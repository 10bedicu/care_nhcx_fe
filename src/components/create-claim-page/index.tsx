import { Button } from "@/components/ui/button";
import { ClaimAccidentSection } from "./claim-accident-section";
import { ClaimInsuranceSection } from "./claim-insurance-section";
import { ClaimItemSection } from "./claim-item-section";
import { ClaimOtherSection } from "./claim-other-section";
import { ClaimRelatedSection } from "./claim-related-section";
import { FC } from "react";
import { Form } from "@/components/ui/form";
import { Separator } from "../ui/separator";
import { createClaimFormSchema } from "./schema";
import { useForm } from "react-hook-form";
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
  const form = useForm<z.infer<typeof createClaimFormSchema>>({
    resolver: zodResolver(createClaimFormSchema),
    defaultValues: {
      facility: facilityId,
      patient: patientId,
      encounter: encounterId,
      status: "draft",
    },
  });

  function onSubmit(values: z.infer<typeof createClaimFormSchema>) {
    console.log(values);
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Create Claim</h3>
        <p className="text-sm text-muted-foreground">
          Create a new claim for the patient.
        </p>
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

          <Button type="submit">Submit</Button>
        </form>
      </Form>
    </div>
  );
};

export default CreateClaimPage;
