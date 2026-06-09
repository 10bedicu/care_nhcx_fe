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

import { Button } from "@/components/ui/button";
import { Coding } from "@/types/base";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  onSubmit: (payload: { reason_code?: Coding; description?: string }) => void;
  trigger?: ReactNode;
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
}) => {
  const [selectedCode, setSelectedCode] = useState<string>(NONE_REASON_VALUE);
  const [taskDescription, setTaskDescription] = useState("");

  useEffect(() => {
    if (!open) {
      setSelectedCode(NONE_REASON_VALUE);
      setTaskDescription("");
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      reason_code: undefined as Coding | undefined,
      description: undefined as string | undefined,
    };
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
    onSubmit(payload);
  };

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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Close
            </Button>
            <Button
              type="submit"
              variant={variant === "destructive" ? "destructive" : "default"}
              loading={loading}
              disabled={loading}
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
