import {
  AlarmClockMinusIcon,
  CalendarIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
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
import { cn, formatCurrency, formatDate } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Claim } from "@/types/claim";
import ClaimNotificationSheet from "./claim-notification-sheet";

interface ClaimCardProps {
  claim: Claim;
}

const ClaimCard: FC<ClaimCardProps> = ({ claim }) => {
  const [isOpen, setIsOpen] = useState(false);

  const totalRequestedAmount = useMemo(() => {
    return (
      claim.item?.reduce(
        (sum, item) => sum + item.unit_price * item.quantity.value,
        0
      ) ?? 0
    );
  }, [claim.item]);

  const totalApprovedAmount = useMemo(() => {
    return (
      claim.latest_response?.item?.reduce(
        (sum, item) => sum + (item.adjudication?.[0]?.amount?.value ?? 0),
        0
      ) ?? 0
    );
  }, [claim.latest_response]);

  const status = useMemo(() => {
    if (!claim.latest_response) {
      return "pending";
    }

    if (totalApprovedAmount === 0) {
      return "rejected";
    } else if (totalApprovedAmount === totalRequestedAmount) {
      return "approved";
    } else {
      return "partially-approved";
    }
  }, [claim.latest_response, totalApprovedAmount, totalRequestedAmount]);

  const getResponseItemForClaimItem = (claimItemSequence: number) => {
    if (!claim.latest_response?.item) return null;

    return claim.latest_response.item.find(
      (responseItem) => responseItem.itemSequence === claimItemSequence
    );
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
                <p>
                  Claim Process ID: #
                  {claim.related?.[0]?.claim as unknown as string}
                </p>
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
            <div className="flex items-center space-x-2">
              {status === "approved" && (
                <CheckCircleIcon className="w-4 h-4 text-green-500" />
              )}
              {status === "partially-approved" && (
                <CheckCircleIcon className="w-4 h-4 text-orange-500" />
              )}
              {status === "rejected" && (
                <XCircleIcon className="w-4 h-4 text-red-500" />
              )}
              {status === "pending" && (
                <AlarmClockMinusIcon className="w-4 h-4 text-yellow-500" />
              )}
              <span
                className={cn("capitalize font-medium text-sm", {
                  "text-green-500": status === "approved",
                  "text-orange-500": status === "partially-approved",
                  "text-red-500": status === "rejected",
                  "text-yellow-500": status === "pending",
                })}
              >
                {status.replace("-", " ")}
              </span>
            </div>
            <div className="text-2xl font-bold">
              {formatCurrency(
                claim.latest_response?.total?.length
                  ? claim.latest_response.total.reduce(
                      (sum, total) => sum + (total.amount?.value ?? 0),
                      0
                    )
                  : claim.item?.reduce(
                      (sum, item) =>
                        sum + item.unit_price * item.quantity.value,
                      0
                    ) ?? 0
              )}
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <div className="max-sm:-mx-6 mt-8 flow-root">
              <table className="min-w-full divide-y divide-secondary-300">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pl-6 pr-3 text-left text-sm font-semibold text-secondary-900 sm:pl-0"
                    >
                      Claim Items
                    </th>
                    <th
                      scope="col"
                      className="py-3.5 pl-3 pr-6 text-center text-sm font-semibold text-secondary-900"
                    >
                      Claimed Amount
                    </th>
                    {claim.latest_response && (
                      <th
                        scope="col"
                        className="py-3.5 pl-3 pr-6 text-center text-sm font-semibold text-secondary-900"
                      >
                        Adjudicated Amount
                      </th>
                    )}
                    <th
                      scope="col"
                      className="py-3.5 pl-3 pr-6 text-center text-sm font-semibold text-secondary-900 sm:pr-0"
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {claim.item?.map((item) => {
                    const responseItem = getResponseItemForClaimItem(
                      item.sequence
                    );
                    const claimedAmount = item.unit_price * item.quantity.value;
                    const adjudicatedAmount =
                      responseItem?.adjudication?.[0]?.amount?.value || 0;
                    const adjudicationReason =
                      responseItem?.adjudication?.[0]?.reason?.coding?.[0]
                        ?.display ||
                      responseItem?.adjudication?.[0]?.reason?.text ||
                      "No reason provided";

                    return (
                      <tr
                        key={item.sequence}
                        className="border-b border-secondary-200"
                      >
                        <td className="py-4 pl-6 pr-3 text-sm sm:pl-0">
                          <div className="font-medium text-secondary-900">
                            {item.product_or_service.code}
                          </div>
                          <div className="mt-0.5 text-secondary-500">
                            {item.product_or_service.display}
                          </div>
                          {responseItem && (
                            <div className="mt-2 text-xs text-gray-600">
                              <span className="font-medium">Reason: </span>
                              {adjudicationReason}
                            </div>
                          )}
                        </td>
                        <td className="py-4 pl-3 pr-6 text-center text-sm text-secondary-500">
                          {formatCurrency(claimedAmount)}
                        </td>
                        {claim.latest_response && (
                          <td className="py-4 pl-3 pr-6 text-center text-sm text-secondary-500">
                            {responseItem
                              ? formatCurrency(adjudicatedAmount)
                              : "NA"}
                          </td>
                        )}
                        <td className="py-4 pl-3 pr-6 text-center text-sm sm:pr-0">
                          {responseItem ? (
                            <Badge
                              className={cn("text-xs", {
                                "bg-green-200 text-green-600":
                                  adjudicatedAmount > 0 &&
                                  adjudicatedAmount === claimedAmount,
                                "bg-orange-200 text-orange-600":
                                  adjudicatedAmount > 0 &&
                                  adjudicatedAmount < claimedAmount,
                                "bg-red-200 text-red-600":
                                  adjudicatedAmount === 0,
                              })}
                            >
                              {adjudicatedAmount === 0
                                ? "Rejected"
                                : adjudicatedAmount === claimedAmount
                                ? "Approved"
                                : "Partially Approved"}
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-200 text-gray-600 text-xs">
                              Pending
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <th
                      scope="row"
                      colSpan={claim.latest_response ? 2 : 1}
                      className="table-cell pl-6 pr-3 pt-6 text-right text-sm font-normal text-secondary-500 sm:pl-0"
                    >
                      Total Claim Amount
                    </th>
                    {claim.latest_response && <td></td>}
                    <td className="pl-3 pr-6 pt-6 text-center text-sm text-secondary-500 sm:pr-0">
                      {formatCurrency(
                        claim.item?.reduce(
                          (sum, item) =>
                            sum + item.unit_price * item.quantity.value,
                          0
                        )
                      )}
                    </td>
                  </tr>

                  {claim.latest_response && (
                    <tr>
                      <th
                        scope="row"
                        colSpan={2}
                        className="table-cell pl-6 pr-3 pt-4 text-right text-sm font-semibold text-secondary-900 sm:pl-0"
                      >
                        Total Approved Amount
                      </th>
                      <td></td>
                      <td className="pl-3 pr-6 pt-4 text-center text-sm font-semibold text-secondary-900 sm:pr-0">
                        {claim.latest_response?.total?.length
                          ? formatCurrency(
                              claim.latest_response.total.reduce(
                                (sum, total) =>
                                  sum + (total.amount?.value ?? 0),
                                0
                              )
                            )
                          : "NA"}
                      </td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          </CardContent>
        </CollapsibleContent>
        <CardFooter
          className={cn("flex justify-between p-4 pt-4", isOpen && "border-t")}
        >
          <div className="flex space-x-4 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4" />
              <span>Created on: {formatDate(claim.created_date)}</span>
            </div>
            {status !== "pending" && (
              <div className="flex items-center gap-1.5">
                {status === "approved" && (
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                )}
                {status === "partially-approved" && (
                  <CheckCircleIcon className="w-4 h-4 text-orange-500" />
                )}
                {status === "rejected" && (
                  <XCircleIcon className="w-4 h-4 text-red-500" />
                )}
                <span className="capitalize">
                  {status.replace("-", " ")} On:{" "}
                  {formatDate(claim.latest_response?.created_date)}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ClaimNotificationSheet claim={claim} />
            <Button asChild variant="secondary" size="sm">
              <a href={`claims/new?related=${claim.id}`}>Follow up</a>
            </Button>
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
        </CardFooter>
      </Collapsible>
    </Card>
  );
};

export default ClaimCard;
