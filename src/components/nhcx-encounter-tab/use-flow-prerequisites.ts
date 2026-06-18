import { Encounter } from "@/types/encounter";
import { Patient } from "@/types/patient";
import { apis } from "@/apis";
import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ATTENDANT_DETAILS_SLUG,
  buildPrerequisiteContext,
  CHILD_AGE_THRESHOLD,
  CHILD_VERIFICATION_SLUG,
  FlowAnchor,
  getPrerequisiteGroup,
  PrerequisiteGroupState,
  PrerequisitePhase,
  resolvePatientAge,
} from "./flow-prerequisites";

export type FlowPrerequisitesState = {
  isLoading: boolean;
  ageUnknown: boolean;
  isChild: boolean;
  patientUpdateHref: string;
  getGroup: (
    anchor: FlowAnchor,
    phase: PrerequisitePhase,
  ) => PrerequisiteGroupState;
  beforeCeValidation: PrerequisiteGroupState;
  afterCeValidation: PrerequisiteGroupState;
};

export function useFlowPrerequisites(
  encounter: Encounter,
  patient: Patient,
): FlowPrerequisitesState {
  const patientId = patient.id;
  const encounterId = encounter.id;

  const age = useMemo(() => resolvePatientAge(patient), [patient]);
  const ageUnknown = age === undefined;
  const isChild = age !== undefined && age <= CHILD_AGE_THRESHOLD;

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

  const context = useMemo(
    () =>
      buildPrerequisiteContext(encounter, patient, {
        hasAttendantDetails: (attendantResponses?.count ?? 0) > 0,
        hasChildVerification: (childVerificationResponses?.count ?? 0) > 0,
        isLoadingAttendant,
        isLoadingChild,
      }),
    [
      encounter,
      patient,
      attendantResponses?.count,
      childVerificationResponses?.count,
      isLoadingAttendant,
      isLoadingChild,
    ],
  );

  const getGroup = useCallback(
    (anchor: FlowAnchor, phase: PrerequisitePhase) =>
      getPrerequisiteGroup(context, anchor, phase),
    [context],
  );

  const beforeCeValidation = useMemo(
    () => getPrerequisiteGroup(context, "ce-validation", "before"),
    [context],
  );

  const afterCeValidation = useMemo(
    () => getPrerequisiteGroup(context, "ce-validation", "after"),
    [context],
  );

  const isLoading = beforeCeValidation.isLoading || afterCeValidation.isLoading;

  return {
    isLoading,
    ageUnknown: context.ageUnknown,
    isChild: context.isChild,
    patientUpdateHref: context.patientUpdateHref,
    getGroup,
    beforeCeValidation,
    afterCeValidation,
  };
}
