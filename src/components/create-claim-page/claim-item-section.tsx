import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CircleMinusIcon,
  PaperclipIcon,
  PlusIcon,
  ShoppingBasketIcon,
  XIcon,
} from "lucide-react";
import { FileIcon, TrashIcon } from "lucide-react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { UseFormReturn, useFieldArray } from "react-hook-form";

import Autocomplete from "../ui/autocomplete";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Coding } from "@/types/base";
import { DateTimePicker } from "../ui/date-time-picker";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import ValuesetSelect from "../common/valueset-select";
import { apis } from "@/apis";
import { createClaimFormSchema } from "./schema";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";

interface ClaimItemSectionProps {
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
}

export function ClaimItemSection({ form }: ClaimItemSectionProps) {
  const { fields, append, remove } = useFieldArray({
    name: "item",
    control: form.control,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <ShoppingBasketIcon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Add claim items</h3>
          <p className="text-sm text-muted-foreground">
            Add all applicable items to the claim.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => (
          <Card>
            <CardHeader>
              <FormField
                key={field.id}
                control={form.control}
                name={`item.${index}.product_or_service`}
                render={({ field }) => (
                  <div className="flex justify-between items-center gap-2">
                    <FormItem className="space-y-1.5 w-full">
                      <FormLabel>
                        Product or Service
                        <span className="text-red-500 text-sm ml-0.5">*</span>
                      </FormLabel>
                      <FormControl>
                        <ValuesetSelect
                          system="system-claim-type"
                          value={field.value}
                          onSelect={(value) => {
                            form.setValue(
                              `item.${index}.product_or_service`,
                              value
                            );
                          }}
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
            <CardContent className="space-y-4">
              <FormField
                key={field.id}
                control={form.control}
                name={`item.${index}.category`}
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <ValuesetSelect
                        system="system-claim-type"
                        value={field.value}
                        onSelect={(value) => {
                          form.setValue(`item.${index}.category`, value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                key={field.id}
                control={form.control}
                name={`item.${index}.program_code`}
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Program Code</FormLabel>
                    <FormControl>
                      <div className="grid gap-4">
                        <ValuesetSelect
                          system="system-claim-type"
                          value={undefined}
                          onSelect={(value) => {
                            form.setValue(
                              `item.${index}.program_code`,
                              field.value
                                .map((c) => c.code)
                                .includes(value.code)
                                ? field.value
                                : [...field.value, value]
                            );
                          }}
                        />

                        <div className="flex flex-wrap gap-2">
                          {field.value.map((code) => (
                            <Badge key={code.code} className="flex gap-2">
                              {code.display}
                              <XIcon
                                className="w-4 h-4 cursor-pointer"
                                onClick={() => {
                                  form.setValue(
                                    `item.${index}.program_code`,
                                    field.value.filter(
                                      (c) => c.code !== code.code
                                    )
                                  );
                                }}
                              />
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <AddDiagnosisSection form={form} index={index} />
              <AddProcedureSection form={form} index={index} />
              <AddCareTeamSection form={form} index={index} />
              <AddSupportingInfoSection form={form} index={index} />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`item.${index}.serviced_period.start`}
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel>Service Period Start</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          value={
                            field.value ? new Date(field.value) : undefined
                          }
                          onChange={(value) => {
                            form.setValue(
                              `item.${index}.serviced_period.start`,
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
                  name={`item.${index}.serviced_period.end`}
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel>Service Period End</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          value={
                            field.value ? new Date(field.value) : undefined
                          }
                          onChange={(value) => {
                            form.setValue(
                              `item.${index}.serviced_period.end`,
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`item.${index}.quantity.value`}
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel>
                        Quantity Value
                        <span className="text-red-500 text-sm ml-0.5">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value || ""}
                          onChange={(e) => {
                            form.setValue(
                              `item.${index}.quantity.value`,
                              e.target.value ? parseFloat(e.target.value) : 0
                            );
                          }}
                          placeholder="Enter quantity"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`item.${index}.quantity.unit`}
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel>Quantity Unit</FormLabel>
                      <FormControl>
                        <ValuesetSelect
                          system="system-claim-type"
                          value={field.value}
                          onSelect={(value) => {
                            form.setValue(`item.${index}.quantity.unit`, value);
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
                  name={`item.${index}.unit_price`}
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel>
                        Unit Price
                        <span className="text-red-500 text-sm ml-0.5">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          value={field.value || ""}
                          onChange={(e) => {
                            form.setValue(
                              `item.${index}.unit_price`,
                              e.target.value ? parseFloat(e.target.value) : 0
                            );
                          }}
                          placeholder="Enter unit price"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`item.${index}.factor`}
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel>Factor</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          value={field.value || ""}
                          onChange={(e) => {
                            form.setValue(
                              `item.${index}.factor`,
                              e.target.value
                                ? parseFloat(e.target.value)
                                : undefined
                            );
                          }}
                          placeholder="Enter factor"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        ))}

        <FormField
          control={form.control}
          name="item"
          render={() => (
            <FormItem>
              <FormLabel />
              <FormControl>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    append({
                      sequence: (fields[fields.length - 1]?.sequence ?? 0) + 1,
                      care_team_sequence: [],
                      diagnosis_sequence: [],
                      procedure_sequence: [],
                      information_sequence: [],
                      program_code: [],
                      quantity: {
                        value: 0,
                      },
                      unit_price: 0,
                    })
                  }
                >
                  <PlusIcon className="w-5 h-5" />
                  Add Item
                </Button>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

function AddDiagnosisSection({
  form,
  index,
}: {
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
  index: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const diagnosisFields = form.watch("diagnosis") || [];
  const itemDiagnosisSequences =
    form.watch(`item.${index}.diagnosis_sequence`) || [];
  const { fields: diagnosisArrayFields, append: appendDiagnosis } =
    useFieldArray({
      name: "diagnosis",
      control: form.control,
    });

  const itemSpecificDiagnoses = diagnosisFields.filter((diagnosis) =>
    itemDiagnosisSequences.includes(diagnosis.sequence)
  );

  const addNewDiagnosis = () => {
    const newSequence =
      (diagnosisArrayFields[diagnosisArrayFields.length - 1]?.sequence ?? 0) +
      1;
    const newDiagnosis = {
      sequence: newSequence,
      type: [],
      diagnosis_reference: undefined,
      diagnosis_code: undefined,
      on_admission: undefined,
    };

    appendDiagnosis(newDiagnosis);

    const currentSequences =
      form.getValues(`item.${index}.diagnosis_sequence`) || [];
    form.setValue(`item.${index}.diagnosis_sequence`, [
      ...currentSequences,
      newSequence,
    ]);
  };

  return (
    <div className="space-y-4">
      <div
        className="flex items-center justify-between cursor-pointer p-3 border rounded-lg hover:bg-muted/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4" />
          ) : (
            <ChevronRightIcon className="w-4 h-4" />
          )}
          <span className="font-medium">Diagnoses</span>
          {itemSpecificDiagnoses.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {itemSpecificDiagnoses.length}
            </Badge>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4 pl-4">
          {itemSpecificDiagnoses.map((diagnosis, diagnosisIndex) => {
            const mainDiagnosisIndex = diagnosisFields.findIndex(
              (d) => d.sequence === diagnosis.sequence
            );
            return (
              <Card key={diagnosisIndex}>
                <CardHeader>
                  <div className="flex justify-between items-center gap-2">
                    <FormField
                      control={form.control}
                      name={`diagnosis.${mainDiagnosisIndex}.diagnosis_code`}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5 w-full">
                          <FormLabel>
                            Diagnosis Code
                            <span className="text-red-500 text-sm ml-0.5">
                              *
                            </span>
                          </FormLabel>
                          <FormControl>
                            <ValuesetSelect
                              system="system-condition-code"
                              value={field.value}
                              onSelect={(value) => {
                                form.setValue(
                                  `diagnosis.${mainDiagnosisIndex}.diagnosis_code`,
                                  value
                                );
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`diagnosis.${mainDiagnosisIndex}.on_admission`}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>On Admission</FormLabel>
                          <FormControl>
                            <Autocomplete
                              options={[
                                { label: "Yes", value: "y" },
                                { label: "No", value: "n" },
                                { label: "Unknown", value: "u" },
                                { label: "Not applicable", value: "w" },
                              ]}
                              value={field.value}
                              onChange={(value) => {
                                form.setValue(
                                  `diagnosis.${mainDiagnosisIndex}.on_admission`,
                                  value as "y" | "n" | "u" | "w" | undefined
                                );
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const currentDiagnoses =
                          form.getValues("diagnosis") || [];
                        const updatedDiagnoses = currentDiagnoses.filter(
                          (_, i) => i !== mainDiagnosisIndex
                        );
                        form.setValue("diagnosis", updatedDiagnoses);

                        const items = form.getValues("item") || [];
                        items.forEach((item, itemIndex) => {
                          const currentSequences =
                            item.diagnosis_sequence || [];
                          const updatedSequences = currentSequences.filter(
                            (seq) => seq !== diagnosis.sequence
                          );
                          form.setValue(
                            `item.${itemIndex}.diagnosis_sequence`,
                            updatedSequences
                          );
                        });
                      }}
                      className="mt-6"
                    >
                      <CircleMinusIcon className="h-6 w-6 text-danger-500" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name={`diagnosis.${mainDiagnosisIndex}.type`}
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel>
                          Type
                          <span className="text-red-500 text-sm ml-0.5">*</span>
                        </FormLabel>
                        <FormControl>
                          <div className="grid gap-4">
                            <ValuesetSelect
                              system="system-claim-type"
                              value={undefined}
                              onSelect={(value) => {
                                form.setValue(
                                  `diagnosis.${mainDiagnosisIndex}.type`,
                                  field.value
                                    .map((c) => c.code)
                                    .includes(value.code)
                                    ? field.value
                                    : [...field.value, value]
                                );
                              }}
                            />

                            <div className="flex flex-wrap gap-2">
                              {field.value.map((code) => (
                                <Badge key={code.code} className="flex gap-2">
                                  {code.display}
                                  <XIcon
                                    className="w-4 h-4 cursor-pointer"
                                    onClick={() => {
                                      form.setValue(
                                        `diagnosis.${mainDiagnosisIndex}.type`,
                                        field.value.filter(
                                          (c) => c.code !== code.code
                                        )
                                      );
                                    }}
                                  />
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            );
          })}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={addNewDiagnosis}
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Diagnosis
          </Button>
        </div>
      )}
    </div>
  );
}

function AddProcedureSection({
  form,
  index,
}: {
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
  index: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const procedureFields = form.watch("procedure") || [];
  const itemProcedureSequences =
    form.watch(`item.${index}.procedure_sequence`) || [];
  const { fields: procedureArrayFields, append: appendProcedure } =
    useFieldArray({
      name: "procedure",
      control: form.control,
    });

  const itemSpecificProcedures = procedureFields.filter((procedure) =>
    itemProcedureSequences.includes(procedure.sequence)
  );

  const addNewProcedure = () => {
    const newSequence =
      (procedureArrayFields[procedureArrayFields.length - 1]?.sequence ?? 0) +
      1;
    const newProcedure = {
      sequence: newSequence,
      type: [],
      date: undefined,
      procedure_reference: undefined,
      procedure_code: undefined,
    };

    appendProcedure(newProcedure);

    const currentSequences =
      form.getValues(`item.${index}.procedure_sequence`) || [];
    form.setValue(`item.${index}.procedure_sequence`, [
      ...currentSequences,
      newSequence,
    ]);
  };

  return (
    <div className="space-y-4">
      <div
        className="flex items-center justify-between cursor-pointer p-3 border rounded-lg hover:bg-muted/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4" />
          ) : (
            <ChevronRightIcon className="w-4 h-4" />
          )}
          <span className="font-medium">Procedures</span>
          {itemSpecificProcedures.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {itemSpecificProcedures.length}
            </Badge>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4 pl-4">
          {itemSpecificProcedures.map((procedure, procedureIndex) => {
            const mainProcedureIndex = procedureFields.findIndex(
              (p) => p.sequence === procedure.sequence
            );
            return (
              <Card key={procedureIndex}>
                <CardHeader>
                  <div className="flex justify-between items-center gap-2">
                    <FormField
                      control={form.control}
                      name={`procedure.${mainProcedureIndex}.procedure_code`}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5 w-full">
                          <FormLabel>
                            Procedure Code
                            <span className="text-red-500 text-sm ml-0.5">
                              *
                            </span>
                          </FormLabel>
                          <FormControl>
                            <ValuesetSelect
                              system="system-claim-type"
                              value={field.value}
                              onSelect={(value) => {
                                form.setValue(
                                  `procedure.${mainProcedureIndex}.procedure_code`,
                                  value
                                );
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`procedure.${mainProcedureIndex}.date`}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <DateTimePicker
                              value={
                                field.value ? new Date(field.value) : undefined
                              }
                              onChange={(value) => {
                                form.setValue(
                                  `procedure.${mainProcedureIndex}.date`,
                                  value ? value.toISOString() : undefined
                                );
                              }}
                              placeholder="Select date and time"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const currentProcedures =
                          form.getValues("procedure") || [];
                        const updatedProcedures = currentProcedures.filter(
                          (_, i) => i !== mainProcedureIndex
                        );
                        form.setValue("procedure", updatedProcedures);

                        const items = form.getValues("item") || [];
                        items.forEach((item, itemIndex) => {
                          const currentSequences =
                            item.procedure_sequence || [];
                          const updatedSequences = currentSequences.filter(
                            (seq) => seq !== procedure.sequence
                          );
                          form.setValue(
                            `item.${itemIndex}.procedure_sequence`,
                            updatedSequences
                          );
                        });
                      }}
                      className="mt-6"
                    >
                      <CircleMinusIcon className="h-6 w-6 text-danger-500" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name={`procedure.${mainProcedureIndex}.type`}
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel>Type</FormLabel>
                        <FormControl>
                          <div className="grid gap-4">
                            <ValuesetSelect
                              system="system-claim-type"
                              value={undefined}
                              onSelect={(value) => {
                                form.setValue(
                                  `procedure.${mainProcedureIndex}.type`,
                                  field.value
                                    .map((c) => c.code)
                                    .includes(value.code)
                                    ? field.value
                                    : [...field.value, value]
                                );
                              }}
                            />

                            <div className="flex flex-wrap gap-2">
                              {field.value.map((code) => (
                                <Badge key={code.code} className="flex gap-2">
                                  {code.display}
                                  <XIcon
                                    className="w-4 h-4 cursor-pointer"
                                    onClick={() => {
                                      form.setValue(
                                        `procedure.${mainProcedureIndex}.type`,
                                        field.value.filter(
                                          (c) => c.code !== code.code
                                        )
                                      );
                                    }}
                                  />
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            );
          })}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={addNewProcedure}
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Procedure
          </Button>
        </div>
      )}
    </div>
  );
}

function AddCareTeamSection({
  form,
  index,
}: {
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
  index: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const careTeamFields = form.watch("care_team") || [];
  const itemCareTeamSequences =
    form.watch(`item.${index}.care_team_sequence`) || [];
  const { fields: careTeamArrayFields, append: appendCareTeam } = useFieldArray(
    {
      name: "care_team",
      control: form.control,
    }
  );

  const itemSpecificCareTeam = careTeamFields.filter((member) =>
    itemCareTeamSequences.includes(member.sequence)
  );

  const facilityId = form.getValues("facility");
  const { data: usersResponse, isLoading: loading } = useQuery({
    queryKey: ["facility-users", facilityId],
    queryFn: () => apis.user.facilityUsers(facilityId),
    enabled: isExpanded && !!facilityId,
  });

  const users = usersResponse?.results || [];

  const addNewCareTeamMember = () => {
    const newSequence =
      (careTeamArrayFields[careTeamArrayFields.length - 1]?.sequence ?? 0) + 1;
    const newCareTeamMember = {
      sequence: newSequence,
      provider: "",
      responsible: false,
      role: undefined,
    };

    appendCareTeam(newCareTeamMember);

    const currentSequences =
      form.getValues(`item.${index}.care_team_sequence`) || [];
    form.setValue(`item.${index}.care_team_sequence`, [
      ...currentSequences,
      newSequence,
    ]);
  };

  return (
    <div className="space-y-4">
      <div
        className="flex items-center justify-between cursor-pointer p-3 border rounded-lg hover:bg-muted/50"
        onClick={() => {
          setIsExpanded(!isExpanded);
        }}
      >
        <div className="flex items-center space-x-2">
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4" />
          ) : (
            <ChevronRightIcon className="w-4 h-4" />
          )}
          <span className="font-medium">Care Team</span>
          {itemSpecificCareTeam.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {itemSpecificCareTeam.length}
            </Badge>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4 pl-4">
          {loading && (
            <div className="text-sm text-muted-foreground">
              Loading facility users...
            </div>
          )}

          {itemSpecificCareTeam.map((member, memberIndex) => {
            const mainMemberIndex = careTeamFields.findIndex(
              (m) => m.sequence === member.sequence
            );
            return (
              <Card key={memberIndex}>
                <CardHeader>
                  <div className="flex justify-between items-center gap-2">
                    <FormField
                      control={form.control}
                      name={`care_team.${mainMemberIndex}.provider`}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5 w-full">
                          <FormLabel>
                            Provider
                            <span className="text-red-500 text-sm ml-0.5">
                              *
                            </span>
                          </FormLabel>
                          <FormControl>
                            <Autocomplete
                              options={users.map((user) => ({
                                label: `${user.first_name} ${user.last_name}`,
                                value: user.id,
                              }))}
                              value={field.value}
                              onChange={(value) => {
                                form.setValue(
                                  `care_team.${mainMemberIndex}.provider`,
                                  value
                                );
                              }}
                              placeholder="Select a provider"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const currentCareTeam =
                          form.getValues("care_team") || [];
                        const updatedCareTeam = currentCareTeam.filter(
                          (_, i) => i !== mainMemberIndex
                        );
                        form.setValue("care_team", updatedCareTeam);

                        const items = form.getValues("item") || [];
                        items.forEach((item, itemIndex) => {
                          const currentSequences =
                            item.care_team_sequence || [];
                          const updatedSequences = currentSequences.filter(
                            (seq) => seq !== member.sequence
                          );
                          form.setValue(
                            `item.${itemIndex}.care_team_sequence`,
                            updatedSequences
                          );
                        });
                      }}
                      className="mt-6"
                    >
                      <CircleMinusIcon className="h-6 w-6 text-danger-500" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`care_team.${mainMemberIndex}.role`}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>Role</FormLabel>
                          <FormControl>
                            <ValuesetSelect
                              system="system-claim-care-team-role"
                              value={field.value}
                              onSelect={(value) => {
                                form.setValue(
                                  `care_team.${mainMemberIndex}.role`,
                                  value
                                );
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`care_team.${mainMemberIndex}.responsible`}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>Responsible</FormLabel>
                          <FormControl>
                            <div className="flex items-center space-x-2 h-9">
                              <Checkbox
                                id={`responsible-${mainMemberIndex}`}
                                checked={field.value || false}
                                onCheckedChange={(checked) => {
                                  form.setValue(
                                    `care_team.${mainMemberIndex}.responsible`,
                                    checked as boolean
                                  );
                                }}
                              />
                              <Label
                                htmlFor={`responsible-${mainMemberIndex}`}
                                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                This provider is responsible for the care
                              </Label>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={addNewCareTeamMember}
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Care Team Member
          </Button>
        </div>
      )}
    </div>
  );
}

function AddSupportingInfoSection({
  form,
  index,
}: {
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
  index: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const supportingInfoFields = form.watch("supporting_info") || [];
  const itemSupportingInfoSequences =
    form.watch(`item.${index}.information_sequence`) || [];
  const { fields: supportingInfoArrayFields, append: appendSupportingInfo } =
    useFieldArray({
      name: "supporting_info",
      control: form.control,
    });

  const itemSpecificSupportingInfo = supportingInfoFields.filter((info) =>
    itemSupportingInfoSequences.includes(info.sequence)
  );

  const addNewSupportingInfo = () => {
    const newSequence =
      (supportingInfoArrayFields[supportingInfoArrayFields.length - 1]
        ?.sequence ?? 0) + 1;
    const newSupportingInfo = {
      sequence: newSequence,
      category: undefined as unknown as Coding,
      code: undefined as unknown as Coding,
      timing: undefined,
      value_string: undefined,
      value_attachment: undefined,
    };

    appendSupportingInfo(newSupportingInfo);

    const currentSequences =
      form.getValues(`item.${index}.information_sequence`) || [];
    form.setValue(`item.${index}.information_sequence`, [
      ...currentSequences,
      newSequence,
    ]);
  };

  return (
    <div className="space-y-4">
      <div
        className="flex items-center justify-between cursor-pointer p-3 border rounded-lg hover:bg-muted/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4" />
          ) : (
            <ChevronRightIcon className="w-4 h-4" />
          )}
          <span className="font-medium">Supporting Information</span>
          {itemSpecificSupportingInfo.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {itemSpecificSupportingInfo.length}
            </Badge>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4 pl-4">
          {itemSpecificSupportingInfo.map((info, infoIndex) => {
            const mainInfoIndex = supportingInfoFields.findIndex(
              (i) => i.sequence === info.sequence
            );
            return (
              <Card key={infoIndex}>
                <CardHeader>
                  <div className="flex justify-between items-center gap-2">
                    <FormField
                      control={form.control}
                      name={`supporting_info.${mainInfoIndex}.code`}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5 w-full">
                          <FormLabel>
                            Code
                            <span className="text-red-500 text-sm ml-0.5">
                              *
                            </span>
                          </FormLabel>
                          <FormControl>
                            <ValuesetSelect
                              system="system-claim-type"
                              value={field.value}
                              onSelect={(value) => {
                                form.setValue(
                                  `supporting_info.${mainInfoIndex}.code`,
                                  value
                                );
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const currentSupportingInfo =
                          form.getValues("supporting_info") || [];
                        const updatedSupportingInfo =
                          currentSupportingInfo.filter(
                            (_, i) => i !== mainInfoIndex
                          );
                        form.setValue("supporting_info", updatedSupportingInfo);

                        const items = form.getValues("item") || [];
                        items.forEach((item, itemIndex) => {
                          const currentSequences =
                            item.information_sequence || [];
                          const updatedSequences = currentSequences.filter(
                            (seq) => seq !== info.sequence
                          );
                          form.setValue(
                            `item.${itemIndex}.information_sequence`,
                            updatedSequences
                          );
                        });
                      }}
                      className="mt-6"
                    >
                      <CircleMinusIcon className="h-6 w-6 text-danger-500" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`supporting_info.${mainInfoIndex}.timing.start`}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <DateTimePicker
                              value={
                                field.value ? new Date(field.value) : undefined
                              }
                              onChange={(value) => {
                                form.setValue(
                                  `supporting_info.${mainInfoIndex}.timing.start`,
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
                      name={`supporting_info.${mainInfoIndex}.timing.end`}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <DateTimePicker
                              value={
                                field.value ? new Date(field.value) : undefined
                              }
                              onChange={(value) => {
                                form.setValue(
                                  `supporting_info.${mainInfoIndex}.timing.end`,
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

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`supporting_info.${mainInfoIndex}.category`}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>
                            Category
                            <span className="text-red-500 text-sm ml-0.5">
                              *
                            </span>
                          </FormLabel>
                          <FormControl>
                            <ValuesetSelect
                              system="system-claim-type"
                              value={field.value}
                              onSelect={(value) => {
                                form.setValue(
                                  `supporting_info.${mainInfoIndex}.category`,
                                  value
                                );
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <SupportingInfoFileUpload
                      form={form}
                      mainInfoIndex={mainInfoIndex}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name={`supporting_info.${mainInfoIndex}.value_string`}
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel>Value (Text)</FormLabel>
                        <FormControl>
                          <Textarea
                            value={field.value || ""}
                            onChange={(e) => {
                              form.setValue(
                                `supporting_info.${mainInfoIndex}.value_string`,
                                e.target.value || undefined
                              );
                              form.setValue(
                                `supporting_info.${mainInfoIndex}.value_attachment`,
                                undefined
                              );
                            }}
                            placeholder="Enter supporting info value"
                            className="min-h-[80px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            );
          })}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={addNewSupportingInfo}
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Supporting Information
          </Button>
        </div>
      )}
    </div>
  );
}

function SupportingInfoFileUpload({
  form,
  mainInfoIndex,
}: {
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
  mainInfoIndex: number;
}) {
  const currentFile = form.watch(`supporting_info.${mainInfoIndex}.value_file`);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue(`supporting_info.${mainInfoIndex}.value_file`, file);
      form.setValue(`supporting_info.${mainInfoIndex}.value_string`, undefined);
    }
  };

  const handleRemoveFile = () => {
    form.setValue(`supporting_info.${mainInfoIndex}.value_file`, undefined);
  };

  return (
    <FormField
      control={form.control}
      name={`supporting_info.${mainInfoIndex}.value_file`}
      render={() => (
        <FormItem className="space-y-1.5">
          <FormLabel>Value (Attachment)</FormLabel>
          <FormControl>
            <div className="space-y-2">
              {currentFile && (
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50/50">
                  <div className="flex-shrink-0">
                    {currentFile.type.includes("image") ? (
                      <img
                        src={URL.createObjectURL(currentFile)}
                        alt={currentFile.name}
                        className="h-12 w-12 rounded-md object-cover border"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gray-200 border">
                        <FileIcon className="h-6 w-6 text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {currentFile.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {(currentFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveFile}
                    className="flex-shrink-0 hover:bg-red-50 hover:text-red-600"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {!currentFile && (
                <div className="relative">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex items-center justify-center w-full"
                  >
                    <Label className="button-size-default button-shape-square button-primary-default inline-flex h-min w-full cursor-pointer items-center justify-center gap-2 whitespace-pre font-medium outline-offset-1 transition-all duration-200 ease-in-out">
                      <PaperclipIcon className="h-5 w-5" />
                      <span>Add Attachment</span>
                      <input
                        type="file"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleFileChange}
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                      />
                    </Label>
                  </Button>
                </div>
              )}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
