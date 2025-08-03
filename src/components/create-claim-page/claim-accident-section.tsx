import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { AlertTriangleIcon } from "lucide-react";
import { Checkbox } from "../ui/checkbox";
import { DateTimePicker } from "../ui/date-time-picker";
import { Textarea } from "../ui/textarea";
import { UseFormReturn } from "react-hook-form";
import ValuesetSelect from "../common/valueset-select";
import { createClaimFormSchema } from "./schema";
import { z } from "zod";

interface ClaimAccidentSectionProps {
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
}

export function ClaimAccidentSection({ form }: ClaimAccidentSectionProps) {
  const accidentData = form.watch("accident");
  const isAccidentEnabled = !!accidentData;

  const handleAccidentToggle = (enabled: boolean) => {
    if (enabled) {
      form.setValue("accident", {
        date: new Date().toISOString(),
        type: undefined,
        location: "",
      });
    } else {
      form.setValue("accident", undefined);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <AlertTriangleIcon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold">Accident Information</h3>
          <p className="text-sm text-muted-foreground">
            Add accident details if this claim is related to an accident.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="accident-enabled"
            checked={isAccidentEnabled}
            onCheckedChange={handleAccidentToggle}
            className="border-black"
          />
          <label
            htmlFor="accident-enabled"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            This claim is accident-related
          </label>
        </div>
      </div>

      {isAccidentEnabled ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Accident Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="accident.date"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>
                      Date
                      <span className="text-red-500 text-sm ml-0.5">*</span>
                    </FormLabel>
                    <FormControl>
                      <DateTimePicker
                        value={field.value ? new Date(field.value) : undefined}
                        onChange={(value) => {
                          form.setValue(
                            "accident.date",
                            value
                              ? value.toISOString()
                              : new Date().toISOString()
                          );
                        }}
                        placeholder="Select date and time"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accident.type"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Type</FormLabel>
                    <FormControl>
                      <ValuesetSelect
                        system="system-accident-type"
                        value={field.value}
                        onSelect={(value) => {
                          form.setValue("accident.type", value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="accident.location"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value || ""}
                      placeholder="Enter location details"
                      className="min-h-[80px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p>
            Check the box above if this is an accident-related claim, or skip
            this section.
          </p>
        </div>
      )}
    </div>
  );
}
