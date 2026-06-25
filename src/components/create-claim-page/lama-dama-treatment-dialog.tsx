import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FC, useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LamaDamaTreatmentTiming } from "./lama-dama-helpers";

export interface LamaDamaTreatmentDialogProps {
  open: boolean;
  dispositionLabel: string;
  onConfirm: (timing: LamaDamaTreatmentTiming) => void;
}

const NONE_VALUE = "__none__";

export const LamaDamaTreatmentDialog: FC<LamaDamaTreatmentDialogProps> = ({
  open,
  dispositionLabel,
  onConfirm,
}) => {
  const [selectedTiming, setSelectedTiming] = useState<string>(NONE_VALUE);

  useEffect(() => {
    if (!open) {
      setSelectedTiming(NONE_VALUE);
    }
  }, [open]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (selectedTiming === "before_during" || selectedTiming === "after") {
      onConfirm(selectedTiming);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent hideCloseButton>
        <DialogHeader>
          <DialogTitle>Treatment timing for {dispositionLabel}</DialogTitle>
          <DialogDescription>
            Please specify when the patient left against medical advice. This
            determines whether the claim should include only the LM100 benefit
            or the full treatment details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="lama-dama-timing">
              When did the patient leave?
              <span className="text-red-500 text-sm ml-0.5">*</span>
            </Label>
            <Select value={selectedTiming} onValueChange={setSelectedTiming}>
              <SelectTrigger id="lama-dama-timing">
                <SelectValue placeholder="Select treatment timing" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="before_during">
                  Before or during treatment
                </SelectItem>
                <SelectItem value="after">After treatment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={selectedTiming === NONE_VALUE}
              className="w-full sm:w-auto"
            >
              Continue
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
