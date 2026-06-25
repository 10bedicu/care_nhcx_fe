import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CalendarIcon, MessageCircleQuestionIcon } from "lucide-react";

import { FC } from "react";
import { formatDate } from "@/lib/utils";

interface PayerQueryBannerProps {
  message?: string;
  createdAt?: string;
  context: "preauthorization" | "claim";
}

const FALLBACK_MESSAGE =
  "The payer raised a query on this request. Review the request and make the necessary changes before resubmitting.";

export const PayerQueryBanner: FC<PayerQueryBannerProps> = ({
  message,
  createdAt,
  context,
}) => {
  const title =
    context === "preauthorization"
      ? "Payer raised a query on this pre-authorisation"
      : "Payer raised a query on this claim";
  return (
    <Alert className="border-amber-300 bg-amber-50 text-amber-900">
      <MessageCircleQuestionIcon className="h-4 w-4 text-amber-600" />
      <AlertTitle className="font-semibold">{title}</AlertTitle>
      <AlertDescription className="space-y-2">
        <p className="whitespace-pre-line leading-relaxed text-amber-900">
          {message?.trim() ? message : FALLBACK_MESSAGE}
        </p>
        {createdAt && (
          <div className="flex items-center gap-1.5 text-xs text-amber-700">
            <CalendarIcon className="h-3.5 w-3.5" />
            <span>Raised on {formatDate(createdAt)}</span>
          </div>
        )}
        <p className="text-xs text-amber-800/80">
          Update the form below to address the query and resubmit.
        </p>
      </AlertDescription>
    </Alert>
  );
};

export default PayerQueryBanner;
