import {
  AlertCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleMinusIcon,
  PaperclipIcon,
  PlusIcon,
  ShoppingBasketIcon,
  XIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { FileIcon, TrashIcon } from "lucide-react";
import {
  FormCardErrorFooter,
  SectionErrorMessage,
  SectionValidationBadges,
  cardErrorBorderClass,
  sectionErrorBorderClass,
} from "@/components/common/form-card-error";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { UseFormReturn, useController, useFieldArray } from "react-hook-form";
import {
  buildBenefitConditionErrors,
  buildCrossItemErrors,
  countImplantLineItemsForParent,
  findExistingImplantItemIndex,
  getLinkedImplantsForParent,
  getQualifierTypeByCode,
  isModifierRequired,
} from "@/lib/benefit-item-validation";
import {
  getCardSectionValidationCounts,
  getCeDiagnosisCardError,
  getCeSupportingInfoCardError,
  getSectionVirtualErrorMessage,
  hasSectionValidationIssue,
  syncVirtualFormErrorFromForm,
} from "@/lib/form-card-validation";
import { useEffect, useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";

import Autocomplete from "../ui/autocomplete";
import { Badge } from "../ui/badge";
import BenefitSearchSelect from "../common/benefit-search-select";
import { Button } from "../ui/button";
import { Coding } from "@/types/base";
import { InlineLoading } from "@/components/common/loading-spinner";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "../ui/textarea";
import ValuesetSelect from "../common/valueset-select";
import { apis } from "@/apis";
import { cn } from "@/lib/utils";
import { createCoverageEligibilityRequestFormSchema } from "./schema";
import { z } from "zod";

interface CoverageEligibilityRequestItemSectionProps {
  form: UseFormReturn<
    z.infer<typeof createCoverageEligibilityRequestFormSchema>
  >;
  /** Encounter diagnoses pre-mapped to the form's diagnosis shape, injected into every new item. */
  defaultItemDiagnoses?: {
    diagnosis_reference?: string;
    diagnosis_code?: { system: string; code: string; display?: string };
  }[];
  /** When adding items to an auth-requirements CE, only benefits with enhancement allowed are permitted. */
  requireEnhancementAllowed?: boolean;
  /** Sequences of items prefilled from the linked CE — exempt from enhancement validation. */
  prefilledItemSequences?: Set<number>;
}

const BENEFIT_CATEGORY_SYSTEM =
  "https://nrces.in/ndhm/fhir/r4/ValueSet/ndhm-benefitcategory";
const PROCEDURE_CODE_SYSTEM =
  "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-procedures-code";

export function CoverageEligibilityRequestItemSection({
  form,
  defaultItemDiagnoses = [],
  requireEnhancementAllowed = false,
  prefilledItemSequences,
}: CoverageEligibilityRequestItemSectionProps) {
  const { fields, append, remove } = useFieldArray({
    name: "item",
    control: form.control,
  });

  const selectedInsurances = form.watch("insurance");
  const focalPolicy =
    selectedInsurances?.find((i) => i.focal)?.policy ??
    selectedInsurances?.[0]?.policy;

  const { data: planListData, isLoading: isPlanLoading } = useQuery({
    queryKey: ["insurancePlan", "list", focalPolicy?.sno],
    queryFn: () =>
      apis.insurancePlan.list({
        identifier_value: "100155-IN2910001986", // FIXME: replace with focalPolicy!.sno
      }),
    enabled: Boolean(focalPolicy?.sno),
    staleTime: 5 * 60 * 1000,
  });

  const planId = planListData?.results?.[0]?.id ?? null;

  const productCodesKey = fields
    .map(
      (_, index) => form.watch(`item.${index}.product_or_service`)?.code ?? "",
    )
    .join("|");

  const productCodes = useMemo(
    () => [...new Set(productCodesKey.split("|").filter(Boolean))],
    [productCodesKey],
  );

  const benefitDetailQueries = useQueries({
    queries: productCodes.map((code) => ({
      queryKey: ["insurancePlanBenefit", "lookup", planId, code],
      queryFn: () =>
        apis.insurancePlanBenefit.lookup({
          insurance_plan: planId!,
          type_code: code,
        }),
      enabled: Boolean(planId && code),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const benefitDetailsByCode = useMemo(() => {
    const map = new Map<
      string,
      (typeof benefitDetailQueries)[number]["data"]
    >();
    productCodes.forEach((code, index) => {
      map.set(code, benefitDetailQueries[index]?.data);
    });
    return map;
  }, [productCodes, benefitDetailQueries]);

  const crossItemErrorsByIndex = useMemo(() => {
    const validationItems = fields.map((_, index) => ({
      sequence: form.getValues(`item.${index}.sequence`),
      product_or_service: form.getValues(`item.${index}.product_or_service`),
    }));
    return buildCrossItemErrors(validationItems, benefitDetailsByCode, {
      requireEnhancementAllowed,
      enhancementExemptSequences: prefilledItemSequences,
    });
  }, [
    fields,
    benefitDetailsByCode,
    requireEnhancementAllowed,
    prefilledItemSequences,
    form,
  ]);

  // Adds an auto-generated, locked line item for a selected implant.
  // The implant code becomes the new item's product/service; the item is
  // linked back to its parent so it can be removed when the parent changes.
  const addImplantLineItem = (parentIndex: number, implant: Coding) => {
    const parentSequence = form.getValues(`item.${parentIndex}.sequence`);
    const parentCategory = form.getValues(`item.${parentIndex}.category`);
    const allItems = form.getValues("item") ?? [];
    const existingIndex = findExistingImplantItemIndex(
      allItems,
      parentSequence,
      implant.code,
    );
    if (existingIndex >= 0) {
      const existing = allItems[existingIndex];
      if (
        existing._implant_parent_sequence === parentSequence &&
        existing._implant_code === implant.code
      ) {
        return;
      }
      form.setValue(
        `item.${existingIndex}._implant_parent_sequence`,
        parentSequence,
        { shouldDirty: false },
      );
      form.setValue(`item.${existingIndex}._implant_code`, implant.code, {
        shouldDirty: false,
      });
      void form.trigger("item");
      return;
    }
    const existingSupportingInfo = form.getValues("supporting_info") ?? [];
    const allSupportingInfoSequences = existingSupportingInfo.map(
      (s) => s.sequence,
    );
    const nextSequence =
      Math.max(0, ...allItems.map((f) => f.sequence ?? 0)) + 1;
    append({
      sequence: nextSequence,
      category: parentCategory,
      product_or_service: implant,
      modifier: [],
      quantity: { value: 1 },
      diagnosis: defaultItemDiagnoses.map((d) => ({ ...d })),
      supporting_info_sequence: allSupportingInfoSequences,
      _implant_parent_sequence: parentSequence,
      _implant_code: implant.code,
    });
    void form.trigger("item");
  };

  // Removes the auto-generated line item associated with a given parent item
  // and implant code (no-op when none exists).
  const removeImplantLineItem = (
    parentSequence: number,
    implantCode: string,
  ) => {
    const allItems = form.getValues("item") ?? [];
    const targetIndex = allItems.findIndex(
      (it) =>
        it._implant_parent_sequence === parentSequence &&
        it._implant_code === implantCode,
    );
    if (targetIndex >= 0) {
      remove(targetIndex);
      void form.trigger("item");
    }
  };

  // Removes a line item along with every implant line item it generated.
  const removeItemAndImplants = (index: number) => {
    const allItems = form.getValues("item") ?? [];
    const parentSequence = allItems[index]?.sequence;
    const indexesToRemove = new Set<number>([index]);
    if (parentSequence != null) {
      allItems.forEach((it, i) => {
        if (it._implant_parent_sequence === parentSequence) {
          indexesToRemove.add(i);
        }
      });
    }
    remove([...indexesToRemove]);
    void form.trigger("item");
  };

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

      {focalPolicy?.sno && isPlanLoading && (
        <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-3">
          <InlineLoading label="Loading insurance plan details for procedure search…" />
        </div>
      )}

      <div className="space-y-4">
        {fields.map((field, index) => {
          const conditionErrors = form.watch(`item.${index}._condition_errors`);
          const mandatoryDiagnosisError = form.watch(
            `item.${index}._mandatory_diagnosis_error`,
          );
          const mandatorySupportingInfoError = form.watch(
            `item.${index}._mandatory_supporting_info_error`,
          );
          const crossItemErrorsKey =
            crossItemErrorsByIndex.get(index)?.join(" • ") ?? "";
          const isImplantItem = Boolean(
            form.watch(`item.${index}._implant_parent_sequence`),
          );
          const hasAnyError =
            !!conditionErrors ||
            !!crossItemErrorsKey ||
            !!mandatoryDiagnosisError ||
            !!mandatorySupportingInfoError;
          return (
            <Card
              key={field.id}
              className={cn(hasAnyError && "overflow-hidden border-red-500")}
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
                            <span className="text-red-500 text-sm ml-0.5">
                              *
                            </span>
                          </FormLabel>
                          <FormControl>
                            <BenefitSearchSelect
                              insurancePlanId={planId}
                              value={field.value}
                              categoryCode={
                                form.watch(`item.${index}.category`)?.code
                              }
                              categoryDisplay={
                                form.watch(`item.${index}.category`)?.display
                              }
                              onSelect={(benefit) => {
                                form.setValue(
                                  `item.${index}.product_or_service`,
                                  {
                                    system: PROCEDURE_CODE_SYSTEM,
                                    code: benefit.type_code,
                                    display: benefit.type_display,
                                  },
                                  { shouldValidate: true, shouldDirty: true },
                                );
                                form.setValue(
                                  `item.${index}.category`,
                                  {
                                    system: BENEFIT_CATEGORY_SYSTEM,
                                    code: benefit.coverage_type_code,
                                    display: benefit.coverage_type_display,
                                  },
                                  { shouldValidate: true, shouldDirty: true },
                                );
                              }}
                              disabled={isProductLocked}
                            />
                          </FormControl>
                          {isProductLocked && (
                            <p className="text-xs text-muted-foreground">
                              {isImplantItem
                                ? "Auto-added implant. Manage it from the originating item."
                                : "Product is locked. Remove this item and add a new one to change it."}
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            removeItemAndImplants(index);
                          }}
                          className={cn("mt-6", isImplantItem && "hidden")}
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
                      form.watch(`item.${index}.product_or_service`)?.code,
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
                              form.setValue(`item.${index}.category`, value, {
                                shouldValidate: true,
                                shouldDirty: true,
                              });
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

                <ModifierField
                  form={form}
                  index={index}
                  planId={planId}
                  disabled={isImplantItem}
                  onImplantAdd={(implant) => addImplantLineItem(index, implant)}
                  onImplantRemove={(parentSequence, implantCode) =>
                    removeImplantLineItem(parentSequence, implantCode)
                  }
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
                                e.target.value ? parseFloat(e.target.value) : 0,
                                { shouldValidate: true, shouldDirty: true },
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
                              form.setValue(
                                `item.${index}.quantity.unit`,
                                value,
                                {
                                  shouldValidate: true,
                                  shouldDirty: true,
                                },
                              );
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <CEItemValidationEffects
                  form={form}
                  index={index}
                  planId={planId}
                  crossItemErrorsKey={crossItemErrorsKey}
                />
              </CardContent>
              {hasAnyError && (
                <CardFooter className="rounded-b-xl px-6 py-3 border-t border-red-200 bg-red-50 flex-col items-start gap-2">
                  {crossItemErrorsKey &&
                    crossItemErrorsKey.split(" • ").map((err, i) => (
                      <div
                        key={`cross-${i}`}
                        className="flex items-center gap-2 text-sm font-medium text-red-600"
                      >
                        <AlertCircleIcon className="h-4 w-4 flex-shrink-0 text-red-600" />
                        {err}
                      </div>
                    ))}
                  {mandatoryDiagnosisError && (
                    <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                      <AlertCircleIcon className="h-4 w-4 flex-shrink-0 text-red-600" />
                      {mandatoryDiagnosisError}
                    </div>
                  )}
                  {mandatorySupportingInfoError && (
                    <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                      <AlertCircleIcon className="h-4 w-4 flex-shrink-0 text-red-600" />
                      {mandatorySupportingInfoError}
                    </div>
                  )}
                  {conditionErrors &&
                    conditionErrors.split(" • ").map((err, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-sm font-medium text-red-600"
                      >
                        <AlertCircleIcon className="h-4 w-4 flex-shrink-0 text-red-600" />
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
                      (s) => s.sequence,
                    );
                    append({
                      sequence:
                        Math.max(0, ...fields.map((f) => f.sequence)) + 1,
                      category: undefined as unknown as Coding,
                      product_or_service: undefined,
                      modifier: [],
                      quantity: {
                        value: 1,
                      },
                      diagnosis: defaultItemDiagnoses.map((d) => ({ ...d })),
                      supporting_info_sequence: allSequences,
                    });
                    void form.trigger("item");
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
  disabled = false,
  onImplantAdd,
  onImplantRemove,
}: {
  form: UseFormReturn<
    z.infer<typeof createCoverageEligibilityRequestFormSchema>
  >;
  index: number;
  planId: string | null;
  /** When true (auto-generated implant line items), the modifier UI is hidden. */
  disabled?: boolean;
  /** Called when an implant-type qualifier is selected on this item. */
  onImplantAdd?: (implant: Coding) => void;
  /** Called when an implant-type qualifier is removed from this item. */
  onImplantRemove?: (parentSequence: number, implantCode: string) => void;
}) {
  const productCode = form.watch(`item.${index}.product_or_service`)?.code;
  const parentSequence = form.watch(`item.${index}.sequence`);
  const rawAllItems = form.watch("item");

  const linkedImplants = useMemo(() => {
    const allItems = rawAllItems ?? [];
    if (parentSequence == null) return [];
    return getLinkedImplantsForParent(allItems, parentSequence);
  }, [rawAllItems, parentSequence]);

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

  const qualifierTypeByCode = useMemo(
    () => getQualifierTypeByCode(benefitDetail),
    [benefitDetail],
  );

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

  if (disabled) return null;

  return (
    <FormField
      control={form.control}
      name={`item.${index}.modifier`}
      render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel>
            Modifier
            {isModifierRequired(benefitDetail) && (
              <span className="text-red-500 text-sm ml-0.5">*</span>
            )}
          </FormLabel>
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
                  const isImplant =
                    qualifierTypeByCode.get(qualifier.code) === "implant";
                  if (isImplant) {
                    if (linkedImplants.some((i) => i.code === qualifier.code)) {
                      return;
                    }
                    onImplantAdd?.(qualifier);
                    return;
                  }
                  const existing = (field.value ?? []).filter(
                    (c) => qualifierTypeByCode.get(c.code) !== "implant",
                  );
                  if (existing.some((c) => c.code === qualifier.code)) return;
                  form.setValue(
                    `item.${index}.modifier`,
                    [...existing, qualifier],
                    { shouldValidate: true, shouldDirty: true },
                  );
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
                {(field.value ?? [])
                  .filter(
                    (code) => qualifierTypeByCode.get(code.code) !== "implant",
                  )
                  .map((code) => (
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
                            (field.value ?? []).filter(
                              (c) => c.code !== code.code,
                            ),
                            { shouldValidate: true, shouldDirty: true },
                          );
                        }}
                      />
                    </Badge>
                  ))}
                {linkedImplants.map((implant) => (
                  <Badge key={implant.code} className="flex gap-2">
                    <span className="font-mono">{implant.code}</span>
                    {implant.display && (
                      <span className="opacity-80"> – {implant.display}</span>
                    )}
                    <XIcon
                      className="w-4 h-4 cursor-pointer"
                      onClick={() => {
                        if (parentSequence == null) return;
                        onImplantRemove?.(parentSequence, implant.code);
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

function CEItemValidationEffects({
  form,
  index,
  planId,
  crossItemErrorsKey = "",
}: {
  form: UseFormReturn<
    z.infer<typeof createCoverageEligibilityRequestFormSchema>
  >;
  index: number;
  planId: string | null;
  crossItemErrorsKey?: string;
}) {
  const productCode = form.watch(`item.${index}.product_or_service`)?.code;
  const quantityValue = form.watch(`item.${index}.quantity.value`);
  const rawModifiers = form.watch(`item.${index}.modifier`);
  const isImplantItem = Boolean(
    form.watch(`item.${index}._implant_parent_sequence`),
  );
  const currentSequence = form.watch(`item.${index}.sequence`);
  const rawAllItems = form.watch("item");

  const modifiers = useMemo(
    () => rawModifiers ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(rawModifiers)],
  );

  const linkedImplantCount = useMemo(() => {
    const allItems = rawAllItems ?? [];
    if (isImplantItem || currentSequence == null) return undefined;
    return countImplantLineItemsForParent(allItems, currentSequence);
  }, [rawAllItems, currentSequence, isImplantItem]);

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

  useEffect(() => {
    const conditionErrors = isImplantItem
      ? []
      : buildBenefitConditionErrors(
          benefitDetail,
          Number(quantityValue),
          modifiers,
          { linkedImplantCount: linkedImplantCount ?? 0 },
        );
    const crossItemErrors = crossItemErrorsKey
      ? crossItemErrorsKey.split(" • ")
      : [];
    const allErrors = [...conditionErrors, ...crossItemErrors];
    const nextError = allErrors.length > 0 ? allErrors.join(" • ") : undefined;
    const currentError = form.getValues(`item.${index}._condition_errors`);

    if (currentError !== nextError) {
      form.setValue(`item.${index}._condition_errors`, nextError, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
  }, [
    benefitDetail,
    quantityValue,
    modifiers,
    linkedImplantCount,
    isImplantItem,
    crossItemErrorsKey,
    form,
    index,
  ]);

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
  const diagnosisValidation = getCardSectionValidationCounts(
    diagnosisFields,
    getCeDiagnosisCardError,
  );
  const hasSectionError = hasSectionValidationIssue(diagnosisValidation);

  const {
    field: mandatoryDiagnosisField,
    fieldState: mandatoryDiagnosisFieldState,
  } = useController({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    name: `item.${index}._mandatory_diagnosis_error` as any,
    control: form.control,
  });

  useEffect(() => {
    const nextError = getSectionVirtualErrorMessage(
      diagnosisValidation,
      "diagnosis",
    );
    syncVirtualFormErrorFromForm(
      form,
      `item.${index}._mandatory_diagnosis_error`,
      nextError,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form,
    index,
    diagnosisValidation.requiredMissing,
    diagnosisValidation.incomplete,
    diagnosisFields.length,
  ]);

  const sectionErrorMessage =
    mandatoryDiagnosisFieldState.error?.message ||
    (mandatoryDiagnosisField.value as string | undefined);

  const addNewDiagnosis = () => {
    const currentDiagnoses = form.getValues(`item.${index}.diagnosis`) || [];
    const newDiagnosis = {
      diagnosis_reference: undefined,
      diagnosis_code: undefined,
    };
    form.setValue(
      `item.${index}.diagnosis`,
      [...currentDiagnoses, newDiagnosis],
      { shouldValidate: true, shouldDirty: true },
    );
  };

  const removeDiagnosis = (diagnosisIndex: number) => {
    const currentDiagnoses = form.getValues(`item.${index}.diagnosis`) || [];
    const updatedDiagnoses = currentDiagnoses.filter(
      (_, i) => i !== diagnosisIndex,
    );
    form.setValue(`item.${index}.diagnosis`, updatedDiagnoses, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex items-center justify-between cursor-pointer p-3 border rounded-lg hover:bg-muted/50",
          hasSectionError && sectionErrorBorderClass,
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4" />
          ) : (
            <ChevronRightIcon className="w-4 h-4" />
          )}
          <span className="font-medium">Diagnoses</span>
          {!hasSectionError && diagnosisFields.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {diagnosisFields.length}
            </Badge>
          )}
          <SectionValidationBadges counts={diagnosisValidation} />
        </div>
      </div>

      <SectionErrorMessage message={sectionErrorMessage} />

      {isExpanded && (
        <div className="space-y-4 pl-4">
          {diagnosisFields.map((diagnosis, diagnosisIndex) => {
            const cardError = getCeDiagnosisCardError(diagnosis);
            return (
              <Card
                key={diagnosisIndex}
                className={cn(cardError && cardErrorBorderClass)}
              >
                <CardHeader>
                  <div className="flex justify-between items-center gap-2">
                    <FormField
                      control={form.control}
                      name={`item.${index}.diagnosis.${diagnosisIndex}.diagnosis_code`}
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
                              system="system-coverage-eligibility-request-item-diagnosis-code"
                              value={field.value}
                              onSelect={(value) => {
                                form.setValue(
                                  `item.${index}.diagnosis.${diagnosisIndex}.diagnosis_code`,
                                  value,
                                  { shouldValidate: true, shouldDirty: true },
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
                {cardError && <FormCardErrorFooter message={cardError} />}
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
  const itemSpecificSupportingInfo = supportingInfoFields.filter((info) =>
    itemSupportingInfoSequences.includes(info.sequence),
  );
  const supportingInfoValidation = getCardSectionValidationCounts(
    itemSpecificSupportingInfo,
    getCeSupportingInfoCardError,
  );
  const hasSectionError = hasSectionValidationIssue(supportingInfoValidation);

  const {
    field: mandatorySupportingInfoField,
    fieldState: mandatorySupportingInfoFieldState,
  } = useController({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    name: `item.${index}._mandatory_supporting_info_error` as any,
    control: form.control,
  });

  useEffect(() => {
    const nextError = getSectionVirtualErrorMessage(
      supportingInfoValidation,
      "supporting information entry",
    );
    syncVirtualFormErrorFromForm(
      form,
      `item.${index}._mandatory_supporting_info_error`,
      nextError,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form,
    index,
    supportingInfoValidation.requiredMissing,
    supportingInfoValidation.incomplete,
    itemSpecificSupportingInfo.length,
  ]);

  const sectionErrorMessage =
    mandatorySupportingInfoFieldState.error?.message ||
    (mandatorySupportingInfoField.value as string | undefined);

  const addNewSupportingInfo = () => {
    const currentSupportingInfo = form.getValues("supporting_info") || [];
    const newSequence =
      Math.max(0, ...currentSupportingInfo.map((s) => s.sequence)) + 1;
    const newSupportingInfo = {
      sequence: newSequence,
      value_string: undefined,
      value_attachment: undefined,
      value_file: undefined,
    };

    form.setValue(
      "supporting_info",
      [...currentSupportingInfo, newSupportingInfo],
      { shouldValidate: true, shouldDirty: true },
    );

    const currentSequences =
      form.getValues(`item.${index}.supporting_info_sequence`) || [];
    form.setValue(
      `item.${index}.supporting_info_sequence`,
      [...currentSequences, newSequence],
      { shouldValidate: true, shouldDirty: true },
    );
  };

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex items-center justify-between cursor-pointer p-3 border rounded-lg hover:bg-muted/50",
          hasSectionError && sectionErrorBorderClass,
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
          {!hasSectionError && itemSpecificSupportingInfo.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {itemSpecificSupportingInfo.length}
            </Badge>
          )}
          <SectionValidationBadges counts={supportingInfoValidation} />
        </div>
      </div>

      <SectionErrorMessage message={sectionErrorMessage} />

      {isExpanded && (
        <div className="space-y-4 pl-4">
          {itemSpecificSupportingInfo.map((info, infoIndex) => {
            const mainInfoIndex = supportingInfoFields.findIndex(
              (i) => i.sequence === info.sequence,
            );
            const cardError = getCeSupportingInfoCardError(info);
            return (
              <Card
                key={infoIndex}
                className={cn(cardError && cardErrorBorderClass)}
              >
                <CardContent className="space-y-4 pt-6">
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const currentSupportingInfo =
                          form.getValues("supporting_info") || [];
                        const updatedSupportingInfo =
                          currentSupportingInfo.filter(
                            (_, i) => i !== mainInfoIndex,
                          );
                        form.setValue(
                          "supporting_info",
                          updatedSupportingInfo,
                          { shouldValidate: true, shouldDirty: true },
                        );

                        const items = form.getValues("item") || [];
                        items.forEach((item, itemIndex) => {
                          const currentSequences =
                            item.supporting_info_sequence || [];
                          const updatedSequences = currentSequences.filter(
                            (seq) => seq !== info.sequence,
                          );
                          form.setValue(
                            `item.${itemIndex}.supporting_info_sequence`,
                            updatedSequences,
                            { shouldValidate: true, shouldDirty: true },
                          );
                        });
                      }}
                    >
                      <CircleMinusIcon className="h-6 w-6 text-danger-500" />
                    </Button>
                  </div>
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
                                e.target.value || undefined,
                                { shouldValidate: true, shouldDirty: true },
                              );
                              form.setValue(
                                `supporting_info.${mainInfoIndex}.value_attachment`,
                                undefined,
                                { shouldValidate: true, shouldDirty: true },
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
                {cardError && <FormCardErrorFooter message={cardError} />}
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
    `supporting_info.${mainInfoIndex}.value_attachment`,
  );

  const { data: existingFile, isLoading: isFileLoading } = useQuery({
    queryKey: ["file", attachmentId],
    queryFn: () => apis.file.get(attachmentId as string),
    enabled: !!attachmentId && !currentFile,
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue(`supporting_info.${mainInfoIndex}.value_file`, file, {
        shouldValidate: true,
        shouldDirty: true,
      });
      form.setValue(
        `supporting_info.${mainInfoIndex}.value_string`,
        undefined,
        { shouldValidate: true, shouldDirty: true },
      );
    }
  };

  const handleRemoveFile = () => {
    form.setValue(`supporting_info.${mainInfoIndex}.value_file`, undefined, {
      shouldValidate: true,
      shouldDirty: true,
    });
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

              {!currentFile && isFileLoading && attachmentId && (
                <Skeleton className="h-[72px] w-full rounded-lg" />
              )}

              {!currentFile && existingFile?.read_signed_url && (
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50/50">
                  <div className="flex-shrink-0">
                    {existingFile.extension &&
                    ["jpg", "jpeg", "png", "gif", "webp"].includes(
                      existingFile.extension.toLowerCase(),
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
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.json"
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
