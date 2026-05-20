import { Condition, ConditionCategory } from "@/types/condition";
import { FC, useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useQueryParams } from "raviger";

import { Button } from "@/components/ui/button";
import { ChargeItem } from "@/types/charge_item";
import { ClaimAccidentSection } from "./claim-accident-section";
import { ClaimDiagnosisOnAdmissionChoice } from "@/types/claim";
import { ClaimInsuranceSection } from "./claim-insurance-section";
import { ClaimItemSection } from "./claim-item-section";
import { ClaimOtherSection } from "./claim-other-section";
import { ClaimRelatedSection } from "./claim-related-section";
import { EncounterClass } from "@/types/encounter";
import { FileUploadModel } from "@/types/file_upload";
import { Form } from "@/components/ui/form";
import { GlobalStoreProvider } from "@/hooks/use-global-store";
import { InsurancePlanDetailsPanel } from "../insurance-plan-details-panel";
import { PmjayBiometricVerificationGate } from "@/components/common/pmjay-biometric-verification-gate";
import { Separator } from "../ui/separator";
import { apis } from "@/apis";
import { createClaimFormSchema } from "./schema";
import { toast } from "sonner";
import { uploadFile } from "@/lib/upload-file";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export type CreateClaimPageProps = {
  facilityId: string;
  patientId: string;
  encounterId: string;
};

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

const CreateClaimPage: FC<CreateClaimPageProps> = ({
  facilityId,
  patientId,
  encounterId,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [queryParams] = useQueryParams();

  const form = useForm<z.infer<typeof createClaimFormSchema>>({
    resolver: zodResolver(createClaimFormSchema),
    defaultValues: {
      facility: facilityId,
      patient: patientId,
      encounter: encounterId,
      status: "draft",
      priority: "normal",
    },
  });

  useEffect(() => {
    const related = queryParams?.related as string | undefined;

    if (related) {
      const existingRelated = form.getValues("related") || [];
      if (!existingRelated.find((r) => r.claim === related)) {
        form.setValue("related", [
          { claim: related, relationship: undefined, reference: "" },
          ...existingRelated,
        ]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const previousClaimId = useWatch({
    control: form.control,
    name: "related.0.claim",
  });

  const insuranceSelection = useWatch({
    control: form.control,
    name: "insurance",
  });

  const { data: previousClaim } = useQuery({
    queryKey: ["claim", previousClaimId],
    queryFn: () => apis.claim.get(previousClaimId),
    enabled: !!previousClaimId,
  });

  const didPrefillEncounterRef = useRef(false);

  const { data: encounterDiagnoses, isFetched: encounterDiagnosesFetched } =
    useQuery({
      queryKey: ["encounter-diagnoses", patientId, encounterId],
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
    queryKey: ["encounter-files", encounterId],
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
      queryKey: ["encounter-charge-items", facilityId, encounterId],
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

  const { data: encounter, isFetched: encounterFetched } = useQuery({
    queryKey: ["encounter", facilityId, encounterId],
    queryFn: () => apis.encounter.get(facilityId, encounterId),
    enabled: !!facilityId && !!encounterId,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (!encounter) {
      return;
    }

    switch (encounter.encounter_class) {
      case EncounterClass.inpatient:
        form.setValue("type", {
          code: "1586771000168103",
          system: "http://snomed.info/sct",
          display: "Inpatient care management",
        });
        break;
      case EncounterClass.outpatient:
        form.setValue("type", {
          code: "737850002",
          system: "http://snomed.info/sct",
          display: "Outpatient care management",
        });
        break;
      case EncounterClass.observation:
        form.setValue("type", {
          code: "737492002",
          system: "http://snomed.info/sct",
          display: "Outpatient care management",
        });
        break;
      case EncounterClass.emergency:
        form.setValue("type", {
          code: "737481003",
          system: "http://snomed.info/sct",
          display: "Inpatient care management",
        });
        break;
      case EncounterClass.virtual:
        form.setValue("type", {
          code: "713603004",
          system: "http://snomed.info/sct",
          display: "Advance care planning",
        });
        break;
      case EncounterClass.home:
        form.setValue("type", {
          code: "60689008",
          system: "http://snomed.info/sct",
          display: "Home care of patient",
        });
        break;
      default:
        form.setValue("type", {
          code: "737850002",
          system: "http://snomed.info/sct",
          display: "Outpatient care management",
        });
        break;
    }
  }, [encounter, form]);

  useEffect(() => {
    if (didPrefillEncounterRef.current) return;
    if (previousClaimId) return;
    if (
      !encounterDiagnosesFetched ||
      !encounterFilesFetched ||
      !encounterChargeItemsFetched ||
      !encounterFetched
    ) {
      return;
    }

    const existingDiagnosis = form.getValues("diagnosis") || [];
    const existingSupportingInfo = form.getValues("supporting_info") || [];
    const existingCareTeam = form.getValues("care_team") || [];
    const existingItems = form.getValues("item") || [];
    if (
      existingDiagnosis.length > 0 ||
      existingSupportingInfo.length > 0 ||
      existingCareTeam.length > 0 ||
      existingItems.length > 0
    ) {
      didPrefillEncounterRef.current = true;
      return;
    }

    didPrefillEncounterRef.current = true;

    const diagnosis =
      (encounterDiagnoses || []).map((c, idx) => ({
        sequence: idx + 1,
        type: [
          {
            code: "89100005", // TODO: Map this based on the verification status
            system: "http://snomed.info/sct",
            display:
              "Final diagnosis (discharge) (contextual qualifier) (qualifier value)",
          },
        ],
        diagnosis_reference: undefined,
        diagnosis_code: c.code,
        on_admission: "unknown" as ClaimDiagnosisOnAdmissionChoice,
      })) || [];

    const diagnosisSequences = diagnosis.map((d) => d.sequence);
    form.setValue("diagnosis", diagnosis);

    const supportingInfo =
      (encounterFiles || []).map((file, idx) => ({
        sequence: idx + 1,
        category: {
          code: "DIA",
          system:
            "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
          display: "Diagnostic report",
        },
        code: {
          code: "AT",
          system:
            "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
          display: "Attachment",
        },
        timing: undefined,
        value_string: undefined,
        value_attachment: file.id,
      })) || [];

    const informationSequences = supportingInfo.map((info) => info.sequence);
    form.setValue("supporting_info", supportingInfo);

    const care_team =
      encounter?.care_team
        ?.filter((entry) => entry.member?.id)
        .map((entry, idx) => ({
          sequence: idx + 1,
          provider: entry.member.id,
          responsible: false,
          role: entry.role,
        })) || [];
    const careTeamSequences = care_team.map((m) => m.sequence);
    form.setValue("care_team", care_team);

    const codedChargeItems = (encounterChargeItems || []).filter(
      chargeItemHasCoding
    );

    const emptyItemTemplate = {
      care_team_sequence: [...careTeamSequences],
      procedure_sequence: [] as number[],
      category: {
        display: "Primary healthcare service",
        system: "http://snomed.info/sct",
        code: "1586771000168103",
      },
      program_code: [] as z.infer<
        typeof createClaimFormSchema
      >["item"][number]["program_code"],
      serviced_period: undefined,
      factor: undefined,
    };

    if (codedChargeItems.length > 0) {
      form.setValue(
        "item",
        codedChargeItems.map((ci, idx) => ({
          ...emptyItemTemplate,
          sequence: idx + 1,
          product_or_service: {
            system: ci.code.system,
            code: ci.code.code,
            display: ci.code.display,
          },
          modifier: [],
          diagnosis_sequence: [...diagnosisSequences],
          information_sequence: [...informationSequences],
          quantity: {
            value: parsePositiveNumber(ci.quantity, 1),
          },
          unit_price: parsePositiveNumber(ci.total_price, 1),
        }))
      );
    }
  }, [
    encounter,
    encounterChargeItems,
    encounterChargeItemsFetched,
    encounterDiagnoses,
    encounterDiagnosesFetched,
    encounterFetched,
    encounterFiles,
    encounterFilesFetched,
    form,
    previousClaimId,
  ]);

  useEffect(() => {
    if (previousClaim) {
      const current = form.getValues();

      const mappedValues: z.infer<typeof createClaimFormSchema> = {
        // keep current associations
        facility: current.facility,
        patient: current.patient,
        encounter: current.encounter,

        // copy simple fields
        use: previousClaim.use,
        status: "draft",
        priority: previousClaim.priority,
        type: previousClaim.type,

        // optional period
        billable_period: previousClaim.billable_period,

        // carry over linked claim (already selected), keep as-is
        related: current.related || [],

        // map care team to provider ids
        care_team:
          (previousClaim.care_team || []).map((m) => ({
            sequence: m.sequence,
            provider: m.provider?.id,
            responsible: m.responsible ?? false,
            role: m.role,
          })) || [],

        // supporting info (only ids for attachments; no files here)
        supporting_info:
          (previousClaim.supporting_info || []).map((s) => ({
            sequence: s.sequence,
            category: s.category,
            code: s.code,
            timing: s.timing,
            value_string: s.value_string,
            value_attachment: s.value_attachment as unknown as string,
          })) || [],

        // procedures
        procedure:
          (previousClaim.procedure || []).map((p) => ({
            sequence: p.sequence,
            type: p.type || [],
            date: p.date,
            procedure_reference: undefined,
            procedure_code: p.procedure_code,
          })) || [],

        // diagnoses
        diagnosis:
          (previousClaim.diagnosis || []).map((d) => ({
            sequence: d.sequence,
            type: d.type || [],
            diagnosis_reference: undefined,
            diagnosis_code: d.diagnosis_code,
            on_admission: d.on_admission,
          })) || [],

        // insurances
        insurance:
          (previousClaim.insurance || []).map((ins) => ({
            sequence: ins.sequence,
            focal: !!ins.focal,
            policy: ins.policy,
          })) || [],

        // items
        item:
          (previousClaim.item || []).map((it) => ({
            sequence: it.sequence,
            care_team_sequence: it.care_team_sequence || [],
            diagnosis_sequence: it.diagnosis_sequence || [],
            procedure_sequence: it.procedure_sequence || [],
            information_sequence: it.information_sequence || [],
            category: it.category,
            product_or_service: it.product_or_service,
            modifier: it.modifier ?? [],
            charge_item: undefined,
            program_code: it.program_code || [],
            serviced_period: it.serviced_period,
            quantity: it.quantity,
            unit_price: it.unit_price,
            factor: it.factor,
          })) || [],

        // accident
        accident: previousClaim.accident ?? undefined,

        // payment is not part of creation typically; omit/undefined
        payment: undefined,

        // Prefill questionnaire responses — sequence will be recomputed on submit
        questionnaire_responses: (
          previousClaim.questionnaire_responses ?? []
        ).map((qr) => ({
          sequence: 0, // recomputed on submit
          questionnaire: qr.questionnaire,
          category: qr.category,
          code: qr.code,
          item: qr.item,
        })),
      };

      form.reset(mappedValues, { keepDefaultValues: false });
    }
  }, [form, previousClaim]);

  const { mutate: submitClaim } = useMutation({
    mutationFn: apis.claim.submit,
    onSuccess: () => {
      toast.success("Claim submitted successfully");
      navigate(
        `/facility/${facilityId}/patient/${patientId}/encounter/${encounterId}/claims`
      );
    },
  });

  const { mutate: createClaim, isPending: createClaimIsPending } = useMutation({
    mutationFn: apis.claim.create,
    onSuccess: (data) => {
      form.reset();
      toast.success("Claim created successfully");
      submitClaim(data.id);
      queryClient.invalidateQueries({ queryKey: ["claims", encounterId] });
    },
  });

  async function onSubmit(values: z.infer<typeof createClaimFormSchema>) {
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

      // Compute globally unique sequences for questionnaire_responses.
      // They must not collide with supporting_info sequences.
      if (updatedValues.questionnaire_responses?.length) {
        const maxSupportingInfoSeq = Math.max(
          0,
          ...(updatedValues.supporting_info ?? []).map((s) => s.sequence)
        );
        updatedValues.questionnaire_responses =
          updatedValues.questionnaire_responses.map((qr, idx) => ({
            ...qr,
            sequence: maxSupportingInfoSeq + idx + 1,
          }));
      }

      createClaim(updatedValues);
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
            <h3 className="text-lg font-medium">Create Claim</h3>
            <p className="text-sm text-muted-foreground">
              Create a new claim for the patient.
            </p>
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
                <ClaimRelatedSection form={form} />
                <Separator />
                <ClaimInsuranceSection form={form} />
                <Separator />
                <ClaimItemSection form={form} />
                <Separator />
                <ClaimAccidentSection form={form} />
                <Separator />
                <ClaimOtherSection form={form} />
                <Separator />

                <Button
                  className="w-full"
                  size="lg"
                  type="submit"
                  loading={createClaimIsPending}
                >
                  Create Claim
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

export default CreateClaimPage;
