import { Card, CardContent, CardHeader } from "../ui/card";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  InsurancePlanQuestionnaireDetail,
  InsurancePlanSupportingInfoRequirement,
  QuestionnaireAnswerOption,
  QuestionnaireItem,
  QuestionnaireItemType,
} from "@/types/insurance_plan";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FieldArrayPath,
  FieldPath,
  UseFormReturn,
  useController,
  useFieldArray,
  useWatch,
} from "react-hook-form";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";

import { Textarea } from "../ui/textarea";
import { apis } from "@/apis";
import { ClaimUseChoice } from "@/types/claim";
import { CoverageEligibilityRequest } from "@/types/coverage_eligibility";
import {
  buildInitialItems,
  countMissingRequiredItems,
  hasAnswerValue,
  itemLabel,
} from "./questionnaire-helpers";
import { QuestionnaireResponseItemInput } from "./schema";
import { cn } from "@/lib/utils";
import { createClaimFormSchema } from "./schema";
import { uploadFile } from "@/lib/upload-file";
import { useGlobalStore } from "@/hooks/use-global-store";
import { z } from "zod";


// ─── Quantity input (separate component to avoid conditional hook call) ───────

function QuantityInput({
  answerPath,
  form,
  disabled,
}: {
  answerPath: string;
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
  disabled: boolean;
}) {
  const { field } = useController({
    name: `${answerPath}.value_quantity` as FieldPath<
      z.infer<typeof createClaimFormSchema>
    >,
    control: form.control,
  });
  const qty = (field.value as { value?: number; unit?: string }) ?? {};

  return (
    <div className="flex gap-2">
      <Input
        type="number"
        step="any"
        value={qty.value ?? ""}
        onChange={(e) =>
          field.onChange({
            ...qty,
            value:
              e.target.value === "" ? undefined : parseFloat(e.target.value),
          })
        }
        disabled={disabled}
        placeholder="Value"
        className="flex-1"
      />
      <Input
        value={qty.unit ?? ""}
        onChange={(e) => field.onChange({ ...qty, unit: e.target.value })}
        disabled={disabled}
        placeholder="Unit"
        className="w-28"
      />
    </div>
  );
}

// ─── Choice input (radio ≤ 4, dropdown > 4) ──────────────────────────────────

function ChoiceInput({
  fhirItem,
  answerPath,
  form,
  disabled,
}: {
  fhirItem: QuestionnaireItem;
  answerPath: string;
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
  disabled: boolean;
}) {
  const options: QuestionnaireAnswerOption[] = fhirItem.answerOption ?? [];

  const { field: codingField } = useController({
    name: `${answerPath}.value_coding` as FieldPath<
      z.infer<typeof createClaimFormSchema>
    >,
    control: form.control,
  });
  const { field: strField } = useController({
    name: `${answerPath}.value_string` as FieldPath<
      z.infer<typeof createClaimFormSchema>
    >,
    control: form.control,
  });

  const selectedCode =
    (codingField.value as { code?: string })?.code ??
    (strField.value as string) ??
    "";

  const getOptionLabel = (opt: QuestionnaireAnswerOption) =>
    opt.valueCoding?.display ??
    opt.valueCoding?.code ??
    opt.valueString ??
    String(opt.valueInteger ?? "");

  const getOptionValue = (opt: QuestionnaireAnswerOption) =>
    opt.valueCoding?.code ?? opt.valueString ?? String(opt.valueInteger ?? "");

  const handleSelect = (optValue: string) => {
    const opt = options.find((o) => getOptionValue(o) === optValue);
    if (!opt) return;
    if (opt.valueCoding) {
      codingField.onChange(opt.valueCoding);
      strField.onChange(undefined);
    } else {
      codingField.onChange(undefined);
      strField.onChange(opt.valueString ?? String(opt.valueInteger ?? ""));
    }
  };

  if (options.length <= 4) {
    return (
      <div className="space-y-2">
        {options.map((opt) => {
          const val = getOptionValue(opt);
          const checked = selectedCode === val;
          return (
            <label
              key={val}
              className={cn(
                "flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors text-sm",
                checked
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <input
                type="radio"
                className="accent-primary"
                checked={checked}
                disabled={disabled}
                onChange={() => handleSelect(val)}
              />
              {getOptionLabel(opt)}
            </label>
          );
        })}
        {fhirItem.type === "open-choice" && (
          <Input
            value={
              options.some((o) => getOptionValue(o) === selectedCode)
                ? ""
                : (strField.value as string) ?? ""
            }
            onChange={(e) => {
              codingField.onChange(undefined);
              strField.onChange(e.target.value || undefined);
            }}
            disabled={disabled}
            placeholder="Or type a custom value…"
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Select
        value={selectedCode}
        onValueChange={handleSelect}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select an option…" />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => {
            const val = getOptionValue(opt);
            return (
              <SelectItem key={val} value={val}>
                {getOptionLabel(opt)}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {fhirItem.type === "open-choice" && (
        <Input
          value={
            options.some((o) => getOptionValue(o) === selectedCode)
              ? ""
              : (strField.value as string) ?? ""
          }
          onChange={(e) => {
            codingField.onChange(undefined);
            strField.onChange(e.target.value || undefined);
          }}
          disabled={disabled}
          placeholder="Or type a custom value…"
        />
      )}
    </div>
  );
}

// ─── Attachment input ─────────────────────────────────────────────────────────

function AttachmentInput({
  answerPath,
  form,
  disabled,
  encounterId,
}: {
  answerPath: string;
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
  disabled: boolean;
  encounterId: string;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const { field } = useController({
    name: `${answerPath}.value_attachment` as FieldPath<
      z.infer<typeof createClaimFormSchema>
    >,
    control: form.control,
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const result = await uploadFile(file, {
        file_type: "encounter",
        file_category: "unspecified",
        name: file.name,
        associating_id: encounterId,
        original_name: file.name,
        mime_type: file.type,
      });
      field.onChange(result.id);
    } catch {
      // silently ignore; user can retry
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  if (field.value) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-green-600 font-medium">✓ File uploaded</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => field.onChange(undefined)}
          disabled={disabled}
        >
          Remove
        </Button>
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || isUploading}
        className="relative"
        asChild
      >
        <span>
          {isUploading ? "Uploading…" : "Upload file"}
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileChange}
            disabled={disabled || isUploading}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.txt"
          />
        </span>
      </Button>
    </div>
  );
}

// ─── Single-answer leaf input  ────────────────────────────────────────────────

function QuestionnaireAnswerInput({
  fhirItem,
  answerPath,
  form,
  encounterId,
}: {
  fhirItem: QuestionnaireItem;
  answerPath: string;
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
  encounterId: string;
}) {
  const typeToValueField: Partial<Record<QuestionnaireItemType, string>> = {
    boolean: "value_boolean",
    decimal: "value_decimal",
    integer: "value_integer",
    date: "value_date",
    dateTime: "value_date_time",
    time: "value_time",
    string: "value_string",
    text: "value_string",
    url: "value_uri",
  };

  const valueField = typeToValueField[fhirItem.type];
  const { field } = useController({
    name: (valueField
      ? `${answerPath}.${valueField}`
      : `${answerPath}.__noop`) as FieldPath<
      z.infer<typeof createClaimFormSchema>
    >,
    control: form.control,
  });

  const disabled = !!fhirItem.readOnly;

  if (fhirItem.type === "boolean") {
    return (
      <div className="flex items-center gap-2 h-9">
        <Checkbox
          checked={!!field.value}
          onCheckedChange={field.onChange}
          disabled={disabled}
        />
        <span className="text-sm">{field.value ? "Yes" : "No"}</span>
      </div>
    );
  }

  if (fhirItem.type === "text") {
    return (
      <Textarea
        value={(field.value as string) ?? ""}
        onChange={(e) => field.onChange(e.target.value || undefined)}
        placeholder="Enter text…"
        disabled={disabled}
        rows={3}
      />
    );
  }

  if (fhirItem.type === "decimal") {
    return (
      <Input
        type="number"
        step="any"
        value={(field.value as number) ?? ""}
        onChange={(e) =>
          field.onChange(
            e.target.value === "" ? undefined : parseFloat(e.target.value)
          )
        }
        disabled={disabled}
        placeholder="0.00"
      />
    );
  }

  if (fhirItem.type === "integer") {
    return (
      <Input
        type="number"
        step="1"
        value={(field.value as number) ?? ""}
        onChange={(e) =>
          field.onChange(
            e.target.value === "" ? undefined : parseInt(e.target.value, 10)
          )
        }
        disabled={disabled}
        placeholder="0"
      />
    );
  }

  if (fhirItem.type === "date") {
    return (
      <Input
        type="date"
        value={(field.value as string) ?? ""}
        onChange={(e) => field.onChange(e.target.value || undefined)}
        disabled={disabled}
      />
    );
  }

  if (fhirItem.type === "dateTime") {
    return (
      <Input
        type="datetime-local"
        value={(field.value as string) ?? ""}
        onChange={(e) => field.onChange(e.target.value || undefined)}
        disabled={disabled}
      />
    );
  }

  if (fhirItem.type === "time") {
    return (
      <Input
        type="time"
        value={(field.value as string) ?? ""}
        onChange={(e) => field.onChange(e.target.value || undefined)}
        disabled={disabled}
      />
    );
  }

  if (fhirItem.type === "url") {
    return (
      <Input
        type="url"
        value={(field.value as string) ?? ""}
        onChange={(e) => field.onChange(e.target.value || undefined)}
        disabled={disabled}
        placeholder="https://…"
      />
    );
  }

  if (fhirItem.type === "quantity") {
    return (
      <QuantityInput answerPath={answerPath} form={form} disabled={disabled} />
    );
  }

  if (fhirItem.type === "choice" || fhirItem.type === "open-choice") {
    return (
      <ChoiceInput
        fhirItem={fhirItem}
        answerPath={answerPath}
        form={form}
        disabled={disabled}
      />
    );
  }

  if (fhirItem.type === "attachment") {
    return (
      <AttachmentInput
        answerPath={answerPath}
        form={form}
        disabled={disabled}
        encounterId={encounterId}
      />
    );
  }

  // string / fallback
  return (
    <Input
      value={(field.value as string) ?? ""}
      onChange={(e) => field.onChange(e.target.value || undefined)}
      disabled={disabled}
      placeholder="Enter value…"
    />
  );
}

// ─── Repeating answers wrapper ────────────────────────────────────────────────

function RepeatingAnswerField({
  fhirItem,
  itemBasePath,
  form,
  encounterId,
}: {
  fhirItem: QuestionnaireItem;
  itemBasePath: string;
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
  encounterId: string;
}) {
  const { fields, append, remove } = useFieldArray({
    name: `${itemBasePath}.answer` as FieldArrayPath<
      z.infer<typeof createClaimFormSchema>
    >,
    control: form.control,
  });

  return (
    <div className="space-y-2">
      {fields.map((f, idx) => (
        <div key={f.id} className="flex items-start gap-2">
          <div className="flex-1">
            <QuestionnaireAnswerInput
              fhirItem={fhirItem}
              answerPath={`${itemBasePath}.answer.${idx}`}
              form={form}
              encounterId={encounterId}
            />
          </div>
          {fields.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => remove(idx)}
            >
              <TrashIcon className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        onClick={() => append({})}
      >
        <PlusIcon className="h-3 w-3 mr-1" />
        Add answer
      </Button>
    </div>
  );
}

// ─── Recursive FHIR item renderer ────────────────────────────────────────────

function QuestionnaireItemRenderer({
  fhirItem,
  itemBasePath,
  form,
  depth,
  encounterId,
}: {
  fhirItem: QuestionnaireItem;
  itemBasePath: string;
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
  depth: number;
  encounterId: string;
}) {
  const [groupExpanded, setGroupExpanded] = useState(true);

  // Always watch the answer array so the required-error indicator stays in
  // sync as the user fills in the field.  Called unconditionally (hook rule).
  const watchedAnswer = useWatch({
    control: form.control,
    name: `${itemBasePath}.answer` as FieldPath<
      z.infer<typeof createClaimFormSchema>
    >,
  }) as Array<Record<string, unknown>> | undefined;

  if (fhirItem.type === "display") {
    return (
      <p className="text-sm text-muted-foreground italic py-0.5">
        {itemLabel(fhirItem)}
      </p>
    );
  }

  if (fhirItem.type === "group") {
    return (
      <div
        className={cn("space-y-3", depth > 0 && "border-l-2 border-muted pl-4")}
      >
        <button
          type="button"
          className="flex items-center gap-1.5 w-full text-left"
          onClick={() => setGroupExpanded((v) => !v)}
        >
          {groupExpanded ? (
            <ChevronDownIcon className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="font-medium text-sm">{itemLabel(fhirItem)}</span>
        </button>
        {groupExpanded &&
          fhirItem.item?.map((child, ci) => (
            <QuestionnaireItemRenderer
              key={child.linkId}
              fhirItem={child}
              itemBasePath={`${itemBasePath}.item.${ci}`}
              form={form}
              depth={depth + 1}
              encounterId={encounterId}
            />
          ))}
      </div>
    );
  }

  const answers = watchedAnswer ?? [];
  const hasValue = fhirItem.repeats
    ? answers.some((a) => hasAnswerValue(a))
    : hasAnswerValue(answers[0]);
  const showRequiredError =
    fhirItem.required && form.formState.isSubmitted && !hasValue;

  return (
    <FormItem className="space-y-1.5">
      <FormLabel className="text-sm">
        {itemLabel(fhirItem)}
        {fhirItem.required && <span className="text-red-500 ml-0.5">*</span>}
        {fhirItem.readOnly && (
          <Badge variant="secondary" className="ml-2 text-xs font-normal">
            Read-only
          </Badge>
        )}
      </FormLabel>
      <FormControl>
        {fhirItem.repeats ? (
          <RepeatingAnswerField
            fhirItem={fhirItem}
            itemBasePath={itemBasePath}
            form={form}
            encounterId={encounterId}
          />
        ) : (
          <QuestionnaireAnswerInput
            fhirItem={fhirItem}
            answerPath={`${itemBasePath}.answer.0`}
            form={form}
            encounterId={encounterId}
          />
        )}
      </FormControl>
      {showRequiredError && (
        <p className="text-sm font-medium text-destructive">
          This field is required
        </p>
      )}
      <FormMessage />
    </FormItem>
  );
}

// ─── Single questionnaire response card ──────────────────────────────────────

export function QuestionnaireResponseCard({
  detail,
  qrIdx,
  form,
  encounterId,
  onRemove,
}: {
  detail: InsurancePlanQuestionnaireDetail;
  qrIdx: number;
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
  encounterId: string;
  onRemove?: () => void;
}) {
  const PURPOSE_LABELS: Record<string, string> = {
    STG: "Standard Treatment Guidelines",
    PHX: "Past / Family History",
  };

  // Track required-item completeness and surface as a virtual error field so
  // the Zod refine on claimQuestionnaireResponseSchema blocks submission.
  const { field: requiredItemsField, fieldState: requiredItemsFieldState } =
    useController({
      name: `questionnaire_responses.${qrIdx}._required_items_error` as FieldPath<
        z.infer<typeof createClaimFormSchema>
      >,
      control: form.control,
    });

  const watchedItems = useWatch({
    control: form.control,
    name: `questionnaire_responses.${qrIdx}.item` as FieldPath<
      z.infer<typeof createClaimFormSchema>
    >,
  }) as QuestionnaireResponseItemInput[] | undefined;

  useEffect(() => {
    const missing = countMissingRequiredItems(detail.items, watchedItems ?? []);
    requiredItemsField.onChange(
      missing > 0
        ? `${missing} required question(s) must be answered`
        : undefined
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedItems, detail.items, requiredItemsField.onChange]);

  const errorMessage =
    requiredItemsFieldState.error?.message ||
    (requiredItemsField.value as string | undefined);
  const hasError = !!errorMessage;

  return (
    <Card
      className={cn(
        "border",
        hasError
          ? "border-destructive bg-destructive/5"
          : "border-muted"
      )}
    >
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-center gap-2">
          <ClipboardListIcon
            className={cn(
              "w-4 h-4 shrink-0",
              hasError ? "text-destructive" : "text-primary"
            )}
          />
          <span className="font-semibold text-sm">{detail.title}</span>
          {hasError && (
            <Badge variant="destructive" className="ml-1 text-xs font-normal gap-1">
              <AlertCircleIcon className="w-3 h-3" />
              Incomplete
            </Badge>
          )}
          {detail.purpose && (
            <Badge variant="outline" className="ml-auto text-xs font-normal">
              {PURPOSE_LABELS[detail.purpose] ?? detail.purpose}
            </Badge>
          )}
          {onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 ml-auto text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onRemove}
            >
              <TrashIcon className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        {detail.items.map((fhirItem, idx) => (
          <QuestionnaireItemRenderer
            key={fhirItem.linkId}
            fhirItem={fhirItem}
            itemBasePath={`questionnaire_responses.${qrIdx}.item.${idx}`}
            form={form}
            depth={0}
            encounterId={encounterId}
          />
        ))}
        {hasError && (
          <div className="flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            <AlertCircleIcon className="w-4 h-4 shrink-0" />
            {errorMessage}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Per-item questionnaire section (exported) ────────────────────────────────

export function AddQuestionnaireSection({
  form,
  index,
  planId,
  coverageEligibilityRequest,
  claimUse,
}: {
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
  index: number;
  planId: string | null;
  /**
   * When provided alongside `claimUse === "preauthorization"`, the IPB benefit
   * questionnaire requirements are filtered down to the strict intersection
   * with the CE response's required questionnaires for this item's procedure
   * code. For `claimUse === "claim"` (or when no CE request is available) all
   * benefit-driven questionnaire requirements are shown unfiltered.
   */
  coverageEligibilityRequest?: CoverageEligibilityRequest;
  claimUse: ClaimUseChoice | undefined;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const didAutoExpandRef = useRef(false);
  const { getStore } = useGlobalStore();
  const encounterId = getStore<string>("encounterId");

  const productCode = form.watch(`item.${index}.product_or_service`)?.code;

  // Reuses cached benefit detail shared with ModifierField / AddSupportingInfoSection
  const { data: benefitDetail, isLoading: isBenefitLoading } = useQuery({
    queryKey: ["insurancePlanBenefit", "lookup", planId, productCode],
    queryFn: () =>
      apis.insurancePlanBenefit.lookup({
        insurance_plan: planId!,
        type_code: productCode!,
      }),
    enabled: Boolean(planId && productCode),
    staleTime: 5 * 60 * 1000,
  });

  // CE response questionnaires expected for this item, if we are running in
  // PA-via-CE:AR mode. `null` means "no filtering"; an empty Set means "the
  // CE response had nothing for this item — show nothing".
  // Per the schema, CE `required_questionnaires[].id` matches IPB
  // requirement `questionnaire.fhir_id`.
  const ceQuestionnaireFhirIdsForItem = useMemo(() => {
    if (claimUse !== "preauthorization") return null;
    if (!coverageEligibilityRequest || !productCode) return null;
    const allItems =
      coverageEligibilityRequest.latest_response?.insurances?.flatMap(
        (i) => i.items ?? []
      ) ?? [];
    const matchedItem = allItems.find((item) => item.code === productCode);
    if (!matchedItem) return new Set<string>();
    return new Set(matchedItem.required_questionnaires.map((q) => q.id));
  }, [coverageEligibilityRequest, claimUse, productCode]);

  // Questionnaire requirements are supporting_info_requirements that have a
  // documentation_url. is_required is read directly from the requirement.
  const questionnaireRequirements = useMemo(() => {
    const all = benefitDetail?.supporting_info_requirements ?? [];
    const qReqs = all.filter((req) => req.documentation_url !== null);

    const filtered = ceQuestionnaireFhirIdsForItem
      ? qReqs.filter((req) => {
          const fhir = req.questionnaire?.fhir_id;
          return !!fhir && ceQuestionnaireFhirIdsForItem.has(fhir);
        })
      : qReqs;

    const seen = new Set<string>();
    return filtered.filter((req) => {
      const key = req.questionnaire?.fhir_id ?? req.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [benefitDetail, ceQuestionnaireFhirIdsForItem]);

  const requiredRequirements = useMemo(
    () => questionnaireRequirements.filter((req) => req.is_required),
    [questionnaireRequirements]
  );

  const optionalRequirements = useMemo(
    () => questionnaireRequirements.filter((req) => !req.is_required),
    [questionnaireRequirements]
  );

  // Build the list of questionnaire ids to fetch — one per unique requirement.
  // The `id` is now carried directly on the requirement's questionnaire ref.
  const questionnaireIdsToFetch = useMemo(() => {
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const req of questionnaireRequirements) {
      const id = req.questionnaire?.id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
    return ids;
  }, [questionnaireRequirements]);

  const detailQueries = useQueries({
    queries: questionnaireIdsToFetch.map((id) => ({
      queryKey: ["insurancePlanQuestionnaire", id],
      queryFn: () => apis.insurancePlanQuestionnaire.get(id),
      enabled: Boolean(id),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const allDetailsLoaded = detailQueries.every((q) => !q.isLoading);
  const loadedDetails = useMemo(
    () =>
      detailQueries
        .map((q) => q.data)
        .filter(Boolean) as InsurancePlanQuestionnaireDetail[],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [detailQueries.map((q) => q.dataUpdatedAt).join()]
  );

  const detailById = useMemo(() => {
    const map = new Map<string, InsurancePlanQuestionnaireDetail>();
    for (const detail of loadedDetails) {
      map.set(detail.id, detail);
    }
    return map;
  }, [loadedDetails]);

  const getDetailForReq = (req: InsurancePlanSupportingInfoRequirement) => {
    if (!req.questionnaire?.id) return undefined;
    return detailById.get(req.questionnaire.id);
  };

  const watchedQR = form.watch("questionnaire_responses") ?? [];

  // Count only QRs that belong to this item's loaded questionnaire details (not all QRs globally).
  const itemQRCount = useMemo(() => {
    const detailUrls = new Set(loadedDetails.map((d) => d.full_url));
    return watchedQR.filter((qr) => detailUrls.has(qr.questionnaire)).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedDetails.map((d) => d.full_url).join(), watchedQR]);

  // Auto-expand once when pre-filled questionnaire responses exist for this item's plan.
  const matchedPrefillCount = useMemo(
    () =>
      loadedDetails.filter((detail) =>
        watchedQR.some((r) => r.questionnaire === detail.full_url)
      ).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loadedDetails.map((d) => d.full_url).join(), watchedQR]
  );

  useEffect(() => {
    if (matchedPrefillCount > 0 && !didAutoExpandRef.current) {
      didAutoExpandRef.current = true;
      setIsExpanded(true);
    }
  }, [matchedPrefillCount]);

  type QStatus = "missing" | "added";

  const getQStatus = (req: InsurancePlanSupportingInfoRequirement): QStatus => {
    const detail = getDetailForReq(req);
    if (!detail) return "missing";
    return watchedQR.some((r) => r.questionnaire === detail.full_url)
      ? "added"
      : "missing";
  };

  const requiredStatuses = useMemo(
    () => requiredRequirements.map((req) => ({ req, status: getQStatus(req) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [requiredRequirements, watchedQR, detailById]
  );

  const optionalStatuses = useMemo(
    () => optionalRequirements.map((req) => ({ req, status: getQStatus(req) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [optionalRequirements, watchedQR, detailById]
  );

  const unsatisfiedCount = requiredStatuses.filter(
    ({ status }) => status !== "added"
  ).length;

  // Validation controller for mandatory questionnaires
  const { field: mandatoryQRField, fieldState: mandatoryQRFieldState } =
    useController({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      name: `item.${index}._mandatory_questionnaires_error` as any,
      control: form.control,
    });

  useEffect(() => {
    if (requiredRequirements.length > 0 && unsatisfiedCount > 0) {
      mandatoryQRField.onChange(
        `${unsatisfiedCount} required questionnaire(s) must be completed before submitting`
      );
    } else {
      mandatoryQRField.onChange(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mandatoryQRField.onChange, requiredRequirements.length, unsatisfiedCount]);

  // Initialise a questionnaire response entry when the user clicks Add
  const addQuestionnaireForReq = (
    req: InsurancePlanSupportingInfoRequirement
  ) => {
    const detail = getDetailForReq(req);
    if (!detail) return;
    const currentResponses = form.getValues("questionnaire_responses") ?? [];
    if (currentResponses.find((r) => r.questionnaire === detail.full_url))
      return;

    // Compute a unique sequence that doesn't collide with supporting_info or
    // any existing questionnaire_response sequences.
    const currentSupportingInfo = form.getValues("supporting_info") ?? [];
    const allSeqs = [
      ...currentSupportingInfo.map((s) => s.sequence),
      ...currentResponses.map((qr) => qr.sequence),
    ];
    const newSequence = Math.max(0, ...allSeqs) + 1;

    // Link the questionnaire sequence to this item's information_sequence FIRST
    // so that any intermediate render triggered by the questionnaire_responses
    // update already sees the sequence as item-linked.
    const currentItemSeqs =
      form.getValues(`item.${index}.information_sequence`) ?? [];
    form.setValue(
      `item.${index}.information_sequence`,
      [...currentItemSeqs, newSequence],
      { shouldDirty: true }
    );

    form.setValue(
      "questionnaire_responses",
      [
        ...currentResponses,
        {
          sequence: newSequence,
          questionnaire: detail.full_url,
          category: {
            system:
              "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
            code: "STG",
            display: "Standard Treatment Guidelines",
          },
          code: {
            system:
              "https://nrces.in/ndhm/fhir/r4/ValueSet/ndhm-supportinginfo-code",
            code: "ARC",
            display:
              "Additional info related to claim (conveying additional situation and condition information.)",
          },
          item: buildInitialItems(detail.items),
        },
      ],
      { shouldDirty: true }
    );

    if (!isExpanded) setIsExpanded(true);
  };

  // Remove a questionnaire response and unlink it from this item's
  // information_sequence.
  const removeQuestionnaireForDetail = (
    detail: InsurancePlanQuestionnaireDetail
  ) => {
    const currentResponses = form.getValues("questionnaire_responses") ?? [];
    const qr = currentResponses.find(
      (r) => r.questionnaire === detail.full_url
    );
    if (!qr) return;
    const removedSeq = qr.sequence;

    form.setValue(
      "questionnaire_responses",
      currentResponses.filter((r) => r.questionnaire !== detail.full_url),
      { shouldDirty: true }
    );

    const currentItemSeqs =
      form.getValues(`item.${index}.information_sequence`) ?? [];
    form.setValue(
      `item.${index}.information_sequence`,
      currentItemSeqs.filter((seq) => seq !== removedSeq),
      { shouldDirty: true }
    );
  };

  if (!productCode || !planId) return null;
  if (!isBenefitLoading && benefitDetail && questionnaireRequirements.length === 0)
    return null;

  const isLoading =
    isBenefitLoading ||
    (questionnaireRequirements.length > 0 && !allDetailsLoaded);

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
          <span className="font-medium">Questionnaires</span>
          {itemQRCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {itemQRCount}
            </Badge>
          )}
          {unsatisfiedCount > 0 && (
            <Badge variant="destructive" className="ml-1 text-xs">
              {unsatisfiedCount} required
            </Badge>
          )}
        </div>
        {isLoading && (
          <span className="text-xs text-muted-foreground animate-pulse">
            Loading…
          </span>
        )}
      </div>

      {(mandatoryQRFieldState.error?.message || mandatoryQRField.value) && (
        <p className="text-sm font-medium text-destructive px-1">
          {mandatoryQRFieldState.error?.message || mandatoryQRField.value}
        </p>
      )}

      {isExpanded && (
        <div className="space-y-4 pl-4">
          {/* Required Questionnaires Panel */}
          {requiredStatuses.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Required Questionnaires
              </p>
              <div className="space-y-1.5">
                {requiredStatuses.map(({ req, status }) => {
                  const label =
                    req.questionnaire?.title ??
                    req.code.text ??
                    req.code.coding?.[0]?.display ??
                    req.code_code;
                  const detail = getDetailForReq(req);
                  return (
                    <div
                      key={req.id}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm",
                        status === "added" && "bg-green-50 text-green-800",
                        status === "missing" && "bg-amber-50 text-amber-800"
                      )}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {status === "added" ? (
                          <CheckCircle2Icon className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                        ) : (
                          <AlertCircleIcon className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        )}
                        <span className="truncate">{label}</span>
                      </div>
                      {status === "missing" && detail && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs px-2 shrink-0 border-amber-300 bg-white hover:bg-amber-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            addQuestionnaireForReq(req);
                          }}
                        >
                          <PlusIcon className="w-3 h-3 mr-0.5" />
                          Add
                        </Button>
                      )}
                      {status === "missing" && !detail && isLoading && (
                        <span className="text-xs text-amber-600 animate-pulse">
                          Loading…
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Optional Questionnaires Panel */}
          {optionalStatuses.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Optional Questionnaires
              </p>
              <div className="space-y-1.5">
                {optionalStatuses.map(({ req, status }) => {
                  const label =
                    req.questionnaire?.title ??
                    req.code.text ??
                    req.code.coding?.[0]?.display ??
                    req.code_code;
                  const detail = getDetailForReq(req);
                  return (
                    <div
                      key={req.id}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm",
                        status === "added" && "bg-green-50 text-green-800",
                        status === "missing" && "bg-blue-50 text-blue-800"
                      )}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {status === "added" ? (
                          <CheckCircle2Icon className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                        ) : (
                          <AlertCircleIcon className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        )}
                        <span className="truncate">{label}</span>
                      </div>
                      {status === "missing" && detail && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs px-2 shrink-0 border-blue-300 bg-white hover:bg-blue-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            addQuestionnaireForReq(req);
                          }}
                        >
                          <PlusIcon className="w-3 h-3 mr-0.5" />
                          Add
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Questionnaire response forms for added entries */}
          {loadedDetails.length > 0 && (
            <div className="space-y-4">
              {loadedDetails.map((detail) => {
                const qrIdx = watchedQR.findIndex(
                  (r) => r.questionnaire === detail.full_url
                );
                if (qrIdx === -1) return null;
                return (
                  <QuestionnaireResponseCard
                    key={detail.full_url}
                    detail={detail}
                    qrIdx={qrIdx}
                    form={form}
                    encounterId={encounterId}
                    onRemove={() => removeQuestionnaireForDetail(detail)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
