import { Coding } from "@/types/base";
import {
  BenefitCostQualifierType,
  InsurancePlanBenefitDetail,
} from "@/types/insurance_plan";

export function isUnspecifiedProcedureCode(
  code: string | undefined | null,
): boolean {
  return !!code && code.toUpperCase().endsWith("U100");
}

export function isUnspecifiedProcedureOnly(
  items: Array<{
    product_or_service?: Coding;
    _implant_parent_sequence?: number;
    _is_disabled?: boolean;
  }>,
): boolean {
  const active = items.filter(
    (it) =>
      it._implant_parent_sequence == null &&
      !it._is_disabled &&
      it.product_or_service?.code,
  );
  return (
    active.length > 0 &&
    active.every((it) =>
      isUnspecifiedProcedureCode(it.product_or_service?.code),
    )
  );
}

export const UNSPECIFIED_PROCEDURE_MIX_ERROR =
  "An unspecified procedure cannot be combined with other benefits. Submit the unspecified procedure on its own.";

export const UNSPECIFIED_PROCEDURE_COPAY_ERROR =
  "Copay is not allowed for an unspecified procedure. The requested amount must be within the available wallet balance.";

export const UNSPECIFIED_PROCEDURE_PROCEDURE_REQUIRED_ERROR =
  "At least one procedure is required for an unspecified procedure.";

export function computeBenefitLimit(
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

function buildQualifierTypeMap(
  benefitDetail: InsurancePlanBenefitDetail
): Map<string, BenefitCostQualifierType> {
  const map = new Map<string, BenefitCostQualifierType>();
  for (const cost of benefitDetail.costs ?? []) {
    for (const q of cost.qualifiers) {
      map.set(q.qualifier_code, q.qualifier_type);
    }
  }
  return map;
}

export function getQualifierTypeByCode(
  benefitDetail: InsurancePlanBenefitDetail | undefined
): Map<string, BenefitCostQualifierType> {
  if (!benefitDetail) return new Map();
  return buildQualifierTypeMap(benefitDetail);
}

export function hasEnhancementAllowedCondition(
  benefitDetail: InsurancePlanBenefitDetail | undefined
): boolean {
  return (
    benefitDetail?.conditions?.some((c) => c.enhancement_allowed) ?? false
  );
}

export function isModifierRequired(
  benefitDetail: InsurancePlanBenefitDetail | undefined
): boolean {
  return (
    benefitDetail?.conditions?.some(
      (c) => c.stratification_allowed || c.implant_applicable
    ) ?? false
  );
}

export function buildBenefitConditionErrors(
  benefitDetail: InsurancePlanBenefitDetail | undefined,
  quantityValue: number,
  modifiers: Coding[],
  options?: { linkedImplantCount?: number }
): string[] {
  if (!benefitDetail?.conditions?.length) return [];

  const qualifierTypeMap = buildQualifierTypeMap(benefitDetail);
  const stratificationModifiers = modifiers.filter(
    (m) => qualifierTypeMap.get(m.code) === "stratification"
  );
  const implantModifiers = modifiers.filter(
    (m) => qualifierTypeMap.get(m.code) === "implant"
  );
  const useLinkedImplantCount = options?.linkedImplantCount !== undefined;
  const implantCount = useLinkedImplantCount
    ? options!.linkedImplantCount!
    : implantModifiers.length;
  const hasImplants = useLinkedImplantCount
    ? implantCount > 0
    : implantModifiers.length > 0;

  const errors: string[] = [];

  for (const cond of benefitDetail.conditions) {
    if (cond.quantity_allowed > 0 && quantityValue > cond.quantity_allowed) {
      errors.push(
        `Quantity ${quantityValue} exceeds the allowed maximum of ${cond.quantity_allowed}`
      );
    }

    if (cond.stratification_allowed) {
      if (stratificationModifiers.length === 0) {
        errors.push("A stratification modifier is required for this benefit");
      } else if (
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
    } else if (stratificationModifiers.length > 0) {
      errors.push("Stratification is not allowed for this benefit");
    }

    if (cond.implant_applicable) {
      if (implantCount === 0) {
        errors.push("At least one implant is required for this benefit");
      } else if (!cond.multiple_implants_allowed && implantCount > 1) {
        errors.push("Only one implant is allowed");
      } else if (
        cond.maximum_implants_allowed > 0 &&
        implantCount > cond.maximum_implants_allowed
      ) {
        errors.push(
          `Maximum ${cond.maximum_implants_allowed} implant(s) allowed, ${implantCount} selected`
        );
      }
    } else if (hasImplants) {
      errors.push("Implants are not applicable for this benefit");
    }
  }

  return [...new Set(errors)];
}

type ImplantLinkableItem = {
  product_or_service?: Coding;
  _implant_parent_sequence?: number;
  _implant_code?: string;
};

/** Index of an existing implant line item for a parent, or -1 when none. */
export function findExistingImplantItemIndex(
  items: ImplantLinkableItem[],
  parentSequence: number,
  implantCode: string,
): number {
  const linkedIndex = items.findIndex(
    (it) =>
      it._implant_parent_sequence === parentSequence &&
      (it._implant_code === implantCode ||
        it.product_or_service?.code === implantCode),
  );
  if (linkedIndex >= 0) return linkedIndex;

  return items.findIndex(
    (it) =>
      !it._implant_parent_sequence &&
      it.product_or_service?.code === implantCode,
  );
}

export function stripImplantModifiersWhenLineItemExists<
  T extends ImplantLinkableItem & { modifier?: Coding[] },
>(items: T[]): T[] {
  const lineItemProductCodes = new Set(
    items
      .map((it) => it.product_or_service?.code)
      .filter((code): code is string => Boolean(code)),
  );
  return items.map((item) => ({
    ...item,
    modifier: (item.modifier ?? []).filter(
      (m) => !lineItemProductCodes.has(m.code),
    ),
  }));
}

type ImplantPrefillItem = ImplantLinkableItem & {
  sequence?: number;
  category?: Coding;
  modifier?: Coding[];
  quantity?: { value?: number; unit?: Coding; code?: Coding };
  supporting_info_sequence?: number[];
  diagnosis?: Array<{
    diagnosis_reference?: string;
    diagnosis_code?: Coding;
  }>;
  diagnosis_sequence?: number[];
  procedure_sequence?: number[];
  care_team_sequence?: number[];
};

function diagnosisKeys(item: ImplantPrefillItem): string[] {
  return (item.diagnosis ?? [])
    .map((entry) => entry.diagnosis_reference ?? entry.diagnosis_code?.code)
    .filter((key): key is string => Boolean(key));
}

function sequencesOverlap(
  parent: ImplantPrefillItem,
  child: ImplantPrefillItem,
): boolean {
  const hasOverlap = (a?: number[], b?: number[]) =>
    (a ?? []).some((s) => (b ?? []).includes(s));
  if (hasOverlap(parent.diagnosis_sequence, child.diagnosis_sequence)) {
    return true;
  }
  if (hasOverlap(parent.procedure_sequence, child.procedure_sequence)) {
    return true;
  }
  if (hasOverlap(parent.care_team_sequence, child.care_team_sequence)) {
    return true;
  }
  if (hasOverlap(parent.supporting_info_sequence, child.supporting_info_sequence)) {
    return true;
  }
  const parentDiagnosis = diagnosisKeys(parent);
  const childDiagnosis = diagnosisKeys(child);
  return parentDiagnosis.some((key) => childDiagnosis.includes(key));
}

function isLikelyImplantProductCode(code: string): boolean {
  return code.startsWith("IMP");
}

function isNonImplantParentCandidate(item: ImplantPrefillItem): boolean {
  return !isLikelyImplantProductCode(item.product_or_service?.code ?? "");
}

function findImplantParentCandidate<T extends ImplantPrefillItem>(
  items: T[],
  implantItem: T,
): T | undefined {
  const implantCode = implantItem.product_or_service?.code;
  if (!implantCode) return undefined;

  const sameCategoryParents = items.filter(
    (other) =>
      other.sequence !== implantItem.sequence &&
      !other._implant_parent_sequence &&
      isNonImplantParentCandidate(other) &&
      other.category?.code === implantItem.category?.code,
  );

  const withOverlap = sameCategoryParents.find((other) =>
    sequencesOverlap(other, implantItem),
  );
  if (withOverlap) return withOverlap;

  if (sameCategoryParents.length === 1) {
    return sameCategoryParents[0];
  }

  if (sameCategoryParents.length > 1) {
    const implantSeq = implantItem.sequence ?? 0;
    return sameCategoryParents.reduce((closest, candidate) =>
      Math.abs((candidate.sequence ?? 0) - implantSeq) <
      Math.abs((closest.sequence ?? 0) - implantSeq)
        ? candidate
        : closest,
    );
  }

  return undefined;
}

function implantBelongsToParent(
  items: ImplantPrefillItem[],
  parent: ImplantPrefillItem,
  implantItem: ImplantPrefillItem,
): boolean {
  if (implantItem._implant_parent_sequence === parent.sequence) return true;
  if (implantItem._implant_parent_sequence != null) return false;
  const code = implantItem.product_or_service?.code;
  if (!code || !isLikelyImplantProductCode(code)) return false;
  const candidate = findImplantParentCandidate(items, implantItem);
  return candidate?.sequence === parent.sequence;
}

function buildImplantLineItemFromParent<T extends ImplantPrefillItem>(
  parent: T,
  implant: Coding,
  sequence: number,
): T {
  return {
    ...parent,
    sequence,
    product_or_service: implant,
    modifier: [],
    quantity: parent.quantity ?? { value: 1 },
    diagnosis: (parent.diagnosis ?? []).map((entry) => ({ ...entry })),
    supporting_info_sequence: [...(parent.supporting_info_sequence ?? [])],
    _implant_parent_sequence: parent.sequence,
    _implant_code: implant.code,
  } as T;
}

export function normalizeImplantItemsFromPrefill<T extends ImplantPrefillItem>(
  items: T[],
): T[] {
  const parentSequenceByImplantCode = new Map<string, number>();
  for (const item of items) {
    if (item.sequence == null) continue;
    for (const modifier of item.modifier ?? []) {
      const hasMatchingLineItem = items.some(
        (other) =>
          other.sequence !== item.sequence &&
          other.product_or_service?.code === modifier.code,
      );
      if (hasMatchingLineItem) {
        parentSequenceByImplantCode.set(modifier.code, item.sequence);
      }
    }
  }

  const workingItems = [...items];
  const existingLineItemCodes = new Set(
    workingItems
      .map((it) => it.product_or_service?.code)
      .filter((code): code is string => Boolean(code)),
  );
  let nextSequence =
    Math.max(0, ...workingItems.map((it) => it.sequence ?? 0)) + 1;

  for (const item of items) {
    if (item.sequence == null || !isNonImplantParentCandidate(item)) continue;
    for (const modifier of item.modifier ?? []) {
      if (!isLikelyImplantProductCode(modifier.code)) continue;
      if (existingLineItemCodes.has(modifier.code)) continue;
      if (
        workingItems.some(
          (it) =>
            it._implant_parent_sequence === item.sequence &&
            it._implant_code === modifier.code,
        )
      ) {
        continue;
      }
      workingItems.push(
        buildImplantLineItemFromParent(item, modifier, nextSequence),
      );
      existingLineItemCodes.add(modifier.code);
      nextSequence += 1;
    }
  }

  const stripped = stripImplantModifiersWhenLineItemExists(workingItems).map(
    (item) => ({
      ...item,
      modifier: (item.modifier ?? []).filter(
        (m) => !isLikelyImplantProductCode(m.code),
      ),
    }),
  );

  const linked = stripped.map((item) => {
    const code = item.product_or_service?.code;
    if (!code || item._implant_parent_sequence) return item;

    const parentSequenceFromModifier = parentSequenceByImplantCode.get(code);
    if (parentSequenceFromModifier != null) {
      return {
        ...item,
        _implant_parent_sequence: parentSequenceFromModifier,
        _implant_code: code,
      };
    }

    if (!isLikelyImplantProductCode(code)) return item;

    const parent = findImplantParentCandidate(stripped, item);
    if (parent?.sequence == null) return item;

    return {
      ...item,
      _implant_parent_sequence: parent.sequence,
      _implant_code: code,
    };
  });

  return linked;
}

/** Count implant line items associated with a parent (linked or prefilled orphan). */
export function countImplantLineItemsForParent<
  T extends ImplantPrefillItem,
>(items: T[], parentSequence: number): number {
  const parent = items.find((it) => it.sequence === parentSequence);
  if (!parent) return 0;

  return items.filter((it) => implantBelongsToParent(items, parent, it)).length;
}

/** Implant line items to display on a parent's modifier UI. */
export function getLinkedImplantsForParent<
  T extends ImplantPrefillItem,
>(items: T[], parentSequence: number): Coding[] {
  const parent = items.find((it) => it.sequence === parentSequence);
  if (!parent) return [];

  return items
    .filter((it) => implantBelongsToParent(items, parent, it))
    .map((it) => it.product_or_service)
    .filter((coding): coding is Coding => Boolean(coding?.code));
}

type ItemWithProduct = {
  product_or_service?: Coding;
  sequence?: number;
  modifier?: Coding[];
  serviced_period?: { start?: string; end?: string };
  _implant_parent_sequence?: number;
  _is_disabled?: boolean;
};

export function getItemUniquenessKey(item: {
  product_or_service?: Coding;
  modifier?: Coding[];
  serviced_period?: { start?: string; end?: string };
}): string | null {
  const code = item.product_or_service?.code;
  if (!code) return null;
  const stratification = (item.modifier ?? [])
    .map((m) => m.code)
    .filter(Boolean)
    .sort()
    .join(",");
  const period = item.serviced_period
    ? `${item.serviced_period.start ?? ""}~${item.serviced_period.end ?? ""}`
    : "";
  return `${code}|${stratification}|${period}`;
}

export const DUPLICATE_ITEM_ERROR =
  "Duplicate item: product or service, stratification and service period must be unique. Change the stratification or service period to make it unique.";

export const LM100_BENEFIT_CODE = "LM100";

export const LM100_OVERLAP_ERROR =
  "Two LM100 items cannot have overlapping service periods. Adjust the service period so it does not overlap another LM100 item.";

export const STRATIFICATION_OVERLAP_ERROR =
  "Stratified items for the same product or service cannot have overlapping service periods. Adjust the service period so it does not overlap another stratified item.";

function parsePeriodBound(value: string | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

function servicePeriodsOverlap(
  a: { start?: string; end?: string } | undefined,
  b: { start?: string; end?: string } | undefined,
): boolean {
  const aStart = parsePeriodBound(a?.start);
  const bStart = parsePeriodBound(b?.start);

  if (aStart === null || bStart === null) return false;
  const aEnd = parsePeriodBound(a?.end) ?? Number.POSITIVE_INFINITY;
  const bEnd = parsePeriodBound(b?.end) ?? Number.POSITIVE_INFINITY;
  return aStart <= bEnd && bStart <= aEnd;
}

function getStratificationKey(item: { modifier?: Coding[] }): string {
  return (item.modifier ?? [])
    .map((m) => m.code)
    .filter(Boolean)
    .sort()
    .join(",");
}

function hasStratification(item: { modifier?: Coding[] }): boolean {
  return getStratificationKey(item).length > 0;
}

export function findStratificationOverlapIndexes(
  items: ItemWithProduct[],
): Set<number> {
  const overlapping = new Set<number>();

  const groups = new Map<string, number[]>();
  items.forEach((item, index) => {
    if (item._is_disabled) return;
    if (item._implant_parent_sequence != null) return;
    if (!hasStratification(item)) return;
    const code = item.product_or_service?.code;
    if (!code) return;
    if (code === LM100_BENEFIT_CODE) return;
    groups.set(code, [...(groups.get(code) ?? []), index]);
  });

  for (const indexes of groups.values()) {
    for (let i = 0; i < indexes.length; i += 1) {
      for (let j = i + 1; j < indexes.length; j += 1) {
        const first = indexes[i];
        const second = indexes[j];
        if (
          servicePeriodsOverlap(
            items[first].serviced_period,
            items[second].serviced_period,
          )
        ) {
          overlapping.add(first);
          overlapping.add(second);
        }
      }
    }
  }

  return overlapping;
}

export function findOverlappingBenefitItemIndexes(
  items: ItemWithProduct[],
  benefitCode: string,
): Set<number> {
  const overlapping = new Set<number>();

  const candidateIndexes: number[] = [];
  items.forEach((item, index) => {
    if (item.product_or_service?.code !== benefitCode) return;
    if (item._is_disabled) return;
    if (item._implant_parent_sequence != null) return;
    candidateIndexes.push(index);
  });

  for (let i = 0; i < candidateIndexes.length; i += 1) {
    for (let j = i + 1; j < candidateIndexes.length; j += 1) {
      const first = candidateIndexes[i];
      const second = candidateIndexes[j];
      if (
        servicePeriodsOverlap(
          items[first].serviced_period,
          items[second].serviced_period,
        )
      ) {
        overlapping.add(first);
        overlapping.add(second);
      }
    }
  }

  return overlapping;
}

export function buildCrossItemErrors(
  items: ItemWithProduct[],
  benefitDetailsByCode: Map<string, InsurancePlanBenefitDetail | undefined>,
  options?: {
    requireEnhancementAllowed?: boolean;
    enhancementExemptSequences?: Set<number>;
  },
): Map<number, string[]> {
  const errorsByIndex = new Map<number, string[]>();

  const addError = (index: number, message: string) => {
    const existing = errorsByIndex.get(index) ?? [];
    if (!existing.includes(message)) {
      errorsByIndex.set(index, [...existing, message]);
    }
  };

  const keyToIndexes = new Map<string, number[]>();
  items.forEach((item, index) => {
    if (item._implant_parent_sequence != null) return;
    const key = getItemUniquenessKey(item);
    if (!key) return;
    const existing = keyToIndexes.get(key) ?? [];
    keyToIndexes.set(key, [...existing, index]);
  });

  for (const indexes of keyToIndexes.values()) {
    if (indexes.length > 1) {
      for (const index of indexes) {
        addError(index, DUPLICATE_ITEM_ERROR);
      }
    }
  }

  const activeItemIndexes: number[] = [];
  items.forEach((item, index) => {
    if (item._implant_parent_sequence != null) return;
    if (!item.product_or_service?.code) return;
    activeItemIndexes.push(index);
  });
  const hasUnspecified = activeItemIndexes.some((index) =>
    isUnspecifiedProcedureCode(items[index].product_or_service?.code),
  );
  if (hasUnspecified && activeItemIndexes.length > 1) {
    for (const index of activeItemIndexes) {
      addError(index, UNSPECIFIED_PROCEDURE_MIX_ERROR);
    }
  }

  const conservativeIndexes: number[] = [];
  items.forEach((item, index) => {
    const code = item.product_or_service?.code;
    if (!code) return;
    const detail = benefitDetailsByCode.get(code);
    if (detail?.procedure_type === "Conservative") {
      conservativeIndexes.push(index);
    }
  });

  if (conservativeIndexes.length > 1) {
    for (const index of conservativeIndexes) {
      addError(index, "Only one Conservative procedure item is allowed");
    }
  }

  if (options?.requireEnhancementAllowed) {
    items.forEach((item, index) => {
      if (
        item.sequence != null &&
        options.enhancementExemptSequences?.has(item.sequence)
      ) {
        return;
      }
      const code = item.product_or_service?.code;
      if (!code) return;
      const detail = benefitDetailsByCode.get(code);
      if (detail && !hasEnhancementAllowedCondition(detail)) {
        addError(
          index,
          "This benefit does not allow enhancement. Only items with enhancement allowed can be added.",
        );
      }
    });
  }

  return errorsByIndex;
}
