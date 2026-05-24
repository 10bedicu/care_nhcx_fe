import {
  AlarmClockMinusIcon,
  AlertCircleIcon,
  CalendarIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClipboardCopyIcon,
  SendIcon,
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
import { FC, ReactNode, useMemo, useState } from "react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Claim, ClaimResponse } from "@/types/claim";
import ClaimNotificationSheet from "./claim-notification-sheet";
import { ClaimResponseItem } from "@medplum/fhirtypes";
import { Separator } from "@/components/ui/separator";

interface ClaimCardProps {
  claim: Claim;
  /** Extra action buttons rendered in the card footer (before notification + toggle). */
  footerActions?: ReactNode;
  /** Optional banner rendered above the card footer (alerts, status callouts, etc). */
  headerBanner?: ReactNode;
}

// ─── status helpers ───────────────────────────────────────────────────────────

type ResponseStatus = {
  label: string;
  colorClass: string;
  iconColorClass: string;
};

function getResponseStatus(claim: Claim): ResponseStatus {
  const response = claim.latest_response;

  if (claim.status === "cancelled") {
    return {
      label: "Cancelled",
      colorClass: "text-gray-500",
      iconColorClass: "text-gray-500",
    };
  }

  // Dispatch-level status takes priority when it gives us specific information
  if (claim.dispatch_status === "error") {
    return {
      label: "Submission Failed",
      colorClass: "text-red-600",
      iconColorClass: "text-red-500",
    };
  }
  if (claim.dispatch_status === "pending") {
    return {
      label: "Not Submitted",
      colorClass: "text-gray-500",
      iconColorClass: "text-gray-400",
    };
  }
  if (claim.dispatch_status === "awaiting") {
    return {
      label: "Awaiting Response",
      colorClass: "text-blue-600",
      iconColorClass: "text-blue-500",
    };
  }

  if (!response) {
    return {
      label: "Pending",
      colorClass: "text-yellow-500",
      iconColorClass: "text-yellow-500",
    };
  }

  // Adjudication-based status (preferred)
  const statusEntry = response.adjudication?.find(
    (a) => a.category?.coding?.[0]?.code === "status"
  );
  const code = statusEntry?.reason?.coding?.[0]?.code?.toLowerCase();

  if (code === "approved")
    return {
      label: "Approved",
      colorClass: "text-green-600",
      iconColorClass: "text-green-500",
    };
  if (code === "queried")
    return {
      label: "Queried",
      colorClass: "text-amber-600",
      iconColorClass: "text-amber-500",
    };
  if (code === "rejected")
    return {
      label: "Rejected",
      colorClass: "text-red-600",
      iconColorClass: "text-red-500",
    };

  // Outcome fallback
  if (response.outcome === "queued")
    return {
      label: "Queried",
      colorClass: "text-amber-600",
      iconColorClass: "text-amber-500",
    };
  if (response.outcome === "error")
    return {
      label: "Error",
      colorClass: "text-red-600",
      iconColorClass: "text-red-500",
    };
  if (response.outcome === "complete")
    return {
      label: "Processed",
      colorClass: "text-blue-600",
      iconColorClass: "text-blue-500",
    };

  // Amount-based fallback
  const totalRequested =
    claim.item?.reduce(
      (sum, item) => sum + item.unit_price * item.quantity.value,
      0
    ) ?? 0;
  const totalApproved =
    response.item?.reduce(
      (sum, item) => sum + (item.adjudication?.[0]?.amount?.value ?? 0),
      0
    ) ?? 0;

  if (totalApproved === 0)
    return {
      label: "Rejected",
      colorClass: "text-red-600",
      iconColorClass: "text-red-500",
    };
  if (totalApproved >= totalRequested)
    return {
      label: "Approved",
      colorClass: "text-green-600",
      iconColorClass: "text-green-500",
    };
  return {
    label: "Partially Approved",
    colorClass: "text-orange-600",
    iconColorClass: "text-orange-500",
  };
}

function StatusIcon({
  label,
  iconColorClass,
}: {
  label: string;
  iconColorClass: string;
}) {
  if (label === "Approved" || label === "Processed")
    return <CheckCircleIcon className={cn("w-4 h-4", iconColorClass)} />;
  if (label === "Partially Approved")
    return <CheckCircleIcon className={cn("w-4 h-4", iconColorClass)} />;
  if (
    label === "Rejected" ||
    label === "Error" ||
    label === "Cancelled" ||
    label === "Submission Failed"
  )
    return <XCircleIcon className={cn("w-4 h-4", iconColorClass)} />;
  if (label === "Not Submitted")
    return <AlarmClockMinusIcon className={cn("w-4 h-4", iconColorClass)} />;
  return (
    <AlarmClockMinusIcon className={cn("w-4 h-4 animate-pulse", iconColorClass)} />
  );
}

// ─── response type label ──────────────────────────────────────────────────────

function getResponseTypeLabel(use: string | null | undefined): string {
  switch (use) {
    case "preauthorization":
      return "Pre-Authorization";
    case "claim":
      return "Claim";
    case "predetermination":
      return "Pre-Determination";
    default:
      return "";
  }
}

// ─── totals ───────────────────────────────────────────────────────────────────

function getTotals(response: ClaimResponse | undefined) {
  const find = (code: string) =>
    response?.total?.find(
      (t) => t.category?.coding?.[0]?.code === code
    )?.amount?.value ?? null;
  return {
    submitted: find("submitted"),
    eligible: find("eligible"),
    benefit: find("benefit"),
    tax: find("tax"),
    incentive: find("incentive"),
  };
}

// ─── item adjudication ────────────────────────────────────────────────────────

function parseItemAdj(item: ClaimResponseItem) {
  const adj = item.adjudication ?? [];
  const find = (code: string) =>
    adj.find((a) => a.category?.coding?.[0]?.code === code);
  return {
    sequence: item.itemSequence,
    submitted: find("submitted")?.amount?.value ?? null,
    eligible: find("eligible")?.amount?.value ?? null,
    eligPercent: find("eligpercent")?.value ?? null,
    eligQuantity: find("eligquant")?.value ?? null,
    notes: find("reason")?.reason?.coding?.[0]?.display ?? null,
    itemStatus: find("status")?.reason?.coding?.[0]?.code ?? null,
  };
}

function parseQueryNotes(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((event) => {
      const parts = event.split("~");
      const date = parts[1]?.trim() ?? "";
      const text = parts[3]?.trim() ?? event;
      return date ? `${date}: ${text}` : text;
    });
}

function itemStatusBadgeClass(itemStatus: string | null): string {
  const code = itemStatus?.toLowerCase();
  if (code === "approved")
    return "bg-green-100 text-green-700 border border-green-200";
  if (code === "queried")
    return "bg-amber-100 text-amber-700 border border-amber-200";
  if (code === "rejected")
    return "bg-red-100 text-red-700 border border-red-200";
  return "bg-gray-100 text-gray-600 border border-gray-200";
}

// ─── main card ────────────────────────────────────────────────────────────────

const ClaimCard: FC<ClaimCardProps> = ({ claim, footerActions, headerBanner }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const responseStatus = useMemo(() => getResponseStatus(claim), [claim]);
  const response = claim.latest_response;
  const totals = useMemo(() => getTotals(response), [response]);

  const payerClaimNumber = useMemo(() => {
    return (
      response?.identifier?.find(
        (id) => id.type?.coding?.[0]?.code === "CLN"
      )?.value ?? null
    );
  }, [response]);

  const responseTypeLabel = response ? getResponseTypeLabel(response.use) : "";

  const claimTypeDisplay = response?.type?.coding?.[0]?.display ?? null;

  const showPreAuthRef =
    response?.use === "preauthorization" && !!response?.pre_auth_ref;

  const headerAmount = useMemo(() => {
    if (totals.benefit !== null) return totals.benefit;
    if (response?.total?.length) {
      return response.total.reduce(
        (sum, t) => sum + (t.amount?.value ?? 0),
        0
      );
    }
    return (
      claim.item?.reduce(
        (sum, item) => sum + item.unit_price * item.quantity.value,
        0
      ) ?? 0
    );
  }, [totals.benefit, response, claim.item]);

  const copyPreAuthRef = () => {
    if (!response?.pre_auth_ref) return;
    navigator.clipboard.writeText(response.pre_auth_ref).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="flex flex-col gap-3 bg-gray-50 border-t rounded-t-lg">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="capitalize">{claim.use}</CardTitle>
              <CardDescription>
                <p>Claim ID: #{claim.id}</p>
                <p>Flow ID: #{claim.claim_flow_id}</p>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                className={cn("capitalize text-xs", {
                  "bg-green-200 text-green-600": claim.priority === "stat",
                  "bg-yellow-200 text-yellow-600": claim.priority === "normal",
                  "bg-red-200 text-red-600": claim.priority === "deferred",
                })}
              >
                {claim.priority}
              </Badge>
            </div>
          </div>
          <div className="mt-6 flex justify-between items-center">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <StatusIcon
                  label={responseStatus.label}
                  iconColorClass={responseStatus.iconColorClass}
                />
                <span
                  className={cn(
                    "capitalize font-medium text-sm",
                    responseStatus.colorClass
                  )}
                >
                  {responseStatus.label}
                </span>
              </div>
              {responseTypeLabel && (
                <>
                  <span className="text-gray-300">·</span>
                  <Badge
                    variant="outline"
                    className="text-xs font-normal text-gray-600"
                  >
                    {responseTypeLabel}
                  </Badge>
                </>
              )}
            </div>
            <div className="text-2xl font-bold">
              {formatCurrency(headerAmount)}
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent>
            <div className="mt-6 space-y-5">
              {/* Dispatch error section */}
              {claim.dispatch_status === "error" && (
                <Alert className="bg-red-50 border-red-200">
                  <XCircleIcon className="h-4 w-4 text-red-600" />
                  <AlertDescription>
                    <p className="font-semibold text-red-800 mb-1">
                      Gateway submission failed
                    </p>
                    {claim.dispatch_error && (
                      <p className="text-xs text-red-700">
                        {claim.dispatch_error}
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Payer info block */}
              {response && (
                <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
                  {response.disposition && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Payer Note
                      </p>
                      <p className="mt-0.5 text-sm text-gray-800">
                        {response.disposition}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    {payerClaimNumber && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Payer Claim No.
                        </p>
                        <p className="mt-0.5 font-mono text-gray-800 break-all">
                          {payerClaimNumber}
                        </p>
                      </div>
                    )}

                    {claimTypeDisplay && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Claim Type
                        </p>
                        <p className="mt-0.5 text-gray-800">{claimTypeDisplay}</p>
                      </div>
                    )}
                  </div>

                  {showPreAuthRef && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Pre-Auth Reference
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="font-mono text-sm text-gray-800 break-all">
                          {response.pre_auth_ref}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs flex-shrink-0 text-gray-500 hover:text-gray-900"
                          onClick={copyPreAuthRef}
                        >
                          <ClipboardCopyIcon className="w-3.5 h-3.5 mr-1" />
                          {copied ? "Copied!" : "Copy"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Totals section */}
              {response?.total && response.total.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                    Totals
                  </p>
                  <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
                    {[
                      { label: "Submitted", value: totals.submitted },
                      { label: "Eligible", value: totals.eligible },
                      { label: "Benefit Payable", value: totals.benefit, highlight: true },
                      { label: "Tax", value: totals.tax },
                      { label: "Hospital Incentive", value: totals.incentive },
                    ]
                      .filter((row) => row.value !== null)
                      .map((row) => (
                        <div
                          key={row.label}
                          className={cn(
                            "flex justify-between items-center px-4 py-2.5 text-sm",
                            row.highlight && "bg-green-50"
                          )}
                        >
                          <span
                            className={cn(
                              "text-gray-600",
                              row.highlight && "font-semibold text-gray-900"
                            )}
                          >
                            {row.label}
                          </span>
                          <span
                            className={cn(
                              "font-medium text-gray-900",
                              row.highlight && "font-bold text-green-700"
                            )}
                          >
                            {responseStatus.label === "Queried" &&
                            row.value === 0 &&
                            row.highlight
                              ? "Pending adjudication"
                              : formatCurrency(row.value!)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Items table */}
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                  Items
                </p>
                <div className="max-sm:-mx-6 flow-root overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="py-3 pl-0 pr-3 text-left text-xs font-semibold text-gray-700">
                          Item
                        </th>
                        <th className="py-3 px-3 text-right text-xs font-semibold text-gray-700">
                          Submitted
                        </th>
                        {response && (
                          <>
                            <th className="py-3 px-3 text-right text-xs font-semibold text-gray-700">
                              Eligible
                            </th>
                            <th className="py-3 px-3 text-center text-xs font-semibold text-gray-700">
                              Elig.&nbsp;%
                            </th>
                            <th className="py-3 px-3 text-center text-xs font-semibold text-gray-700">
                              Qty
                            </th>
                          </>
                        )}
                        <th className="py-3 px-3 text-center text-xs font-semibold text-gray-700">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {claim.item?.map((item) => {
                        const respItem = response?.item?.find(
                          (r) => r.itemSequence === item.sequence
                        );
                        const parsed = respItem ? parseItemAdj(respItem) : null;
                        const claimedAmount =
                          item.unit_price * item.quantity.value;
                        const queryNotes = parseQueryNotes(parsed?.notes ?? null);

                        const totalCols = response ? 6 : 3;
                        const hasNotes = queryNotes.length > 0;

                        return (
                          <>
                            <tr key={item.sequence}>
                              <td className="pt-3 pb-2 pl-0 pr-3 text-sm">
                                <div className="font-medium text-gray-900">
                                  {item.product_or_service.code}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {item.product_or_service.display}
                                </div>
                              </td>
                              <td className="pt-3 pb-2 px-3 text-right text-sm text-gray-600 whitespace-nowrap">
                                {parsed?.submitted !== null && parsed !== null
                                  ? formatCurrency(parsed.submitted!)
                                  : formatCurrency(claimedAmount)}
                              </td>
                              {response && (
                                <>
                                  <td className="pt-3 pb-2 px-3 text-right text-sm text-gray-600 whitespace-nowrap">
                                    {parsed?.eligible !== null && parsed !== null
                                      ? formatCurrency(parsed.eligible!)
                                      : "—"}
                                  </td>
                                  <td className="pt-3 pb-2 px-3 text-center text-sm text-gray-600">
                                    {parsed?.eligPercent !== null &&
                                    parsed !== null
                                      ? `${parsed.eligPercent}%`
                                      : "—"}
                                  </td>
                                  <td className="pt-3 pb-2 px-3 text-center text-sm text-gray-600">
                                    {parsed?.eligQuantity !== null &&
                                    parsed !== null
                                      ? parsed.eligQuantity
                                      : "—"}
                                  </td>
                                </>
                              )}
                              <td className="pt-3 pb-2 px-3 text-center">
                                {parsed ? (
                                  <Badge
                                    className={cn(
                                      "text-xs capitalize",
                                      itemStatusBadgeClass(parsed.itemStatus)
                                    )}
                                  >
                                    {parsed.itemStatus ?? "—"}
                                  </Badge>
                                ) : (
                                  <Badge className="bg-gray-100 text-gray-600 border border-gray-200 text-xs">
                                    Pending
                                  </Badge>
                                )}
                              </td>
                            </tr>
                            <tr
                              key={`${item.sequence}-notes`}
                              className="border-b border-gray-100"
                            >
                              <td
                                colSpan={totalCols}
                                className={cn(
                                  "pl-0 pr-0",
                                  hasNotes ? "pb-3 pt-1" : "pb-0"
                                )}
                              >
                                {hasNotes && (
                                  <div className="text-xs text-gray-500">
                                    <span className="font-medium text-gray-600">
                                      Note:{" "}
                                    </span>
                                    {queryNotes.length > 1 ? (
                                      <ul className="mt-0.5 list-disc list-inside space-y-0.5">
                                        {queryNotes.map((n, i) => (
                                          <li key={i}>{n}</li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <span>{queryNotes[0]}</span>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          </>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th
                          scope="row"
                          colSpan={response ? 5 : 2}
                          className="pt-4 pr-3 text-right text-xs font-normal text-gray-500"
                        >
                          Total Submitted
                        </th>
                        <td className="pt-4 px-3 text-right text-sm text-gray-500">
                          {formatCurrency(
                            claim.item?.reduce(
                              (sum, item) =>
                                sum + item.unit_price * item.quantity.value,
                              0
                            )
                          )}
                        </td>
                      </tr>
                      {totals.benefit !== null && (
                        <tr>
                          <th
                            scope="row"
                            colSpan={response ? 5 : 2}
                            className="pt-2 pr-3 text-right text-xs font-semibold text-gray-700"
                          >
                            Benefit Payable
                          </th>
                          <td className="pt-2 px-3 text-right text-sm font-semibold text-green-700">
                            {formatCurrency(totals.benefit)}
                          </td>
                        </tr>
                      )}
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Errors section */}
              {response?.error && response.error.length > 0 && (
                <div>
                  <Separator className="mb-4" />
                  <Alert className="bg-red-50 border-red-200">
                    <AlertCircleIcon className="h-4 w-4 text-red-600" />
                    <AlertDescription>
                      <p className="font-semibold text-red-800 mb-2">
                        Payer returned errors
                      </p>
                      <div className="space-y-1.5">
                        {response.error.map((e, i) => {
                          const code = e.code?.coding?.[0]?.code;
                          const display = e.code?.coding?.[0]?.display;
                          const field = e.expression?.[0] ?? null;
                          return (
                            <div key={i} className="text-xs text-red-700">
                              <span className="font-medium font-mono">
                                {code}
                              </span>
                              {display && (
                                <span className="ml-1.5">{display}</span>
                              )}
                              {field && (
                                <span className="ml-1.5 text-red-500 font-mono">
                                  ({field})
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>

        <CardFooter
          className={cn(
            "flex flex-col gap-3 p-4 pt-4",
            isOpen && "border-t"
          )}
        >
          {headerBanner && <div className="w-full">{headerBanner}</div>}
          <div className="flex w-full justify-between items-center gap-3">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
              <div className="flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4" />
                <span>Created on: {formatDate(claim.created_date)}</span>
              </div>
              {claim.dispatched_at && (
                <div className="flex items-center gap-1.5">
                  <SendIcon className="w-4 h-4" />
                  <span>Submitted on: {formatDate(claim.dispatched_at)}</span>
                </div>
              )}
              {response &&
                responseStatus.label !== "Pending" &&
                responseStatus.label !== "Not Submitted" &&
                responseStatus.label !== "Awaiting Response" &&
                responseStatus.label !== "Submission Failed" && (
                  <div className="flex items-center gap-1.5">
                    <StatusIcon
                      label={responseStatus.label}
                      iconColorClass={responseStatus.iconColorClass}
                    />
                    <span>
                      {responseStatus.label} on:{" "}
                      {formatDate(response.created_date)}
                    </span>
                  </div>
                )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {footerActions}
              <ClaimNotificationSheet claim={claim} />
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-9 p-0">
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

export default ClaimCard;
