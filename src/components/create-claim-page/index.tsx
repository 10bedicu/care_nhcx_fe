import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { ClaimAccidentSection } from "./claim-accident-section";
import { ClaimInsuranceSection } from "./claim-insurance-section";
import { ClaimItemSection } from "./claim-item-section";
import { ClaimOtherSection } from "./claim-other-section";
import { ClaimRelatedSection } from "./claim-related-section";
import { FC, useEffect } from "react";
import { Form } from "@/components/ui/form";
import { GlobalStoreProvider } from "@/hooks/use-global-store";
import { InsurancePlanDetailsPanel } from "../insurance-plan-details-panel";
import { Separator } from "../ui/separator";
import { apis } from "@/apis";
import { createClaimFormSchema } from "./schema";
import { toast } from "sonner";
import { uploadFile } from "@/lib/upload-file";
import { useForm, useWatch } from "react-hook-form";
import { useNavigate } from "raviger";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export type CreateClaimPageProps = {
  facilityId: string;
  patientId: string;
  encounterId: string;
};

const CreateClaimPage: FC<CreateClaimPageProps> = ({
  facilityId,
  patientId,
  encounterId,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  const previousClaimId = useWatch({
    control: form.control,
    name: "related.0.claim",
  });

  const { data: previousClaim } = useQuery({
    queryKey: ["claim", previousClaimId],
    queryFn: () => apis.claim.get(previousClaimId),
    enabled: !!previousClaimId,
  });

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
          (previousClaim.care_team || []).map((m: any) => ({
            sequence: m.sequence,
            provider: m.provider?.id,
            responsible: m.responsible ?? false,
            role: m.role,
          })) || [],

        // supporting info (only ids for attachments; no files here)
        supporting_info:
          (previousClaim.supporting_info || []).map((s: any) => ({
            sequence: s.sequence,
            category: s.category,
            code: s.code,
            timing: s.timing,
            value_string: s.value_string,
            value_attachment: s.value_attachment,
          })) || [],

        // procedures
        procedure:
          (previousClaim.procedure || []).map((p: any) => ({
            sequence: p.sequence,
            type: p.type || [],
            date: p.date,
            procedure_reference: undefined,
            procedure_code: p.procedure_code,
          })) || [],

        // diagnoses
        diagnosis:
          (previousClaim.diagnosis || []).map((d: any) => ({
            sequence: d.sequence,
            type: d.type || [],
            diagnosis_reference: undefined,
            diagnosis_code: d.diagnosis_code,
            on_admission: d.on_admission,
          })) || [],

        // insurances
        insurance:
          (previousClaim.insurance || []).map((ins: any) => ({
            sequence: ins.sequence,
            focal: !!ins.focal,
            policy: ins.policy,
          })) || [],

        // items
        item:
          (previousClaim.item || []).map((it: any) => ({
            sequence: it.sequence,
            care_team_sequence: it.care_team_sequence || [],
            diagnosis_sequence: it.diagnosis_sequence || [],
            procedure_sequence: it.procedure_sequence || [],
            information_sequence: it.information_sequence || [],
            category: it.category,
            product_or_service: it.product_or_service,
            charge_item: undefined,
            program_code: it.program_code || [],
            serviced_period: it.serviced_period,
            quantity: it.quantity,
            unit_price: it.unit_price,
            factor: it.factor,
          })) || [],

        // accident
        accident: previousClaim.accident,

        // payment is not part of creation typically; omit/undefined
        payment: undefined,
      };

      form.reset(mappedValues, { keepDefaultValues: false });
    }
  }, [previousClaim]);

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
