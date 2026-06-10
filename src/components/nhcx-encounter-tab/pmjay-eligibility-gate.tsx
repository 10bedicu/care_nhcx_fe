import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowRightIcon, CircleAlertIcon, ShieldXIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FC } from "react";
import { Link } from "raviger";
import { PmjayEligibilityState } from "./use-pmjay-eligibility";

type PmjayEligibilityGateProps = {
  state: PmjayEligibilityState;
};

const PmjayEligibilityGate: FC<PmjayEligibilityGateProps> = ({ state }) => {
  const { ageUnknown, isChild, checklist, patientUpdateHref } = state;

  if (ageUnknown) {
    return (
      <Alert variant="destructive">
        <ShieldXIcon className="h-4 w-4" />
        <AlertTitle>Patient date of birth required</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>
            The patient&apos;s date of birth is mandatory to determine PMJAY
            eligibility requirements. Update the patient record to continue.
          </p>
          <Link href={patientUpdateHref}>
            <Button variant="destructive" size="sm" className="gap-1.5">
              Edit Patient
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  const pendingItems = checklist.filter((item) => !item.satisfied);

  return (
    <Alert variant="destructive">
      <ShieldXIcon className="h-4 w-4" />
      <AlertTitle>PMJAY requirements not met</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          The following details are mandatory before any PMJAY action can be
          taken for this {isChild ? "child (6 years and below)" : "adult"}{" "}
          patient. Complete them all to unlock the insurance claim flow.
        </p>
        <ul className="space-y-2">
          {pendingItems.map((item) => (
            <li
              key={item.key}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-md border border-red-200 bg-white p-3"
            >
              <div className="flex items-start gap-2">
                <CircleAlertIcon className="h-5 w-5 text-red-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {item.label}
                  </p>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
              </div>
              <Link href={item.actionHref}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  {item.actionLabel}
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
};

export default PmjayEligibilityGate;
