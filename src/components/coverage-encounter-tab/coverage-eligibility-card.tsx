import {
  AlertCircleIcon,
  AlertTriangleIcon,
  BanIcon,
  CalendarIcon,
  CheckCircle2Icon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClipboardListIcon,
  ClockIcon,
  ExternalLinkIcon,
  FileTextIcon,
  InfoIcon,
  ShieldCheckIcon,
  UserIcon,
  WalletIcon,
  XCircleIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CoverageEligibilityRequest,
  CoverageEligibilityRequestPurposeChoice,
  EligibilityProcedure,
  InsuranceEntry,
} from "@/types/coverage_eligibility";
import { FC, ReactNode, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

// ─── helpers ─────────────────────────────────────────────────────────────────

const PURPOSE_LABEL: Record<CoverageEligibilityRequestPurposeChoice, string> =
  {
    discovery: "Discovery",
    validation: "Validation",
    benefits: "Benefits",
    "auth-requirements": "Auth Requirements",
  };

const PURPOSE_DESCRIPTION: Record<
  CoverageEligibilityRequestPurposeChoice,
  string
> = {
  discovery: "Who is covered?",
  validation: "What is the wallet balance?",
  benefits: "Is this procedure covered?",
  "auth-requirements": "What is needed for pre-auth?",
};

function formatPurposeTitle(purposes: CoverageEligibilityRequestPurposeChoice[]) {
  return purposes.map((p) => PURPOSE_LABEL[p]).join(" & ");
}

// ─── status helpers ───────────────────────────────────────────────────────────

type CardStatus = "pending" | "processing" | "completed" | "error";

function deriveStatus(
  request: CoverageEligibilityRequest
): CardStatus {
  if (!request.latest_response) return "pending";
  const { outcome } = request.latest_response;
  if (outcome === "complete") return "completed";
  if (outcome === "error") return "error";
  return "processing";
}

function StatusIcon({ status }: { status: CardStatus }) {
  switch (status) {
    case "completed":
      return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
    case "error":
      return <XCircleIcon className="w-4 h-4 text-red-500" />;
    case "processing":
      return <ClockIcon className="w-4 h-4 text-blue-500" />;
    case "pending":
      return <ClockIcon className="w-4 h-4 text-yellow-500" />;
  }
}

const STATUS_TEXT_COLOR: Record<CardStatus, string> = {
  completed: "text-green-600",
  error: "text-red-600",
  processing: "text-blue-600",
  pending: "text-yellow-600",
};

// ─── shared sub-components ────────────────────────────────────────────────────

function DispositionBanner({
  disposition,
  inforce,
}: {
  disposition: string | null;
  inforce?: boolean;
}) {
  if (!disposition) return null;
  const isActive = inforce !== false;
  return (
    <Alert
      className={cn(
        "border",
        isActive
          ? "bg-green-50 border-green-200 text-green-800"
          : "bg-red-50 border-red-200 text-red-800"
      )}
    >
      {isActive ? (
        <CheckCircle2Icon className="h-4 w-4 text-green-600" />
      ) : (
        <AlertCircleIcon className="h-4 w-4 text-red-600" />
      )}
      <AlertDescription className="font-medium">{disposition}</AlertDescription>
    </Alert>
  );
}

function InforceChip({ inforce }: { inforce: boolean }) {
  return (
    <Badge
      className={cn(
        "text-xs font-medium",
        inforce
          ? "bg-green-100 text-green-700 border border-green-200"
          : "bg-red-100 text-red-700 border border-red-200"
      )}
    >
      {inforce ? "Active" : "Inactive"}
    </Badge>
  );
}

function MemberCard({
  entry,
  showBalance = false,
}: {
  entry: InsuranceEntry;
  showBalance?: boolean;
}) {
  const remaining =
    entry.balance
      ? entry.balance.allowed.value - entry.balance.used.value
      : null;

  return (
    <div
      className={cn(
        "rounded-lg border bg-white p-4 space-y-3",
        entry.is_primary
          ? "border-blue-300 ring-2 ring-blue-100 shadow-sm"
          : "border-gray-200"
      )}
    >
      {/* member header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
              entry.is_primary ? "bg-blue-100" : "bg-gray-100"
            )}
          >
            <UserIcon
              className={cn(
                "w-4 h-4",
                entry.is_primary ? "text-blue-600" : "text-gray-500"
              )}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-sm text-gray-900 truncate">
                {entry.name ?? "Unknown Name"}
              </span>
              {entry.is_primary && (
                <Badge className="text-xs bg-blue-100 text-blue-700 border border-blue-200">
                  Patient
                </Badge>
              )}
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap mt-0.5">
              {entry.gender && (
                <span className="capitalize">{entry.gender}</span>
              )}
              {entry.dob && (
                <span>DOB: {formatDate(entry.dob)}</span>
              )}
            </div>
          </div>
        </div>
        <InforceChip inforce={entry.inforce} />
      </div>

      {!entry.inforce && (
        <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
          <AlertTriangleIcon className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Policy is not active for this member</span>
        </div>
      )}

      {/* IDs */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div>
          <span className="text-gray-500">PMJAY ID</span>
          <p className="font-mono font-medium text-gray-800 truncate">
            {entry.pmjay_id}
          </p>
        </div>
        {entry.abha_id && (
          <div>
            <span className="text-gray-500">ABHA ID</span>
            <p className="font-mono font-medium text-gray-800 truncate">
              {entry.abha_id}
            </p>
          </div>
        )}
      </div>

      {/* plan info */}
      {(entry.plan_name || entry.plan_id) && (
        <>
          <Separator />
          <div className="flex items-start gap-2">
            <ShieldCheckIcon className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs min-w-0">
              {entry.plan_name && (
                <p className="font-medium text-gray-800">{entry.plan_name}</p>
              )}
              {entry.plan_id && (
                <p className="text-gray-500 font-mono">{entry.plan_id}</p>
              )}
              {entry.policy_period && (
                <p className="text-gray-500 mt-0.5 flex items-center gap-1">
                  <CalendarIcon className="w-3 h-3" />
                  {formatDate(entry.policy_period.start)} →{" "}
                  {formatDate(entry.policy_period.end)}
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* balance (validation only) */}
      {showBalance && entry.balance && (
        <>
          <Separator />
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
              <WalletIcon className="w-3.5 h-3.5" />
              <span>Balance</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-50 rounded-md p-2 text-center">
                <p className="text-xs text-gray-500">Allowed</p>
                <p className="text-sm font-semibold text-gray-800">
                  {formatCurrency(entry.balance.allowed.value)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-md p-2 text-center">
                <p className="text-xs text-gray-500">Used</p>
                <p className="text-sm font-semibold text-gray-800">
                  {formatCurrency(entry.balance.used.value)}
                </p>
              </div>
              <div
                className={cn(
                  "rounded-md p-2 text-center",
                  remaining !== null && remaining < entry.balance.allowed.value * 0.2
                    ? "bg-red-50"
                    : "bg-green-50"
                )}
              >
                <p className="text-xs text-gray-500">Remaining</p>
                <p
                  className={cn(
                    "text-sm font-semibold",
                    remaining !== null && remaining < entry.balance.allowed.value * 0.2
                      ? "text-red-700"
                      : "text-green-700"
                  )}
                >
                  {remaining !== null ? formatCurrency(remaining) : "—"}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ProcedureHeader({ procedure }: { procedure: EligibilityProcedure }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
            Procedure
          </p>
          <p className="font-semibold text-gray-900 mt-0.5">
            {procedure.display ?? procedure.code}
            <span className="ml-1.5 text-xs text-gray-500 font-mono font-normal">
              ({procedure.code})
            </span>
          </p>
          {procedure.category && (
            <p className="text-xs text-gray-500 mt-0.5">
              Category: {procedure.category.display}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {procedure.authorization_required && (
            <Badge className="text-xs bg-amber-100 text-amber-700 border border-amber-200">
              Pre-auth Required
            </Badge>
          )}
        </div>
      </div>

      {procedure.allowed_amount && (
        <div className="flex items-center gap-2 bg-blue-50 rounded-md px-3 py-2">
          <WalletIcon className="w-4 h-4 text-blue-600" />
          <span className="text-xs text-blue-700 font-medium">
            Package Rate:{" "}
            <span className="text-blue-900 font-bold">
              {formatCurrency(procedure.allowed_amount.value)}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}

function RequiredDocuments({
  documents,
}: {
  documents: EligibilityProcedure["required_documents"];
}) {
  if (!documents.length) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
        <FileTextIcon className="w-4 h-4" />
        <span>Required Documents</span>
        <Badge variant="outline" className="text-xs ml-1">
          {documents.length}
        </Badge>
      </div>
      <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
        {documents.map((doc, i) => (
          <div key={i} className="flex items-start gap-3 px-3 py-2.5">
            <div className="w-5 h-5 rounded border-2 border-gray-300 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-medium text-gray-800">{doc.display}</p>
              <p className="text-gray-500 font-mono">{doc.code}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RequiredQuestionnaires({
  questionnaires,
}: {
  questionnaires: EligibilityProcedure["required_questionnaires"];
}) {
  const [filled, setFilled] = useState<Set<string>>(new Set());

  if (!questionnaires.length) return null;

  const toggleFilled = (id: string) => {
    setFilled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filledCount = filled.size;
  const totalCount = questionnaires.length;
  const allFilled = filledCount === totalCount;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
          <ClipboardListIcon className="w-4 h-4" />
          <span>Required Questionnaires</span>
        </div>
        <Badge
          className={cn(
            "text-xs",
            allFilled
              ? "bg-green-100 text-green-700 border border-green-200"
              : "bg-amber-100 text-amber-700 border border-amber-200"
          )}
        >
          {filledCount} of {totalCount} completed
        </Badge>
      </div>
      <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
        {questionnaires.map((q) => {
          const isFilled = filled.has(q.id);
          return (
            <div
              key={q.id}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5",
                isFilled && "bg-green-50"
              )}
            >
              <Checkbox
                id={`q-${q.id}`}
                checked={isFilled}
                onCheckedChange={() => toggleFilled(q.id)}
              />
              <label
                htmlFor={`q-${q.id}`}
                className={cn(
                  "flex-1 text-xs cursor-pointer",
                  isFilled ? "text-green-800 line-through" : "text-gray-800"
                )}
              >
                {q.display}
              </label>
              <a
                href={q.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
                onClick={(e) => e.stopPropagation()}
              >
                Fill
                <ExternalLinkIcon className="w-3 h-3" />
              </a>
            </div>
          );
        })}
      </div>
      {!allFilled && (
        <p className="text-xs text-amber-700 flex items-center gap-1">
          <InfoIcon className="w-3.5 h-3.5" />
          Complete all questionnaires before submitting pre-auth
        </p>
      )}
    </div>
  );
}

// ─── purpose views ────────────────────────────────────────────────────────────

function DiscoveryView({
  insurances,
  disposition,
}: {
  insurances: InsuranceEntry[];
  disposition: string | null;
}) {
  const primaryInforce = insurances.find((e) => e.is_primary)?.inforce;
  return (
    <div className="space-y-4">
      <DispositionBanner disposition={disposition} inforce={primaryInforce} />
      <div className="space-y-3">
        {insurances.map((entry, i) => (
          <MemberCard key={i} entry={entry} />
        ))}
      </div>
    </div>
  );
}

function ValidationView({
  insurances,
  disposition,
}: {
  insurances: InsuranceEntry[];
  disposition: string | null;
}) {
  const familyAllowed = insurances[0]?.balance?.allowed.value ?? 0;
  const familyUsed = insurances.reduce(
    (sum, e) => sum + (e.balance?.used.value ?? 0),
    0
  );
  const familyRemaining = familyAllowed - familyUsed;
  const isLow = familyRemaining < familyAllowed * 0.2;

  return (
    <div className="space-y-4">
      {/* family wallet summary */}
      {insurances[0]?.balance && (
        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <WalletIcon className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-blue-900">
              Family Wallet Summary
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-lg p-3 text-center shadow-sm">
              <p className="text-xs text-gray-500 font-medium">Total Allowed</p>
              <p className="text-base font-bold text-gray-900 mt-0.5">
                {formatCurrency(familyAllowed)}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center shadow-sm">
              <p className="text-xs text-gray-500 font-medium">Total Used</p>
              <p className="text-base font-bold text-gray-900 mt-0.5">
                {formatCurrency(familyUsed)}
              </p>
            </div>
            <div
              className={cn(
                "rounded-lg p-3 text-center shadow-sm",
                isLow ? "bg-red-100" : "bg-green-100"
              )}
            >
              <p className="text-xs text-gray-500 font-medium">Remaining</p>
              <p
                className={cn(
                  "text-base font-bold mt-0.5",
                  isLow ? "text-red-700" : "text-green-700"
                )}
              >
                {formatCurrency(familyRemaining)}
              </p>
              {isLow && (
                <p className="text-xs text-red-600 mt-0.5">Low balance</p>
              )}
            </div>
          </div>
        </div>
      )}

      <DispositionBanner
        disposition={disposition}
        inforce={insurances.find((e) => e.is_primary)?.inforce}
      />

      <div className="space-y-3">
        {insurances.map((entry, i) => (
          <MemberCard key={i} entry={entry} showBalance />
        ))}
      </div>
    </div>
  );
}

function BenefitsView({
  insurances,
  disposition,
  showQuestionnaires = false,
}: {
  insurances: InsuranceEntry[];
  disposition: string | null;
  showQuestionnaires?: boolean;
}) {
  const procedure = insurances[0]?.procedure;

  return (
    <div className="space-y-4">
      {procedure?.excluded && (
        <Alert className="bg-red-50 border-red-300 text-red-800">
          <BanIcon className="h-4 w-4 text-red-600" />
          <AlertDescription className="font-semibold">
            This procedure is not covered under the policy. Claim submission is
            blocked.
          </AlertDescription>
        </Alert>
      )}

      {procedure && <ProcedureHeader procedure={procedure} />}

      <DispositionBanner
        disposition={disposition}
        inforce={insurances.find((e) => e.is_primary)?.inforce}
      />

      <div className="space-y-3">
        {insurances.map((entry, i) => (
          <MemberCard key={i} entry={entry} />
        ))}
      </div>

      {procedure && !procedure.excluded && (
        <>
          <Separator />
          <RequiredDocuments documents={procedure.required_documents} />
          {showQuestionnaires && (
            <RequiredQuestionnaires
              questionnaires={procedure.required_questionnaires}
            />
          )}
        </>
      )}
    </div>
  );
}

// ─── pending / error / empty states ──────────────────────────────────────────

function PendingState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
      <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
        <ClockIcon className="w-5 h-5 text-yellow-600 animate-pulse" />
      </div>
      <p className="text-sm font-medium text-gray-700">
        Awaiting response from payer
      </p>
      <p className="text-xs text-gray-500">
        The eligibility check is in progress. This may take a few moments.
      </p>
    </div>
  );
}

function ErrorState({ error }: { error: object | null }) {
  return (
    <Alert className="bg-red-50 border-red-200">
      <XCircleIcon className="h-4 w-4 text-red-600" />
      <AlertDescription className="space-y-1">
        <p className="font-semibold text-red-800">
          Payer returned an error response
        </p>
        {error && (
          <pre className="text-xs text-red-700 bg-red-100 rounded p-2 overflow-auto max-h-24 whitespace-pre-wrap">
            {JSON.stringify(error, null, 2)}
          </pre>
        )}
      </AlertDescription>
    </Alert>
  );
}

function EmptyInsurancesState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
        <InfoIcon className="w-5 h-5 text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-700">
        No coverage data returned
      </p>
      <p className="text-xs text-gray-500">
        The payer did not return any insurance entries for this request.
      </p>
    </div>
  );
}

// ─── purpose response content ─────────────────────────────────────────────────

function PurposeResponseContent({
  purpose,
  insurances,
  disposition,
}: {
  purpose: CoverageEligibilityRequestPurposeChoice;
  insurances: InsuranceEntry[];
  disposition: string | null;
}) {
  switch (purpose) {
    case "discovery":
      return <DiscoveryView insurances={insurances} disposition={disposition} />;
    case "validation":
      return (
        <ValidationView insurances={insurances} disposition={disposition} />
      );
    case "benefits":
      return (
        <BenefitsView insurances={insurances} disposition={disposition} />
      );
    case "auth-requirements":
      return (
        <BenefitsView
          insurances={insurances}
          disposition={disposition}
          showQuestionnaires
        />
      );
  }
}

// ─── main card ────────────────────────────────────────────────────────────────

interface CoverageEligibilityCardProps {
  coverageEligibilityRequest: CoverageEligibilityRequest;
  /** Extra content rendered above the timestamps inside the card footer. */
  footerActions?: ReactNode;
  /** Extra content rendered above the card body (alerts, banners, etc.). */
  headerBanner?: ReactNode;
}

const CoverageEligibilityCard: FC<CoverageEligibilityCardProps> = ({
  coverageEligibilityRequest,
  footerActions,
  headerBanner,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const status = useMemo(
    () => deriveStatus(coverageEligibilityRequest),
    [coverageEligibilityRequest]
  );

  const response = coverageEligibilityRequest.latest_response;
  const purposes = coverageEligibilityRequest.purpose;
  const isMultiPurpose = purposes.length > 1;

  const renderResponseContent = () => {
    if (!response) return <PendingState />;
    if (response.outcome === "error") return <ErrorState error={response.error} />;
    if (!response.insurances || response.insurances.length === 0)
      return <EmptyInsurancesState />;

    if (isMultiPurpose) {
      return (
        <Tabs defaultValue={purposes[0]}>
          <TabsList className="w-full">
            {purposes.map((p) => (
              <TabsTrigger key={p} value={p} className="flex-1 text-xs">
                {PURPOSE_LABEL[p]}
              </TabsTrigger>
            ))}
          </TabsList>
          {purposes.map((p) => (
            <TabsContent key={p} value={p} className="mt-4">
              <PurposeResponseContent
                purpose={p}
                insurances={response.insurances!}
                disposition={response.disposition}
              />
            </TabsContent>
          ))}
        </Tabs>
      );
    }

    return (
      <PurposeResponseContent
        purpose={purposes[0]}
        insurances={response.insurances}
        disposition={response.disposition}
      />
    );
  };

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="flex flex-col gap-3 bg-gray-50 border-b rounded-t-lg">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="capitalize text-base">
                {formatPurposeTitle(purposes)} Request
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {isMultiPurpose
                  ? purposes.map((p) => PURPOSE_DESCRIPTION[p]).join(" · ")
                  : PURPOSE_DESCRIPTION[purposes[0]]}
              </CardDescription>
              <CardDescription className="font-mono text-xs mt-1">
                #{coverageEligibilityRequest.id}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge
                className={cn("capitalize text-xs", {
                  "bg-red-100 text-red-700 border border-red-200":
                    coverageEligibilityRequest.priority === "stat",
                  "bg-orange-100 text-orange-700 border border-orange-200":
                    coverageEligibilityRequest.priority === "normal",
                  "bg-yellow-100 text-yellow-700 border border-yellow-200":
                    coverageEligibilityRequest.priority === "deferred",
                })}
              >
                {coverageEligibilityRequest.priority}
              </Badge>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <StatusIcon status={status} />
              <span
                className={cn(
                  "capitalize font-medium text-sm",
                  STATUS_TEXT_COLOR[status]
                )}
              >
                {status}
              </span>
              {response?.disposition && status === "completed" && (
                <>
                  <span className="text-gray-400">·</span>
                  <span className="text-xs text-gray-600 truncate max-w-[200px]">
                    {response.disposition}
                  </span>
                </>
              )}
            </div>
            <div className="text-xs text-gray-500">
              {coverageEligibilityRequest.item?.length ?? 0} item(s)
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-5 pb-4">
            {renderResponseContent()}
          </CardContent>
        </CollapsibleContent>

        <CardFooter
          className={cn(
            "flex flex-col gap-3 p-4 pt-3",
            isOpen && "border-t"
          )}
        >
          {headerBanner && <div className="w-full">{headerBanner}</div>}
          <div className="flex w-full justify-between items-center gap-3">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>
                  Created {formatDate(coverageEligibilityRequest.created_date)}
                </span>
              </div>
              {response && (
                <div className="flex items-center gap-1">
                  <StatusIcon status={status} />
                  <span className="capitalize">
                    {status} {formatDate(response.created_date)}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {footerActions}
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-9 p-0 flex-shrink-0"
                >
                  {isOpen ? (
                    <ChevronUpIcon className="h-4 w-4" />
                  ) : (
                    <ChevronDownIcon className="h-4 w-4" />
                  )}
                  <span className="sr-only">Toggle details</span>
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardFooter>
      </Collapsible>
    </Card>
  );
};

export default CoverageEligibilityCard;
