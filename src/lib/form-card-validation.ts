/**
 * Card-level validation helpers that mirror Zod schema rules in
 * create-coverage-eligibility-request-page/schema.ts and create-claim-page/schema.ts.
 */

import type { FieldValues, UseFormReturn } from "react-hook-form";

type SupportingInfoValueFields = {
  value_string?: string;
  value_attachment?: string;
  value_file?: File;
  value_resource?: { resource_type?: string; resource_id?: string };
};

export function getSupportingInfoValueError(
  data: SupportingInfoValueFields
): string | undefined {
  const hasString = !!data.value_string;
  const hasAttachment = !!data.value_attachment;
  const hasFile = !!data.value_file;
  const hasResource = !!data.value_resource?.resource_id;
  const providedCount = [hasString, hasAttachment, hasFile, hasResource].filter(
    Boolean
  ).length;

  if (providedCount === 0) {
    return "Provide text, an attachment, or a record";
  }
  if (providedCount > 1) {
    return "Provide only one of text, attachment, or record";
  }
  return undefined;
}

function getReferenceOrCodeXorError(
  reference: string | undefined,
  code: string | undefined,
  label: "diagnosis" | "procedure"
): string | undefined {
  const hasReference = !!reference;
  const hasCode = !!code;

  if (hasReference && hasCode) {
    return label === "diagnosis"
      ? "Either a diagnosis reference or a diagnosis code must be provided, but not both"
      : "Either a procedure reference or a procedure code must be provided, but not both";
  }
  if (!hasReference && !hasCode) {
    return label === "diagnosis"
      ? "Either a diagnosis reference or a diagnosis code must be provided"
      : "Either a procedure reference or a procedure code must be provided";
  }
  return undefined;
}

export type CeDiagnosisInput = {
  diagnosis_reference?: string;
  diagnosis_code?: { code?: string };
};

export function getCeDiagnosisCardError(
  diagnosis: CeDiagnosisInput
): string | undefined {
  return getReferenceOrCodeXorError(
    diagnosis.diagnosis_reference,
    diagnosis.diagnosis_code?.code,
    "diagnosis"
  );
}

export type ClaimDiagnosisInput = {
  type?: { code: string }[];
  diagnosis_reference?: string;
  diagnosis_code?: { code?: string };
};

export function getClaimDiagnosisCardError(
  diagnosis: ClaimDiagnosisInput
): string | undefined {
  const xorError = getReferenceOrCodeXorError(
    diagnosis.diagnosis_reference,
    diagnosis.diagnosis_code?.code,
    "diagnosis"
  );
  if (xorError) return xorError;
  if (!diagnosis.type || diagnosis.type.length === 0) {
    return "At least one diagnosis type is required";
  }
  return undefined;
}

export type ClaimProcedureInput = {
  procedure_reference?: string;
  procedure_code?: { code?: string };
};

export function getClaimProcedureCardError(
  procedure: ClaimProcedureInput
): string | undefined {
  return getReferenceOrCodeXorError(
    procedure.procedure_reference,
    procedure.procedure_code?.code,
    "procedure"
  );
}

export type ClaimCareTeamInput = {
  provider?: string;
};

export function getClaimCareTeamCardError(
  member: ClaimCareTeamInput
): string | undefined {
  if (!member.provider) {
    return "Provider is required";
  }
  return undefined;
}

export type CeSupportingInfoInput = SupportingInfoValueFields;

export function getCeSupportingInfoCardError(
  info: CeSupportingInfoInput
): string | undefined {
  return getSupportingInfoValueError(info);
}

export type ClaimSupportingInfoInput = SupportingInfoValueFields & {
  category?: { code?: string };
  code?: { code?: string };
};

export function getClaimSupportingInfoCardError(
  info: ClaimSupportingInfoInput
): string | undefined {
  if (!info.category?.code) {
    return "Category is required";
  }
  if (!info.code?.code) {
    return "Code is required";
  }
  return getSupportingInfoValueError(info);
}

export function syncVirtualFormError(
  onChange: (value: string | undefined) => void,
  currentValue: string | undefined,
  nextValue: string | undefined
) {
  if (currentValue !== nextValue) {
    onChange(nextValue);
  }
}

export function syncVirtualFormErrorFromForm<TFieldValues extends FieldValues>(
  form: Pick<UseFormReturn<TFieldValues>, "getValues" | "setValue">,
  fieldPath: string,
  nextValue: string | undefined
) {
  const currentValue = form.getValues(fieldPath as never) as string | undefined;
  if (currentValue !== nextValue) {
    form.setValue(fieldPath as never, nextValue as never, {
      shouldDirty: false,
      shouldValidate: false,
    });
  }
}

export function countCardErrors<T>(
  items: T[],
  getError: (item: T) => string | undefined
): number {
  return items.filter((item) => !!getError(item)).length;
}

export type SectionValidationCounts = {
  /** Cards/requirements that are needed but not yet added. */
  requiredMissing: number;
  /** Cards/requirements that exist but fail validation. */
  incomplete: number;
};

export type ChecklistItemStatus =
  | "missing"
  | "incomplete"
  | "complete"
  | "satisfied";

export function hasSectionValidationIssue(
  counts: SectionValidationCounts
): boolean {
  return counts.requiredMissing > 0 || counts.incomplete > 0;
}

/** Card-array sections. Pass `minRequired: 1` for mandatory sections; omit for optional. */
export function getCardSectionValidationCounts<T>(
  items: T[],
  getError: (item: T) => string | undefined,
  options?: { minRequired?: number }
): SectionValidationCounts {
  const minRequired = options?.minRequired ?? 0;
  const requiredMissing =
    items.length < minRequired ? minRequired - items.length : 0;
  const incomplete = countCardErrors(items, getError);
  return { requiredMissing, incomplete };
}

/** Checklist rows: missing = not added; incomplete = added but invalid. */
export function getChecklistValidationCounts(
  statuses: { status: ChecklistItemStatus; isRequired?: boolean }[]
): SectionValidationCounts {
  const requiredMissing = statuses.filter(
    (s) => s.status === "missing" && s.isRequired !== false
  ).length;
  const incomplete = statuses.filter(
    (s) => s.status === "incomplete"
  ).length;
  return { requiredMissing, incomplete };
}

export function mergeValidationCounts(
  ...counts: SectionValidationCounts[]
): SectionValidationCounts {
  return counts.reduce(
    (acc, count) => ({
      requiredMissing: acc.requiredMissing + count.requiredMissing,
      incomplete: acc.incomplete + count.incomplete,
    }),
    { requiredMissing: 0, incomplete: 0 }
  );
}

export function getSectionVirtualErrorMessage(
  counts: SectionValidationCounts,
  itemLabel: string,
  options?: { requiredSingular?: string }
): string | undefined {
  const parts: string[] = [];
  if (counts.requiredMissing > 0) {
    if (options?.requiredSingular && counts.requiredMissing === 1) {
      parts.push(options.requiredSingular);
    } else {
      parts.push(
        `${counts.requiredMissing} ${itemLabel}${counts.requiredMissing === 1 ? "" : "(s)"} required`
      );
    }
  }
  if (counts.incomplete > 0) {
    parts.push(
      `${counts.incomplete} ${itemLabel}${counts.incomplete === 1 ? "" : "(es)"} must be completed`
    );
  }
  return parts.length > 0 ? parts.join(" • ") : undefined;
}

export function getIncompleteCardsSectionError<T>(
  items: T[],
  getError: (item: T) => string | undefined,
  itemLabel: string
): string | undefined {
  const incompleteCount = countCardErrors(items, getError);
  if (incompleteCount === 0) return undefined;
  return `${incompleteCount} ${itemLabel}${incompleteCount === 1 ? "" : "(es)"} must be completed`;
}

export function getMandatorySectionError<T>(
  items: T[],
  getError: (item: T) => string | undefined,
  itemLabel: string
): string | undefined {
  if (items.length === 0) {
    return `At least one ${itemLabel} is required`;
  }
  return getIncompleteCardsSectionError(items, getError, itemLabel);
}
