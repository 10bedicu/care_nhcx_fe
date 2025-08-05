import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { ClaimAccidentSection } from "./claim-accident-section";
import { ClaimInsuranceSection } from "./claim-insurance-section";
import { ClaimItemSection } from "./claim-item-section";
import { ClaimOtherSection } from "./claim-other-section";
import { ClaimRelatedSection } from "./claim-related-section";
import { FC } from "react";
import { Form } from "@/components/ui/form";
import { Separator } from "../ui/separator";
import { apis } from "@/apis";
import { createClaimFormSchema } from "./schema";
import { toast } from "sonner";
import { uploadFile } from "@/lib/upload-file";
import { useForm } from "react-hook-form";
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
    },
  });

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
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
  );
};

export default CreateClaimPage;
