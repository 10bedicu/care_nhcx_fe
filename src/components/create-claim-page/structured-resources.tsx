import { apis } from "@/apis";
import { useGlobalStore } from "@/hooks/use-global-store";
import { useQuery } from "@tanstack/react-query";
import { ReactNode } from "react";


export type StructuredResourceOption = {
  value: string;
  label: string;
  display?: ReactNode;
};

export type StructuredResourceTypeDef = {
  type: string;
  label: string;
  useOptions: (
    patientId: string,
    encounterId?: string,
  ) => { options: StructuredResourceOption[]; isLoading: boolean };
};

function shortId(id: string): string {
  return id.slice(0, 5);
}

function formatDate(value: unknown): string {
  if (typeof value !== "string" || !value) {
    return "";
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleDateString();
}

function cleanTitle(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function buildResourceOption({
  id,
  primary,
  date,
  badge,
  cycleLabel,
}: {
  id: string;
  primary: string;
  date: string;
  badge?: string;
  cycleLabel?: string;
}): StructuredResourceOption {
  const label = [
    primary,
    cycleLabel ?? "",
    date ? `on ${date}` : "",
    badge ? `(${badge})` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const display = (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5 py-0.5">
      <div className="flex min-w-0 items-baseline gap-2">
        <span className="min-w-0 break-words text-sm font-medium text-foreground">
          {primary}
        </span>
        {cycleLabel && (
          <span className="shrink-0 text-xs font-normal text-muted-foreground">
            {cycleLabel}
          </span>
        )}
        {badge && (
          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
            {badge}
          </span>
        )}
      </div>
      {date && (
        <span className="min-w-0 break-words text-xs text-muted-foreground">
          on {date}
        </span>
      )}
    </div>
  );

  return { value: id, label, display };
}

function useDiagnosticReportOptions(patientId: string, encounterId?: string) {
  const { data, isLoading } = useQuery({
    queryKey: [
      "structured-resource",
      "diagnostic_report",
      patientId,
      encounterId,
    ],
    queryFn: () =>
      apis.diagnosticReport.list(patientId, {
        encounter: encounterId,
        ordering: "-created_date",
      }),
    enabled: !!patientId,
    staleTime: 60 * 1000,
  });

  const options = (data?.results ?? []).map((report) => {
    const primary =
      cleanTitle(report.code?.display) ||
      cleanTitle(report.category?.display) ||
      cleanTitle(report.conclusion) ||
      `Diagnostic Report #${shortId(report.id)}`;
    return buildResourceOption({
      id: report.id,
      primary,
      date: formatDate(report.created_date),
    });
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

  const options = (data?.results ?? []).map((response) => {
    const primary =
      cleanTitle(response.questionnaire?.title) ||
      `Questionnaire Response #${shortId(response.id)}`;
    return buildResourceOption({
      id: response.id,
      primary,
      date: formatDate(response.created_date),
    });
  });

  return { options, isLoading };
}

function useEncounterOptions(patientId: string, encounterId?: string) {
  const { data, isLoading } = useQuery({
    queryKey: ["structured-resource", "encounter", patientId],
    queryFn: () => apis.claimConsent.list({ patient: patientId }),
    enabled: !!patientId,
    staleTime: 60 * 1000,
  });

  const consents = data?.results ?? [];

  const currentAccount = consents.find(
    (consent) => consent.encounter === encounterId,
  )?.account;
  const relevant = currentAccount
    ? consents.filter((consent) => consent.account === currentAccount)
    : consents;

  const cycleByEncounter = new Map<
    string,
    { cycle: number | null; date: string }
  >();
  for (const consent of relevant) {
    const encounter = consent.encounter;
    if (!encounter || cycleByEncounter.has(encounter)) {
      continue;
    }
    cycleByEncounter.set(encounter, {
      cycle: consent.cycle ?? null,
      date: formatDate(consent.created_date),
    });
  }

  const cycleLabelFor = (encounter: string): string | undefined => {
    const cycle = cycleByEncounter.get(encounter)?.cycle;
    if (cycle == null) {
      return undefined;
    }
    return cycle === 0 ? "Cycle 0 · Initiating" : `Cycle ${cycle}`;
  };

  const seen = new Set<string>();
  const options: StructuredResourceOption[] = [];

  const pushEncounter = (encounter: string, date: string) => {
    if (seen.has(encounter)) {
      return;
    }
    seen.add(encounter);
    options.push(
      buildResourceOption({
        id: encounter,
        primary: `Encounter #${shortId(encounter)}`,
        date,
        badge: encounter === encounterId ? "Current" : undefined,
        cycleLabel: cycleLabelFor(encounter),
      }),
    );
  };

  if (encounterId) {
    pushEncounter(encounterId, cycleByEncounter.get(encounterId)?.date ?? "");
  }

  const cycleEncounters = [...cycleByEncounter.entries()].sort((a, b) => {
    const aCycle = a[1].cycle ?? Number.MAX_SAFE_INTEGER;
    const bCycle = b[1].cycle ?? Number.MAX_SAFE_INTEGER;
    return aCycle - bCycle;
  });
  for (const [encounter, { date }] of cycleEncounters) {
    pushEncounter(encounter, date);
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
    const primary =
      cleanTitle(invoice.title) ||
      cleanTitle(invoice.number) ||
      `Invoice #${shortId(invoice.id)}`;
    return buildResourceOption({
      id: invoice.id,
      primary,
      date: formatDate(invoice.created_date),
    });
  });

  return { options, isLoading };
}

function useFileOptions(patientId: string, encounterId?: string) {
  const { data: patientFiles, isLoading: patientLoading } = useQuery({
    queryKey: ["structured-resource", "file", "patient", patientId],
    queryFn: () =>
      apis.file.list({
        file_type: "patient",
        associating_id: patientId,
        ordering: "-created_date",
      }),
    enabled: !!patientId,
    staleTime: 60 * 1000,
  });

  const { data: encounterFiles, isLoading: encounterLoading } = useQuery({
    queryKey: ["structured-resource", "file", "encounter", encounterId],
    queryFn: () =>
      apis.file.list({
        file_type: "encounter",
        associating_id: encounterId as string,
        ordering: "-created_date",
      }),
    enabled: !!encounterId,
    staleTime: 60 * 1000,
  });

  const isLoading = patientLoading || (!!encounterId && encounterLoading);

  const seen = new Set<string>();
  const options: StructuredResourceOption[] = [];
  const add = (files: typeof patientFiles, badge: string) => {
    for (const file of files?.results ?? []) {
      if (!file.id || file.is_archived || seen.has(file.id)) {
        continue;
      }
      seen.add(file.id);
      options.push(
        buildResourceOption({
          id: file.id,
          primary: cleanTitle(file.name) || `File #${shortId(file.id)}`,
          date: formatDate(file.created_date),
          badge,
        }),
      );
    }
  };
  add(encounterFiles, "Encounter");
  add(patientFiles, "Patient");

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
    label: "Encounter",
    useOptions: useEncounterOptions,
  },
  {
    type: "invoice",
    label: "Invoice",
    useOptions: useInvoiceOptions,
  },
  {
    type: "file",
    label: "Files",
    useOptions: useFileOptions,
  },
];

export function getStructuredResourceTypeDef(
  type: string | undefined,
): StructuredResourceTypeDef | undefined {
  return STRUCTURED_RESOURCE_TYPES.find((def) => def.type === type);
}
