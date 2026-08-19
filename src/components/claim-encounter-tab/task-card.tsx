import { Card, CardContent } from "@/components/ui/card";
import { Communication, CommunicationRequest } from "@/types/communication";

import AcknowledgePaymentModal from "./acknowledge-payment-modal";
import { Badge } from "@/components/ui/badge";
import { ClaimResponse } from "@/types/claim";
import CommunicationReplyModal from "./communication-reply-modal";
import { FC } from "react";
import {
  AlertTriangleIcon,
  BanIcon,
  CheckCircle2Icon,
  ClockIcon,
  FileTextIcon,
  HashIcon,
  IndianRupeeIcon,
  RotateCcwIcon,
  XCircleIcon,
} from "lucide-react";
import { PaymentNotice } from "@/types/payment";
import { Separator } from "@/components/ui/separator";
import { Task } from "@/types/task";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

interface TaskCardProps {
  task: Task;
}

const CommunicationRequestCard: FC<{ task: Task }> = ({ task }) => {
  const communicationRequest = task.focus as CommunicationRequest;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold text-sm leading-tight text-gray-900">
          {communicationRequest.payload?.[0]?.contentString ||
            communicationRequest.category?.[0]?.text ||
            "Communication Request"}
        </h4>
        <div className="flex gap-2 flex-shrink-0">
          <Badge variant="outline" className="text-xs font-medium">
            {communicationRequest.priority || "medium"}
          </Badge>
          <Badge variant="outline" className="text-xs font-medium">
            {task.status}
          </Badge>
        </div>
      </div>

      {communicationRequest.payload &&
        communicationRequest.payload.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
              Messages ({communicationRequest.payload.length})
            </p>
            <div className="space-y-2">
              {communicationRequest.payload.map((payload, index) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded-lg p-3 border-l-4 border border-gray-200"
                >
                  <p className="text-sm text-gray-800 leading-relaxed">
                    {payload.contentString || "No content available"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
        <span className="font-medium">Communication Request</span>
        <span>{formatDate(communicationRequest.created_date)}</span>
      </div>

      <div className="mt-2 grid gap-2">
        <CommunicationReplyModal communicationRequest={communicationRequest} />
      </div>
    </div>
  );
};

const CommunicationCard: FC<{ task: Task }> = ({ task }) => {
  const communication = task.focus as Communication;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold text-sm leading-tight text-gray-900">
          {communication.payload?.[0]?.content_string ||
            communication.category?.[0]?.display ||
            "Communication"}
        </h4>
        <div className="flex gap-2 flex-shrink-0">
          <Badge variant="outline" className="text-xs font-medium">
            {communication.priority || "medium"}
          </Badge>
          <Badge variant="outline" className="text-xs font-medium">
            {communication.status}
          </Badge>
        </div>
      </div>

      {communication.payload && communication.payload.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            Messages ({communication.payload.length})
          </p>
          <div className="space-y-2">
            {communication.payload.map((payload, index) => (
              <div
                key={index}
                className="bg-gray-50 rounded-lg p-3 border border-gray-200"
              >
                <p className="text-sm text-gray-800 leading-relaxed">
                  {payload.content_string || "No content available"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
        <span className="font-medium">Communication</span>
        <span>{formatDate(communication.created_date)}</span>
      </div>
    </div>
  );
};

const DefaultTaskCard: FC<{ task: Task }> = ({ task }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold text-sm leading-tight text-gray-900">
          {task.description || "Task"}
        </h4>
        <div className="flex gap-2 flex-shrink-0">
          <Badge variant="outline" className="text-xs font-medium">
            {task.priority || "medium"}
          </Badge>
          <Badge variant="outline" className="text-xs font-medium">
            {task.status}
          </Badge>
        </div>
      </div>

      <p className="text-sm text-gray-600 leading-relaxed">
        {task.description || "Task requires attention"}
      </p>

      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
        <span className="font-medium">Task</span>
        <span>{formatDate(task.created_date)}</span>
      </div>
    </div>
  );
};

const PaymentNoticeRequestCard: FC<{ task: Task }> = ({ task }) => {
  const paymentNotice = task.focus as PaymentNotice;

  const formatCurrency = (
    amount: number | undefined,
    currency: string = "INR"
  ) => {
    if (amount === undefined) return "N/A";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold text-sm leading-tight text-gray-900">
          Payment Notice Request
        </h4>
        <div className="flex gap-2 flex-shrink-0">
          <Badge variant="outline" className="text-xs font-medium">
            {paymentNotice.status}
          </Badge>
          <Badge variant="outline" className="text-xs font-medium">
            {task.status}
          </Badge>
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">
              Total Amount
            </p>
            <p className="text-lg font-bold text-blue-900">
              {paymentNotice.payment_amount
                ? formatCurrency(
                    paymentNotice.payment_amount.value,
                    paymentNotice.payment_amount.currency
                  )
                : "N/A"}
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-1">
              Payment Date
            </p>
            <p className="text-sm font-semibold text-green-900">
              {paymentNotice.payment_date
                ? formatDate(paymentNotice.payment_date)
                : "N/A"}
            </p>
          </div>
        </div>

        {paymentNotice.payment_identifier && (
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
              Payment Identifier
            </p>
            <p className="text-sm font-mono text-gray-800">
              {paymentNotice.payment_identifier}
            </p>
          </div>
        )}

        {paymentNotice.detail && paymentNotice.detail.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
              Payment Details ({paymentNotice.detail.length})
            </p>
            <div className="space-y-2">
              {paymentNotice.detail.map((detail, index) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">
                      {detail.type?.coding?.[0]?.display || "Payment Detail"}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {detail.amount
                        ? formatCurrency(
                            detail.amount.value,
                            detail.amount.currency
                          )
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Ref: {detail.identifier?.value || "N/A"}</span>
                    <span>{detail.date ? formatDate(detail.date) : "N/A"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
        <span className="font-medium">Payment Reconciliation</span>
        <span>{formatDate(paymentNotice.created_date)}</span>
      </div>

      <div className="mt-2 grid gap-2">
        <AcknowledgePaymentModal task={task} paymentNotice={paymentNotice} />
      </div>
    </div>
  );
};

const PaymentNoticeResponseCard: FC<{ task: Task }> = ({ task }) => {
  const getStatusDisplay = () => {
    if (!task.output || task.output.length === 0) return "Pending";

    const statusOutput = task.output.find(
      (output) => output.type?.coding?.[0]?.code === "status"
    );

    if (statusOutput?.valueCodeableConcept?.coding?.[0]?.display) {
      return statusOutput.valueCodeableConcept.coding[0].display;
    }

    return statusOutput?.valueCodeableConcept?.coding?.[0]?.code || "Pending";
  };

  const getStatusVariant = (status: string) => {
    if (status.toLowerCase().includes("acknowledge")) return "default";
    if (status.toLowerCase().includes("complete")) return "default";
    if (status.toLowerCase().includes("pending")) return "secondary";
    return "outline";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold text-sm leading-tight text-gray-900">
          Payment Notice Response
        </h4>
        <div className="flex gap-2 flex-shrink-0">
          <Badge variant="outline" className="text-xs font-medium">
            {task.intent}
          </Badge>
          <Badge
            variant={getStatusVariant(getStatusDisplay())}
            className="text-xs font-medium"
          >
            {getStatusDisplay()}
          </Badge>
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
        <p className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">
          Response Status
        </p>
        <p className="text-sm text-blue-900">{getStatusDisplay()}</p>
      </div>

      {task.output && task.output.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            Response Details ({task.output.length})
          </p>
          <div className="space-y-2">
            {task.output.map((output, index) => (
              <div
                key={index}
                className="bg-gray-50 rounded-lg p-3 border border-gray-200"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600">
                    {output.type?.coding?.[0]?.code || "Output"}
                  </span>
                  <span className="text-sm text-gray-800">
                    {output.valueCodeableConcept?.coding?.[0]?.display ||
                      output.valueCodeableConcept?.coding?.[0]?.code ||
                      "N/A"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
        <span className="font-medium">Payment Acknowledgement</span>
        <span>{formatDate(task.created_date)}</span>
      </div>
    </div>
  );
};

type ClaimTaskVariant = "reprocess" | "cancel";

const VARIANT_CONFIG: Record<
  ClaimTaskVariant,
  {
    requestTitle: string;
    responseTitle: string;
    icon: FC<{ className?: string }>;
    accentText: string;
    accentBg: string;
    accentBorder: string;
    accentIconBg: string;
  }
> = {
  reprocess: {
    requestTitle: "Reprocess Request",
    responseTitle: "Reprocess Response",
    icon: RotateCcwIcon,
    accentText: "text-amber-700",
    accentBg: "bg-amber-50",
    accentBorder: "border-amber-200",
    accentIconBg: "bg-amber-100",
  },
  cancel: {
    requestTitle: "Cancellation Request",
    responseTitle: "Cancellation Response",
    icon: BanIcon,
    accentText: "text-rose-700",
    accentBg: "bg-rose-50",
    accentBorder: "border-rose-200",
    accentIconBg: "bg-rose-100",
  },
};

const DISPATCH_STATUS_META: Record<
  Task["dispatch_status"],
  { label: string; className: string; icon: FC<{ className?: string }> }
> = {
  pending: {
    label: "Queued",
    className: "bg-gray-100 text-gray-700 border-gray-200",
    icon: ClockIcon,
  },
  awaiting: {
    label: "Awaiting response",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: ClockIcon,
  },
  complete: {
    label: "Delivered",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2Icon,
  },
  error: {
    label: "Failed",
    className: "bg-rose-50 text-rose-700 border-rose-200",
    icon: AlertTriangleIcon,
  },
};

const getReasonText = (task: Task): string | null =>
  task.reason_code?.coding?.[0]?.display ||
  task.reason_code?.text ||
  task.reason_code?.coding?.[0]?.code ||
  null;

const getTaskInput = (task: Task, code: string) =>
  task.input?.find((input) => input.type?.coding?.[0]?.code === code);

const getAuthorName = (task: Task): string | null => {
  const user = task.created_by;
  if (!user) return null;
  const name = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || user.username || null;
};

const ClaimTaskRequestCard: FC<{ task: Task; variant: ClaimTaskVariant }> = ({
  task,
  variant,
}) => {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  const reason = getReasonText(task);
  const amount = getTaskInput(task, "amount")?.valueMoney;
  const hasDocument = Boolean(getTaskInput(task, "document"));
  const authorName = getAuthorName(task);
  const dispatchMeta =
    DISPATCH_STATUS_META[task.dispatch_status] ?? DISPATCH_STATUS_META.pending;
  const DispatchIcon = dispatchMeta.icon;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={cn(
              "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg",
              config.accentIconBg,
            )}
          >
            <Icon className={cn("h-4 w-4", config.accentText)} />
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-sm leading-tight text-gray-900">
              {config.requestTitle}
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">Sent to payer</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "flex items-center gap-1 text-xs font-medium flex-shrink-0",
            dispatchMeta.className,
          )}
        >
          <DispatchIcon className="h-3 w-3" />
          {dispatchMeta.label}
        </Badge>
      </div>

      {reason && (
        <div
          className={cn(
            "rounded-lg border p-3",
            config.accentBorder,
            config.accentBg,
          )}
        >
          <p
            className={cn(
              "text-[11px] font-medium uppercase tracking-wide mb-1",
              config.accentText,
            )}
          >
            Reason
          </p>
          <p className="text-sm text-gray-800 leading-relaxed">{reason}</p>
        </div>
      )}

      {task.description && (
        <p className="text-sm text-gray-600 leading-relaxed">
          {task.description}
        </p>
      )}

      {(amount || hasDocument) && (
        <div className="flex flex-wrap gap-2">
          {amount && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700">
              <IndianRupeeIcon className="h-3.5 w-3.5 text-gray-500" />
              {formatCurrency(amount.value)}
            </span>
          )}
          {hasDocument && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700">
              <FileTextIcon className="h-3.5 w-3.5 text-gray-500" />
              Document attached
            </span>
          )}
        </div>
      )}

      {task.dispatch_status === "error" && task.dispatch_error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3">
          <AlertTriangleIcon className="h-4 w-4 flex-shrink-0 text-rose-600 mt-0.5" />
          <p className="text-xs text-rose-700 leading-relaxed">
            {task.dispatch_error}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
        <span className="font-medium">
          {authorName ? `Raised by ${authorName}` : "Provider request"}
        </span>
        <span>{formatDate(task.created_date)}</span>
      </div>
    </div>
  );
};

const ClaimTaskResponseCard: FC<{ task: Task; variant: ClaimTaskVariant }> = ({
  task,
  variant,
}) => {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;
  const response = task.focus as ClaimResponse | undefined;

  const code = task.code?.coding?.[0]?.code?.toLowerCase();
  const decision: "approved" | "rejected" | null =
    code === "approve" || code === "approved"
      ? "approved"
      : code === "reject" || code === "rejected" || code === "deny"
        ? "rejected"
        : null;

  const disposition = response?.disposition || task.description || null;
  const preAuthRef = response?.pre_auth_ref;
  const totals = response?.total ?? [];
  const errors = response?.error ?? [];

  const decisionMeta =
    decision === "approved"
      ? {
          label: "Approved",
          className: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: CheckCircle2Icon,
        }
      : decision === "rejected"
        ? {
            label: "Rejected",
            className: "bg-rose-50 text-rose-700 border-rose-200",
            icon: XCircleIcon,
          }
        : {
            label: "Response received",
            className: "bg-blue-50 text-blue-700 border-blue-200",
            icon: CheckCircle2Icon,
          };
  const DecisionIcon = decisionMeta.icon;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={cn(
              "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg",
              config.accentIconBg,
            )}
          >
            <Icon className={cn("h-4 w-4", config.accentText)} />
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-sm leading-tight text-gray-900">
              {config.responseTitle}
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">Payer response</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "flex items-center gap-1 text-xs font-medium flex-shrink-0",
            decisionMeta.className,
          )}
        >
          <DecisionIcon className="h-3 w-3" />
          {decisionMeta.label}
        </Badge>
      </div>

      {disposition && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 mb-1">
            Payer remarks
          </p>
          <p className="text-sm text-gray-800 leading-relaxed">{disposition}</p>
        </div>
      )}

      {preAuthRef && (
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <HashIcon className="h-3.5 w-3.5 text-gray-400" />
          <span className="font-medium">Pre-auth ref:</span>
          <span className="font-mono text-gray-800">{preAuthRef}</span>
        </div>
      )}

      {totals.length > 0 && (
        <div className="space-y-1.5">
          {totals.map((total, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2"
            >
              <span className="text-xs text-gray-600">
                {total.category?.coding?.[0]?.display ||
                  total.category?.coding?.[0]?.code ||
                  "Total"}
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {formatCurrency(total.amount?.value)}
              </span>
            </div>
          ))}
        </div>
      )}

      {errors.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-rose-600">
            Errors ({errors.length})
          </p>
          {errors.map((error, index) => (
            <div
              key={index}
              className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2"
            >
              <AlertTriangleIcon className="h-3.5 w-3.5 flex-shrink-0 text-rose-600 mt-0.5" />
              <span className="text-xs text-rose-700 leading-relaxed">
                {error.code?.coding?.[0]?.display ||
                  error.code?.coding?.[0]?.code ||
                  "Unknown error"}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
        <span className="font-medium">Payer response</span>
        <span>{formatDate(task.created_date)}</span>
      </div>
    </div>
  );
};

const TaskCard: FC<TaskCardProps> = ({ task }) => {
  const renderTaskContent = () => {
    switch (task.use_case) {
      case "communication_request":
        return <CommunicationRequestCard task={task} />;

      case "communication_response":
        return <CommunicationCard task={task} />;

      case "payment_notice_request":
        return <PaymentNoticeRequestCard task={task} />;

      case "payment_notice_response":
        return <PaymentNoticeResponseCard task={task} />;

      case "reprocess_request":
        return <ClaimTaskRequestCard task={task} variant="reprocess" />;

      case "reprocess_response":
        return <ClaimTaskResponseCard task={task} variant="reprocess" />;

      case "cancel_request":
        return <ClaimTaskRequestCard task={task} variant="cancel" />;

      case "cancel_response":
        return <ClaimTaskResponseCard task={task} variant="cancel" />;

      default:
        return <DefaultTaskCard task={task} />;
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-lg hover:border-gray-300 transition-all duration-200">
        <CardContent className="p-0">
          <div className="flex items-start gap-4 p-4">
            <div className="flex-1 min-w-0">{renderTaskContent()}</div>
          </div>
        </CardContent>
      </Card>
      <Separator className="my-6" />
    </div>
  );
};

export default TaskCard;
