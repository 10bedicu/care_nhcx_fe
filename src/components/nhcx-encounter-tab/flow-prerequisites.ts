import { Encounter } from "@/types/encounter";
import { Patient } from "@/types/patient";

export const FLOW_ANCHORS = [
  "ce-validation",
  "ce-auth-requirements",
  "pre-auth",
  "claim",
] as const;

export type FlowAnchor = (typeof FLOW_ANCHORS)[number];
export type PrerequisitePhase = "before" | "after";

export type PrerequisiteChecklistItem = {
  key: string;
  label: string;
  description: string;
  satisfied: boolean;
  actionLabel: string;
  actionHref: string;
};

export type PrerequisiteGroupState = {
  isLoading: boolean;
  isSatisfied: boolean;
  checklist: PrerequisiteChecklistItem[];
};

export const CHILD_AGE_THRESHOLD = 6;

export const PMJAY_MEMBER_EXTENSION = "care_nhcx__pmjay_member";
export const ATTENDANT_DETAILS_SLUG = "care_nhcx__attendant_details";
export const CHILD_VERIFICATION_SLUG = "care_nhcx__child_verification";

export type PrerequisiteContext = {
  encounter: Encounter;
  patient: Patient;
  ageUnknown: boolean;
  isChild: boolean;
  hasMemberId: boolean;
  hasParentMemberId: boolean;
  hasAttendantDetails: boolean;
  hasChildVerification: boolean;
  isLoadingAttendant: boolean;
  isLoadingChild: boolean;
  patientUpdateHref: string;
  attendantQuestionnaireHref: string;
  childVerificationQuestionnaireHref: string;
};

type PrerequisiteDefinition = {
  key: string;
  anchor: FlowAnchor;
  phase: PrerequisitePhase;
  label: string;
  description: string;
  actionLabel: string;
  applies: (ctx: PrerequisiteContext) => boolean;
  isSatisfied: (ctx: PrerequisiteContext) => boolean;
  resolveActionHref: (ctx: PrerequisiteContext) => string;
};

const PREREQUISITE_DEFINITIONS: PrerequisiteDefinition[] = [
  {
    key: "parent-member-id",
    anchor: "ce-validation",
    phase: "before",
    label: "Parent's PMJAY Member ID",
    description:
      "Add the parent's PMJAY member ID on the patient record (child below 6 years).",
    actionLabel: "Edit Patient",
    applies: (ctx) => ctx.isChild,
    isSatisfied: (ctx) => ctx.hasParentMemberId,
    resolveActionHref: (ctx) => ctx.patientUpdateHref,
  },
  {
    key: "member-id",
    anchor: "ce-validation",
    phase: "before",
    label: "PMJAY Member ID",
    description: "Add the patient's PMJAY member ID on the patient record.",
    actionLabel: "Edit Patient",
    applies: (ctx) => !ctx.isChild,
    isSatisfied: (ctx) => ctx.hasMemberId,
    resolveActionHref: (ctx) => ctx.patientUpdateHref,
  },
  {
    key: "child-verification",
    anchor: "ce-validation",
    phase: "after",
    label: "Child Verification",
    description:
      "Submit the Child Verification form with the birth certificate for this patient.",
    actionLabel: "Fill Form",
    applies: (ctx) => ctx.isChild,
    isSatisfied: (ctx) => ctx.hasChildVerification,
    resolveActionHref: (ctx) => ctx.childVerificationQuestionnaireHref,
  },
  {
    key: "attendant-details",
    anchor: "ce-validation",
    phase: "after",
    label: "Attendant Details",
    description: "Submit the Attendant Details form for this encounter.",
    actionLabel: "Fill Form",
    applies: () => true,
    isSatisfied: (ctx) => ctx.hasAttendantDetails,
    resolveActionHref: (ctx) => ctx.attendantQuestionnaireHref,
  },
];

export function resolvePatientAge(patient: Patient): number | undefined {
  if (patient.date_of_birth) {
    const dob = new Date(patient.date_of_birth);
    if (!Number.isNaN(dob.getTime())) {
      const now = new Date();
      let age = now.getFullYear() - dob.getFullYear();
      const monthDiff = now.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
        age -= 1;
      }
      return age;
    }
  }
  if (typeof patient.year_of_birth === "number") {
    return new Date().getFullYear() - patient.year_of_birth;
  }
  return undefined;
}

function isGroupLoading(
  ctx: PrerequisiteContext,
  anchor: FlowAnchor,
  phase: PrerequisitePhase,
): boolean {
  if (ctx.ageUnknown) return false;

  const definitions = PREREQUISITE_DEFINITIONS.filter(
    (def) => def.anchor === anchor && def.phase === phase && def.applies(ctx),
  );

  if (definitions.length === 0) return false;

  if (anchor === "ce-validation" && phase === "after") {
    return ctx.isLoadingAttendant || (ctx.isChild && ctx.isLoadingChild);
  }

  return false;
}

function buildChecklist(
  ctx: PrerequisiteContext,
  anchor: FlowAnchor,
  phase: PrerequisitePhase,
): PrerequisiteChecklistItem[] {
  return PREREQUISITE_DEFINITIONS.filter(
    (def) => def.anchor === anchor && def.phase === phase && def.applies(ctx),
  ).map((def) => ({
    key: def.key,
    label: def.label,
    description: def.description,
    satisfied: def.isSatisfied(ctx),
    actionLabel: def.actionLabel,
    actionHref: def.resolveActionHref(ctx),
  }));
}

export function getPrerequisiteGroup(
  ctx: PrerequisiteContext,
  anchor: FlowAnchor,
  phase: PrerequisitePhase,
): PrerequisiteGroupState {
  const isLoading = isGroupLoading(ctx, anchor, phase);
  const checklist = buildChecklist(ctx, anchor, phase);

  if (anchor === "ce-validation" && phase === "before" && ctx.ageUnknown) {
    return { isLoading: false, isSatisfied: false, checklist: [] };
  }

  const isSatisfied =
    !ctx.ageUnknown && !isLoading && checklist.every((item) => item.satisfied);

  return { isLoading, isSatisfied, checklist };
}

export function isPrerequisiteGroupSatisfied(
  ctx: PrerequisiteContext,
  anchor: FlowAnchor,
  phase: PrerequisitePhase,
): boolean {
  return getPrerequisiteGroup(ctx, anchor, phase).isSatisfied;
}

export function buildPrerequisiteContext(
  encounter: Encounter,
  patient: Patient,
  data: {
    hasAttendantDetails: boolean;
    hasChildVerification: boolean;
    isLoadingAttendant: boolean;
    isLoadingChild: boolean;
  },
): PrerequisiteContext {
  const facilityId = encounter.facility.id;
  const patientId = patient.id;
  const encounterId = encounter.id;

  const age = resolvePatientAge(patient);
  const ageUnknown = age === undefined;
  const isChild = age !== undefined && age <= CHILD_AGE_THRESHOLD;

  const memberExtension = (patient.extensions?.[PMJAY_MEMBER_EXTENSION] ??
    {}) as { member_id?: string; parent_member_id?: string };

  return {
    encounter,
    patient,
    ageUnknown,
    isChild,
    hasMemberId: !!memberExtension.member_id?.trim(),
    hasParentMemberId: !!memberExtension.parent_member_id?.trim(),
    hasAttendantDetails: data.hasAttendantDetails,
    hasChildVerification: data.hasChildVerification,
    isLoadingAttendant: data.isLoadingAttendant,
    isLoadingChild: data.isLoadingChild,
    patientUpdateHref: `/facility/${facilityId}/patient/${patientId}/update`,
    attendantQuestionnaireHref: `/facility/${facilityId}/patient/${patientId}/encounter/${encounterId}/questionnaire/${ATTENDANT_DETAILS_SLUG}`,
    childVerificationQuestionnaireHref: `/facility/${facilityId}/patient/${patientId}/questionnaire`,
  };
}
