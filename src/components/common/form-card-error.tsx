import { AlertCircleIcon } from "lucide-react";
import { CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  hasSectionValidationIssue,
  type SectionValidationCounts,
} from "@/lib/form-card-validation";

export const sectionErrorBorderClass = "border-red-500 bg-red-50/50";
export const cardErrorBorderClass = "border-red-500 overflow-hidden";

export function FormCardErrorFooter({ message }: { message: string }) {
  return (
    <CardFooter className="rounded-b-xl px-6 py-3 border-t border-red-200 bg-red-50 flex-col items-start gap-2">
      <div className="flex items-center gap-2 text-sm font-medium text-red-600">
        <AlertCircleIcon className="h-4 w-4 flex-shrink-0 text-red-600" />
        {message}
      </div>
    </CardFooter>
  );
}

export function SectionErrorMessage({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className={cn("text-sm font-medium text-red-600 px-1")}>{message}</p>
  );
}

export function SectionValidationBadges({
  counts,
  requiredLabel,
}: {
  counts: SectionValidationCounts;
  /** Defaults to `"required"`. Use e.g. `"doc required"` for document sections. */
  requiredLabel?: (count: number) => string;
}) {
  if (!hasSectionValidationIssue(counts)) return null;

  const formatRequired =
    requiredLabel ??
    ((count: number) => `${count} required`);

  return (
    <>
      {counts.requiredMissing > 0 && (
        <Badge variant="destructive" className="ml-1 text-xs">
          {formatRequired(counts.requiredMissing)}
        </Badge>
      )}
      {counts.incomplete > 0 && (
        <Badge variant="destructive" className="ml-1 text-xs">
          {counts.incomplete} incomplete
        </Badge>
      )}
    </>
  );
}
