import { ChargeItem } from "@/types/charge_item";
import { Coding } from "@/types/base";
import { InsurancePlanBenefitDetail } from "@/types/insurance_plan";

const SUPPORTING_INFO_CATEGORY_SYSTEM =
  "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category";
const SUPPORTING_INFO_CODE_SYSTEM =
  "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code";
const SNOMED_SYSTEM = "http://snomed.info/sct";
const PROGRAM_CODE_SYSTEM =
  "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code";

export const DEFAULT_PROGRAM_CODE: Coding = {
  code: "AB-PMJAY",
  system: PROGRAM_CODE_SYSTEM,
  display: "Ayushman Bharat Pradhan Mantri Jan Arogya Yojana (AB-PMJAY)",
};

export const DEFAULT_DIAGNOSIS_TYPE: Coding = {
  code: "89100005",
  system: SNOMED_SYSTEM,
  display:
    "Final diagnosis (discharge) (contextual qualifier) (qualifier value)",
};

export const DEFAULT_SUPPORTING_INFO_CATEGORY: Coding = {
  code: "DIA",
  system: SUPPORTING_INFO_CATEGORY_SYSTEM,
  display: "Diagnostic report",
};

export const DEFAULT_SUPPORTING_INFO_CODE: Coding = {
  code: "AT",
  system: SUPPORTING_INFO_CODE_SYSTEM,
  display: "Attachment",
};

export const DEFAULT_RELATED_RELATIONSHIP: Coding = {
  system:
    "http://terminology.hl7.org/CodeSystem/ex-relatedclaimrelationship",
  code: "prior",
  display: "Prior Claim",
};

export const DEFAULT_ITEM_CATEGORY: Coding = {
  code: "1586771000168103",
  system: SNOMED_SYSTEM,
  display: "Primary healthcare service",
};

export function chargeItemHasCoding(ci: ChargeItem): boolean {
  return Boolean(ci.code?.system?.trim() && ci.code?.code?.trim());
}

export function parsePositiveNumber(
  value: string | undefined,
  fallback: number
): number {
  const n = parseFloat(value ?? "");
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function chargeItemLabel(ci: ChargeItem): string {
  return (
    ci.code?.display ??
    ci.title ??
    (ci.code?.code ? `Code ${ci.code.code}` : "Unnamed charge item")
  );
}

/**
 * Collect the unique cost qualifiers from an IPB benefit detail and project
 * them as the `Coding[]` shape used by the form's `modifier` field.
 */
export function modifiersFromBenefit(
  benefit: InsurancePlanBenefitDetail | undefined
): Coding[] {
  if (!benefit?.costs) return [];
  const seen = new Set<string>();
  const result: Coding[] = [];
  for (const cost of benefit.costs) {
    for (const q of cost.qualifiers ?? []) {
      if (seen.has(q.qualifier_code)) continue;
      seen.add(q.qualifier_code);
      result.push({
        system: q.qualifier.coding?.[0]?.system ?? "",
        code: q.qualifier_code,
        display: q.qualifier.text ?? q.qualifier.coding?.[0]?.display,
      });
    }
  }
  return result;
}
