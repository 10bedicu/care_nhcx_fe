import { apis } from "@/apis";
import { useGlobalStore } from "@/hooks/use-global-store";
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

function useEncounterOptions(patientId: string, encounterId?: string) {
  const { data, isLoading } = useQuery({
    queryKey: ["structured-resource", "encounter", patientId],
    queryFn: () => apis.claimConsent.list({ patient: patientId }),
    enabled: !!patientId,
    staleTime: 60 * 1000,
  });

  const seen = new Set<string>();
  const options: StructuredResourceOption[] = [];
  for (const consent of data?.results ?? []) {
    const encounter = consent.encounter;
    if (!encounter || seen.has(encounter)) {
      continue;
    }
    seen.add(encounter);
    const date = consent.created_date
      ? new Date(consent.created_date).toLocaleDateString()
      : "";
    const isCurrent = encounter === encounterId;
    const label = [
      `Encounter ${encounter.slice(0, 8)}`,
      date ? `(${date})` : "",
      isCurrent ? "— current" : "",
    ]
      .filter(Boolean)
      .join(" ");
    options.push({ value: encounter, label });
  }

  return { options, isLoading };
}

function useInvoiceOptions(patientId: string, encounterId?: string) {
  const { getStore } = useGlobalStore();
  const facilityId = getStore<string>("facilityId") ?? "";

  const { data: accountData } = useQuery({
    queryKey: [
      "structured-resource",
      "invoice-account",
      facilityId,
      encounterId,
    ],
    queryFn: () => apis.account.list(facilityId, { encounter: encounterId }),
    enabled: !!facilityId && !!encounterId,
    staleTime: 60 * 1000,
  });
  const accountId = accountData?.results?.[0]?.id;

  const { data, isLoading } = useQuery({
    queryKey: [
      "structured-resource",
      "invoice",
      facilityId,
      patientId,
      accountId,
    ],
    queryFn: () =>
      apis.invoice.list(facilityId, {
        patient: patientId,
        account: accountId,
        ordering: "-created_date",
      }),
    enabled: !!facilityId && !!patientId,
    staleTime: 60 * 1000,
  });

  const options = (data?.results ?? []).map((invoice) => {
    const title =
      (invoice.title as string) || (invoice.number as string) || "Invoice";
    const date = invoice.created_date
      ? new Date(invoice.created_date as string).toLocaleDateString()
      : "";
    return {
      value: invoice.id,
      label: date ? `${title} (${date})` : title,
    };
  });

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
  {
    type: "encounter",
    label: "Encounter (Discharge Summary / OP Consult)",
    useOptions: useEncounterOptions,
  },
  {
    type: "invoice",
    label: "Invoice",
    useOptions: useInvoiceOptions,
  },
];

export function getStructuredResourceTypeDef(
  type: string | undefined,
): StructuredResourceTypeDef | undefined {
  return STRUCTURED_RESOURCE_TYPES.find((def) => def.type === type);
}
