import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CircleMinusIcon, LinkIcon } from "lucide-react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { UseFormReturn, useFieldArray } from "react-hook-form";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { createClaimFormSchema } from "./schema";
import { useQuery } from "@tanstack/react-query";
import { apis } from "@/apis";
import { z } from "zod";

interface ClaimRelatedSectionProps {
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
  /** The claim ID that was injected from the `related` query param. This entry
   * is locked and cannot be removed. */
  lockedClaimId?: string;
}

export function ClaimRelatedSection({
  form,
  lockedClaimId,
}: ClaimRelatedSectionProps) {
  const { fields, remove } = useFieldArray({
    name: "related",
    control: form.control,
  });

  if (fields.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <LinkIcon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Related claim</h3>
          <p className="text-sm text-muted-foreground">
            This claim is linked to a prior claim. The details are set
            automatically.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => {
          const claimId = form.getValues(`related.${index}.claim`);
          const isLocked = claimId === lockedClaimId;
          return (
            <RelatedClaimCard
              key={field.id}
              form={form}
              index={index}
              claimId={claimId}
              isLocked={isLocked}
              onRemove={() => remove(index)}
            />
          );
        })}
      </div>
    </div>
  );
}

interface RelatedClaimCardProps {
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
  index: number;
  claimId: string;
  isLocked: boolean;
  onRemove: () => void;
}

function RelatedClaimCard({
  form,
  index,
  claimId,
  isLocked,
  onRemove,
}: RelatedClaimCardProps) {
  const { data: claim } = useQuery({
    queryKey: ["claim", claimId],
    queryFn: () => apis.claim.get(claimId),
    enabled: !!claimId,
    staleTime: 5 * 60 * 1000,
  });

  const claimLabel = claim
    ? `#${claim.id.slice(0, 6)} · ${claim.use} · ${new Date(claim.created_date).toLocaleDateString()}`
    : `#${claimId.slice(0, 6)}…`;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center gap-2">
          <FormField
            control={form.control}
            name={`related.${index}.claim`}
            render={() => (
              <FormItem className="space-y-1.5 w-full">
                <FormLabel>Claim</FormLabel>
                <FormControl>
                  <Input value={claimLabel} disabled className="bg-muted cursor-not-allowed" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {!isLocked && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="mt-6"
            >
              <CircleMinusIcon className="h-6 w-6 text-danger-500" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name={`related.${index}.relationship`}
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel>Relationship</FormLabel>
              <FormControl>
                <Input
                  value={field.value?.display ?? field.value?.code ?? ""}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`related.${index}.reference`}
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel>Reference</FormLabel>
              <FormControl>
                <Input
                  value={field.value ?? ""}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
