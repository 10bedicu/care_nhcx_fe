import { Condition, ConditionCategory } from "@/types/condition";
import { FC, useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
import { toast } from "@/lib/utils";
import { uploadFile } from "@/lib/upload-file";
import { useNavigate } from "raviger";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

function chargeItemHasCoding(ci: ChargeItem): boolean {
  return Boolean(ci.code?.system?.trim() && ci.code?.code?.trim());
}

function parsePositiveNumber(
  value: string | undefined,
  fallback: number
): number {
  const n = parseFloat(value ?? "");
  return Number.isFinite(n) && n > 0 ? n : fallback;
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
      purpose: ["benefits"],
    },
  });

  const insuranceSelection = useWatch({
    control: form.control,
    name: "insurance",
  });

  const didPrefillEncounterRef = useRef(false);

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
      enabled: !!patientId && !!encounterId,
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
    enabled: !!encounterId,
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
      enabled: !!facilityId && !!encounterId,
      staleTime: 60 * 1000,
    });

  useEffect(() => {
    if (didPrefillEncounterRef.current) return;
    if (
      !encounterDiagnosesFetched ||
      !encounterFilesFetched ||
      !encounterChargeItemsFetched
    ) {
      return;
    }

    const existingItems = form.getValues("item") || [];
    const existingSupportingInfo = form.getValues("supporting_info") || [];

    if (existingItems.length > 0 || existingSupportingInfo.length > 0) {
      didPrefillEncounterRef.current = true;
      return;
    }

    didPrefillEncounterRef.current = true;

    const supportingInfo =
      (encounterFiles || []).map((file, idx) => ({
        sequence: idx + 1,
        value_string: undefined,
        value_attachment: file.id as string,
      })) || [];

    const informationSequences = supportingInfo.map((info) => info.sequence);
    form.setValue("supporting_info", supportingInfo);

    const itemDiagnoses = (encounterDiagnoses || []).map((c) => ({
      diagnosis_reference: undefined,
      diagnosis_code: c.code,
    }));

    const codedChargeItems = (encounterChargeItems || []).filter(
      chargeItemHasCoding
    );

    if (codedChargeItems.length > 0) {
      form.setValue(
        "item",
        codedChargeItems.map((ci) => ({
          supporting_info_sequence: [...informationSequences],
          category: {
            display: "Primary healthcare service",
            system: "http://snomed.info/sct",
            code: "1586771000168103",
          },
          product_or_service: {
            system: ci.code.system,
            code: ci.code.code,
            display: ci.code.display,
          },
          quantity: {
            value: parsePositiveNumber(ci.quantity, 1),
          },
          unit_price: parsePositiveNumber(ci.total_price, 1),
          diagnosis: itemDiagnoses.map((d) => ({ ...d })),
        }))
      );
    }
  }, [
    encounterChargeItems,
    encounterChargeItemsFetched,
    encounterDiagnoses,
    encounterDiagnosesFetched,
    encounterFiles,
    encounterFilesFetched,
    form,
  ]);

  const { mutate: checkCoverageEligibility } = useMutation({
    mutationFn: apis.coverageEligibilityRequest.check,
    onSuccess: () => {
      toast.success("Coverage check submitted successfully");
      navigate(
        `/facility/${facilityId}/patient/${patientId}/encounter/${encounterId}/coverages`
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
      console.log(values);
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
            <h3 className="text-lg font-medium">Check Coverage Eligibility</h3>
            <p className="text-sm text-muted-foreground">
              Check the coverage eligibility for the patient.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              navigate(
                `/facility/${facilityId}/patient/${patientId}/encounter/${encounterId}/coverages`
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
                <CoverageEligibilityRequestInsuranceSection form={form} />
                <Separator />
                <CoverageEligibilityRequestItemSection form={form} />
                <Separator />
                <CoverageEligibilityRequestOtherSection form={form} />
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
