import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

import { FC } from "react";
import { ClaimResponse } from "@/types/claim";
import { formatDate } from "@/lib/utils";

interface PayerQueryDispositionAlertProps {
  response: ClaimResponse;
  context: "preauthorization" | "claim";
}

const FALLBACK_MESSAGE =
  "The payer has raised a query. Review the message below and provide the requested information before resubmitting.";

export const PayerQueryDispositionAlert: FC<PayerQueryDispositionAlertProps> = ({
  response,
  context,
}) => {
  const title =
    context === "preauthorization"
      ? "Payer query on pre-authorisation"
      : "Payer query on claim";

  return (
    <Alert className="border-amber-300 bg-amber-50 text-amber-900 [&>svg]:text-amber-600">
      <InfoIcon />
      <AlertTitle className="text-amber-950">{title}</AlertTitle>
      <AlertDescription className="space-y-1 text-amber-900">
        <p className="whitespace-pre-line leading-relaxed">
          {response.disposition?.trim() ? response.disposition : FALLBACK_MESSAGE}
        </p>
        {response.created_date && (
          <p className="text-xs text-amber-700">
            Raised on {formatDate(response.created_date)}
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default PayerQueryDispositionAlert;
