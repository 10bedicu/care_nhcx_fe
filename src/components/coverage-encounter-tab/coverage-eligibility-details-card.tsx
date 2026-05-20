import {
  AlarmClockMinusIcon,
  CalendarIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InfoIcon,
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
import { FC, useMemo, useState } from "react";
import { cn, formatDate } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CoverageEligibilityRequest } from "@/types/coverage_eligibility";

interface CoverageEligibilityDetailsCardProps {
  coverageEligibilityRequest: CoverageEligibilityRequest;
}

const CoverageEligibilityDetailsCard: FC<
  CoverageEligibilityDetailsCardProps
> = ({ coverageEligibilityRequest }) => {
  const [isOpen, setIsOpen] = useState(false);

  const status = useMemo(() => {
    if (!coverageEligibilityRequest.latest_response) {
      return "pending";
    }

    const outcome = coverageEligibilityRequest.latest_response.outcome;
    if (outcome === "complete") {
      return "completed";
    } else if (outcome === "error") {
      return "error";
    } else {
      return "processing";
    }
  }, [coverageEligibilityRequest.latest_response]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case "error":
        return <XCircleIcon className="w-4 h-4 text-red-500" />;
      case "processing":
        return <AlarmClockMinusIcon className="w-4 h-4 text-blue-500" />;
      case "pending":
        return <AlarmClockMinusIcon className="w-4 h-4 text-yellow-500" />;
      default:
        return <InfoIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-500";
      case "error":
        return "text-red-500";
      case "processing":
        return "text-blue-500";
      case "pending":
        return "text-yellow-500";
      default:
        return "text-gray-500";
    }
  };

  const formatPurpose = (purposes: string[]) => {
    return purposes.map((p) => p.replace("-", " ")).join(", ");
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="flex flex-col gap-3 bg-gray-50 border-t rounded-t-lg">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="capitalize">
                Coverage Eligibility Request
              </CardTitle>
              <CardDescription>
                Request ID: #{coverageEligibilityRequest.id}
              </CardDescription>
              <div className="mt-1 text-sm text-gray-600">
                Purpose: {formatPurpose(coverageEligibilityRequest.purpose)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                className={cn("capitalize text-xs", {
                  "bg-red-200 text-red-600":
                    coverageEligibilityRequest.priority === "stat",
                  "bg-orange-200 text-orange-600":
                    coverageEligibilityRequest.priority === "normal",
                  "bg-yellow-200 text-yellow-600":
                    coverageEligibilityRequest.priority === "deferred",
                })}
              >
                {coverageEligibilityRequest.priority}
              </Badge>
            </div>
          </div>
          <div className="mt-6 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              {getStatusIcon(status)}
              <span
                className={cn(
                  "capitalize font-medium text-sm",
                  getStatusColor(status)
                )}
              >
                {status}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {coverageEligibilityRequest.item?.length ?? 0} item(s)
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <div className="max-sm:-mx-6 mt-8 space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Insurance Information
                </h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  {coverageEligibilityRequest.insurance?.map(
                    (insurance, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {insurance.focal ? "Primary" : "Secondary"}
                          </Badge>
                          <span className="text-sm font-medium">
                            {insurance.policy.productname}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>Member ID: {insurance.policy.memberid}</div>
                          <div>Policy No: {insurance.policy.sno}</div>
                          <div>ABHA: {insurance.policy.abhanumber}</div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {coverageEligibilityRequest.item &&
                coverageEligibilityRequest.item.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      Requested Items
                    </h4>
                    <div className="space-y-3">
                      {coverageEligibilityRequest.item.map((item, index) => (
                        <div
                          key={index}
                          className="border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">
                                {item.product_or_service.code}
                              </div>
                              <div className="text-sm text-gray-600">
                                {item.product_or_service.display}
                              </div>
                              {item.category && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Category: {item.category.display}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">
                                Qty: {item.quantity.value}{" "}
                                {item.quantity.unit?.display || ""}
                              </div>
                              {item.unit_price > 0 && (
                                <div className="text-sm text-gray-600">
                                  ₹{item.unit_price.toFixed(2)}
                                </div>
                              )}
                            </div>
                          </div>

                          {item.diagnosis && item.diagnosis.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className="text-xs font-medium text-gray-700 mb-2">
                                Diagnosis:
                              </div>
                              {item.diagnosis.map((diagnosis, diagIndex) => (
                                <div
                                  key={diagIndex}
                                  className="text-xs text-gray-600"
                                >
                                  {diagnosis.diagnosis_code.display} (
                                  {diagnosis.diagnosis_code.code})
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {coverageEligibilityRequest.supporting_info &&
                coverageEligibilityRequest.supporting_info.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      Supporting Information
                    </h4>
                    <div className="space-y-2">
                      {coverageEligibilityRequest.supporting_info.map(
                        (info, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 text-sm text-gray-600"
                          >
                            <span className="font-medium">
                              #{info.sequence}:
                            </span>
                            {info.value_string && (
                              <span>{info.value_string}</span>
                            )}
                            {info.value_attachment && (
                              <Badge variant="outline" className="text-xs">
                                Attachment
                              </Badge>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

              {coverageEligibilityRequest.latest_response && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                    Response Details
                  </h4>
                  <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        className={cn("text-xs", {
                          "bg-green-200 text-green-600": status === "completed",
                          "bg-red-200 text-red-600": status === "error",
                          "bg-blue-200 text-blue-600": status === "processing",
                        })}
                      >
                        {coverageEligibilityRequest.latest_response.outcome}
                      </Badge>
                      {coverageEligibilityRequest.latest_response
                        .disposition && (
                        <span className="text-sm text-gray-600">
                          {
                            coverageEligibilityRequest.latest_response
                              .disposition
                          }
                        </span>
                      )}
                    </div>

                    {coverageEligibilityRequest.latest_response.insurances && (
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-gray-700">
                          Members:
                        </div>
                        {coverageEligibilityRequest.latest_response.insurances.map(
                          (entry, index) => (
                            <div key={index} className="text-xs text-gray-600">
                              <div>{entry.name ?? "Unknown"}</div>
                              {entry.policy_period && (
                                <div>
                                  Period:{" "}
                                  {formatDate(entry.policy_period.start)} →{" "}
                                  {formatDate(entry.policy_period.end)}
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    )}

                    {coverageEligibilityRequest.latest_response.error && (
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-red-700">
                          Error:
                        </div>
                        <pre className="text-xs text-red-600 whitespace-pre-wrap">
                          {JSON.stringify(
                            coverageEligibilityRequest.latest_response.error,
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
        <CardFooter
          className={cn("flex justify-between p-4 pt-4", isOpen && "border-t")}
        >
          <div className="flex space-x-4 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4" />
              <span>
                Created on:{" "}
                {formatDate(coverageEligibilityRequest.created_date)}
              </span>
            </div>
            {coverageEligibilityRequest.latest_response && (
              <div className="flex items-center gap-1.5">
                {getStatusIcon(status)}
                <span className="capitalize">
                  {status} On:{" "}
                  {formatDate(
                    coverageEligibilityRequest.latest_response.created_date
                  )}
                </span>
              </div>
            )}
          </div>
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
        </CardFooter>
      </Collapsible>
    </Card>
  );
};

export default CoverageEligibilityDetailsCard;
