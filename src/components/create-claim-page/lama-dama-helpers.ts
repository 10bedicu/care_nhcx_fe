import { Claim, ClaimQuestionnaireResponseItem } from "@/types/claim";
import { Coding, Period } from "@/types/base";
import { EncounterDischargeDisposition } from "@/types/encounter";
import { InsurancePlanBenefit } from "@/types/insurance_plan";
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import {
  DEFAULT_ITEM_CATEGORY,
  DEFAULT_PROGRAM_CODE,
} from "@/lib/prefill";
import {
  DAMA_DISCHARGE_QUESTIONNAIRE,
  LAMA_DISCHARGE_QUESTIONNAIRE,
  hasAnswerValue,
} from "./questionnaire-helpers";
import { createClaimFormSchema } from "./schema";

export const LAMA_DAMA_PROCEDURE_BENEFIT_CODE = "LM100";

export type LamaDamaTreatmentTiming = "before_during" | "after";

const PROCEDURE_CODE_SYSTEM =
  "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-procedures-code";
const BENEFIT_CATEGORY_SYSTEM =
  "https://nrces.in/ndhm/fhir/r4/ValueSet/ndhm-benefitcategory";

type ClaimFormValues = z.infer<typeof createClaimFormSchema>;

const ITEM_VALIDATION_ERROR_KEYS = [
  "_mandatory_docs_error",
  "_mandatory_questionnaires_error",
  "_mandatory_care_team_error",
  "_mandatory_diagnosis_error",
  "_mandatory_charge_items_error",
  "_mandatory_procedure_error",
  "_mandatory_supporting_info_error",
  "_amount_cap_error",
  "_condition_errors",
] as const;

export function isLamaDamaDisposition(
  disposition: EncounterDischargeDisposition | undefined,
): boolean {
  return disposition === "aadvice" || disposition === "oth";
}

export function getLamaDamaDispositionLabel(
  disposition: EncounterDischargeDisposition | undefined,
): string {
  if (disposition === "aadvice") {
    return "Leave Against Medical Advice (LAMA)";
  }
  if (disposition === "oth") {
    return "Discharged Against Medical Advice (DAMA)";
  }
  return "LAMA/DAMA";
}

export function claimHasLm100Item(claim: Claim | undefined): boolean {
  return (claim?.item ?? []).some(
    (item) =>
      item.product_or_service?.code === LAMA_DAMA_PROCEDURE_BENEFIT_CODE,
  );
}

export function formHasLm100Item(
  items: ClaimFormValues["item"] | undefined,
): boolean {
  return (items ?? []).some(
    (item) =>
      item.product_or_service?.code === LAMA_DAMA_PROCEDURE_BENEFIT_CODE,
  );
}

function questionnaireResponseHasAnswers(
  items: ClaimQuestionnaireResponseItem[] | undefined,
): boolean {
  if (!items?.length) return false;
  for (const item of items) {
    if ((item.answer ?? []).some((answer) => hasAnswerValue(answer))) {
      return true;
    }
    if (questionnaireResponseHasAnswers(item.item)) {
      return true;
    }
  }
  return false;
}

function getDischargeQuestionnaireFhirId(
  disposition: EncounterDischargeDisposition | undefined,
): string | null {
  if (disposition === "aadvice") return LAMA_DISCHARGE_QUESTIONNAIRE;
  if (disposition === "oth") return DAMA_DISCHARGE_QUESTIONNAIRE;
  return null;
}

export function claimHasLamaDamaQuestionnaireFilled(
  claim: Claim | undefined,
  disposition: EncounterDischargeDisposition | undefined,
): boolean {
  const fhirId = getDischargeQuestionnaireFhirId(disposition);
  if (!claim?.questionnaire_responses?.length || !fhirId) return false;

  return claim.questionnaire_responses.some(
    (response) =>
      response.questionnaire.includes(fhirId) &&
      questionnaireResponseHasAnswers(response.item),
  );
}

export function shouldSkipLamaDamaDialog(
  claim: Claim | undefined,
  disposition: EncounterDischargeDisposition | undefined,
): boolean {
  return (
    claimHasLm100Item(claim) ||
    claimHasLamaDamaQuestionnaireFilled(claim, disposition)
  );
}

function clearedItemValidationErrors(): Partial<
  ClaimFormValues["item"][number]
> {
  return Object.fromEntries(
    ITEM_VALIDATION_ERROR_KEYS.map((key) => [key, undefined]),
  ) as Partial<ClaimFormValues["item"][number]>;
}

function collectAllChargeItemIds(
  items: ClaimFormValues["item"],
): string[] {
  return [
    ...new Set(items.flatMap((item) => item.charge_items ?? [])),
  ];
}

function collectModifiersFromOtherItems(
  items: ClaimFormValues["item"],
): Coding[] {
  const seen = new Set<string>();
  const result: Coding[] = [];

  for (const item of items) {
    if (
      item.product_or_service?.code === LAMA_DAMA_PROCEDURE_BENEFIT_CODE
    ) {
      continue;
    }
    for (const modifier of item.modifier ?? []) {
      if (!modifier.code || seen.has(modifier.code)) continue;
      seen.add(modifier.code);
      result.push(modifier);
    }
  }

  return result;
}

function clearDisabledItemFormErrors(
  form: UseFormReturn<ClaimFormValues>,
  items: ClaimFormValues["item"],
): void {
  items.forEach((item, index) => {
    if (!item._is_disabled) return;
    form.clearErrors(`item.${index}`);
    for (const key of ITEM_VALIDATION_ERROR_KEYS) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      form.setValue(`item.${index}.${key}` as any, undefined, {
        shouldDirty: false,
        shouldValidate: false,
      });
    }
  });
}

export function applyLm100Mode(
  form: UseFormReturn<ClaimFormValues>,
  options: {
    benefit?: InsurancePlanBenefit | null;
    encounterPeriod?: Period;
  },
): void {
  const items = form.getValues("item") ?? [];
  const careTeam = form.getValues("care_team") ?? [];
  const diagnosis = form.getValues("diagnosis") ?? [];
  const careTeamSeqs = careTeam.map((member) => member.sequence);
  const diagnosisSeqs = diagnosis.map((entry) => entry.sequence);
  const clearedValidation = clearedItemValidationErrors();
  const allChargeItemIds = collectAllChargeItemIds(items);
  const collectedModifiers = collectModifiersFromOtherItems(items);

  const productOrService = {
    system: PROCEDURE_CODE_SYSTEM,
    code: LAMA_DAMA_PROCEDURE_BENEFIT_CODE,
    display: options.benefit?.type_display ?? "LAMA DAMA Procedure",
  };
  const category = options.benefit
    ? {
        system: BENEFIT_CATEGORY_SYSTEM,
        code: options.benefit.coverage_type_code,
        display: options.benefit.coverage_type_display,
      }
    : DEFAULT_ITEM_CATEGORY;

  const updatedItems = items.map((item) => {
    const isLm100 =
      item.product_or_service?.code === LAMA_DAMA_PROCEDURE_BENEFIT_CODE;
    return {
      ...item,
      _is_disabled: !isLm100,
      charge_items: isLm100 ? allChargeItemIds : [],
      modifier: isLm100 ? collectedModifiers : [],
      ...(isLm100 ? {} : clearedValidation),
    };
  });

  if (!formHasLm100Item(updatedItems)) {
    const maxSeq = Math.max(0, ...updatedItems.map((item) => item.sequence));
    updatedItems.push({
      sequence: maxSeq + 1,
      care_team_sequence: [...careTeamSeqs],
      diagnosis_sequence: diagnosisSeqs.length > 0 ? [...diagnosisSeqs] : [],
      procedure_sequence: [],
      information_sequence: [],
      category,
      product_or_service: productOrService,
      charge_items: allChargeItemIds,
      modifier: collectedModifiers,
      program_code: [DEFAULT_PROGRAM_CODE],
      serviced_period: options.encounterPeriod,
      quantity: { value: 1 },
      unit_price: 0,
      factor: undefined,
      _is_disabled: false,
      ...clearedValidation,
    });
  }

  form.setValue("item", updatedItems, {
    shouldDirty: true,
    shouldValidate: true,
  });
  clearDisabledItemFormErrors(form, updatedItems);
  void form.trigger("item");
}
