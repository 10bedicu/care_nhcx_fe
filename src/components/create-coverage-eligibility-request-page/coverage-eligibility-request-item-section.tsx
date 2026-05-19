import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
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
import { UseFormReturn, useController, useFieldArray } from "react-hook-form";

import { Badge } from "../ui/badge";
import BenefitSearchSelect from "../common/benefit-search-select";
import { Button } from "../ui/button";
import { Coding } from "@/types/base";
import { Input } from "../ui/input";
import { InsurancePlanSupportingInfoRequirement } from "@/types/insurance_plan";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import ValuesetSelect from "../common/valueset-select";
import Autocomplete from "../ui/autocomplete";
import { apis } from "@/apis";
import { cn } from "@/lib/utils";
import { createCoverageEligibilityRequestFormSchema } from "./schema";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

interface CoverageEligibilityRequestItemSectionProps {
  form: UseFormReturn<
    z.infer<typeof createCoverageEligibilityRequestFormSchema>
  >;
}

const BENEFIT_CATEGORY_SYSTEM =
  "https://nrces.in/ndhm/fhir/r4/ValueSet/ndhm-benefitcategory";
const PROCEDURE_CODE_SYSTEM =
  "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-procedures-code";

export function CoverageEligibilityRequestItemSection({
  form,
}: CoverageEligibilityRequestItemSectionProps) {
  const { fields, append, remove } = useFieldArray({
    name: "item",
    control: form.control,
  });

  // Derive the insurance plan ID from the focal (or first) selected policy
  const selectedInsurances = form.watch("insurance");
  const focalPolicy =
    selectedInsurances?.find((i) => i.focal)?.policy ??
    selectedInsurances?.[0]?.policy;

  const { data: planListData } = useQuery({
    queryKey: ["insurancePlan", "list", focalPolicy?.sno],
    queryFn: () =>
      apis.insurancePlan.list({
        identifier_value: "100155-IN2910001986", // FIXME: replace with focalPolicy!.sno
      }),
    enabled: Boolean(focalPolicy?.sno),
    staleTime: 5 * 60 * 1000,
  });

  const planId = planListData?.results?.[0]?.id ?? null;
  const watchedItems = form.watch("item");
  const hasSubmitted = form.formState.submitCount > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <ShoppingBasketIcon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">
            Add coverage eligibility request items
          </h3>
          <p className="text-sm text-muted-foreground">
            Add all applicable items to the coverage eligibility request.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => {
          const mandatoryDocsError =
            watchedItems?.[index]?._mandatory_docs_error;
          return (
          <Card
            key={field.id}
            className={cn(
              mandatoryDocsError &&
                (hasSubmitted
                  ? "border-destructive ring-1 ring-destructive"
                  : "border-amber-400 ring-1 ring-amber-400")
            )}
          >
            <CardHeader>
              <FormField
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
                        <BenefitSearchSelect
                          insurancePlanId={planId}
                          value={field.value}
                          onSelect={(benefit) => {
                            form.setValue(`item.${index}.product_or_service`, {
                              system: PROCEDURE_CODE_SYSTEM,
                              code: benefit.type_code,
                              display: benefit.type_display,
                            });
                            form.setValue(`item.${index}.category`, {
                              system: BENEFIT_CATEGORY_SYSTEM,
                              code: benefit.coverage_type_code,
                              display: benefit.coverage_type_display,
                            });
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
                control={form.control}
                name={`item.${index}.category`}
                render={({ field }) => {
                  const hasProduct = Boolean(
                    form.watch(`item.${index}.product_or_service`)?.code
                  );
                  return (
                    <FormItem className="space-y-1.5">
                      <FormLabel>
                        Category
                        <span className="text-red-500 text-sm ml-0.5">*</span>
                      </FormLabel>
                      <FormControl>
                        <ValuesetSelect
                          system="system-coverage-eligibility-request-item-category"
                          value={field.value}
                          onSelect={(value) => {
                            form.setValue(`item.${index}.category`, value);
                          }}
                          disabled={hasProduct}
                        />
                      </FormControl>
                      {hasProduct && (
                        <p className="text-xs text-muted-foreground">
                          Auto-set from selected benefit
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <ModifierField form={form} index={index} planId={planId} />

              <AddDiagnosisSection form={form} index={index} />
              <AddSupportingInfoSection
                form={form}
                index={index}
                planId={planId}
              />

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
                          system="system-ucum-units"
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
            </CardContent>
            {mandatoryDocsError && (
              <CardFooter
                className={cn(
                  "px-6 py-3 border-t",
                  hasSubmitted
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-amber-300 bg-amber-50"
                )}
              >
                <div
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium",
                    hasSubmitted ? "text-destructive" : "text-amber-700"
                  )}
                >
                  <AlertCircleIcon className="h-4 w-4 flex-shrink-0" />
                  {mandatoryDocsError}
                </div>
              </CardFooter>
            )}
          </Card>
          );
        })}

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
                      category: undefined as unknown as Coding,
                      product_or_service: undefined,
                      charge_item: undefined,
                      modifier: [],
                      quantity: {
                        value: 0,
                      },
                      unit_price: 0,
                      diagnosis: [],
                      supporting_info_sequence: [],
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

function ModifierField({
  form,
  index,
  planId,
}: {
  form: UseFormReturn<z.infer<typeof createCoverageEligibilityRequestFormSchema>>;
  index: number;
  planId: string | null;
}) {
  const productCode = form.watch(`item.${index}.product_or_service`)?.code;

  const { data: benefitDetail, isLoading } = useQuery({
    queryKey: ["insurancePlanBenefit", "lookup", planId, productCode],
    queryFn: () =>
      apis.insurancePlanBenefit.lookup({
        insurance_plan: planId!,
        type_code: productCode!,
      }),
    enabled: Boolean(planId && productCode),
    staleTime: 5 * 60 * 1000,
  });

  const qualifiers = useMemo<Coding[]>(() => {
    if (!benefitDetail?.costs) return [];
    const seen = new Set<string>();
    const result: Coding[] = [];
    for (const cost of benefitDetail.costs) {
      for (const q of cost.qualifiers) {
        if (!seen.has(q.qualifier_code)) {
          seen.add(q.qualifier_code);
          result.push({
            system: q.qualifier.coding?.[0]?.system ?? "",
            code: q.qualifier_code,
            display: q.qualifier.text ?? q.qualifier.coding?.[0]?.display,
          });
        }
      }
    }
    return result;
  }, [benefitDetail]);

  return (
    <FormField
      control={form.control}
      name={`item.${index}.modifier`}
      render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel>Modifier</FormLabel>
          <FormControl>
            <div className="grid gap-4">
              <Autocomplete
                options={qualifiers.map((q) => ({
                  label: q.display ? `${q.code} - ${q.display}` : q.code,
                  value: q.code,
                }))}
                value={undefined}
                onChange={(code) => {
                  const qualifier = qualifiers.find((q) => q.code === code);
                  if (!qualifier) return;
                  const existing = field.value ?? [];
                  if (existing.some((c) => c.code === qualifier.code)) return;
                  form.setValue(`item.${index}.modifier`, [
                    ...existing,
                    qualifier,
                  ]);
                }}
                disabled={!productCode || isLoading}
                placeholder={
                  !productCode
                    ? "Select a benefit first"
                    : isLoading
                      ? "Loading qualifiers…"
                      : qualifiers.length === 0
                        ? "No qualifiers available"
                        : "Select a modifier"
                }
                noOptionsMessage={
                  !productCode
                    ? "Select a benefit first"
                    : "No qualifiers available"
                }
              />
              <div className="flex flex-wrap gap-2">
                {(field.value ?? []).map((code) => (
                  <Badge key={code.code} className="flex gap-2">
                    <span className="font-mono">{code.code}</span>
                    {code.display && (
                      <span className="opacity-80"> - {code.display}</span>
                    )}
                    <XIcon
                      className="w-4 h-4 cursor-pointer"
                      onClick={() => {
                        form.setValue(
                          `item.${index}.modifier`,
                          field.value.filter((c) => c.code !== code.code)
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
  );
}

function AddDiagnosisSection({
  form,
  index,
}: {
  form: UseFormReturn<
    z.infer<typeof createCoverageEligibilityRequestFormSchema>
  >;
  index: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const diagnosisFields = form.watch(`item.${index}.diagnosis`) || [];

  const addNewDiagnosis = () => {
    const currentDiagnoses = form.getValues(`item.${index}.diagnosis`) || [];
    const newDiagnosis = {
      diagnosis_reference: undefined,
      diagnosis_code: undefined,
    };
    form.setValue(`item.${index}.diagnosis`, [
      ...currentDiagnoses,
      newDiagnosis,
    ]);
  };

  const removeDiagnosis = (diagnosisIndex: number) => {
    const currentDiagnoses = form.getValues(`item.${index}.diagnosis`) || [];
    const updatedDiagnoses = currentDiagnoses.filter(
      (_, i) => i !== diagnosisIndex
    );
    form.setValue(`item.${index}.diagnosis`, updatedDiagnoses);
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
          {diagnosisFields.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {diagnosisFields.length}
            </Badge>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4 pl-4">
          {diagnosisFields.map((_diagnosis, diagnosisIndex) => (
            <Card key={diagnosisIndex}>
              <CardHeader>
                <div className="flex justify-between items-center gap-2">
                  <FormField
                    control={form.control}
                    name={`item.${index}.diagnosis.${diagnosisIndex}.diagnosis_code`}
                    render={({ field }) => (
                      <FormItem className="space-y-1.5 w-full">
                        <FormLabel>
                          Diagnosis Code
                          <span className="text-red-500 text-sm ml-0.5">*</span>
                        </FormLabel>
                        <FormControl>
                          <ValuesetSelect
                            system="system-coverage-eligibility-request-item-diagnosis-code"
                            value={field.value}
                            onSelect={(value) => {
                              form.setValue(
                                `item.${index}.diagnosis.${diagnosisIndex}.diagnosis_code`,
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
                    onClick={() => removeDiagnosis(diagnosisIndex)}
                    className="mt-6"
                  >
                    <CircleMinusIcon className="h-6 w-6 text-danger-500" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}

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

function AddSupportingInfoSection({
  form,
  index,
  planId,
}: {
  form: UseFormReturn<
    z.infer<typeof createCoverageEligibilityRequestFormSchema>
  >;
  index: number;
  planId: string | null;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const supportingInfoFields = form.watch("supporting_info") || [];
  const itemSupportingInfoSequences =
    form.watch(`item.${index}.supporting_info_sequence`) || [];
  const productCode = form.watch(`item.${index}.product_or_service`)?.code;

  const { fields: supportingInfoArrayFields, append: appendSupportingInfo } =
    useFieldArray({
      name: "supporting_info",
      control: form.control,
    });

  const { data: benefitDetail } = useQuery({
    queryKey: ["insurancePlanBenefit", "lookup", planId, productCode],
    queryFn: () =>
      apis.insurancePlanBenefit.lookup({
        insurance_plan: planId!,
        type_code: productCode!,
      }),
    enabled: Boolean(planId && productCode),
    staleTime: 5 * 60 * 1000,
  });

  const allSupportingInfoRequirements = useMemo(() => {
    const all = benefitDetail?.supporting_info_requirements ?? [];
    const filtered = all.filter((req) => !req.documentation_url);
    const seen = new Set<string>();
    return filtered.filter((req) => {
      const key = `${req.category_code}:${req.code_code}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [benefitDetail]);

  const requiredRequirements = useMemo(
    () => allSupportingInfoRequirements.filter((req) => req.is_required),
    [allSupportingInfoRequirements]
  );

  const recommendedRequirements = useMemo(
    () => allSupportingInfoRequirements.filter((req) => !req.is_required),
    [allSupportingInfoRequirements]
  );

  const itemSpecificSupportingInfo = supportingInfoFields.filter((info) =>
    itemSupportingInfoSequences.includes(info.sequence)
  );

  type RequirementStatus = "satisfied" | "incomplete" | "missing";

  const getRequirementStatus = (
    req: InsurancePlanSupportingInfoRequirement
  ): RequirementStatus => {
    const matchingEntry = itemSpecificSupportingInfo.find(
      (info) =>
        info.category?.code === req.category_code &&
        info.code?.code === req.code_code
    );
    if (!matchingEntry) return "missing";
    const hasValue =
      matchingEntry.value_string ||
      matchingEntry.value_attachment ||
      matchingEntry.value_file;
    return hasValue ? "satisfied" : "incomplete";
  };

  const requirementStatuses = useMemo(
    () =>
      requiredRequirements.map((req) => ({
        req,
        status: getRequirementStatus(req),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [requiredRequirements, itemSpecificSupportingInfo]
  );

  const recommendedStatuses = useMemo(
    () =>
      recommendedRequirements.map((req) => ({
        req,
        status: getRequirementStatus(req),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recommendedRequirements, itemSpecificSupportingInfo]
  );

  const unsatisfiedCount = requirementStatuses.filter(
    ({ status }) => status !== "satisfied"
  ).length;

  const {
    field: mandatoryDocsField,
    fieldState: mandatoryDocsFieldState,
  } = useController({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    name: `item.${index}._mandatory_docs_error` as any,
    control: form.control,
  });

  useEffect(() => {
    if (requiredRequirements.length > 0 && unsatisfiedCount > 0) {
      mandatoryDocsField.onChange(
        `${unsatisfiedCount} required document(s) must be uploaded before submitting`
      );
    } else {
      mandatoryDocsField.onChange(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mandatoryDocsField.onChange, requiredRequirements.length, unsatisfiedCount]);

  const addSupportingInfoForRequirement = (
    req: InsurancePlanSupportingInfoRequirement
  ) => {
    const alreadyAdded = itemSpecificSupportingInfo.some(
      (info) =>
        info.category?.code === req.category_code &&
        info.code?.code === req.code_code
    );
    if (!alreadyAdded) {
      const newSequence =
        (supportingInfoArrayFields[supportingInfoArrayFields.length - 1]
          ?.sequence ?? 0) + 1;
      appendSupportingInfo({
        sequence: newSequence,
        category: {
          system: req.category.coding?.[0]?.system ?? "",
          code: req.category_code,
          display: req.category.text ?? req.category.coding?.[0]?.display,
        },
        code: {
          system: req.code.coding?.[0]?.system ?? "",
          code: req.code_code,
          display: req.code.text ?? req.code.coding?.[0]?.display,
        },
        value_string: undefined,
        value_attachment: undefined,
      });
      const currentSequences =
        form.getValues(`item.${index}.supporting_info_sequence`) || [];
      form.setValue(`item.${index}.supporting_info_sequence`, [
        ...currentSequences,
        newSequence,
      ]);
    }
    if (!isExpanded) setIsExpanded(true);
  };

  const addNewSupportingInfo = () => {
    const newSequence =
      (supportingInfoArrayFields[supportingInfoArrayFields.length - 1]
        ?.sequence ?? 0) + 1;
    appendSupportingInfo({
      sequence: newSequence,
      value_string: undefined,
      value_attachment: undefined,
      value_file: undefined,
    });

    const currentSequences =
      form.getValues(`item.${index}.supporting_info_sequence`) || [];
    form.setValue(`item.${index}.supporting_info_sequence`, [
      ...currentSequences,
      newSequence,
    ]);
  };

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex items-center justify-between cursor-pointer p-3 border rounded-lg hover:bg-muted/50",
          unsatisfiedCount > 0 && "border-amber-400 bg-amber-50/50"
        )}
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
          {unsatisfiedCount > 0 && (
            <Badge variant="destructive" className="ml-1 text-xs">
              {unsatisfiedCount} doc{unsatisfiedCount > 1 ? "s" : ""} required
            </Badge>
          )}
        </div>
      </div>

      {(mandatoryDocsFieldState.error?.message || mandatoryDocsField.value) && (
        <p className="text-sm font-medium text-destructive px-1">
          {mandatoryDocsFieldState.error?.message || mandatoryDocsField.value}
        </p>
      )}

      {isExpanded && (
        <div className="space-y-4 pl-4">
          {/* Required Documents Panel */}
          {requirementStatuses.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Required Documents
              </p>
              <div className="space-y-1.5">
                {requirementStatuses.map(({ req, status }) => {
                  const label =
                    req.code.text ??
                    req.code.coding?.[0]?.display ??
                    req.code_code;
                  const categoryLabel =
                    req.category.text ??
                    req.category.coding?.[0]?.display ??
                    req.category_code;
                  return (
                    <div
                      key={req.id}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm",
                        status === "satisfied" && "bg-green-50 text-green-800",
                        (status === "incomplete" || status === "missing") &&
                          "bg-amber-50 text-amber-800"
                      )}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {status === "satisfied" ? (
                          <CheckCircle2Icon className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                        ) : (
                          <AlertCircleIcon className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        )}
                        <span className="truncate">
                          {label}{" "}
                          <span className="opacity-60 text-xs">
                            ({categoryLabel})
                          </span>
                        </span>
                      </div>
                      {status === "missing" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs px-2 shrink-0 border-amber-300 bg-white hover:bg-amber-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            addSupportingInfoForRequirement(req);
                          }}
                        >
                          <PlusIcon className="w-3 h-3 mr-0.5" />
                          Add
                        </Button>
                      )}
                      {status === "incomplete" && (
                        <span className="text-xs text-amber-600 shrink-0 font-medium">
                          Upload required
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recommended Documents Panel */}
          {recommendedStatuses.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Recommended Documents
              </p>
              <div className="space-y-1.5">
                {recommendedStatuses.map(({ req, status }) => {
                  const label =
                    req.code.text ??
                    req.code.coding?.[0]?.display ??
                    req.code_code;
                  const categoryLabel =
                    req.category.text ??
                    req.category.coding?.[0]?.display ??
                    req.category_code;
                  return (
                    <div
                      key={req.id}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm",
                        status === "satisfied" && "bg-green-50 text-green-800",
                        (status === "incomplete" || status === "missing") &&
                          "bg-blue-50 text-blue-800"
                      )}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {status === "satisfied" ? (
                          <CheckCircle2Icon className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                        ) : (
                          <AlertCircleIcon className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        )}
                        <span className="truncate">
                          {label}{" "}
                          <span className="opacity-60 text-xs">
                            ({categoryLabel})
                          </span>
                        </span>
                      </div>
                      {status === "missing" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs px-2 shrink-0 border-blue-300 bg-white hover:bg-blue-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            addSupportingInfoForRequirement(req);
                          }}
                        >
                          <PlusIcon className="w-3 h-3 mr-0.5" />
                          Add
                        </Button>
                      )}
                      {status === "incomplete" && (
                        <span className="text-xs text-blue-600 shrink-0 font-medium">
                          Upload pending
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {itemSpecificSupportingInfo.map((info, infoIndex) => {
            const mainInfoIndex = supportingInfoFields.findIndex(
              (i) => i.sequence === info.sequence
            );
            const matchingRequirement = allSupportingInfoRequirements.find(
              (req) =>
                req.category_code === info.category?.code &&
                req.code_code === info.code?.code
            );
            const isRequiredDoc = Boolean(matchingRequirement?.is_required);

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
                            Document
                            {matchingRequirement && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "ml-2 text-xs font-normal",
                                  isRequiredDoc
                                    ? "border-amber-400 text-amber-700"
                                    : "border-blue-400 text-blue-700"
                                )}
                              >
                                {isRequiredDoc ? "Required" : "Recommended"}
                              </Badge>
                            )}
                          </FormLabel>
                          <FormControl>
                            {isRequiredDoc ? (
                              <Input
                                value={
                                  field.value?.display ?? field.value?.code ?? ""
                                }
                                disabled
                                className="bg-muted"
                              />
                            ) : (
                              <Input
                                value="Supporting Document"
                                disabled
                                className="bg-muted text-muted-foreground"
                              />
                            )}
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
                            item.supporting_info_sequence || [];
                          const updatedSequences = currentSequences.filter(
                            (seq) => seq !== info.sequence
                          );
                          form.setValue(
                            `item.${itemIndex}.supporting_info_sequence`,
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
                  {isRequiredDoc && (
                    <FormField
                      control={form.control}
                      name={`supporting_info.${mainInfoIndex}.category`}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>Category</FormLabel>
                          <FormControl>
                            <Input
                              value={
                                field.value?.display ?? field.value?.code ?? ""
                              }
                              disabled
                              className="bg-muted"
                            />
                          </FormControl>
                          {matchingRequirement && (
                            <p
                              className={cn(
                                "text-xs",
                                isRequiredDoc
                                  ? "text-amber-600"
                                  : "text-blue-600"
                              )}
                            >
                              {isRequiredDoc
                                ? "Required by insurance plan benefit"
                                : "Recommended by insurance plan benefit"}
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <SupportingInfoFileUpload
                    form={form}
                    mainInfoIndex={mainInfoIndex}
                  />

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
  form: UseFormReturn<
    z.infer<typeof createCoverageEligibilityRequestFormSchema>
  >;
  mainInfoIndex: number;
}) {
  const currentFile = form.watch(`supporting_info.${mainInfoIndex}.value_file`);
  const attachmentId = form.watch(
    `supporting_info.${mainInfoIndex}.value_attachment`
  );

  const { data: existingFile } = useQuery({
    queryKey: ["file", attachmentId],
    queryFn: () => apis.file.get(attachmentId as string),
    enabled: !!attachmentId && !currentFile,
  });

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

              {!currentFile && existingFile?.read_signed_url && (
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50/50">
                  <div className="flex-shrink-0">
                    {existingFile.extension &&
                    ["jpg", "jpeg", "png", "gif", "webp"].includes(
                      existingFile.extension.toLowerCase()
                    ) ? (
                      <img
                        src={existingFile.read_signed_url}
                        alt={existingFile.name || "attachment"}
                        className="h-12 w-12 rounded-md object-cover border"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gray-200 border">
                        <FileIcon className="h-6 w-6 text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <a
                      href={existingFile.read_signed_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-primary truncate hover:underline"
                    >
                      {existingFile.name ||
                        `file.${existingFile.extension || "bin"}`}
                    </a>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Remote attachment
                    </p>
                  </div>
                </div>
              )}

              {!currentFile && !existingFile?.read_signed_url && (
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
