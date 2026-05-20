import { QuestionnaireItem } from "@/types/insurance_plan";
import { QuestionnaireResponseItemInput } from "./schema";

/** Returns true if the answer object has at least one meaningful value set. */
export function hasAnswerValue(
  answer: Record<string, unknown> | null | undefined
): boolean {
  if (!answer) return false;
  // value_boolean: false is still a valid answer
  if (typeof answer.value_boolean === "boolean") return true;
  const SCALAR_KEYS = [
    "value_decimal",
    "value_integer",
    "value_date",
    "value_date_time",
    "value_time",
    "value_string",
    "value_uri",
    "value_attachment",
  ] as const;
  if (SCALAR_KEYS.some((k) => answer[k] !== undefined && answer[k] !== null && answer[k] !== ""))
    return true;
  const coding = answer.value_coding as Record<string, unknown> | undefined;
  if (coding?.code) return true;
  const qty = answer.value_quantity as Record<string, unknown> | undefined;
  if (qty?.value !== undefined && qty.value !== null && qty.value !== "") return true;
  return false;
}

/**
 * Recursively counts FHIR questionnaire items that are required but have no
 * answer in the corresponding response items.
 */
export function countMissingRequiredItems(
  fhirItems: QuestionnaireItem[],
  responseItems: QuestionnaireResponseItemInput[] | undefined
): number {
  let missing = 0;
  for (let i = 0; i < fhirItems.length; i++) {
    const fhirItem = fhirItems[i];
    const responseItem = responseItems?.[i];
    if (fhirItem.type === "display") continue;
    if (fhirItem.type === "group") {
      if (fhirItem.item?.length) {
        missing += countMissingRequiredItems(fhirItem.item, responseItem?.item);
      }
      continue;
    }
    if (fhirItem.required) {
      if (fhirItem.repeats) {
        const hasAny = (responseItem?.answer ?? []).some((a) =>
          hasAnswerValue(a as Record<string, unknown>)
        );
        if (!hasAny) missing++;
      } else {
        if (!hasAnswerValue(responseItem?.answer?.[0] as Record<string, unknown> | undefined))
          missing++;
      }
    }
    // Recurse into nested sub-items
    if (fhirItem.item?.length) {
      missing += countMissingRequiredItems(fhirItem.item, responseItem?.item);
    }
  }
  return missing;
}

/** PMJAY payloads use `prefix` for the question label; `text` may be absent. */
export function itemLabel(item: QuestionnaireItem): string {
  return item.prefix ?? item.text ?? item.linkId;
}

export function buildInitialItems(
  fhirItems: QuestionnaireItem[]
): QuestionnaireResponseItemInput[] {
  return fhirItems.map((item) => ({
    link_id: item.linkId,
    text: itemLabel(item),
    answer: item.type !== "group" && item.type !== "display" ? [{}] : undefined,
    item: item.item ? buildInitialItems(item.item) : undefined,
  }));
}

export function extractCoding(codeableConcept: {
  coding?: { system?: string; code?: string; display?: string }[];
  text?: string;
}) {
  const c = codeableConcept.coding?.[0];
  return {
    system: c?.system ?? "",
    code: c?.code ?? "",
    display: codeableConcept.text ?? c?.display,
  };
}
