import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
  insurance: PmjaySelectedInsurance[];
}

export function PmjayBiometricVerificationGate({
  encounterId,
  insurance,
}: PmjayBiometricVerificationGateProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const focalPolicy = useMemo(
    () => insurance?.find((i) => i.focal),
    [insurance]
  );

  const { data: lookupData, isFetching: lookupFetching } = useQuery({
    queryKey: [
      "member-biometric-auth-lookup",
      encounterId,
      focalPolicy?.policy.payerid,
    ],
    queryFn: () =>
      apis.memberBiometricAuth.lookup({
        payer_id: focalPolicy?.policy.payerid ?? "",
        encounter_id: encounterId,
      }),
    enabled: !!encounterId && !!focalPolicy?.policy.payerid,
  });

  useEffect(() => {
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
  }, [lookupData, lookupFetching]);

  if (!focalPolicy || lookupFetching) {
    return null;
  }

  return (
    <BiometricVerificationDialog
      encounterId={encounterId}
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      abhaNumber={"91-3625-4621-8003"} // TODO: remove this hardcoded value
      payerId={focalPolicy.policy.payerid}
      process="Preauth"
      onVerifySuccess={() => {
        queryClient.invalidateQueries({
          queryKey: [
            "member-biometric-auth-lookup",
            encounterId,
            focalPolicy.policy.payerid,
          ],
        });
      }}
    />
  );
}
