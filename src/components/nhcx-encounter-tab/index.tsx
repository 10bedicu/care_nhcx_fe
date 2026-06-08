import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowRightIcon, ShieldCheckIcon } from "lucide-react";
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
  hasValidationPurpose,
  isLatestRecord,
} from "./flow";

import { Button } from "@/components/ui/button";
import { Encounter } from "@/types/encounter";
import { FC } from "react";
import { GlobalStoreProvider } from "@/hooks/use-global-store";
import { Link } from "raviger";
import { Patient } from "@/types/patient";
import { apis } from "@/apis";
import { useQuery } from "@tanstack/react-query";

export type EncounterTabProps = {
  encounter: Encounter;
  patient: Patient;
};

const NhcxEncounterTab: FC<EncounterTabProps> = ({ encounter, patient }) => {
  const { data: coverages, isFetching: isLoadingCoverages } = useQuery({
    queryKey: ["coverage-eligibility-requests", encounter?.id],
    queryFn: () =>
      apis.coverageEligibilityRequest.list({
        encounter: encounter?.id,
      }),
    enabled: !!encounter?.id,
  });

  const { data: claims, isFetching: isLoadingClaims } = useQuery({
    queryKey: ["claims", encounter?.id],
    queryFn: () =>
      apis.claim.list({
        encounter: encounter?.id,
      }),
    enabled: !!encounter?.id,
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

  const isLoadingPrereqs = isHealthFacilityLoading || isProviderLoading;
  const hasHealthFacility = !!healthFacility;
  const hasProvider = !!provider;
  const isLoadingTimeline = isLoadingCoverages || isLoadingClaims;

  const encounterCoverages = coverages?.results ?? [];

  // Determine guided headline state. The CTA is shown when no CE:V exists yet,
  // or when the latest validation request hard-stops the flow (so the user can
  // start a fresh check after fixing the underlying issue).
  const validationRequests = encounterCoverages.filter(hasValidationPurpose);
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

  const showInitialCTA = !latestValidation;

  // Track the most recent CE id so we can propagate it through claim actions.
  const latestCoverageEligibilityId = encounterCoverages
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_date).getTime() - new Date(a.created_date).getTime(),
    )[0]?.id;

  const encounterClaims = claims?.results ?? [];
  const latestClaimId = findLatestClaim(encounterClaims)?.id;
  const latestSuccessfulClaimId =
    findLatestClaimWithSuccessfulResponse(encounterClaims)?.id;

  const timeline = buildTimeline(encounterCoverages, encounterClaims);

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
            </div>

            {/* ─── Initial CTA when there's no validation request yet ─── */}
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
                      balance before checking what is needed for pre-authorisation.
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

            {/* ─── Hard stop banner: validation says policy/balance is bad ─── */}
            {!isLoadingTimeline && isHardStop && (
              <Alert className="border-red-300 bg-red-50 text-red-800">
                <AlertTitle>Flow blocked</AlertTitle>
                <AlertDescription className="space-y-3">
                  <p>
                    {validationOutcome?.kind === "policy-inactive"
                      ? "The patient’s policy is inactive."
                      : "The patient’s wallet balance is exhausted."}{" "}
                    No further authorisation or claim actions can be taken on
                    this encounter.
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

            {/* ─── Timeline ─── */}
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
                    />
                  );
                }
                return (
                  <ClaimTimelineCard
                    key={`claim-${entry.record.id}`}
                    claim={entry.record}
                    encounterId={encounter.id}
                    isCurrent={isCurrent}
                    latestCoverageEligibilityId={latestCoverageEligibilityId}
                    latestClaimId={latestClaimId}
                    latestSuccessfulClaimId={latestSuccessfulClaimId}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
    </GlobalStoreProvider>
  );
};

export default NhcxEncounterTab;
