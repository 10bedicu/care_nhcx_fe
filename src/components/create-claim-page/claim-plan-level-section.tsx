import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  FileTextIcon,
  PaperclipIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InsurancePlanQuestionnaire,
  InsurancePlanQuestionnaireDetail,
  InsurancePlanSupportingInfoRequirement,
} from "@/types/insurance_plan";
import {
  FieldPath,
  UseFormReturn,
  useController,
  useFieldArray,
} from "react-hook-form";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { apis } from "@/apis";
import { cn } from "@/lib/utils";
import { useGlobalStore } from "@/hooks/use-global-store";
import { createClaimFormSchema } from "./schema";
import { z } from "zod";
import { buildInitialItems } from "./questionnaire-helpers";
import { QuestionnaireResponseCard } from "./claim-questionnaire-section";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function reqLabel(req: InsurancePlanSupportingInfoRequirement): string {
  return (
    req.code.text ??
    req.code.coding?.[0]?.display ??
    req.code_code
  );
}

function reqCategoryLabel(req: InsurancePlanSupportingInfoRequirement): string {
  return (
    req.category.text ??
    req.category.coding?.[0]?.display ??
    req.category_code
  );
}

/** Derive the focal plan ID from the insurance selection – same pattern as ClaimItemSection. */
function usePlanId(
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>
): string | null {
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

  return planListData?.results?.[0]?.id ?? null;
}

// ─── Plan-Level Doc Entry Card ────────────────────────────────────────────────

function PlanLevelDocCard({
  mainInfoIndex,
  form,
  requirement,
  onRemove,
}: {
  mainInfoIndex: number;
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
  requirement: InsurancePlanSupportingInfoRequirement | undefined;
  onRemove: () => void;
}) {
  const label = requirement
    ? reqLabel(requirement)
    : (form.watch(
        `supporting_info.${mainInfoIndex}.code` as FieldPath<
          z.infer<typeof createClaimFormSchema>
        >
      ) as { display?: string } | undefined)?.display ?? "Document";

  const categoryLabel = requirement ? reqCategoryLabel(requirement) : "";

  const currentFile = form.watch(
    `supporting_info.${mainInfoIndex}.value_file` as FieldPath<
      z.infer<typeof createClaimFormSchema>
    >
  ) as File | undefined;

  const valueString = form.watch(
    `supporting_info.${mainInfoIndex}.value_string` as FieldPath<
      z.infer<typeof createClaimFormSchema>
    >
  ) as string | undefined;

  const valueAttachment = form.watch(
    `supporting_info.${mainInfoIndex}.value_attachment` as FieldPath<
      z.infer<typeof createClaimFormSchema>
    >
  ) as string | undefined;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    form.setValue(
      `supporting_info.${mainInfoIndex}.value_file` as FieldPath<
        z.infer<typeof createClaimFormSchema>
      >,
      file as never
    );
    form.setValue(
      `supporting_info.${mainInfoIndex}.value_string` as FieldPath<
        z.infer<typeof createClaimFormSchema>
      >,
      undefined as never
    );
    form.setValue(
      `supporting_info.${mainInfoIndex}.value_attachment` as FieldPath<
        z.infer<typeof createClaimFormSchema>
      >,
      undefined as never
    );
    e.target.value = "";
  };

  const clearFile = () => {
    form.setValue(
      `supporting_info.${mainInfoIndex}.value_file` as FieldPath<
        z.infer<typeof createClaimFormSchema>
      >,
      undefined as never
    );
    form.setValue(
      `supporting_info.${mainInfoIndex}.value_attachment` as FieldPath<
        z.infer<typeof createClaimFormSchema>
      >,
      undefined as never
    );
  };

  const hasFile = !!(currentFile || valueAttachment);

  return (
    <Card className="border-l-4 border-l-primary/30">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm leading-snug">{label}</p>
            {categoryLabel && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {categoryLabel}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onRemove}
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-2">
        <Input
          placeholder="Enter a value or description…"
          value={valueString ?? ""}
          disabled={hasFile}
          onChange={(e) => {
            form.setValue(
              `supporting_info.${mainInfoIndex}.value_string` as FieldPath<
                z.infer<typeof createClaimFormSchema>
              >,
              (e.target.value || undefined) as never
            );
            if (e.target.value) {
              form.setValue(
                `supporting_info.${mainInfoIndex}.value_file` as FieldPath<
                  z.infer<typeof createClaimFormSchema>
                >,
                undefined as never
              );
              form.setValue(
                `supporting_info.${mainInfoIndex}.value_attachment` as FieldPath<
                  z.infer<typeof createClaimFormSchema>
                >,
                undefined as never
              );
            }
          }}
        />

        {!valueString && (
          <>
            {hasFile ? (
              <div className="flex items-center gap-2 rounded-md bg-green-50 px-2 py-1.5">
                <PaperclipIcon className="w-3.5 h-3.5 text-green-600" />
                <span className="text-xs font-medium text-green-700 flex-1">
                  {currentFile?.name ?? "File attached"}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-xs text-muted-foreground hover:text-destructive"
                  onClick={clearFile}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs relative"
                asChild
              >
                <span>
                  <PaperclipIcon className="w-3 h-3 mr-1" />
                  Attach file
                  <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.txt"
                  />
                </span>
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Status Row Helper ────────────────────────────────────────────────────────

function DocStatusRow({
  req,
  status,
  onAdd,
}: {
  req: InsurancePlanSupportingInfoRequirement;
  status: "satisfied" | "incomplete" | "missing";
  onAdd: (req: InsurancePlanSupportingInfoRequirement) => void;
}) {
  const isRequired = req.is_required;
  const label = reqLabel(req);
  const catLabel = reqCategoryLabel(req);

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm",
        status === "satisfied" && "bg-green-50 text-green-800",
        status !== "satisfied" &&
          isRequired &&
          "bg-amber-50 text-amber-800",
        status !== "satisfied" &&
          !isRequired &&
          "bg-blue-50 text-blue-800"
      )}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {status === "satisfied" ? (
          <CheckCircle2Icon className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
        ) : (
          <AlertCircleIcon
            className={cn(
              "w-3.5 h-3.5 flex-shrink-0",
              isRequired ? "text-amber-500" : "text-blue-500"
            )}
          />
        )}
        <span className="truncate">
          {label}{" "}
          <span className="opacity-60 text-xs">({catLabel})</span>
        </span>
      </div>
      {status === "missing" && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "h-6 text-xs px-2 shrink-0 bg-white",
            isRequired
              ? "border-amber-300 hover:bg-amber-50"
              : "border-blue-300 hover:bg-blue-50"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onAdd(req);
          }}
        >
          <PlusIcon className="w-3 h-3 mr-0.5" />
          Add
        </Button>
      )}
      {status === "incomplete" && (
        <span
          className={cn(
            "text-xs shrink-0 font-medium",
            isRequired ? "text-amber-600" : "text-blue-600"
          )}
        >
          Value needed
        </span>
      )}
    </div>
  );
}

// ─── Plan-Level Supporting Info Section ───────────────────────────────────────

export function PlanLevelSupportingInfoSection({
  form,
}: {
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const didAutoExpandRef = useRef(false);
  const planId = usePlanId(form);

  const { data: extensions, isLoading: isExtensionsLoading } = useQuery({
    queryKey: ["insurancePlan", "extensions", planId],
    queryFn: () => apis.insurancePlan.extensions(planId!),
    enabled: Boolean(planId),
    staleTime: 5 * 60 * 1000,
  });

  // Non-questionnaire requirements (documentation_url is null)
  const allRequirements = useMemo(() => {
    const all = extensions?.supporting_info_requirements ?? [];
    const filtered = all.filter((req) => !req.documentation_url);
    const seen = new Set<string>();
    return filtered.filter((req) => {
      const key = `${req.category_code}:${req.code_code}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [extensions]);

  const requiredReqs = useMemo(
    () => allRequirements.filter((r) => r.is_required),
    [allRequirements]
  );
  const optionalReqs = useMemo(
    () => allRequirements.filter((r) => !r.is_required),
    [allRequirements]
  );

  const { fields: siFields, append: appendSI, remove: removeSI } =
    useFieldArray({ name: "supporting_info", control: form.control });

  const allSI = form.watch("supporting_info") ?? [];

  // Plan-level entries are explicitly marked with _is_plan_level: true.
  // This avoids the race condition where the plan-level section re-renders
  // after supporting_info changes but before information_sequence is updated.
  const planLevelEntries = useMemo(
    () => allSI.filter((info) => info._is_plan_level === true),
    [allSI]
  );

  // Auto-expand once when there is pre-filled plan-level data.
  useEffect(() => {
    if (planLevelEntries.length > 0 && !didAutoExpandRef.current) {
      didAutoExpandRef.current = true;
      setIsExpanded(true);
    }
  }, [planLevelEntries.length]);

  const getDocStatus = (
    req: InsurancePlanSupportingInfoRequirement
  ): "satisfied" | "incomplete" | "missing" => {
    const match = planLevelEntries.find(
      (info) =>
        info.category?.code === req.category_code &&
        info.code?.code === req.code_code
    );
    if (!match) return "missing";
    const hasValue =
      match.value_string || match.value_attachment || match.value_file;
    return hasValue ? "satisfied" : "incomplete";
  };

  // No useMemo here: form.watch returns the same array reference when nested
  // fields are mutated in place, so a memo keyed on planLevelEntries would
  // cache stale statuses even after the user enters a value.
  const requiredStatuses = requiredReqs.map((req) => ({
    req,
    status: getDocStatus(req),
  }));
  const optionalStatuses = optionalReqs.map((req) => ({
    req,
    status: getDocStatus(req),
  }));

  const unsatisfiedCount = requiredStatuses.filter(
    ({ status }) => status !== "satisfied"
  ).length;

  // Validation
  const { field: errorField, fieldState: errorFieldState } = useController({
    name: "_mandatory_plan_docs_error" as FieldPath<
      z.infer<typeof createClaimFormSchema>
    >,
    control: form.control,
  });

  useEffect(() => {
    const value =
      requiredReqs.length > 0 && unsatisfiedCount > 0
        ? `${unsatisfiedCount} required plan-level document(s) must be provided`
        : undefined;
    errorField.onChange(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiredReqs.length, unsatisfiedCount]);

  const addDocForReq = (req: InsurancePlanSupportingInfoRequirement) => {
    const alreadyAdded = planLevelEntries.some(
      (info) =>
        info.category?.code === req.category_code &&
        info.code?.code === req.code_code
    );
    if (alreadyAdded) return;

    const currentQRSeqs = (form.getValues("questionnaire_responses") ?? []).map(
      (qr) => qr.sequence
    );
    const nextSeq =
      Math.max(0, ...siFields.map((f) => f.sequence), ...currentQRSeqs) + 1;
    appendSI({
      sequence: nextSeq,
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
      timing: undefined,
      value_string: undefined,
      value_attachment: undefined,
      _is_plan_level: true,
    });
    if (!isExpanded) setIsExpanded(true);
  };

  const removeDocEntry = (infoSequence: number) => {
    const idx = siFields.findIndex(
      (f) => (f as unknown as { sequence: number }).sequence === infoSequence
    );
    if (idx !== -1) removeSI(idx);
  };

  if (!planId) return null;
  if (!isExtensionsLoading && extensions && allRequirements.length === 0)
    return null;

  return (
    <div className="space-y-3">
      <button
        type="button"
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors hover:bg-muted/50",
          unsatisfiedCount > 0 && "border-amber-400 bg-amber-50/50"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
          )}
          <FileTextIcon className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">
            Plan-Level Supporting Documents
          </span>
          {planLevelEntries.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {planLevelEntries.length} added
            </Badge>
          )}
          {unsatisfiedCount > 0 && (
            <Badge
              variant="outline"
              className="text-xs border-amber-400 text-amber-700 bg-amber-50"
            >
              {unsatisfiedCount} required
            </Badge>
          )}
        </div>
        {isExtensionsLoading && (
          <span className="text-xs text-muted-foreground animate-pulse">
            Loading…
          </span>
        )}
      </button>

      {(errorFieldState.error?.message || errorField.value) && (
        <p className="text-sm font-medium text-destructive px-1">
          {errorFieldState.error?.message || (errorField.value as string)}
        </p>
      )}

      {isExpanded && (
        <div className="space-y-4 pl-4 border-l-2 border-muted ml-2">
          {/* Required Documents */}
          {requiredStatuses.length > 0 && (
            <div className="rounded-lg border bg-card p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Required Documents
              </p>
              <div className="space-y-1.5">
                {requiredStatuses.map(({ req, status }) => (
                  <DocStatusRow
                    key={req.id}
                    req={req}
                    status={status}
                    onAdd={addDocForReq}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Optional Documents */}
          {optionalStatuses.length > 0 && (
            <div className="rounded-lg border bg-card p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Optional Documents
              </p>
              <div className="space-y-1.5">
                {optionalStatuses.map(({ req, status }) => (
                  <DocStatusRow
                    key={req.id}
                    req={req}
                    status={status}
                    onAdd={addDocForReq}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Entry Cards */}
          {planLevelEntries.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Added Documents
              </p>
              {planLevelEntries.map((entry) => {
                const mainInfoIndex = allSI.findIndex(
                  (i) => i.sequence === entry.sequence
                );
                const matchingReq = allRequirements.find(
                  (req) =>
                    req.category_code === entry.category?.code &&
                    req.code_code === entry.code?.code
                );
                return (
                  <PlanLevelDocCard
                    key={entry.sequence}
                    mainInfoIndex={mainInfoIndex}
                    form={form}
                    requirement={matchingReq}
                    onRemove={() => removeDocEntry(entry.sequence)}
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

// ─── Questionnaire Status Row ─────────────────────────────────────────────────

function QStatusRow({
  req,
  status,
  isLoading,
  onAdd,
}: {
  req: InsurancePlanSupportingInfoRequirement;
  status: "added" | "missing";
  isLoading: boolean;
  onAdd: (req: InsurancePlanSupportingInfoRequirement) => void;
}) {
  const isRequired = req.is_required;
  const title = req.questionnaire?.title ?? reqLabel(req);

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm",
        status === "added" && "bg-green-50 text-green-800",
        status === "missing" && isRequired && "bg-amber-50 text-amber-800",
        status === "missing" && !isRequired && "bg-blue-50 text-blue-800"
      )}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {status === "added" ? (
          <CheckCircle2Icon className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
        ) : (
          <ClipboardListIcon
            className={cn(
              "w-3.5 h-3.5 flex-shrink-0",
              isRequired ? "text-amber-500" : "text-blue-500"
            )}
          />
        )}
        <span className="truncate font-medium">{title}</span>
      </div>
      {status === "missing" && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "h-6 text-xs px-2 shrink-0 bg-white",
            isRequired
              ? "border-amber-300 hover:bg-amber-50"
              : "border-blue-300 hover:bg-blue-50"
          )}
          disabled={isLoading}
          onClick={(e) => {
            e.stopPropagation();
            onAdd(req);
          }}
        >
          <PlusIcon className="w-3 h-3 mr-0.5" />
          {isLoading ? "Loading…" : "Add"}
        </Button>
      )}
    </div>
  );
}

// ─── Plan-Level Questionnaires Section ────────────────────────────────────────

export function PlanLevelQuestionnairesSection({
  form,
}: {
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const didAutoExpandRef = useRef(false);
  const { getStore } = useGlobalStore();
  const encounterId = getStore<string>("encounterId") ?? "";
  const planId = usePlanId(form);

  const { data: extensions, isLoading: isExtensionsLoading } = useQuery({
    queryKey: ["insurancePlan", "extensions", planId],
    queryFn: () => apis.insurancePlan.extensions(planId!),
    enabled: Boolean(planId),
    staleTime: 5 * 60 * 1000,
  });

  const { data: planQuestionnaires } = useQuery({
    queryKey: ["insurancePlan", "questionnaires", planId],
    queryFn: () => apis.insurancePlan.questionnaires(planId!),
    enabled: Boolean(planId),
    staleTime: 5 * 60 * 1000,
  });

  // Questionnaire requirements (documentation_url is NOT null)
  const questionnaireReqs = useMemo(() => {
    const all = extensions?.supporting_info_requirements ?? [];
    const filtered = all.filter((req) => !!req.documentation_url);
    const seen = new Set<string>();
    return filtered.filter((req) => {
      const key = req.questionnaire?.fhir_id ?? req.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [extensions]);

  const requiredReqs = useMemo(
    () => questionnaireReqs.filter((r) => r.is_required),
    [questionnaireReqs]
  );
  const optionalReqs = useMemo(
    () => questionnaireReqs.filter((r) => !r.is_required),
    [questionnaireReqs]
  );

  // Build fhir_id → InsurancePlanQuestionnaire map from the plan questionnaires list
  const questionnaireByFhirId = useMemo(() => {
    const map = new Map<string, InsurancePlanQuestionnaire>();
    for (const q of (planQuestionnaires as unknown as InsurancePlanQuestionnaire[]) ?? []) {
      map.set(q.fhir_id, q);
    }
    return map;
  }, [planQuestionnaires]);

  // Unique questionnaires to fetch details for
  const questionnairesToFetch = useMemo(() => {
    const seen = new Set<string>();
    return questionnaireReqs
      .map((req) => {
        if (!req.questionnaire?.fhir_id) return null;
        const q = questionnaireByFhirId.get(req.questionnaire.fhir_id);
        if (!q || seen.has(q.id)) return null;
        seen.add(q.id);
        return q;
      })
      .filter((q): q is InsurancePlanQuestionnaire => q !== null);
  }, [questionnaireReqs, questionnaireByFhirId]);

  const detailQueries = useQueries({
    queries: questionnairesToFetch.map((q) => ({
      queryKey: ["insurancePlanQuestionnaire", q.id],
      queryFn: () => apis.insurancePlanQuestionnaire.get(q.id),
      enabled: Boolean(q.id),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const allDetailsLoaded = detailQueries.every((q) => !q.isLoading);

  const loadedDetails = useMemo(
    () =>
      detailQueries.map((q) => q.data).filter(Boolean) as InsurancePlanQuestionnaireDetail[],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [detailQueries.map((q) => q.dataUpdatedAt).join(",")]
  );

  const detailByFhirId = useMemo(() => {
    const map = new Map<string, InsurancePlanQuestionnaireDetail>();
    for (const detail of loadedDetails) {
      map.set(detail.fhir_id, detail);
    }
    return map;
  }, [loadedDetails]);

  const getDetailForReq = (
    req: InsurancePlanSupportingInfoRequirement
  ): InsurancePlanQuestionnaireDetail | undefined => {
    if (!req.questionnaire?.fhir_id) return undefined;
    return detailByFhirId.get(req.questionnaire.fhir_id);
  };

  const watchedQR = form.watch("questionnaire_responses") ?? [];

  const getQStatus = (
    req: InsurancePlanSupportingInfoRequirement
  ): "added" | "missing" => {
    const detail = getDetailForReq(req);
    if (!detail) return "missing";
    return watchedQR.some((r) => r.questionnaire === detail.full_url)
      ? "added"
      : "missing";
  };

  const requiredStatuses = useMemo(
    () => requiredReqs.map((req) => ({ req, status: getQStatus(req) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [requiredReqs, watchedQR, detailByFhirId]
  );
  const optionalStatuses = useMemo(
    () => optionalReqs.map((req) => ({ req, status: getQStatus(req) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [optionalReqs, watchedQR, detailByFhirId]
  );

  const unsatisfiedCount = requiredStatuses.filter(
    ({ status }) => status !== "added"
  ).length;

  // Validation
  const { field: errorField, fieldState: errorFieldState } = useController({
    name: "_mandatory_plan_questionnaires_error" as FieldPath<
      z.infer<typeof createClaimFormSchema>
    >,
    control: form.control,
  });

  useEffect(() => {
    const value =
      requiredReqs.length > 0 && unsatisfiedCount > 0
        ? `${unsatisfiedCount} required plan-level questionnaire(s) must be completed`
        : undefined;
    errorField.onChange(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiredReqs.length, unsatisfiedCount]);

  const addQuestionnaireForReq = (
    req: InsurancePlanSupportingInfoRequirement
  ) => {
    const detail = getDetailForReq(req);
    if (!detail) return;
    const currentQR = form.getValues("questionnaire_responses") ?? [];
    if (currentQR.find((r) => r.questionnaire === detail.full_url)) return;

    const currentSISeqs = (form.getValues("supporting_info") ?? []).map(
      (s) => s.sequence
    );
    const newSequence =
      Math.max(0, ...currentSISeqs, ...currentQR.map((qr) => qr.sequence)) + 1;

    form.setValue(
      "questionnaire_responses",
      [
        ...currentQR,
        {
          sequence: newSequence,
          questionnaire: detail.full_url,
          category: {
            system:
              "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
            code: "INF",
            display:
              "Additional info related to claim ( conveying additional situation and condition information.)",
          },
          code: {
            system:
              "https://nrces.in/ndhm/fhir/r4/ValueSet/ndhm-supportinginfo-code",
            code: "ODN",
            display: "Other document",
          },
          item: buildInitialItems(detail.items),
        },
      ],
      { shouldDirty: true }
    );
    if (!isExpanded) setIsExpanded(true);
  };

  const removeQuestionnaire = (questionnaireUrl: string) => {
    form.setValue(
      "questionnaire_responses",
      (form.getValues("questionnaire_responses") ?? []).filter(
        (r) => r.questionnaire !== questionnaireUrl
      ),
      { shouldDirty: true }
    );
  };

  // QR entries that belong to plan-level requirements
  const planQREntries = useMemo(() => {
    const planDetailUrls = new Set(
      [...detailByFhirId.values()].map((d) => d.full_url)
    );
    return watchedQR.filter((qr) => planDetailUrls.has(qr.questionnaire));
  }, [watchedQR, detailByFhirId]);

  // Auto-expand once when pre-filled questionnaire responses are detected.
  useEffect(() => {
    if (planQREntries.length > 0 && !didAutoExpandRef.current) {
      didAutoExpandRef.current = true;
      setIsExpanded(true);
    }
  }, [planQREntries.length]);

  if (!planId) return null;
  if (!isExtensionsLoading && extensions && questionnaireReqs.length === 0)
    return null;

  const isLoadingDetails =
    isExtensionsLoading ||
    (questionnaireReqs.length > 0 && !allDetailsLoaded);

  return (
    <div className="space-y-3">
      <button
        type="button"
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors hover:bg-muted/50",
          unsatisfiedCount > 0 && "border-amber-400 bg-amber-50/50"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
          )}
          <ClipboardListIcon className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">
            Plan-Level Questionnaires
          </span>
          {planQREntries.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {planQREntries.length} added
            </Badge>
          )}
          {unsatisfiedCount > 0 && (
            <Badge
              variant="outline"
              className="text-xs border-amber-400 text-amber-700 bg-amber-50"
            >
              {unsatisfiedCount} required
            </Badge>
          )}
        </div>
        {isLoadingDetails && (
          <span className="text-xs text-muted-foreground animate-pulse">
            Loading…
          </span>
        )}
      </button>

      {(errorFieldState.error?.message || errorField.value) && (
        <p className="text-sm font-medium text-destructive px-1">
          {errorFieldState.error?.message || (errorField.value as string)}
        </p>
      )}

      {isExpanded && (
        <div className="space-y-4 pl-4 border-l-2 border-muted ml-2">
          {/* Required Questionnaires */}
          {requiredStatuses.length > 0 && (
            <div className="rounded-lg border bg-card p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Required Questionnaires
              </p>
              <div className="space-y-1.5">
                {requiredStatuses.map(({ req, status }) => (
                  <QStatusRow
                    key={req.id}
                    req={req}
                    status={status}
                    isLoading={!getDetailForReq(req)}
                    onAdd={addQuestionnaireForReq}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Optional Questionnaires */}
          {optionalStatuses.length > 0 && (
            <div className="rounded-lg border bg-card p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Optional Questionnaires
              </p>
              <div className="space-y-1.5">
                {optionalStatuses.map(({ req, status }) => (
                  <QStatusRow
                    key={req.id}
                    req={req}
                    status={status}
                    isLoading={!getDetailForReq(req)}
                    onAdd={addQuestionnaireForReq}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Added Questionnaire Response Cards */}
          {planQREntries.length > 0 && (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Added Questionnaires
              </p>
              {planQREntries.map((qr) => {
                const qrIndex = watchedQR.findIndex(
                  (r) => r.questionnaire === qr.questionnaire
                );
                const detail = loadedDetails.find(
                  (d) => d.full_url === qr.questionnaire
                );
                if (qrIndex === -1 || !detail) return null;
                return (
                  <QuestionnaireResponseCard
                    key={qr.questionnaire}
                    qrIdx={qrIndex}
                    detail={detail}
                    form={form}
                    encounterId={encounterId}
                    onRemove={() => removeQuestionnaire(qr.questionnaire)}
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
