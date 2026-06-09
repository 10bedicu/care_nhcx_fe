import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";

import { BiometricVerificationDialog } from "./biometric-verification-dialog";
import { Policy } from "@/types/policy";
import { apis } from "@/apis";

export type PmjaySelectedInsurance = {
  sequence: number;
  focal: boolean;
  policy: Policy;
};

export interface PmjayBiometricVerificationGateProps {
  encounterId: string;
  patientId: string;
  insurance: PmjaySelectedInsurance[];
  process: "Preauth" | "Discharge";
}

// Permission slug that allows a user (e.g. Medical Super Intendent / Admin) to skip the biometric claim-consent verification.
const SKIP_CLAIM_CONSENT_PERMISSION = "can_skip_claim_consent";

export function PmjayBiometricVerificationGate({
  encounterId,
  patientId,
  insurance,
  process,
}: PmjayBiometricVerificationGateProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const focalPolicy = useMemo(
    () => insurance?.find((i) => i.focal),
    [insurance],
  );

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => apis.user.getCurrentUser(),
  });

  const { data: abhaNumber } = useQuery({
    queryKey: ["abhaNumber", patientId],
    queryFn: () => apis.abhaNumber.get(patientId),
    enabled: !!patientId,
  });

  const canSkipVerification =
    currentUser?.permissions?.includes(SKIP_CLAIM_CONSENT_PERMISSION) ?? false;
  const [skipped, setSkipped] = useState(false);

  const { data: lookupData, isFetching: lookupFetching } = useQuery({
    queryKey: [
      "claim-consent-lookup",
      encounterId,
      focalPolicy?.policy.payerid,
      process,
    ],
    queryFn: () =>
      apis.claimConsent.lookup({
        payer_id: focalPolicy?.policy.payerid ?? "",
        encounter_id: encounterId,
        stage: process === "Preauth" ? "preauthorization" : "claim",
      }),
    enabled: !!encounterId && !!focalPolicy?.policy.payerid && !skipped,
  });

  useEffect(() => {
    if (skipped) {
      setDialogOpen(false);
      return;
    }

    if (lookupFetching) {
      return;
    }

    if (!lookupData) {
      setDialogOpen(true);
      return;
    }

    if (lookupData.id) {
      setDialogOpen(false);
      return;
    }
  }, [lookupData, lookupFetching, skipped]);

  if (!focalPolicy) {
    return null;
  }

  if (skipped) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Biometric verification skipped
      </div>
    );
  }

  if (lookupFetching) {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        Checking biometric verification status…
      </div>
    );
  }

  return (
    <BiometricVerificationDialog
      encounterId={encounterId}
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      abhaNumber={abhaNumber?.abha_number ?? ""}
      payerId={focalPolicy.policy.payerid}
      process={process}
      onVerifySuccess={() => {
        queryClient.invalidateQueries({
          queryKey: [
            "claim-consent-lookup",
            encounterId,
            focalPolicy.policy.payerid,
            process,
          ],
        });
      }}
      onBypass={canSkipVerification ? () => setSkipped(true) : undefined}
    />
  );
}
