import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowRightIcon, RefreshCwIcon, ShieldCheckIcon } from "lucide-react";
import {
  ClaimTimelineCard,
  CoverageEligibilityTimelineCard,
} from "./timeline-cards";
import {
  EncounterPrereqsSkeleton,
  TimelineSkeleton,
} from "@/components/common/timeline-skeleton";
import {
  buildTimeline,
  deriveValidationOutcome,
  findLatestClaim,
  findLatestClaimWithSuccessfulResponse,
  getWalletRemaining,
  hasValidationPurpose,
  isAwaitingResponse,
  isLatestRecord,
} from "./flow";

import FlowPrerequisitesGate, {
  FlowPrerequisitesTimelineGate,
} from "./flow-prerequisites-gate";
import { hasDemographicMismatch } from "./demographics";
import { useFlowPrerequisites } from "./use-flow-prerequisites";
import { useLinkPatientValidation } from "./use-link-patient-validation";
import { WalletBalanceCard } from "./wallet-balance-card";

import { Button } from "@/components/ui/button";
import { Condition, ConditionCategory } from "@/types/condition";
import { CyclicalConsentPanel } from "./cyclical-consent-panel";
import { Encounter } from "@/types/encounter";
import { FC } from "react";
import { GlobalStoreProvider } from "@/hooks/use-global-store";
import { Link } from "raviger";
import { Patient } from "@/types/patient";
import { apis } from "@/apis";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export type EncounterTabProps = {
  encounter: Encounter;
  patient: Patient;
};

const NhcxEncounterTab: FC<EncounterTabProps> = ({ encounter, patient }) => {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ refetchType: "active" });
    } finally {
      setIsRefreshing(false);
    }
  };

  const { data: coverages, isLoading: isLoadingCoverages } = useQuery({
    queryKey: ["coverage-eligibility-requests", encounter?.id],
    queryFn: () =>
      apis.coverageEligibilityRequest.list({
        encounter: encounter?.id,
      }),
    enabled: !!encounter?.id,
    refetchInterval: (query) => {
      const results = query.state.data?.results ?? [];
      const latestValidation = results
        .filter(hasValidationPurpose)
        .slice()
        .sort(
          (a, b) =>
            new Date(b.created_date).getTime() -
            new Date(a.created_date).getTime(),
        )[0];
      return latestValidation && isAwaitingResponse(latestValidation)
        ? 5000
        : false;
    },
  });

  const encounterCoverages = coverages?.results ?? [];
  // System-initiated wallet refreshes (is_automatic) must not appear as timeline
  // entries — they only feed the always-latest wallet balance card. Everything
  // downstream (timeline, prerequisites, flow gating) uses the manual set.
  const manualCoverages = encounterCoverages.filter((c) => !c.is_automatic);
  const hasEncounterValidation = manualCoverages.some(hasValidationPurpose);

  const { isLinking } = useLinkPatientValidation({
    encounterId: encounter?.id,
    patientId: patient?.id,
    hasEncounterValidation,
  });

  const { data: claims, isLoading: isLoadingClaims } = useQuery({
    queryKey: ["claims", encounter?.id],
    queryFn: () =>
      apis.claim.list({
        encounter: encounter?.id,
      }),
    enabled: !!encounter?.id,
  });

  const { data: encounterAccount } = useQuery({
    queryKey: ["encounter-account", encounter?.facility.id, encounter?.id],
    queryFn: async () => {
      const res = await apis.account.list(encounter.facility.id, {
        encounter: encounter?.id,
      });
      return res.results?.[0] ?? null;
    },
    enabled: !!encounter?.facility.id && !!encounter?.id,
  });

  const { data: accountPreAuths } = useQuery({
    queryKey: ["account-preauths", encounterAccount?.id],
    queryFn: async () => {
      const res = await apis.claim.list({ account: encounterAccount!.id });
      return (res.results ?? []).filter(
        (claim) =>
          claim.use === "preauthorization" && claim.status !== "cancelled",
      );
    },
    enabled: !!encounterAccount?.id,
  });

  const { data: healthFacility, isLoading: isHealthFacilityLoading } = useQuery(
    {
      queryKey: ["healthFacility", encounter?.facility.id],
      queryFn: () => apis.healthFacility.get(encounter?.facility.id),
      enabled: !!encounter?.facility.id,
    },
  );

  const { data: provider, isLoading: isProviderLoading } = useQuery({
    queryKey: ["provider", encounter?.facility.id],
    queryFn: () => apis.provider.get(encounter?.facility.id),
    enabled: !!encounter?.facility.id,
  });

  const { data: abhaNumber } = useQuery({
    queryKey: ["abhaNumber", patient?.id],
    queryFn: () => apis.abhaNumber.get(patient.id),
    enabled: !!patient?.id,
  });

  const { data: encounterDiagnoses, isFetching: isLoadingDiagnoses } = useQuery(
    {
      queryKey: ["encounter-diagnoses", patient?.id, encounter?.id],
      queryFn: async (): Promise<Condition[]> => {
        const res = await apis.diagnosis.list(patient.id, {
          encounter: encounter.id,
          category: [ConditionCategory.encounter_diagnosis],
          ordering: "-created_date",
        });
        return res.results ?? [];
      },
      enabled: !!patient?.id && !!encounter?.id,
      staleTime: 60 * 1000,
    },
  );

  const isLoadingPrereqs = isHealthFacilityLoading || isProviderLoading;
  const hasHealthFacility = !!healthFacility;
  const hasProvider = !!provider;
  const isLoadingTimeline =
    isLinking ||
    (isLoadingCoverages && coverages === undefined) ||
    (isLoadingClaims && claims === undefined);

  // Diagnosis and care team are mandatory clinical details before any
  // pre-authorisation or claim can be raised. Surface a warning while either
  // is missing so the user can complete the encounter record first.
  const hasDiagnosis = (encounterDiagnoses?.length ?? 0) > 0;
  const hasCareTeam = (encounter?.care_team?.length ?? 0) > 0;
  const showClinicalDetailsWarning =
    !isLoadingDiagnoses && (!hasDiagnosis || !hasCareTeam);

  // Before CE-validation prerequisites gate the timeline; after CE-validation
  // prerequisites appear as a timeline entry below the validation card.
  const flowPrerequisites = useFlowPrerequisites(encounter, patient);
  const { beforeCeValidation, afterCeValidation } = flowPrerequisites;

  // Determine guided headline state. The CTA is shown when no CE:V exists yet,
  // or when the latest validation request hard-stops the flow (so the user can
  // start a fresh check after fixing the underlying issue).
  const validationRequests = manualCoverages.filter(hasValidationPurpose);
  const latestValidation = validationRequests
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_date).getTime() - new Date(a.created_date).getTime(),
    )[0];
  const validationOutcome = latestValidation
    ? deriveValidationOutcome(latestValidation)
    : null;

  const isHardStop =
    validationOutcome?.kind === "policy-inactive" ||
    validationOutcome?.kind === "no-balance";

  // Demographic verification is a post-requirement: once the policy validates,
  // a contradiction between the payer's record and the patient's record blocks
  const demographicMismatch =
    latestValidation && !flowPrerequisites.isChild
      ? hasDemographicMismatch(latestValidation, patient, abhaNumber)
      : false;

  const showInitialCTA = !latestValidation;

  // The wallet balance card always reflects the freshest validation, including
  // system-initiated (is_automatic) refreshes raised after a claim response.
  const latestValidationForWallet = encounterCoverages
    .filter(hasValidationPurpose)
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_date).getTime() - new Date(a.created_date).getTime(),
    )[0];

  // Remaining wallet balance drives the patient copay shown on claim cards.
  const walletRemaining = getWalletRemaining(latestValidationForWallet);

  // Track the most recent CE id so we can propagate it through claim actions.
  const latestCoverageEligibilityId = manualCoverages
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_date).getTime() - new Date(a.created_date).getTime(),
    )[0]?.id;

  const encounterOwnClaims = claims?.results ?? [];
  const encounterOwnClaimIds = new Set(encounterOwnClaims.map((c) => c.id));
  const linkedCyclePreAuth = (accountPreAuths ?? []).find(
    (c) => !encounterOwnClaimIds.has(c.id),
  );
  const encounterClaims = [
    ...encounterOwnClaims,
    ...(accountPreAuths ?? []).filter((c) => !encounterOwnClaimIds.has(c.id)),
  ];
  const latestClaim = findLatestClaim(encounterClaims);
  const latestClaimId =
    latestClaim?.status === "cancelled" ? undefined : latestClaim?.id;
  const latestSuccessfulClaimId =
    findLatestClaimWithSuccessfulResponse(encounterClaims)?.id;

  const timeline = buildTimeline(manualCoverages, encounterClaims, {
    afterCeValidationSatisfied: afterCeValidation.isSatisfied,
  });

  return (
    <GlobalStoreProvider
      initialStore={{
        encounter,
        patient,
      }}
    >
      <div className="min-h-screen bg-gray-50 p-6 space-y-6">
        {isLoadingPrereqs && <EncounterPrereqsSkeleton />}

        {!isLoadingPrereqs && !hasHealthFacility && (
          <Alert variant="warning">
            <AlertTitle>Health Facility Required</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>
                No health facility is linked to this facility. Please go to
                Settings → General to link a health facility before proceeding.
              </p>
              <Link
                href={`/facility/${encounter?.facility.id}/settings/general`}
              >
                <Button variant="outline" size="sm">
                  Go to Settings
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {!isLoadingPrereqs && hasHealthFacility && !hasProvider && (
          <Alert variant="warning">
            <AlertTitle>NHCX Provider Required</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>
                No NHCX provider is configured for this facility. Please go to
                Settings → General to create an NHCX provider before proceeding.
              </p>
              <Link
                href={`/facility/${encounter?.facility.id}/settings/general`}
              >
                <Button variant="outline" size="sm">
                  Go to Settings
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {!isLoadingPrereqs && hasHealthFacility && hasProvider && (
          <>
            <div className="flex justify-between items-start gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Insurance Claim Flow
                </h1>
                <p className="text-sm text-gray-500">
                  Step-by-step coverage validation, pre-authorization and claim
                  submission for this encounter.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 shrink-0"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCwIcon
                  className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>

            {latestValidationForWallet && (
              <WalletBalanceCard
                request={latestValidationForWallet}
                encounterId={encounter.id}
              />
            )}

            {showClinicalDetailsWarning && (
              <Alert variant="warning">
                <AlertTitle>Clinical Details Required</AlertTitle>
                <AlertDescription className="space-y-3">
                  <p>
                    {!hasDiagnosis && !hasCareTeam
                      ? "This encounter is missing a diagnosis and a care team. Add both before raising a pre-authorisation or claim."
                      : !hasDiagnosis
                        ? "This encounter is missing a diagnosis. Add one before raising a pre-authorisation or claim."
                        : "This encounter is missing a care team. Add one before raising a pre-authorisation or claim."}
                  </p>
                  <Link
                    href={`/facility/${encounter?.facility.id}/patient/${patient?.id}/encounter/${encounter?.id}/updates`}
                  >
                    <Button variant="outline" size="sm">
                      Update Encounter
                    </Button>
                  </Link>
                </AlertDescription>
              </Alert>
            )}
            {beforeCeValidation.isLoading && <TimelineSkeleton count={2} />}

            {!beforeCeValidation.isLoading &&
              !beforeCeValidation.isSatisfied && (
                <FlowPrerequisitesGate
                  title="PMJAY requirements not met"
                  description="The following details are mandatory before coverage eligibility validation can be started for this"
                  state={beforeCeValidation}
                  ageUnknown={flowPrerequisites.ageUnknown}
                  patientUpdateHref={flowPrerequisites.patientUpdateHref}
                  isChild={flowPrerequisites.isChild}
                />
              )}

            {beforeCeValidation.isSatisfied && (
              <>
                {!isLoadingTimeline && linkedCyclePreAuth && (
                  <CyclicalConsentPanel
                    encounter={encounter}
                    patient={patient}
                    preAuth={linkedCyclePreAuth}
                  />
                )}
                {!isLoadingTimeline && showInitialCTA && (
                  <div className="rounded-lg border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-primary/10 p-2.5">
                        <ShieldCheckIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-base font-semibold text-gray-900">
                          Start with a Coverage Balance Check
                        </h2>
                        <p className="text-sm text-gray-600 mt-0.5">
                          Confirm the patient’s policy is active and has wallet
                          balance before checking what is needed for
                          pre-authorisation.
                        </p>
                      </div>
                    </div>
                    <Link href="coverages/new?purpose=validation">
                      <Button size="lg" className="gap-2">
                        Check Coverage Balance
                        <ArrowRightIcon className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                )}

                {!isLoadingTimeline && isHardStop && (
                  <Alert className="border-red-300 bg-red-50 text-red-800">
                    <AlertTitle>Flow blocked</AlertTitle>
                    <AlertDescription className="space-y-3">
                      <p>
                        {validationOutcome?.kind === "policy-inactive"
                          ? "The patient’s policy is inactive."
                          : "The patient’s wallet balance is exhausted."}{" "}
                        No further authorisation or claim actions can be taken
                        on this encounter.
                      </p>
                      <div>
                        <Link href="coverages/new?purpose=validation">
                          <Button variant="outline" size="sm">
                            Re-check Coverage Balance
                          </Button>
                        </Link>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {!isLoadingTimeline && !isHardStop && demographicMismatch && (
                  <Alert className="border-red-300 bg-red-50 text-red-800">
                    <AlertTitle>Flow blocked: demographic mismatch</AlertTitle>
                    <AlertDescription className="space-y-3">
                      <p>
                        The patient’s details do not match the records returned
                        by the payer. Correct the patient’s details so they
                        match, then re-run the coverage check before proceeding
                        with pre-authorisation or claims.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {flowPrerequisites.patientUpdateHref && (
                          <Link href={flowPrerequisites.patientUpdateHref}>
                            <Button variant="outline" size="sm">
                              Update Patient Details
                            </Button>
                          </Link>
                        )}
                        <Link href="coverages/new?purpose=validation">
                          <Button variant="outline" size="sm">
                            Re-check Coverage Balance
                          </Button>
                        </Link>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  {isLoadingTimeline && <TimelineSkeleton count={3} />}

                  {!isLoadingTimeline &&
                    timeline.length === 0 &&
                    !showInitialCTA && (
                      <div className="text-center py-8 text-gray-500">
                        No activity yet.
                      </div>
                    )}

                  {timeline.map((entry) => {
                    if (entry.kind === "prerequisites-gate") {
                      return (
                        <FlowPrerequisitesTimelineGate
                          key={`gate-${entry.anchor}-${entry.phase}`}
                          title="Additional details required"
                          description="Complete the following before proceeding with pre-authorisation or claim submission."
                          state={afterCeValidation}
                        />
                      );
                    }

                    const isCurrent = isLatestRecord(timeline, entry);
                    if (entry.kind === "ce") {
                      return (
                        <CoverageEligibilityTimelineCard
                          key={`ce-${entry.record.id}`}
                          request={entry.record}
                          encounterId={encounter.id}
                          isCurrent={isCurrent}
                          latestClaimId={latestClaimId}
                          latestSuccessfulClaimId={latestSuccessfulClaimId}
                          afterCeValidationSatisfied={
                            afterCeValidation.isSatisfied
                          }
                          patient={patient}
                          abhaNumber={abhaNumber}
                        />
                      );
                    }
                    return (
                      <ClaimTimelineCard
                        key={`claim-${entry.record.id}`}
                        claim={entry.record}
                        encounterId={encounter.id}
                        encounterStatus={encounter.status}
                        isCurrent={isCurrent}
                        latestCoverageEligibilityId={
                          latestCoverageEligibilityId
                        }
                        latestClaimId={latestClaimId}
                        latestSuccessfulClaimId={latestSuccessfulClaimId}
                        walletRemaining={walletRemaining}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </GlobalStoreProvider>
  );
};

export default NhcxEncounterTab;
