import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FC, ReactNode, useEffect, useState } from "react";
import {
  NdhmReasonCodeOption,
  toNdhmReasonCode,
} from "@/lib/ndhm-reason-codes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaperclipIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Coding } from "@/types/base";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ALLOWED_UPLOAD_ACCEPT,
  ALLOWED_UPLOAD_LABEL,
  isAllowedUploadFile,
  readInlineAttachment,
  toast,
} from "@/lib/utils";
import { InlineAttachment } from "@/types/file_upload";

export interface ReasonDialogSubmitPayload {
  reason_code?: Coding;
  description?: string;
  amount?: { value: number; currency: string };
  attachment?: InlineAttachment;
}

export interface ReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  reasonLabel?: string;
  descriptionLabel?: string;
  reasonPlaceholder?: string;
  descriptionPlaceholder?: string;
  submitLabel?: string;
  variant?: "default" | "destructive";
  loading?: boolean;
  reasonCodes: readonly NdhmReasonCodeOption[];
  onSubmit: (payload: ReasonDialogSubmitPayload) => void;
  trigger?: ReactNode;
  /** When set, shows an amount field prefilled with this value (in INR). */
  showAmount?: boolean;
  amountLabel?: string;
  defaultAmount?: number;
  /** When set, shows a file attachment picker. Requires `encounterId`. */
  showAttachment?: boolean;
  attachmentLabel?: string;
  /** Encounter id used as the associating id for the uploaded file. */
  encounterId?: string;
}

const NONE_REASON_VALUE = "__none__";

export const ReasonDialog: FC<ReasonDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  reasonLabel = "Reason",
  descriptionLabel = "Description",
  reasonPlaceholder = "Select a reason (optional)",
  descriptionPlaceholder = "Add details for the payer (optional)…",
  submitLabel = "Submit",
  variant = "default",
  loading,
  reasonCodes,
  onSubmit,
  showAmount = false,
  amountLabel = "Amount (₹)",
  defaultAmount,
  showAttachment = false,
  attachmentLabel = "Supporting document",
}) => {
  const [selectedCode, setSelectedCode] = useState<string>(NONE_REASON_VALUE);
  const [taskDescription, setTaskDescription] = useState("");
  const [amount, setAmount] = useState<string>("");

  const [attachment, setAttachment] = useState<InlineAttachment | undefined>();
  const [attachedName, setAttachedName] = useState<string | undefined>();
  const [reading, setReading] = useState(false);

  const handleAttachmentChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isAllowedUploadFile(file)) {
      toast.error(`Unsupported file type. Allowed: ${ALLOWED_UPLOAD_LABEL}.`);
      e.target.value = "";
      return;
    }
    setReading(true);
    try {
      const inline = await readInlineAttachment(file);
      setAttachment(inline);
      setAttachedName(file.name);
    } catch {
      toast.error("Failed to read file. Please try again.");
    } finally {
      setReading(false);
      e.target.value = "";
    }
  };

  useEffect(() => {
    if (!open) {
      setSelectedCode(NONE_REASON_VALUE);
      setTaskDescription("");
      setAmount("");
      setAttachment(undefined);
      setAttachedName(undefined);
    } else if (showAmount && defaultAmount !== undefined) {
      setAmount(defaultAmount > 0 ? String(defaultAmount) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: ReasonDialogSubmitPayload = {};
    if (selectedCode !== NONE_REASON_VALUE) {
      const option = reasonCodes.find((c) => c.code === selectedCode);
      if (option) {
        payload.reason_code = toNdhmReasonCode(option);
      }
    }
    const trimmedDescription = taskDescription.trim();
    if (trimmedDescription) {
      payload.description = trimmedDescription;
    }
    if (showAmount) {
      const value = Number(amount);
      if (Number.isFinite(value) && value > 0) {
        payload.amount = { value, currency: "INR" };
      }
    }
    if (showAttachment && attachment) {
      payload.attachment = attachment;
    }
    onSubmit(payload);
  };

  const busy = loading || reading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reason-code">{reasonLabel}</Label>
            <Select value={selectedCode} onValueChange={setSelectedCode}>
              <SelectTrigger id="reason-code">
                <SelectValue placeholder={reasonPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_REASON_VALUE}>
                  No specific reason
                </SelectItem>
                {reasonCodes.map((option) => (
                  <SelectItem key={option.code} value={option.code}>
                    {option.display}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showAmount && (
            <div className="space-y-1.5">
              <Label htmlFor="task-amount">{amountLabel}</Label>
              <Input
                id="task-amount"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500">
                Prefilled with the shortfall (requested − approved). Edit if
                needed.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="task-description">{descriptionLabel}</Label>
            <Textarea
              id="task-description"
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder={descriptionPlaceholder}
              rows={4}
            />
          </div>

          {showAttachment && (
            <div className="space-y-1.5">
              <Label>{attachmentLabel}</Label>
              {attachedName ? (
                <div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm">
                  <span className="flex items-center gap-2 truncate">
                    <PaperclipIcon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{attachedName}</span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAttachment(undefined);
                      setAttachedName(undefined);
                    }}
                    disabled={busy}
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  asChild
                  disabled={busy}
                  className="relative"
                >
                  <span className="cursor-pointer">
                    <PaperclipIcon className="h-4 w-4" />
                    {reading ? "Reading…" : "Attach file"}
                    <input
                      type="file"
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      onChange={handleAttachmentChange}
                      disabled={busy}
                      accept={ALLOWED_UPLOAD_ACCEPT}
                    />
                  </span>
                </Button>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Close
            </Button>
            <Button
              type="submit"
              variant={variant === "destructive" ? "destructive" : "default"}
              loading={busy}
              disabled={busy}
            >
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReasonDialog;
