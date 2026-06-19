import { FC, useEffect, useRef, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Claim, ClaimUseChoice } from "@/types/claim";
import { Encounter } from "@/types/encounter";
import { encounterServicedPeriod } from "@/lib/prefill";
import { apis } from "@/apis";
import { createClaimFormSchema } from "./schema";
import {
  LAMA_DAMA_PROCEDURE_BENEFIT_CODE,
  LamaDamaTreatmentTiming,
  applyLm100Mode,
  claimHasLm100Item,
  getLamaDamaDispositionLabel,
  isLamaDamaDisposition,
  shouldSkipLamaDamaDialog,
} from "./lama-dama-helpers";
import { LamaDamaTreatmentDialog } from "./lama-dama-treatment-dialog";

type ClaimFormValues = z.infer<typeof createClaimFormSchema>;

export type LamaDamaFlowControllerProps = {
  form: UseFormReturn<ClaimFormValues>;
  encounter: Encounter | undefined;
  prefilledClaim: Claim | undefined;
  lockedUse: ClaimUseChoice | null;
  isFormReady: boolean;
  onLm100ModeApplied: () => void;
};

export const LamaDamaFlowController: FC<LamaDamaFlowControllerProps> = ({
  form,
  encounter,
  prefilledClaim,
  lockedUse,
  isFormReady,
  onLm100ModeApplied,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const didInitializeRef = useRef(false);

  const selectedInsurances = form.watch("insurance");
  const focalPolicy =
    selectedInsurances?.find((insurance) => insurance.focal)?.policy ??
    selectedInsurances?.[0]?.policy;

  const { data: planListData } = useQuery({
    queryKey: ["insurancePlan", "list", focalPolicy?.sno],
    queryFn: () =>
      apis.insurancePlan.list({
        identifier_value: "100155-IN2910001986", // FIXME: replace with focalPolicy!.sno
      }),
    enabled: Boolean(focalPolicy?.sno),
    staleTime: 5 * 60 * 1000,
  });

  const planId = planListData?.results?.[0]?.id ?? null;

  const { data: lm100Benefit } = useQuery({
    queryKey: [
      "insurancePlanBenefit",
      "lookup",
      planId,
      LAMA_DAMA_PROCEDURE_BENEFIT_CODE,
    ],
    queryFn: () =>
      apis.insurancePlanBenefit.lookup({
        insurance_plan: planId!,
        type_code: LAMA_DAMA_PROCEDURE_BENEFIT_CODE,
      }),
    enabled: Boolean(planId),
    staleTime: 5 * 60 * 1000,
  });

  const disposition = encounter?.hospitalization?.discharge_disposition;
  const dispositionLabel = getLamaDamaDispositionLabel(disposition);

  const applyMode = () => {
    applyLm100Mode(form, {
      benefit: lm100Benefit,
      encounterPeriod: encounterServicedPeriod(encounter),
    });
    onLm100ModeApplied();
  };

  useEffect(() => {
    if (!isFormReady || didInitializeRef.current) return;

    const effectiveUse = lockedUse ?? form.getValues("use");
    if (effectiveUse !== "claim") return;
    if (!isLamaDamaDisposition(disposition)) return;

    didInitializeRef.current = true;

    if (shouldSkipLamaDamaDialog(prefilledClaim, disposition)) {
      if (claimHasLm100Item(prefilledClaim)) {
        applyMode();
      }
      return;
    }

    setDialogOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    disposition,
    encounter,
    form,
    isFormReady,
    lockedUse,
    prefilledClaim,
  ]);

  const handleConfirm = (timing: LamaDamaTreatmentTiming) => {
    setDialogOpen(false);

    if (timing === "before_during") {
      applyMode();
    }
  };

  return (
    <LamaDamaTreatmentDialog
      open={dialogOpen}
      dispositionLabel={dispositionLabel}
      onConfirm={handleConfirm}
    />
  );
};
