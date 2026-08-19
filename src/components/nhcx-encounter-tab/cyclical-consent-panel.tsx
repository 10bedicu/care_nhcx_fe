import {
  ArrowRightIcon,
  CheckCircle2Icon,
  ClockIcon,
  FingerprintIcon,
  RepeatIcon,
} from "lucide-react";
import { FC, useMemo, useState } from "react";

import { BiometricVerificationDialog } from "@/components/common/biometric-verification-dialog";
import { Button } from "@/components/ui/button";
import { Claim } from "@/types/claim";
import { ClaimConsentStage } from "@/types/claim_consent";
import { Encounter } from "@/types/encounter";
import { Link } from "raviger";
import { Patient } from "@/types/patient";
import { apis } from "@/apis";
import { isEncounterDischarged } from "./flow";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface CyclicalConsentPanelProps {
  encounter: Encounter;
  patient: Patient;
  preAuth: Claim;
}

const toISTDateString = (date: string | Date) =>
  new Date(date).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

export const CyclicalConsentPanel: FC<CyclicalConsentPanelProps> = ({
  encounter,
  patient,
  preAuth,
}) => {
  const queryClient = useQueryClient();
  const [dialogStage, setDialogStage] = useState<ClaimConsentStage | null>(
    null,
  );

  const payerId = useMemo(() => {
    const focal =
      preAuth.insurance?.find((i) => i.focal) ?? preAuth.insurance?.[0];
    return focal?.policy.payerid ?? "";
  }, [preAuth]);

  const { data: abhaNumber } = useQuery({
    queryKey: ["abhaNumber", patient?.id],
    queryFn: () => apis.abhaNumber.get(patient.id),
    enabled: !!patient?.id,
  });

  const checkInQuery = useQuery({
    queryKey: [
      "cycle-consent",
      encounter?.id,
      payerId,
      "preauthorization" satisfies ClaimConsentStage,
    ],
    queryFn: () =>
      apis.claimConsent.lookup({
        payer_id: payerId,
        encounter_id: encounter.id,
        stage: "preauthorization",
      }),
    enabled: !!encounter?.id && !!payerId,
    retry: false,
  });

  const checkOutQuery = useQuery({
    queryKey: [
      "cycle-consent",
      encounter?.id,
      payerId,
      "claim" satisfies ClaimConsentStage,
    ],
    queryFn: () =>
      apis.claimConsent.lookup({
        payer_id: payerId,
        encounter_id: encounter.id,
        stage: "claim",
      }),
    enabled: !!encounter?.id && !!payerId,
    retry: false,
  });

  const checkIn = checkInQuery.data?.id ? checkInQuery.data : undefined;
  const checkOut = checkOutQuery.data?.id ? checkOutQuery.data : undefined;

  const { data: cycleConsents } = useQuery({
    queryKey: ["claim-consents", "by-claim", preAuth.id],
    queryFn: () => apis.claimConsent.list({ claim: preAuth.id }),
    enabled: !!preAuth.id,
  });

  const cycleNumber = useMemo(() => {
    const consents = cycleConsents?.results ?? [];
    const cycleByEncounter = new Map<string, number>();
    let maxCycle = 0;
    for (const consent of consents) {
      const encounterId = consent.encounter;
      if (!encounterId || consent.cycle == null) continue;
      if (!cycleByEncounter.has(encounterId)) {
        cycleByEncounter.set(encounterId, consent.cycle);
      }
      maxCycle = Math.max(maxCycle, consent.cycle);
    }

    const current = cycleByEncounter.get(encounter.id);
    if (current != null) {
      return current;
    }

    return maxCycle + 1;
  }, [cycleConsents, encounter.id]);

  const isNewCycleBlockedToday = useMemo(() => {
    const consents = cycleConsents?.results ?? [];
    const hasOwnConsent = consents.some(
      (consent) => consent.encounter === encounter.id && consent.cycle != null,
    );
    if (hasOwnConsent || encounter.id === preAuth.encounter) {
      return false;
    }
    const today = toISTDateString(new Date());
    return consents.some(
      (consent) =>
        consent.cycle != null &&
        consent.cycle > 0 &&
        consent.encounter !== encounter.id &&
        consent.created_date &&
        toISTDateString(consent.created_date) === today,
    );
  }, [cycleConsents, encounter.id, preAuth.encounter]);

  const patientDischarged = isEncounterDischarged(encounter.status);
  const preAuthRef = preAuth.latest_response?.pre_auth_ref;

  const invalidateConsent = (stage: ClaimConsentStage) => {
    queryClient.invalidateQueries({
      queryKey: ["cycle-consent", encounter.id, payerId, stage],
    });
  };

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/10 p-2.5">
          <RepeatIcon className="h-5 w-5 text-primary" />
        </div>
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold text-gray-900">
            Cyclical procedure: Cycle {cycleNumber}
          </h2>
          <p className="text-sm text-gray-600">
            A pre-authorization
            {preAuthRef ? ` (ref ${preAuthRef})` : ""} raised on an earlier
            cycle covers this encounter. Capture the biometric consent for this
            cycle at check-in and check-out, then raise the final claim.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ConsentTile
          label="Check-in consent"
          capturedAt={checkIn?.created_date}
          loading={checkInQuery.isFetching && !checkInQuery.data}
          onCapture={() => setDialogStage("preauthorization")}
          disabled={isNewCycleBlockedToday}
        />
        <ConsentTile
          label="Check-out consent"
          capturedAt={checkOut?.created_date}
          loading={checkOutQuery.isFetching && !checkOutQuery.data}
          onCapture={() => setDialogStage("claim")}
          disabled={isNewCycleBlockedToday}
        />
      </div>

      {isNewCycleBlockedToday && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          A cycle&apos;s consent was already captured today. Only one cycle can
          be captured per day — please capture this cycle&apos;s consent
          tomorrow.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Link
          href={`claims/new?use=claim&claim=${preAuth.id}&related=${preAuth.id}`}
        >
          <Button
            size="sm"
            className="gap-2"
            disabled={!patientDischarged}
            title={
              patientDischarged
                ? undefined
                : "The patient must be discharged before the final claim can be raised."
            }
          >
            Proceed to Final Claim
            <ArrowRightIcon className="h-4 w-4" />
          </Button>
        </Link>
        {!patientDischarged && (
          <span className="text-xs text-gray-500">
            Discharge the patient to enable the final claim.
          </span>
        )}
      </div>

      {dialogStage && payerId && (
        <BiometricVerificationDialog
          open={!!dialogStage}
          onOpenChange={(open) => {
            if (!open) setDialogStage(null);
          }}
          encounterId={encounter.id}
          abhaNumber={abhaNumber?.abha_number ?? ""}
          payerId={payerId}
          process={dialogStage === "preauthorization" ? "Preauth" : "Discharge"}
          claim={preAuth.id}
          onVerifySuccess={() => {
            invalidateConsent(dialogStage);
            setDialogStage(null);
          }}
        />
      )}
    </div>
  );
};

interface ConsentTileProps {
  label: string;
  capturedAt?: string;
  loading?: boolean;
  onCapture: () => void;
  disabled?: boolean;
}

const ConsentTile: FC<ConsentTileProps> = ({
  label,
  capturedAt,
  loading,
  onCapture,
  disabled,
}) => {
  const captured = !!capturedAt;
  return (
    <div className="rounded-md border bg-white px-4 py-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {loading ? (
          <p className="text-xs text-gray-400">Checking…</p>
        ) : captured ? (
          <p className="text-xs text-green-700 flex items-center gap-1">
            <CheckCircle2Icon className="h-3.5 w-3.5 shrink-0" />
            Captured {new Date(capturedAt!).toLocaleString()}
          </p>
        ) : (
          <p className="text-xs text-amber-700 flex items-center gap-1">
            <ClockIcon className="h-3.5 w-3.5 shrink-0" />
            Not captured yet
          </p>
        )}
      </div>
      <Button
        size="sm"
        variant={captured ? "outline" : "default"}
        className="gap-1.5 shrink-0"
        onClick={onCapture}
        disabled={disabled}
      >
        <FingerprintIcon className="h-4 w-4" />
        {captured ? "Recapture" : "Capture"}
      </Button>
    </div>
  );
};
