import { ShieldCheckIcon } from "lucide-react";
import { FC, useState } from "react";

import {
  PolicyVerificationForm,
  PolicyVerificationContext,
} from "@/components/policy-verification/policy-verification-form";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Patient } from "@/types/patient";

type PatientHomePolicyVerificationProps = {
  patient: Patient;
  facilityId?: string;
  className?: string;
};

const PatientHomePolicyVerification: FC<PatientHomePolicyVerificationProps> = ({
  patient,
  facilityId,
  className,
}) => {
  const [open, setOpen] = useState(false);

  if (!facilityId) {
    return null;
  }

  const context: PolicyVerificationContext = {
    scope: "patient",
    patientId: patient.id,
    facilityId,
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className={`flex-1 flex flex-row md:flex-col gap-1.25 p-1 pb-2 rounded-lg shadow bg-white ${className ?? ""}`}
        >
          <div className="relative flex md:py-3 py-0 rounded-t-md rounded-b-lg md:bg-gray-100 bg-white">
            <div className="rounded-xl bg-white md:shadow shadow-none mx-auto items-center flex p-2">
              <ShieldCheckIcon className="size-8 text-teal-700" />
            </div>
          </div>
          <div className="flex items-center gap-1 justify-center">
            <span className="text-sm font-semibold">Verify Policy</span>
          </div>
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto overflow-x-hidden p-0 flex flex-col"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <ShieldCheckIcon className="size-5 text-primary" />
            Policy Verification
          </SheetTitle>
          <SheetDescription>
            Look up a policy and tap to verify. Results from the last 3 hours
            can be reused when starting a claim.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 min-w-0">
          <PolicyVerificationForm
            context={context}
            embedded
            skipSaveForVerification
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PatientHomePolicyVerification;
