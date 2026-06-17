import { apis } from "@/apis";
import { useQuery } from "@tanstack/react-query";

/**
 * Registry of "structured resource" types that can be attached to a claim's
 * supporting information. A structured-resource entry references an existing
 * care/EMR record by `{ resource_type, resource_id }`; the backend builds the
 * ABDM FHIR document for it, base64-encodes it, and embeds it as a
 * DocumentReference.
 *
 * Adding a new type is a single entry here (mirrored by the backend registry
 * in `nhcx/utils/structured_resources.py`).
 */

export type StructuredResourceOption = {
  value: string;
  label: string;
};

export type StructuredResourceTypeDef = {
  type: string;
  label: string;
  /** Hook returning the selectable existing records for this type. */
  useOptions: (
    patientId: string,
    encounterId?: string,
  ) => { options: StructuredResourceOption[]; isLoading: boolean };
};

function useDiagnosticReportOptions(patientId: string, encounterId?: string) {
  const { data, isLoading } = useQuery({
    queryKey: ["structured-resource", "diagnostic_report", patientId, encounterId],
    queryFn: () =>
      apis.diagnosticReport.list(patientId, {
        encounter: encounterId,
        ordering: "-created_date",
      }),
    enabled: !!patientId,
    staleTime: 60 * 1000,
  });

  const options = (data?.results ?? []).map((report) => {
    const title =
      report.code?.display ||
      report.category?.display ||
      report.conclusion ||
      "Diagnostic report";
    const date = report.created_date
      ? new Date(report.created_date).toLocaleDateString()
      : "";
    return {
      value: report.id,
      label: date ? `${title} (${date})` : title,
    };
  });

  return { options, isLoading };
}

function useQuestionnaireResponseOptions(
  patientId: string,
  encounterId?: string,
) {
  const { data, isLoading } = useQuery({
    queryKey: [
      "structured-resource",
      "questionnaire_response",
      patientId,
      encounterId,
    ],
    queryFn: () =>
      apis.questionnaireResponse.list(patientId, {
        encounter: encounterId,
      }),
    enabled: !!patientId,
    staleTime: 60 * 1000,
  });

  const options = (data?.results ?? []).map((response) => ({
    value: response.id,
    label: response.questionnaire?.title || "Questionnaire response",
  }));

  return { options, isLoading };
}

export const STRUCTURED_RESOURCE_TYPES: StructuredResourceTypeDef[] = [
  {
    type: "diagnostic_report",
    label: "Diagnostic Report",
    useOptions: useDiagnosticReportOptions,
  },
  {
    type: "questionnaire_response",
    label: "Questionnaire Response",
    useOptions: useQuestionnaireResponseOptions,
  },
];

export function getStructuredResourceTypeDef(
  type: string | undefined,
): StructuredResourceTypeDef | undefined {
  return STRUCTURED_RESOURCE_TYPES.find((def) => def.type === type);
}
