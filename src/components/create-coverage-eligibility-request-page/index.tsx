import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { CoverageEligibilityRequestInsuranceSection } from "./coverage-eligibility-request-insurance-section";
import { CoverageEligibilityRequestItemSection } from "./coverage-eligibility-request-item-section";
import { CoverageEligibilityRequestOtherSection } from "./coverage-eligibility-request-other-section";
import { FC } from "react";
import { Form } from "@/components/ui/form";
import { Separator } from "../ui/separator";
import { apis } from "@/apis";
import { createCoverageEligibilityRequestFormSchema } from "./schema";
import { toast } from "@/lib/utils";
import { uploadFile } from "@/lib/upload-file";
import { useForm } from "react-hook-form";
import { useNavigate } from "raviger";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

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
    },
  });

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
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Check Coverage Eligibility</h3>
        <p className="text-sm text-muted-foreground">
          Check the coverage eligibility for the patient.
        </p>
      </div>
      <Separator />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
  );
};

export default CreateCoverageEligibilityRequestPage;
