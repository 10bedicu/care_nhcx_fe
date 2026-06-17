import { Card, CardContent } from "@/components/ui/card";
import { Communication, CommunicationRequest } from "@/types/communication";

import AcknowledgePaymentModal from "./acknowledge-payment-modal";
import { Badge } from "@/components/ui/badge";
import CommunicationReplyModal from "./communication-reply-modal";
import { FC } from "react";
import { PaymentNotice } from "@/types/payment";
import { Separator } from "@/components/ui/separator";
import { Task } from "@/types/task";
import { formatDate } from "@/lib/utils";

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
