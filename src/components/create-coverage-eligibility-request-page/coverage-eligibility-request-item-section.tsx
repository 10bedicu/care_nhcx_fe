import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  AlertCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleMinusIcon,
  PaperclipIcon,
  PlusIcon,
  ReceiptIcon,
  ShoppingBasketIcon,
  XIcon,
} from "lucide-react";
import { ChargeItem } from "@/types/charge_item";
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
import BenefitSearchSelect from "../common/benefit-search-select";
import { Button } from "../ui/button";
import { Coding } from "@/types/base";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import ValuesetSelect from "../common/valueset-select";
import { apis } from "@/apis";
import {
  BenefitCostQualifierType,
  InsurancePlanBenefitDetail,
} from "@/types/insurance_plan";
import { chargeItemLabel } from "@/lib/prefill";
import { cn } from "@/lib/utils";
import { createCoverageEligibilityRequestFormSchema } from "./schema";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

interface CoverageEligibilityRequestItemSectionProps {
  form: UseFormReturn<
    z.infer<typeof createCoverageEligibilityRequestFormSchema>
  >;
  encounterChargeItems?: ChargeItem[];
  /** Encounter diagnoses pre-mapped to the form's diagnosis shape, injected into every new item. */
  defaultItemDiagnoses?: { diagnosis_reference?: string; diagnosis_code?: { system: string; code: string; display?: string } }[];
}

const BENEFIT_CATEGORY_SYSTEM =
  "https://nrces.in/ndhm/fhir/r4/ValueSet/ndhm-benefitcategory";
const PROCEDURE_CODE_SYSTEM =
  "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-procedures-code";


export function CoverageEligibilityRequestItemSection({
  form,
  encounterChargeItems = [],
  defaultItemDiagnoses = [],
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
          const watchedItem = form.watch(`item.${index}`);
          const amountCapError = watchedItem?._amount_cap_error;
          const conditionErrors = watchedItem?._condition_errors;
          const hasAnyError = amountCapError || conditionErrors;
          return (
          <Card
            key={field.id}
            className={cn(
              hasAnyError && "border-destructive ring-1 ring-destructive"
            )}
          >
            <CardHeader>
              <FormField
                control={form.control}
                name={`item.${index}.product_or_service`}
                render={({ field }) => {
                  const isProductLocked = !!field.value?.code;
                  return (
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
                            disabled={isProductLocked}
                          />
                        </FormControl>
                        {isProductLocked && (
                          <p className="text-xs text-muted-foreground">
                            Product is locked. Remove this item and add a new one to change it.
                          </p>
                        )}
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
                  );
                }}
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

              <AddChargeItemsSection
                form={form}
                index={index}
                encounterChargeItems={encounterChargeItems}
              />

              <AddDiagnosisSection form={form} index={index} />
              <AddSupportingInfoSection form={form} index={index} />

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

              {/* Amount — read-only, auto-calculated from selected charge items */}
              <FormField
                control={form.control}
                name={`item.${index}.unit_price`}
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>
                      Amount
                      <span className="text-red-500 text-sm ml-0.5">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/40 text-sm font-medium">
                        <span className="text-muted-foreground">₹</span>
                        <span>{(field.value ?? 0).toFixed(2)}</span>
                      </div>
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Auto-calculated from selected charge items (capped at benefit limit)
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <CEItemValidationEffects
                form={form}
                index={index}
                planId={planId}
                encounterChargeItems={encounterChargeItems}
              />
            </CardContent>
            {hasAnyError && (
              <CardFooter className="px-6 py-3 border-t border-destructive/30 bg-destructive/5 flex-col items-start gap-2">
                {amountCapError && (
                  <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                    <AlertCircleIcon className="h-4 w-4 flex-shrink-0" />
                    {amountCapError}
                  </div>
                )}
                {conditionErrors &&
                  conditionErrors.split(" • ").map((err, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-sm font-medium text-destructive"
                    >
                      <AlertCircleIcon className="h-4 w-4 flex-shrink-0" />
                      {err}
                    </div>
                  ))}
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
                  onClick={() => {
                    const existingSupportingInfo =
                      form.getValues("supporting_info") ?? [];
                    const allSequences = existingSupportingInfo.map(
                      (s) => s.sequence
                    );
                    append({
                      sequence:
                        Math.max(0, ...fields.map((f) => f.sequence)) + 1,
                      category: undefined as unknown as Coding,
                      product_or_service: undefined,
                      charge_items: [],
                      modifier: [],
                      quantity: {
                        value: 0,
                      },
                      unit_price: 0,
                      diagnosis: defaultItemDiagnoses.map((d) => ({ ...d })),
                      supporting_info_sequence: allSequences,
                    });
                  }}
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
                  label: q.display ? `${q.code} – ${q.display}` : q.code,
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
                      <span className="opacity-80"> – {code.display}</span>
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

function AddChargeItemsSection({
  form,
  index,
  encounterChargeItems = [],
}: {
  form: UseFormReturn<z.infer<typeof createCoverageEligibilityRequestFormSchema>>;
  index: number;
  encounterChargeItems?: ChargeItem[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const rawSelectedIds = form.watch(`item.${index}.charge_items`);
  const rawAllItems = form.watch("item");

  const selectedIds = useMemo(
    () => rawSelectedIds ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(rawSelectedIds)]
  );

  const allItems = useMemo(
    () => rawAllItems ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(rawAllItems?.map((i) => i.charge_items))]
  );

  // Collect charge item IDs already used in other item rows
  const takenByOthers = useMemo(
    () =>
      new Set(
        allItems.flatMap((item, i) =>
          i !== index ? (item.charge_items ?? []) : []
        )
      ),
    [allItems, index]
  );

  const selectedChargeItems = useMemo(
    () =>
      selectedIds
        .map((id) => encounterChargeItems.find((ci) => ci.id === id))
        .filter((ci): ci is ChargeItem => !!ci),
    [selectedIds, encounterChargeItems]
  );

  // Items available to add: not already selected in this row, not taken by another row
  const availableToAdd = useMemo(
    () =>
      encounterChargeItems.filter(
        (ci) => !selectedIds.includes(ci.id) && !takenByOthers.has(ci.id)
      ),
    [encounterChargeItems, selectedIds, takenByOthers]
  );

  const totalSelected = useMemo(
    () =>
      selectedChargeItems.reduce(
        (sum, ci) => sum + parseFloat(ci.total_price || "0"),
        0
      ),
    [selectedChargeItems]
  );

  if (encounterChargeItems.length === 0) return null;

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
          <ReceiptIcon className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">Charge Items</span>
          {selectedIds.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {selectedIds.length}
            </Badge>
          )}
        </div>
        {selectedIds.length > 0 && !isExpanded && (
          <span className="text-sm text-muted-foreground">
            ₹{totalSelected.toFixed(2)}
          </span>
        )}
      </div>

      {isExpanded && (
        <div className="space-y-3 pl-4">
          <Autocomplete
            options={availableToAdd.map((ci) => ({
              label: `${chargeItemLabel(ci)}${ci.code?.code ? ` (${ci.code.code})` : ""} — ₹${parseFloat(ci.total_price || "0").toFixed(2)}`,
              value: ci.id,
            }))}
            value={undefined}
            onChange={(id) => {
              if (!selectedIds.includes(id)) {
                form.setValue(`item.${index}.charge_items`, [
                  ...selectedIds,
                  id,
                ]);
              }
            }}
            placeholder={
              availableToAdd.length === 0
                ? "No charge items available"
                : "Search and select a charge item…"
            }
            noOptionsMessage="No charge items available"
          />

          {selectedChargeItems.length > 0 && (
            <div className="space-y-2">
              {selectedChargeItems.map((ci) => (
                <div
                  key={ci.id}
                  className="flex items-center justify-between p-2.5 border rounded-lg bg-muted/30"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {chargeItemLabel(ci)}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {ci.code?.code && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {ci.code.code}
                        </span>
                      )}
                      <span className="text-xs font-medium text-foreground">
                        ₹{parseFloat(ci.total_price || "0").toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 h-7 w-7"
                    onClick={() => {
                      form.setValue(
                        `item.${index}.charge_items`,
                        selectedIds.filter((id) => id !== ci.id)
                      );
                    }}
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {selectedChargeItems.length > 1 && (
                <div className="flex justify-end text-sm text-muted-foreground px-1">
                  Total: ₹{totalSelected.toFixed(2)}
                </div>
              )}
            </div>
          )}

          {selectedIds.length === 0 && (
            <p className="text-xs text-muted-foreground py-1">
              No charge items selected. Select charge items to auto-calculate the amount.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function computeIpbCap(
  benefitDetail: InsurancePlanBenefitDetail,
  selectedModifierCodes: string[]
): number | null {
  const costs = benefitDetail.costs ?? [];
  if (costs.length > 0) {
    const matchingCosts = costs.filter((cost) => {
      if (cost.qualifiers.length === 0) return true;
      return cost.qualifiers.every((q) =>
        selectedModifierCodes.includes(q.qualifier_code)
      );
    });
    if (matchingCosts.length > 0) {
      const maxValue = Math.max(
        ...matchingCosts.map((c) => parseFloat(c.value_amount) || 0)
      );
      if (maxValue > 0) return maxValue;
    }
  }

  if (benefitDetail.limits?.length > 0) {
    const maxLimit = Math.max(
      ...benefitDetail.limits.map((l) => parseFloat(l.value_amount) || 0)
    );
    if (maxLimit > 0) return maxLimit;
  }

  const maxLimitAmount = parseFloat(benefitDetail.max_limit_amount);
  if (maxLimitAmount > 0) return maxLimitAmount;

  return null;
}

/**
 * For CE:AR items — auto-calculates unit_price from selected charge items
 * (capped at the IPB limit), and validates condition rules.
 */
function CEItemValidationEffects({
  form,
  index,
  planId,
  encounterChargeItems = [],
}: {
  form: UseFormReturn<z.infer<typeof createCoverageEligibilityRequestFormSchema>>;
  index: number;
  planId: string | null;
  encounterChargeItems?: ChargeItem[];
}) {
  const productCode = form.watch(`item.${index}.product_or_service`)?.code;
  const quantityValue = form.watch(`item.${index}.quantity.value`);
  const rawModifiers = form.watch(`item.${index}.modifier`);
  const rawChargeItemIds = form.watch(`item.${index}.charge_items`);

  const modifiers = useMemo(
    () => rawModifiers ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(rawModifiers)]
  );

  const chargeItemIds = useMemo(
    () => rawChargeItemIds ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(rawChargeItemIds)]
  );

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

  const amountCap = useMemo(() => {
    if (!benefitDetail) return null;
    return computeIpbCap(
      benefitDetail,
      modifiers.map((m) => m.code)
    );
  }, [benefitDetail, modifiers]);

  // Sum total prices of all selected charge items
  const chargeItemsTotal = useMemo(() => {
    return chargeItemIds.reduce((sum, id) => {
      const ci = encounterChargeItems.find((c) => c.id === id);
      return sum + parseFloat(ci?.total_price ?? "0");
    }, 0);
  }, [chargeItemIds, encounterChargeItems]);

  // Auto-set unit_price = min(sum, cap)
  useEffect(() => {
    const capped =
      amountCap != null ? Math.min(chargeItemsTotal, amountCap) : chargeItemsTotal;
    form.setValue(`item.${index}.unit_price`, capped);

    if (amountCap != null && chargeItemsTotal > amountCap) {
      form.setValue(
        `item.${index}._amount_cap_error`,
        `Charge items total ₹${chargeItemsTotal.toFixed(2)} exceeds the allowed limit of ₹${amountCap.toFixed(2)}. Amount has been capped at ₹${amountCap.toFixed(2)}.`
      );
    } else {
      form.setValue(`item.${index}._amount_cap_error`, undefined);
    }
  }, [chargeItemsTotal, amountCap, form, index]);

  useEffect(() => {
    if (!benefitDetail?.conditions?.length) {
      form.setValue(`item.${index}._condition_errors`, undefined);
      return;
    }

    const qualifierTypeMap = new Map<string, BenefitCostQualifierType>();
    for (const cost of benefitDetail.costs ?? []) {
      for (const q of cost.qualifiers) {
        qualifierTypeMap.set(q.qualifier_code, q.qualifier_type);
      }
    }

    const stratificationModifiers = modifiers.filter(
      (m) => qualifierTypeMap.get(m.code) === "stratification"
    );
    const implantModifiers = modifiers.filter(
      (m) => qualifierTypeMap.get(m.code) === "implant"
    );

    const errors: string[] = [];

    for (const cond of benefitDetail.conditions) {
      if (cond.quantity_allowed > 0 && quantityValue > cond.quantity_allowed) {
        errors.push(
          `Quantity ${quantityValue} exceeds the allowed maximum of ${cond.quantity_allowed}`
        );
      }

      if (stratificationModifiers.length > 0) {
        if (!cond.stratification_allowed) {
          errors.push("Stratification is not allowed for this benefit");
        } else {
          if (
            !cond.multiple_stratification_allowed &&
            stratificationModifiers.length > 1
          ) {
            errors.push("Only one stratification is allowed");
          } else if (
            cond.maximum_stratification_allowed > 0 &&
            stratificationModifiers.length > cond.maximum_stratification_allowed
          ) {
            errors.push(
              `Maximum ${cond.maximum_stratification_allowed} stratification(s) allowed, ${stratificationModifiers.length} selected`
            );
          }
        }
      }

      if (implantModifiers.length > 0) {
        if (!cond.implant_applicable) {
          errors.push("Implants are not applicable for this benefit");
        } else {
          if (!cond.multiple_implants_allowed && implantModifiers.length > 1) {
            errors.push("Only one implant is allowed");
          } else if (
            cond.maximum_implants_allowed > 0 &&
            implantModifiers.length > cond.maximum_implants_allowed
          ) {
            errors.push(
              `Maximum ${cond.maximum_implants_allowed} implant(s) allowed, ${implantModifiers.length} selected`
            );
          }
        }
      }
    }

    form.setValue(
      `item.${index}._condition_errors`,
      errors.length > 0 ? errors.join(" • ") : undefined
    );
  }, [benefitDetail, quantityValue, modifiers, form, index]);

  return null;
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
}: {
  form: UseFormReturn<
    z.infer<typeof createCoverageEligibilityRequestFormSchema>
  >;
  index: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const supportingInfoFields = form.watch("supporting_info") || [];
  const itemSupportingInfoSequences =
    form.watch(`item.${index}.supporting_info_sequence`) || [];
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
      Math.max(0, ...supportingInfoArrayFields.map((f) => f.sequence)) + 1;
    const newSupportingInfo = {
      sequence: newSequence,
      value_string: undefined,
      value_attachment: undefined,
      value_file: undefined,
    };

    appendSupportingInfo(newSupportingInfo);

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
                      name={`supporting_info.${mainInfoIndex}.sequence`}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5 w-full">
                          <FormLabel>
                            Sequence
                            <span className="text-red-500 text-sm ml-0.5">
                              *
                            </span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              value={field.value || ""}
                              onChange={(e) => {
                                form.setValue(
                                  `supporting_info.${mainInfoIndex}.sequence`,
                                  e.target.value ? parseInt(e.target.value) : 0
                                );
                              }}
                              placeholder="Enter sequence number"
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
