import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  COVERAGE_ELIGIBILITY_REQUEST_PURPOSE_CHOICES,
  CoverageEligibilityRequestPurposeChoice,
} from "@/types/coverage_eligibility";
import { Condition, ConditionCategory } from "@/types/condition";
import { FC, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useFormState, useWatch } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useQueryParams } from "raviger";

import { AlertCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CoverageEligibilityRequestInsuranceSection } from "./coverage-eligibility-request-insurance-section";
import { CoverageEligibilityRequestItemSection } from "./coverage-eligibility-request-item-section";
import { CoverageEligibilityRequestOtherSection } from "./coverage-eligibility-request-other-section";
import { Form } from "@/components/ui/form";
import { GlobalStoreProvider } from "@/hooks/use-global-store";
import { InsurancePlanDetailsPanel } from "../insurance-plan-details-panel";
import { FormPrefillSkeleton } from "@/components/common/form-prefill-skeleton";
import { PmjayBiometricVerificationGate } from "@/components/common/pmjay-biometric-verification-gate";
import { Separator } from "../ui/separator";
import { apis } from "@/apis";
import { createCoverageEligibilityRequestFormSchema } from "./schema";
import { toast } from "@/lib/utils";
import { uploadFile } from "@/lib/upload-file";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

function parsePurposeQueryParam(
  value: unknown,
): CoverageEligibilityRequestPurposeChoice | null {
  if (typeof value !== "string") return null;
  const lower = value.toLowerCase();
  const match = COVERAGE_ELIGIBILITY_REQUEST_PURPOSE_CHOICES.find(
    (choice) => choice === lower,
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
    [queryParams?.purpose],
  );

  const linkedCoverageEligibilityId = useMemo(
    () => parseStringParam(queryParams?.coverage_eligibility),
    [queryParams?.coverage_eligibility],
  );

  const initialPurpose: CoverageEligibilityRequestPurposeChoice[] = useMemo(
    () => (lockedPurpose ? [lockedPurpose] : ["validation"]),
    [lockedPurpose],
  );

  const form = useForm<
    z.infer<typeof createCoverageEligibilityRequestFormSchema>
  >({
    resolver: zodResolver(createCoverageEligibilityRequestFormSchema),
    defaultValues: {
      facility: facilityId,
      patient: patientId,
      encounter: encounterId,
      status: "active",
      priority: "normal",
      purpose: initialPurpose,
    },
  });

  const { isDirty } = useFormState({ control: form.control });
  const [hasLinkedCePrefill, setHasLinkedCePrefill] = useState(false);
  const isUnchangedPrefill = hasLinkedCePrefill && !isDirty;

  const insuranceSelection = useWatch({
    control: form.control,
    name: "insurance",
  });

  const isAuthRequirements = lockedPurpose === "auth-requirements";

  const didPrefillFromLinkedCeRef = useRef(false);

  const { data: linkedCoverageEligibilityRequest, isFetching: isLinkedCeLoading } =
    useQuery({
    queryKey: ["coverage-eligibility-request", linkedCoverageEligibilityId],
    queryFn: () =>
      apis.coverageEligibilityRequest.get(
        linkedCoverageEligibilityId as string,
      ),
    enabled: !!linkedCoverageEligibilityId,
  });

  const requireEnhancementAllowed = useMemo(
    () =>
      Boolean(
        linkedCoverageEligibilityId &&
        linkedCoverageEligibilityRequest?.purpose.includes("auth-requirements"),
      ),
    [linkedCoverageEligibilityId, linkedCoverageEligibilityRequest],
  );

  const prefilledItemSequences = useMemo(() => {
    if (!linkedCoverageEligibilityRequest) return new Set<number>();
    return new Set(
      (linkedCoverageEligibilityRequest.item ?? []).map((it, idx) =>
        typeof it.sequence === "number" && it.sequence > 0
          ? it.sequence
          : idx + 1,
      ),
    );
  }, [linkedCoverageEligibilityRequest]);

  const { data: encounterDiagnoses, isFetching: isDiagnosesLoading } = useQuery({
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

  useEffect(() => {
    if (didPrefillFromLinkedCeRef.current) return;
    if (!linkedCoverageEligibilityId) return;
    if (!linkedCoverageEligibilityRequest) return;

    didPrefillFromLinkedCeRef.current = true;

    const current = form.getValues();

    const ceInsurance = linkedCoverageEligibilityRequest.insurance ?? [];
    const ceItems = linkedCoverageEligibilityRequest.item ?? [];
    const ceSupportingInfo =
      linkedCoverageEligibilityRequest.supporting_info ?? [];

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

    const supportingInfo = ceSupportingInfo
      .filter((s) => s.value_string || s.value_attachment)
      .map((s) => ({
        sequence: s.sequence,
        value_string: s.value_string,
        value_attachment: s.value_attachment as unknown as string | undefined,
      }));

    const mappedItems = ceItems.map((it, idx) => ({
      sequence:
        typeof it.sequence === "number" && it.sequence > 0
          ? it.sequence
          : idx + 1,
      supporting_info_sequence: it.supporting_info_sequence ?? [],
      category: it.category,
      product_or_service: it.product_or_service,
      modifier: it.modifier ?? [],
      quantity: {
        value: Number(it.quantity?.value) > 0 ? Number(it.quantity?.value) : 1,
        unit: it.quantity?.unit,
      },
      diagnosis: (it.diagnosis ?? []).map((d) => ({
        diagnosis_reference: d.diagnosis_reference?.id,
        diagnosis_code: d.diagnosis_code,
      })),
    }));

    if (mappedInsurance.length > 0) {
      current.insurance = mappedInsurance;
    }
    if (supportingInfo.length > 0) {
      current.supporting_info = supportingInfo;
    }
    if (mappedItems.length > 0) {
      current.item = mappedItems;
    }

    form.reset(current, { keepDefaultValues: false });
    setHasLinkedCePrefill(true);
  }, [linkedCoverageEligibilityId, linkedCoverageEligibilityRequest, form]);

  // Mapped diagnosis objects ready to pre-fill into each new item
  const defaultItemDiagnoses = useMemo(
    () =>
      (encounterDiagnoses ?? []).map((c) => ({
        diagnosis_reference: undefined as string | undefined,
        diagnosis_code: c.code,
      })),
    [encounterDiagnoses],
  );

  const { mutate: checkCoverageEligibility, isPending: checkIsPending } =
    useMutation({
    mutationFn: apis.coverageEligibilityRequest.check,
    onSuccess: () => {
      toast.success("Coverage check submitted successfully");
      navigate(
        `/facility/${facilityId}/patient/${patientId}/encounter/${encounterId}/claims`,
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

  const isFormPrefillLoading =
    (!!linkedCoverageEligibilityId && isLinkedCeLoading) ||
    (isAuthRequirements &&
      !!patientId &&
      !!encounterId &&
      isDiagnosesLoading &&
      !hasLinkedCePrefill);

  const isSubmitting =
    createCoverageEligibilityRequestIsPending || checkIsPending;

  async function onSubmit(
    values: z.infer<typeof createCoverageEligibilityRequestFormSchema>,
  ) {
    if (isUnchangedPrefill) {
      toast.error("No changes noted. Please update the form before submitting.");
      return;
    }

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
                fileUploadRequest,
              );

              updatedValues.supporting_info[i].value_attachment =
                uploadResponse.id;

              delete updatedValues.supporting_info[i].value_file;
            } catch (error) {
              console.error("Error uploading file:", error);
              throw new Error(
                `Failed to upload file: ${info.value_file?.name}`,
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
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              navigate(
                `/facility/${facilityId}/patient/${patientId}/encounter/${encounterId}/claims`,
              );
            }}
          >
            Back to Encounter
          </Button>
        </div>
        <Separator />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {isFormPrefillLoading ? (
              <FormPrefillSkeleton />
            ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-8"
              >
                <CoverageEligibilityRequestInsuranceSection
                  form={form}
                  readOnly={
                    lockedPurpose !== null && lockedPurpose !== "validation"
                  }
                />
                <Separator />
                <CoverageEligibilityRequestItemSection
                  form={form}
                  defaultItemDiagnoses={
                    isAuthRequirements ? defaultItemDiagnoses : []
                  }
                  requireEnhancementAllowed={requireEnhancementAllowed}
                  prefilledItemSequences={prefilledItemSequences}
                />
                <Separator />
                <CoverageEligibilityRequestOtherSection
                  form={form}
                  lockedPurpose={lockedPurpose}
                />
                <Separator />

                {isUnchangedPrefill && (
                  <Alert
                    variant="destructive"
                    className="flex items-center gap-2"
                  >
                    <AlertCircleIcon className="h-4 w-4" />
                    <AlertDescription>
                      No changes noted. Please update the form before submitting.
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  type="submit"
                  loading={isSubmitting}
                  disabled={isUnchangedPrefill || isFormPrefillLoading}
                >
                  Check Coverage Eligibility
                </Button>
              </form>
            </Form>
            )}
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
