import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { validationCreatedAfterIso } from "@/components/policy-verification/constants";
import { apis } from "@/apis";
import { CoverageEligibilityRequest } from "@/types/coverage_eligibility";
import { PaginatedResponse } from "@/apis/types";

type UseLinkPatientValidationOptions = {
  encounterId?: string;
  patientId?: string;
  hasEncounterValidation: boolean;
};

export function useLinkPatientValidation({
  encounterId,
  patientId,
  hasEncounterValidation,
}: UseLinkPatientValidationOptions) {
  const queryClient = useQueryClient();
  const linkAttemptedRef = useRef<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  const shouldSearchPatientValidation =
    !!encounterId && !!patientId && !hasEncounterValidation;

  const { data: patientValidations } = useQuery({
    queryKey: ["coverage-eligibility-requests", "patient-unlinked", patientId],
    queryFn: () =>
      apis.coverageEligibilityRequest.list({
        patient: patientId,
        purpose: "validation",
        created_after: validationCreatedAfterIso(),
        ordering: "-created_date",
      }),
    enabled: shouldSearchPatientValidation,
  });

  const unlinkedValidation = (patientValidations?.results ?? []).find(
    (request) => !request.encounter,
  );

  useEffect(() => {
    linkAttemptedRef.current = null;
    setIsLinking(false);
  }, [encounterId, patientId]);

  useEffect(() => {
    if (
      !shouldSearchPatientValidation ||
      !encounterId ||
      !unlinkedValidation?.id
    ) {
      return;
    }

    const attemptKey = `${encounterId}:${unlinkedValidation.id}`;
    if (linkAttemptedRef.current === attemptKey) {
      return;
    }
    linkAttemptedRef.current = attemptKey;

    let cancelled = false;
    setIsLinking(true);

    apis.coverageEligibilityRequest
      .linkEncounter(unlinkedValidation.id, encounterId)
      .then((linkedRequest) => {
        queryClient.setQueryData<PaginatedResponse<CoverageEligibilityRequest>>(
          ["coverage-eligibility-requests", encounterId],
          (existing) => {
            const withoutLinked = (existing?.results ?? []).filter(
              (request) => request.id !== linkedRequest.id,
            );
            return {
              count: withoutLinked.length + 1,
              results: [linkedRequest, ...withoutLinked],
            };
          },
        );
        queryClient.removeQueries({
          queryKey: [
            "coverage-eligibility-requests",
            "patient-unlinked",
            patientId,
          ],
        });
      })
      .catch(() => {
        linkAttemptedRef.current = null;
      })
      .finally(() => {
        if (!cancelled) {
          setIsLinking(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    shouldSearchPatientValidation,
    encounterId,
    patientId,
    unlinkedValidation?.id,
    queryClient,
  ]);

  return { isLinking };
}
