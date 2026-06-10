import { Encounter } from "@/types/encounter";
import { Patient } from "@/types/patient";
import { apis } from "@/apis";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

const CHILD_AGE_THRESHOLD = 6;

const PMJAY_MEMBER_EXTENSION = "care_nhcx__pmjay_member";
const ATTENDANT_DETAILS_SLUG = "care_nhcx__attendant_details";
const CHILD_VERIFICATION_SLUG = "care_nhcx__child_verification";

export type PmjayChecklistItem = {
  key: string;
  label: string;
  description: string;
  satisfied: boolean;
  actionLabel: string;
  actionHref: string;
};

export type PmjayEligibilityState = {
  isLoading: boolean;
  ageUnknown: boolean;
  isSatisfied: boolean;
  isChild: boolean;
  checklist: PmjayChecklistItem[];
  patientUpdateHref: string;
};

function resolvePatientAge(patient: Patient): number | undefined {
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

export function usePmjayEligibility(
  encounter: Encounter,
  patient: Patient,
): PmjayEligibilityState {
  const facilityId = encounter.facility.id;
  const patientId = patient.id;
  const encounterId = encounter.id;

  const age = useMemo(() => resolvePatientAge(patient), [patient]);
  const ageUnknown = age === undefined;
  const isChild = age !== undefined && age <= CHILD_AGE_THRESHOLD;

  const memberExtension = (patient.extensions?.[PMJAY_MEMBER_EXTENSION] ??
    {}) as { member_id?: string; parent_member_id?: string };
  const hasMemberId = !!memberExtension.member_id?.trim();
  const hasParentMemberId = !!memberExtension.parent_member_id?.trim();

  const { data: attendantResponses, isLoading: isLoadingAttendant } = useQuery({
    queryKey: ["pmjay-attendant-response", patientId, encounterId],
    queryFn: () =>
      apis.questionnaireResponse.list(patientId, {
        questionnaire_slug: ATTENDANT_DETAILS_SLUG,
        encounter: encounterId,
        status: "completed",
      }),
    enabled: !!patientId && !!encounterId && !ageUnknown,
  });

  const { data: childVerificationResponses, isLoading: isLoadingChild } =
    useQuery({
      queryKey: ["pmjay-child-verification-response", patientId],
      queryFn: () =>
        apis.questionnaireResponse.list(patientId, {
          questionnaire_slug: CHILD_VERIFICATION_SLUG,
          status: "completed",
        }),
      enabled: !!patientId && isChild,
    });

  const patientUpdateHref = `/facility/${facilityId}/patient/${patientId}/update`;
  const attendantQuestionnaireHref = `/facility/${facilityId}/patient/${patientId}/encounter/${encounterId}/questionnaire/${ATTENDANT_DETAILS_SLUG}`;
  const childVerificationQuestionnaireHref = `/facility/${facilityId}/patient/${patientId}/questionnaire`;

  const hasAttendantDetails = (attendantResponses?.count ?? 0) > 0;
  const hasChildVerification = (childVerificationResponses?.count ?? 0) > 0;

  const isLoading =
    !ageUnknown && (isLoadingAttendant || (isChild && isLoadingChild));

  const checklist = useMemo<PmjayChecklistItem[]>(() => {
    const items: PmjayChecklistItem[] = [];

    if (isChild) {
      items.push({
        key: "parent-member-id",
        label: "Parent's PMJAY Member ID",
        description:
          "Add the parent's PMJAY member ID on the patient record (child below 6 years).",
        satisfied: hasParentMemberId,
        actionLabel: "Edit Patient",
        actionHref: patientUpdateHref,
      });
      items.push({
        key: "child-verification",
        label: "Child Verification",
        description:
          "Submit the Child Verification form with the birth certificate for this patient.",
        satisfied: hasChildVerification,
        actionLabel: "Fill Form",
        actionHref: childVerificationQuestionnaireHref,
      });
    } else {
      items.push({
        key: "member-id",
        label: "PMJAY Member ID",
        description: "Add the patient's PMJAY member ID on the patient record.",
        satisfied: hasMemberId,
        actionLabel: "Edit Patient",
        actionHref: patientUpdateHref,
      });
    }

    items.push({
      key: "attendant-details",
      label: "Attendant Details",
      description: "Submit the Attendant Details form for this encounter.",
      satisfied: hasAttendantDetails,
      actionLabel: "Fill Form",
      actionHref: attendantQuestionnaireHref,
    });

    return items;
  }, [
    isChild,
    hasParentMemberId,
    hasChildVerification,
    hasMemberId,
    hasAttendantDetails,
    patientUpdateHref,
    attendantQuestionnaireHref,
    childVerificationQuestionnaireHref,
  ]);

  const isSatisfied =
    !ageUnknown && !isLoading && checklist.every((item) => item.satisfied);

  return {
    isLoading,
    ageUnknown,
    isSatisfied,
    isChild,
    checklist,
    patientUpdateHref,
  };
}
