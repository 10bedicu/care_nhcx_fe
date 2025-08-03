import { CLAIM_PRIORITY_CHOICES, CLAIM_USE_CHOICES } from "@/types/claim";
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

import { DateTimePicker } from "../ui/date-time-picker";
import { Input } from "@/components/ui/input";
import { SettingsIcon } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import ValuesetSelect from "../common/valueset-select";
import { createClaimFormSchema } from "./schema";
import { z } from "zod";

interface ClaimOtherSectionProps {
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
}

export function ClaimOtherSection({ form }: ClaimOtherSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <SettingsIcon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Other details</h3>
          <p className="text-sm text-muted-foreground">
            Configure additional claim settings and billing information.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Claim Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="use"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>
                    Use
                    <span className="text-red-500 text-sm ml-0.5">*</span>
                  </FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        form.setValue(
                          "use",
                          value as
                            | "claim"
                            | "preauthorization"
                            | "predetermination"
                        );
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select use type" />
                      </SelectTrigger>
                      <SelectContent>
                        {CLAIM_USE_CHOICES.map((choice) => (
                          <SelectItem key={choice} value={choice}>
                            {choice.charAt(0).toUpperCase() + choice.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                        {CLAIM_PRIORITY_CHOICES.map((choice) => (
                          <SelectItem key={choice} value={choice}>
                            {choice.charAt(0).toUpperCase() + choice.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>
                    Type
                    <span className="text-red-500 text-sm ml-0.5">*</span>
                  </FormLabel>
                  <FormControl>
                    <ValuesetSelect
                      system="system-claim-type"
                      value={field.value}
                      onSelect={(value) => {
                        form.setValue("type", value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="billable_period.start"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Billable Period Start</FormLabel>
                  <FormControl>
                    <DateTimePicker
                      value={field.value ? new Date(field.value) : undefined}
                      onChange={(value) => {
                        form.setValue(
                          "billable_period.start",
                          value ? value.toISOString() : undefined
                        );
                      }}
                      placeholder="Select start date and time"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="billable_period.end"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Billable Period End</FormLabel>
                  <FormControl>
                    <DateTimePicker
                      value={field.value ? new Date(field.value) : undefined}
                      onChange={(value) => {
                        form.setValue(
                          "billable_period.end",
                          value ? value.toISOString() : undefined
                        );
                      }}
                      placeholder="Select end date and time"
                    />
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
