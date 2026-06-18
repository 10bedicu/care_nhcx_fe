import { QuestionnaireItem } from "@/types/insurance_plan";
import { ClaimUseChoice } from "@/types/claim";
import { EncounterDischargeDisposition } from "@/types/encounter";
import { QuestionnaireResponseItemInput } from "./schema";

export type QuestionnaireRequirementStatus =
  | "missing"
  | "incomplete"
  | "complete";

export const AUTHENTICATION_CONSENT_QUESTIONNAIRE = "100024";
export const DISCHARGE_CONSENT_QUESTIONNAIRE = "100466";
export const LAMA_DISCHARGE_QUESTIONNAIRE = "100136";
export const DAMA_DISCHARGE_QUESTIONNAIRE = "100137";
export const DEATH_DISCHARGE_QUESTIONNAIRE = "100025";
export const NORMAL_DISCHARGE_QUESTIONNAIRE = "100005";

export const CLAIM_CONSENT_OBTAINED_STORE_KEY = "claimConsentObtained";
export const CLAIM_DISCHARGE_DISPOSITION_STORE_KEY = "claimDischargeDisposition";

export function getForcedConsentQuestionnaireFhirId(
  claimUse: ClaimUseChoice | undefined,
  consentObtained: boolean | undefined,
): string | null {
  if (consentObtained !== false) return null;
  return claimUse === "claim"
    ? DISCHARGE_CONSENT_QUESTIONNAIRE
    : AUTHENTICATION_CONSENT_QUESTIONNAIRE;
}

export function getForcedDischargeQuestionnaireFhirId(
  claimUse: ClaimUseChoice | undefined,
  dischargeDisposition: EncounterDischargeDisposition | undefined,
): string | null {
  if (claimUse !== "claim") return null;

  switch (dischargeDisposition) {
    case "aadvice":
      return LAMA_DISCHARGE_QUESTIONNAIRE;
    case "oth":
      return DAMA_DISCHARGE_QUESTIONNAIRE;
    case "exp":
      return DEATH_DISCHARGE_QUESTIONNAIRE;
    default:
      return NORMAL_DISCHARGE_QUESTIONNAIRE;
  }
}

export function getForcedQuestionnaireFhirIds(
  claimUse: ClaimUseChoice | undefined,
  consentObtained: boolean | undefined,
  dischargeDisposition: EncounterDischargeDisposition | undefined,
): Set<string> {
  const ids = new Set<string>();
  const consentId = getForcedConsentQuestionnaireFhirId(
    claimUse,
    consentObtained,
  );
  if (consentId) ids.add(consentId);
  const dischargeId = getForcedDischargeQuestionnaireFhirId(
    claimUse,
    dischargeDisposition,
  );
  if (dischargeId) ids.add(dischargeId);
  return ids;
}

export function isQuestionnaireRequirementEffectivelyRequired(
  req: { is_required: boolean; questionnaire?: { fhir_id?: string } | null },
  forcedFhirIds: Set<string>,
): boolean {
  const fhirId = req.questionnaire?.fhir_id;
  return req.is_required || (!!fhirId && forcedFhirIds.has(fhirId));
}

export function getQuestionnaireRequirementStatus(
  detail: { full_url: string; items: QuestionnaireItem[] } | undefined,
  watchedQR: { questionnaire: string; item?: QuestionnaireResponseItemInput[] }[]
): QuestionnaireRequirementStatus {
  if (!detail) return "missing";
  const qr = watchedQR.find((r) => r.questionnaire === detail.full_url);
  if (!qr) return "missing";
  const missing = countMissingRequiredItems(detail.items, qr.item ?? []);
  return missing === 0 ? "complete" : "incomplete";
}

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
