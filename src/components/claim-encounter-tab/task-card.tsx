import { Card, CardContent } from "@/components/ui/card";
import { Communication, CommunicationRequest } from "@/types/communication";

import { Badge } from "@/components/ui/badge";
import CommunicationReplyModal from "./communication-reply-modal";
import { FC } from "react";
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
        <span>
          <CommunicationReplyModal
            communicationRequest={communicationRequest}
          />
        </span>
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
        <span>
          {communication.sent ? formatDate(communication.sent) : "N/A"}
        </span>
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
        <span>{task.authored_on ? formatDate(task.authored_on) : "N/A"}</span>
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
