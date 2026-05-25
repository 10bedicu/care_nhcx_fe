import { Coding } from "@/types/base";
import {
  BenefitCostQualifierType,
  InsurancePlanBenefitDetail,
} from "@/types/insurance_plan";

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
  modifiers: Coding[]
): string[] {
  if (!benefitDetail?.conditions?.length) return [];

  const qualifierTypeMap = buildQualifierTypeMap(benefitDetail);
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
      if (implantModifiers.length === 0) {
        errors.push("An implant modifier is required for this benefit");
      } else if (!cond.multiple_implants_allowed && implantModifiers.length > 1) {
        errors.push("Only one implant is allowed");
      } else if (
        cond.maximum_implants_allowed > 0 &&
        implantModifiers.length > cond.maximum_implants_allowed
      ) {
        errors.push(
          `Maximum ${cond.maximum_implants_allowed} implant(s) allowed, ${implantModifiers.length} selected`
        );
      }
    } else if (implantModifiers.length > 0) {
      errors.push("Implants are not applicable for this benefit");
    }
  }

  return [...new Set(errors)];
}

type ItemWithProduct = {
  product_or_service?: Coding;
  sequence?: number;
};

export function buildCrossItemErrors(
  items: ItemWithProduct[],
  benefitDetailsByCode: Map<string, InsurancePlanBenefitDetail | undefined>,
  options?: {
    requireEnhancementAllowed?: boolean;
    /** Item sequences prefilled from a linked CE — exempt from enhancement validation. */
    enhancementExemptSequences?: Set<number>;
  }
): Map<number, string[]> {
  const errorsByIndex = new Map<number, string[]>();

  const addError = (index: number, message: string) => {
    const existing = errorsByIndex.get(index) ?? [];
    if (!existing.includes(message)) {
      errorsByIndex.set(index, [...existing, message]);
    }
  };

  const codeToIndexes = new Map<string, number[]>();
  items.forEach((item, index) => {
    const code = item.product_or_service?.code;
    if (!code) return;
    const existing = codeToIndexes.get(code) ?? [];
    codeToIndexes.set(code, [...existing, index]);
  });

  for (const [code, indexes] of codeToIndexes) {
    if (indexes.length > 1) {
      for (const index of indexes) {
        addError(
          index,
          `Duplicate product or service code: ${code}. Each item must have a unique procedure.`
        );
      }
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
          "This benefit does not allow enhancement. Only items with enhancement allowed can be added."
        );
      }
    });
  }

  return errorsByIndex;
}
