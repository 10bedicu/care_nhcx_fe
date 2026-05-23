import {
  COVERAGE_ELIGIBILITY_REQUEST_PURPOSE_CHOICES,
  CoverageEligibilityRequestPurposeChoice,
} from "@/types/coverage_eligibility";
import { Condition, ConditionCategory } from "@/types/condition";
import { FC, useEffect, useMemo, useRef } from "react";
import {
  chargeItemHasCoding,
  modifiersFromBenefit,
  parsePositiveNumber,
} from "@/lib/prefill";
import { useForm, useWatch } from "react-hook-form";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useNavigate, useQueryParams } from "raviger";

import { Button } from "@/components/ui/button";
import { ChargeItem } from "@/types/charge_item";
import { CoverageEligibilityRequestInsuranceSection } from "./coverage-eligibility-request-insurance-section";
import { CoverageEligibilityRequestItemSection } from "./coverage-eligibility-request-item-section";
import { CoverageEligibilityRequestOtherSection } from "./coverage-eligibility-request-other-section";
import { FileUploadModel } from "@/types/file_upload";
import { Form } from "@/components/ui/form";
import { GlobalStoreProvider } from "@/hooks/use-global-store";
import { InsurancePlanDetailsPanel } from "../insurance-plan-details-panel";
import { PmjayBiometricVerificationGate } from "@/components/common/pmjay-biometric-verification-gate";
import { Separator } from "../ui/separator";
import { apis } from "@/apis";
import { createCoverageEligibilityRequestFormSchema } from "./schema";
import { pickFocalPolicy, useFocalPlanId } from "@/hooks/use-plan-id";
import { toast } from "@/lib/utils";
import { uploadFile } from "@/lib/upload-file";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

function parsePurposeQueryParam(
  value: unknown
): CoverageEligibilityRequestPurposeChoice | null {
  if (typeof value !== "string") return null;
  const lower = value.toLowerCase();
  const match = COVERAGE_ELIGIBILITY_REQUEST_PURPOSE_CHOICES.find(
    (choice) => choice === lower
  );
  return match ?? null;
}

function parseStringParam(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export type CreateCoverageEligibilityRequestPageProps = {
  facilityId: string;
  patientId: string;
  encounterId: string;
};

const CreateCoverageEligibilityRequestPage: FC<
  CreateCoverageEligibilityRequestPageProps
> = ({ facilityId, patientId, encounterId }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [queryParams] = useQueryParams();

  const lockedPurpose = useMemo(
    () => parsePurposeQueryParam(queryParams?.purpose),
    [queryParams?.purpose]
  );

  const linkedCoverageEligibilityId = useMemo(
    () => parseStringParam(queryParams?.coverage_eligibility),
    [queryParams?.coverage_eligibility]
  );

  const initialPurpose: CoverageEligibilityRequestPurposeChoice[] = useMemo(
    () => (lockedPurpose ? [lockedPurpose] : ["validation"]),
    [lockedPurpose]
  );

  const form = useForm<
    z.infer<typeof createCoverageEligibilityRequestFormSchema>
  >({
    resolver: zodResolver(createCoverageEligibilityRequestFormSchema),
    defaultValues: {
      facility: facilityId,
      patient: patientId,
      encounter: encounterId,
      status: "draft",
      priority: "normal",
      purpose: initialPurpose,
    },
  });

  const insuranceSelection = useWatch({
    control: form.control,
    name: "insurance",
  });

  const focalPolicy = pickFocalPolicy(insuranceSelection);
  const { planId, isLoading: isPlanIdLoading } = useFocalPlanId(focalPolicy);

  const isAuthRequirements = lockedPurpose === "auth-requirements";
  const isValidation = lockedPurpose === "validation";

  const didPrefillRef = useRef(false);
  const didPrefillInsuranceRef = useRef(false);

  const { data: linkedCoverageEligibilityRequest } = useQuery({
    queryKey: ["coverage-eligibility-request", linkedCoverageEligibilityId],
    queryFn: () =>
      apis.coverageEligibilityRequest.get(linkedCoverageEligibilityId as string),
    enabled: !!linkedCoverageEligibilityId,
  });

  const { data: encounterDiagnoses, isFetched: encounterDiagnosesFetched } =
    useQuery({
      queryKey: ["cer-encounter-diagnoses", patientId, encounterId],
      queryFn: async (): Promise<Condition[]> => {
        const res = await apis.diagnosis.list(patientId, {
          encounter: encounterId,
          category: [ConditionCategory.encounter_diagnosis],
          ordering: "-created_date",
        });
        return res.results || [];
      },
      enabled: !!patientId && !!encounterId && isAuthRequirements,
      staleTime: 60 * 1000,
    });

  const { data: encounterFiles, isFetched: encounterFilesFetched } = useQuery({
    queryKey: ["cer-encounter-files", encounterId],
    queryFn: async (): Promise<FileUploadModel[]> => {
      const res = await apis.file.list({
        file_type: "encounter",
        associating_id: encounterId,
        ordering: "-created_date",
      });
      return (res.results || []).filter((file) => !!file.id);
    },
    enabled: !!encounterId && isAuthRequirements,
    staleTime: 60 * 1000,
  });

  const { data: encounterChargeItems, isFetched: encounterChargeItemsFetched } =
    useQuery({
      queryKey: ["cer-encounter-charge-items", facilityId, encounterId],
      queryFn: async (): Promise<ChargeItem[]> => {
        const res = await apis.charge_item.list(facilityId, {
          encounter: encounterId,
          ordering: "-created_date",
        });
        return res.results || [];
      },
      enabled: !!facilityId && !!encounterId && isAuthRequirements,
      staleTime: 60 * 1000,
    });

  const codedChargeItems = useMemo(
    () => (encounterChargeItems ?? []).filter(chargeItemHasCoding),
    [encounterChargeItems]
  );

  const benefitQueries = useQueries({
    queries: codedChargeItems.map((ci) => ({
      queryKey: ["insurancePlanBenefit", "lookup", planId, ci.code.code],
      queryFn: () =>
        apis.insurancePlanBenefit.lookup({
          insurance_plan: planId!,
          type_code: ci.code.code,
        }),
      enabled: Boolean(isAuthRequirements && planId && ci.code.code),
      staleTime: 5 * 60 * 1000,
      retry: false,
    })),
  });

  const allBenefitsResolved = benefitQueries.every((q) => !q.isFetching);
  const benefitsFingerprint = benefitQueries
    .map((q) => q.dataUpdatedAt)
    .join(",");

  const coveredItems = useMemo(() => {
    if (!isAuthRequirements || !planId) return [];
    return codedChargeItems
      .map((ci, idx) => ({ ci, benefit: benefitQueries[idx]?.data }))
      .filter(
        (entry): entry is { ci: ChargeItem; benefit: NonNullable<typeof entry.benefit> } =>
          !!entry.benefit
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthRequirements, planId, codedChargeItems, benefitsFingerprint]);

  const uncoveredChargeItems = useMemo(() => {
    if (!isAuthRequirements || !planId || !allBenefitsResolved) return [];
    return codedChargeItems.filter((_, idx) => {
      const q = benefitQueries[idx];
      return !!q && !q.isFetching && !q.data;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isAuthRequirements,
    planId,
    allBenefitsResolved,
    codedChargeItems,
    benefitsFingerprint,
  ]);

  useEffect(() => {
    if (didPrefillInsuranceRef.current) return;
    if (!linkedCoverageEligibilityRequest) return;

    const ceInsurance = linkedCoverageEligibilityRequest.insurance ?? [];
    if (ceInsurance.length === 0) return;

    const existingInsurance = form.getValues("insurance") ?? [];
    if (existingInsurance.length > 0) {
      didPrefillInsuranceRef.current = true;
      return;
    }

    didPrefillInsuranceRef.current = true;

    const mappedInsurance = ceInsurance.map((ins, idx) => ({
      sequence:
        typeof ins.sequence === "number" && ins.sequence > 0
          ? ins.sequence
          : idx + 1,
      focal: !!ins.focal,
      policy: ins.policy,
    }));
    if (mappedInsurance.length > 0 && !mappedInsurance.some((i) => i.focal)) {
      mappedInsurance[0].focal = true;
    }

    form.setValue("insurance", mappedInsurance);
  }, [linkedCoverageEligibilityRequest, form]);

  useEffect(() => {
    if (didPrefillRef.current) return;
    if (isValidation) {
      didPrefillRef.current = true;
      return;
    }
    if (!isAuthRequirements) return;
    if (
      !encounterDiagnosesFetched ||
      !encounterFilesFetched ||
      !encounterChargeItemsFetched
    ) {
      return;
    }
    if (!planId || !allBenefitsResolved) return;

    const existingItems = form.getValues("item") || [];
    const existingSupportingInfo = form.getValues("supporting_info") || [];
    if (existingItems.length > 0 || existingSupportingInfo.length > 0) {
      didPrefillRef.current = true;
      return;
    }

    didPrefillRef.current = true;

    const supportingInfo = (encounterFiles || []).map((file, idx) => ({
      sequence: idx + 1,
      value_string: undefined,
      value_attachment: file.id as string,
    }));
    const informationSequences = supportingInfo.map((info) => info.sequence);
    form.setValue("supporting_info", supportingInfo);

    const itemDiagnoses = (encounterDiagnoses || []).map((c) => ({
      diagnosis_reference: undefined,
      diagnosis_code: c.code,
    }));

    if (coveredItems.length === 0) return;

    form.setValue(
      "item",
      coveredItems.map(({ ci, benefit }, idx) => ({
        sequence: idx + 1,
        supporting_info_sequence: [...informationSequences],
        category: {
          system:
            "https://nrces.in/ndhm/fhir/r4/ValueSet/ndhm-benefitcategory",
          code: benefit.coverage_type_code,
          display: benefit.coverage_type_display,
        },
        product_or_service: {
          system: ci.code.system,
          code: ci.code.code,
          display: ci.code.display,
        },
        modifier: modifiersFromBenefit(benefit),
        quantity: {
          value: parsePositiveNumber(ci.quantity, 1),
        },
        unit_price: parsePositiveNumber(ci.total_price, 1),
        diagnosis: itemDiagnoses.map((d) => ({ ...d })),
      }))
    );
  }, [
    isValidation,
    isAuthRequirements,
    encounterDiagnoses,
    encounterDiagnosesFetched,
    encounterFiles,
    encounterFilesFetched,
    encounterChargeItemsFetched,
    planId,
    allBenefitsResolved,
    coveredItems,
    form,
  ]);

  const { mutate: checkCoverageEligibility } = useMutation({
    mutationFn: apis.coverageEligibilityRequest.check,
    onSuccess: () => {
      toast.success("Coverage check submitted successfully");
      navigate(
        `/facility/${facilityId}/patient/${patientId}/encounter/${encounterId}/claims`
      );
    },
  });

  const {
    mutate: createCoverageEligibilityRequest,
    isPending: createCoverageEligibilityRequestIsPending,
  } = useMutation({
    mutationFn: apis.coverageEligibilityRequest.create,
    onSuccess: (data) => {
      form.reset();
      toast.success("Coverage check created successfully");
      checkCoverageEligibility(data.id);
      queryClient.invalidateQueries({
        queryKey: ["coverage-eligibility-requests", encounterId],
      });
    },
  });

  async function onSubmit(
    values: z.infer<typeof createCoverageEligibilityRequestFormSchema>
  ) {
    try {
      const updatedValues = { ...values };

      if (updatedValues.supporting_info?.length) {
        for (let i = 0; i < updatedValues.supporting_info.length; i++) {
          const info = updatedValues.supporting_info[i];

          if (info.value_file && !info.value_attachment) {
            try {
              const fileUploadRequest = {
                file_type: "encounter" as const,
                file_category: "unspecified" as const,
                name: info.value_file.name,
                associating_id: encounterId,
                original_name: info.value_file.name,
                mime_type: info.value_file.type,
              };

              const uploadResponse = await uploadFile(
                info.value_file,
                fileUploadRequest
              );

              updatedValues.supporting_info[i].value_attachment =
                uploadResponse.id;

              delete updatedValues.supporting_info[i].value_file;
            } catch (error) {
              console.error("Error uploading file:", error);
              throw new Error(
                `Failed to upload file: ${info.value_file?.name}`
              );
            }
          }
        }
      }

      createCoverageEligibilityRequest(updatedValues);
    } catch (error) {
      console.error("Error in onSubmit:", error);
    }
  }

  const showWaitingForInsuranceHint =
    isAuthRequirements && !planId && !isPlanIdLoading;

  return (
    <GlobalStoreProvider
      initialStore={{
        encounterId,
        patientId,
        facilityId,
      }}
    >
      <div className="space-y-6">
        <PmjayBiometricVerificationGate
          encounterId={encounterId}
          insurance={insuranceSelection || []}
        />
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">
              {lockedPurpose === "auth-requirements"
                ? "Check Auth Requirements"
                : lockedPurpose === "validation"
                ? "Coverage Validation"
                : lockedPurpose === "discovery"
                ? "Coverage Discovery"
                : lockedPurpose === "benefits"
                ? "Benefits Check"
                : "Check Coverage Eligibility"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {lockedPurpose === "auth-requirements"
                ? "Discover what documents and questionnaires are required for pre-authorisation."
                : lockedPurpose === "validation"
                ? "Confirm the policy is active and check the available wallet balance."
                : "Check the coverage eligibility for the patient."}
            </p>
            {showWaitingForInsuranceHint && (
              <p className="text-xs text-muted-foreground mt-1">
                Select an insurance plan to prefill the items from this
                encounter&apos;s charge items.
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              navigate(
                `/facility/${facilityId}/patient/${patientId}/encounter/${encounterId}/claims`
              );
            }}
          >
            Back to Encounter
          </Button>
        </div>
        <Separator />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-8"
              >
                <CoverageEligibilityRequestInsuranceSection
                  form={form}
                  readOnly={lockedPurpose !== null && lockedPurpose !== "validation"}
                />
                <Separator />
                <CoverageEligibilityRequestItemSection
                  form={form}
                  uncoveredChargeItems={uncoveredChargeItems}
                />
                <Separator />
                <CoverageEligibilityRequestOtherSection
                  form={form}
                  lockedPurpose={lockedPurpose}
                />
                <Separator />

                <Button
                  className="w-full"
                  size="lg"
                  type="submit"
                  loading={createCoverageEligibilityRequestIsPending}
                >
                  Check Coverage Eligibility
                </Button>
              </form>
            </Form>
          </div>

          <div className="lg:col-span-1">
            <InsurancePlanDetailsPanel
              selectedInsurances={form.watch("insurance") || []}
            />
          </div>
        </div>
      </div>
    </GlobalStoreProvider>
  );
};

export default CreateCoverageEligibilityRequestPage;
