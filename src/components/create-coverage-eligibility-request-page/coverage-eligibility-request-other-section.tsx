import {
  COVERAGE_ELIGIBILITY_REQUEST_PRIORITY_CHOICES,
  COVERAGE_ELIGIBILITY_REQUEST_PURPOSE_CHOICES,
} from "@/types/coverage_eligibility";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CoverageEligibilityRequestPurposeChoice } from "@/types/coverage_eligibility";
import { Input } from "@/components/ui/input";
import { LockIcon, SettingsIcon } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { X } from "lucide-react";
import { createCoverageEligibilityRequestFormSchema } from "./schema";
import { z } from "zod";

interface CoverageEligibilityRequestOtherSectionProps {
  form: UseFormReturn<
    z.infer<typeof createCoverageEligibilityRequestFormSchema>
  >;
  /**
   * When set, the purpose field is locked to this value and cannot be changed.
   * Used by the guided flow that drives the form via query params.
   */
  lockedPurpose?: CoverageEligibilityRequestPurposeChoice | null;
}

export function CoverageEligibilityRequestOtherSection({
  form,
  lockedPurpose,
}: CoverageEligibilityRequestOtherSectionProps) {
  const selectedPurposes = form.watch("purpose") || [];

  const handlePurposeChange = (purpose: string) => {
    const currentPurposes = form.getValues("purpose") || [];
    if (
      currentPurposes.includes(
        purpose as CoverageEligibilityRequestPurposeChoice
      )
    ) {
      form.setValue(
        "purpose",
        currentPurposes.filter((p) => p !== purpose)
      );
    } else {
      form.setValue("purpose", [
        ...currentPurposes,
        purpose as CoverageEligibilityRequestPurposeChoice,
      ]);
    }
  };

  const removePurpose = (purposeToRemove: string) => {
    const currentPurposes = form.getValues("purpose") || [];
    form.setValue(
      "purpose",
      currentPurposes.filter((p) => p !== purposeToRemove)
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <SettingsIcon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Other details</h3>
          <p className="text-sm text-muted-foreground">
            Configure additional coverage eligibility request settings and
            information.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>
                    Status
                    <span className="text-red-500 text-sm ml-0.5">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      value={field.value}
                      disabled
                      className="bg-muted cursor-not-allowed"
                      placeholder="Status will be set automatically"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>
                    Priority
                    <span className="text-red-500 text-sm ml-0.5">*</span>
                  </FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        form.setValue(
                          "priority",
                          value as "stat" | "normal" | "deferred"
                        );
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        {COVERAGE_ELIGIBILITY_REQUEST_PRIORITY_CHOICES.map(
                          (choice) => (
                            <SelectItem key={choice} value={choice}>
                              {choice.charAt(0).toUpperCase() + choice.slice(1)}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="purpose"
              render={() => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="flex items-center gap-1.5">
                    Purpose
                    <span className="text-red-500 text-sm">*</span>
                    {lockedPurpose && (
                      <span className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground ml-1">
                        <LockIcon className="h-3 w-3" />
                        Locked by guided flow
                      </span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <div className="space-y-3">
                      {!lockedPurpose && (
                        <Select value="" onValueChange={handlePurposeChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select purpose" />
                          </SelectTrigger>
                          <SelectContent>
                            {COVERAGE_ELIGIBILITY_REQUEST_PURPOSE_CHOICES.map(
                              (choice) => (
                                <SelectItem
                                  key={choice}
                                  value={choice}
                                  disabled={selectedPurposes.includes(choice)}
                                >
                                  {choice.charAt(0).toUpperCase() +
                                    choice.slice(1)}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      )}

                      {selectedPurposes.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedPurposes.map((purpose) => (
                            <Badge
                              key={purpose}
                              variant="secondary"
                              className="flex items-center gap-1"
                            >
                              {purpose
                                .split("-")
                                .map(
                                  (part) =>
                                    part.charAt(0).toUpperCase() + part.slice(1)
                                )
                                .join(" ")}
                              {!lockedPurpose && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-auto p-0 ml-1 hover:bg-transparent"
                                  onClick={() => removePurpose(purpose)}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              )}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
