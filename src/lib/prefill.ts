import { ChargeItem } from "@/types/charge_item";
import { ClaimDiagnosisOnAdmissionChoice } from "@/types/claim";
import { Coding, Period } from "@/types/base";
import { Condition } from "@/types/condition";
import { Encounter } from "@/types/encounter";
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

export function encounterServicedPeriod(
  encounter: Encounter | undefined | null,
): Period | undefined {
  const period = encounter?.period;
  if (!period?.start && !period?.end) return undefined;
  return period;
}

/** Merge serviced periods field-by-field; claim values take precedence. */
export function mergeServicedPeriod(
  claimPeriod: Period | undefined,
  fallbackPeriod: Period | undefined,
): Period | undefined {
  const start = claimPeriod?.start ?? fallbackPeriod?.start;
  const end = claimPeriod?.end ?? fallbackPeriod?.end;
  if (!start && !end) return undefined;
  return { start, end };
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
export type ClaimPrefillDiagnosis = {
  sequence: number;
  type: Coding[];
  diagnosis_reference?: string;
  diagnosis_code?: Coding;
  on_admission?: ClaimDiagnosisOnAdmissionChoice;
};

export type ClaimPrefillCareTeam = {
  sequence: number;
  provider: string;
  responsible?: boolean;
  role?: Coding;
};

export function codingKey(coding: Coding | undefined): string | null {
  const code = coding?.code?.trim();
  if (!code) return null;
  return code;
}

function careTeamUsernameKey(
  providerId: string | undefined,
  username: string | undefined,
  providerUsernameById: Map<string, string>,
): string | null {
  const resolvedUsername =
    username?.trim() || providerUsernameById.get(providerId ?? "")?.trim();
  if (resolvedUsername) return resolvedUsername.toLowerCase();
  return providerId ?? null;
}

function buildProviderUsernameMap(
  encounter: Encounter | undefined | null,
  extra?: Map<string, string>,
): Map<string, string> {
  const map = new Map(extra);
  for (const entry of encounter?.care_team ?? []) {
    const providerId = entry.member?.id;
    const username = entry.member?.username?.trim();
    if (providerId && username) {
      map.set(providerId, username);
    }
  }
  return map;
}

/** Merge existing care team with encounter members, deduplicated by username. */
export function mergeCareTeamWithEncounter(
  existing: ClaimPrefillCareTeam[],
  encounter: Encounter | undefined | null,
  providerUsernameById: Map<string, string> = new Map(),
): ClaimPrefillCareTeam[] {
  const usernameMap = buildProviderUsernameMap(encounter, providerUsernameById);
  const seen = new Set<string>();
  const result: ClaimPrefillCareTeam[] = [];

  for (const member of existing) {
    const key = careTeamUsernameKey(
      member.provider,
      undefined,
      usernameMap,
    );
    if (key) seen.add(key);
    result.push({ ...member });
  }

  let nextSequence = Math.max(0, ...result.map((member) => member.sequence)) + 1;

  for (const entry of encounter?.care_team ?? []) {
    const providerId = entry.member?.id;
    const key = careTeamUsernameKey(
      providerId,
      entry.member?.username,
      usernameMap,
    );
    if (!key || !providerId || seen.has(key)) continue;
    seen.add(key);
    result.push({
      sequence: nextSequence++,
      provider: providerId,
      responsible: false,
      role: entry.role,
    });
  }

  return result;
}

/** Build deduplicated claim diagnoses from encounter conditions. */
export function buildEncounterDiagnoses(
  conditions: Condition[],
): ClaimPrefillDiagnosis[] {
  return mergeDiagnosesWithEncounter([], conditions);
}

/** Build deduplicated claim care team from encounter participants. */
export function buildEncounterCareTeam(
  encounter: Encounter | undefined | null,
): ClaimPrefillCareTeam[] {
  return mergeCareTeamWithEncounter([], encounter);
}

/** Merge existing diagnoses with encounter conditions, deduplicated by code. */
export function mergeDiagnosesWithEncounter(
  existing: ClaimPrefillDiagnosis[],
  encounterDiagnoses: Condition[],
  additional: Array<{
    diagnosis_code?: Coding;
    type?: Coding[];
    on_admission?: ClaimDiagnosisOnAdmissionChoice;
  }> = [],
): ClaimPrefillDiagnosis[] {
  const seen = new Set<string>();
  const result: ClaimPrefillDiagnosis[] = [];

  for (const entry of existing) {
    const key = codingKey(entry.diagnosis_code);
    if (key) seen.add(key);
    result.push({ ...entry });
  }

  let nextSequence = Math.max(0, ...result.map((entry) => entry.sequence)) + 1;

  const add = (entry: {
    diagnosis_code?: Coding;
    type?: Coding[];
    on_admission?: ClaimDiagnosisOnAdmissionChoice;
  }) => {
    const key = codingKey(entry.diagnosis_code);
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push({
      sequence: nextSequence++,
      type: entry.type?.length ? entry.type : [DEFAULT_DIAGNOSIS_TYPE],
      diagnosis_code: entry.diagnosis_code,
      on_admission: entry.on_admission ?? "unknown",
    });
  };

  for (const condition of encounterDiagnoses) {
    add({ diagnosis_code: condition.code });
  }
  for (const entry of additional) {
    add(entry);
  }

  return result;
}

function uniqueSequences(sequences: number[]): number[] {
  return [...new Set(sequences)];
}

/** Add encounter care team and diagnoses on top of existing form values. */
export function applyEncounterPrefill<
  T extends {
    care_team: ClaimPrefillCareTeam[];
    diagnosis: ClaimPrefillDiagnosis[];
    item: Array<{
      care_team_sequence: number[];
      diagnosis_sequence: number[];
    }>;
  },
>(
  values: T,
  encounter: Encounter | undefined | null,
  encounterDiagnoses: Condition[],
  options: {
    extraDiagnoses?: Array<{
      diagnosis_code?: Coding;
      type?: Coding[];
      on_admission?: ClaimDiagnosisOnAdmissionChoice;
    }>;
    providerUsernameById?: Map<string, string>;
  } = {},
): T {
  const care_team = mergeCareTeamWithEncounter(
    values.care_team ?? [],
    encounter,
    options.providerUsernameById,
  );
  const diagnosis = mergeDiagnosesWithEncounter(
    values.diagnosis ?? [],
    encounterDiagnoses,
    options.extraDiagnoses ?? [],
  );
  const careTeamSequences = care_team.map((member) => member.sequence);
  const diagnosisSequences = diagnosis.map((entry) => entry.sequence);

  return {
    ...values,
    care_team,
    diagnosis,
    item: values.item.map((item) => ({
      ...item,
      care_team_sequence: uniqueSequences([
        ...(item.care_team_sequence ?? []),
        ...careTeamSequences,
      ]),
      diagnosis_sequence: uniqueSequences([
        ...(item.diagnosis_sequence ?? []),
        ...diagnosisSequences,
      ]),
    })),
  } as T;
}

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
