import { QuestionnaireItem } from "@/types/insurance_plan";
import { QuestionnaireResponseItemInput } from "./schema";

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
