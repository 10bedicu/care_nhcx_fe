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

import Autocomplete from "../ui/autocomplete";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import ValuesetSelect from "../common/valueset-select";
import { apis } from "@/apis";
import { createClaimFormSchema } from "./schema";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

interface ClaimRelatedSectionProps {
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
}

export function ClaimRelatedSection({ form }: ClaimRelatedSectionProps) {
  const { fields, append, remove } = useFieldArray({
    name: "related",
    control: form.control,
  });

  const { data: claims } = useQuery({
    queryKey: ["claims", form.getValues("encounter")],
    queryFn: () =>
      apis.claim.list({
        encounter: form.getValues("encounter"),
      }),
    enabled: !!form.getValues("encounter"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <LinkIcon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Link related claims</h3>
          <p className="text-sm text-muted-foreground">
            Used to establish the relationship between the claims.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => (
          <Card>
            <CardHeader>
              <FormField
                key={`${field.id}-claim`}
                control={form.control}
                name={`related.${index}.claim`}
                render={({ field }) => (
                  <div className="flex justify-between items-center gap-2">
                    <FormItem className="space-y-1.5 w-full">
                      <FormLabel>
                        Category
                        <span className="text-red-500 text-sm ml-0.5">*</span>
                      </FormLabel>
                      <FormControl>
                        <Autocomplete
                          options={
                            claims?.results.map((claim) => ({
                              label: `#${claim.id.slice(0, 6)} ${
                                claim.use
                              } at ${new Date(
                                claim.created_date
                              ).toLocaleString()}`,
                              value: claim.id,
                            })) ?? []
                          }
                          value={field.value}
                          onChange={(value) => {
                            form.setValue(`related.${index}.claim`, value);
                          }}
                          placeholder="Select a claim"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        remove(index);
                      }}
                      className="mt-6"
                    >
                      <CircleMinusIcon className="h-6 w-6 text-danger-500" />
                    </Button>
                  </div>
                )}
              />
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <FormField
                key={`${field.id}-relationship`}
                control={form.control}
                name={`related.${index}.relationship`}
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Relationship</FormLabel>
                    <FormControl>
                      <ValuesetSelect
                        system="system-claim-related-relationship"
                        value={field.value}
                        onSelect={(value) => {
                          form.setValue(`related.${index}.relationship`, value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                key={`${field.id}-reference`}
                control={form.control}
                name={`related.${index}.reference`}
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Reference</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        ))}

        <FormField
          control={form.control}
          name="related"
          render={() => (
            <FormItem>
              <FormLabel />
              <FormControl>
                <Autocomplete
                  options={
                    claims?.results.map((claim) => ({
                      label: `#${claim.id.slice(0, 6)} ${
                        claim.use
                      } at ${new Date(claim.created_date).toLocaleString()}`,
                      value: claim.id,
                    })) ?? []
                  }
                  value={undefined}
                  onChange={(value) => {
                    append({
                      claim: value,
                      relationship: undefined,
                      reference: "",
                    });
                  }}
                  placeholder="Select a claim"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
