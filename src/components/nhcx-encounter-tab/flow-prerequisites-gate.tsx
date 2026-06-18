import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowRightIcon, CircleAlertIcon, ShieldXIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FC } from "react";
import { Link } from "raviger";
import { PrerequisiteGroupState } from "./flow-prerequisites";

type FlowPrerequisitesGateProps = {
  title: string;
  description: string;
  state: PrerequisiteGroupState;
  ageUnknown?: boolean;
  patientUpdateHref?: string;
  isChild?: boolean;
};

function PrerequisiteChecklist({
  pendingItems,
}: {
  pendingItems: PrerequisiteGroupState["checklist"];
}) {
  return (
    <ul className="space-y-2">
      {pendingItems.map((item) => (
        <li
          key={item.key}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-md border border-red-200 bg-white p-3"
        >
          <div className="flex items-start gap-2">
            <CircleAlertIcon className="h-5 w-5 text-red-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">{item.label}</p>
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
  );
}

export const FlowPrerequisitesGate: FC<FlowPrerequisitesGateProps> = ({
  title,
  description,
  state,
  ageUnknown,
  patientUpdateHref,
  isChild,
}) => {
  if (ageUnknown && patientUpdateHref) {
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

  const pendingItems = state.checklist.filter((item) => !item.satisfied);

  return (
    <Alert variant="destructive">
      <ShieldXIcon className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          {description}
          {isChild !== undefined && (
            <>
              {" "}
              for this {isChild ? "child (6 years and below)" : "adult"}{" "}
              patient.
            </>
          )}
        </p>
        <PrerequisiteChecklist pendingItems={pendingItems} />
      </AlertDescription>
    </Alert>
  );
};

type FlowPrerequisitesTimelineGateProps = {
  title: string;
  description: string;
  state: PrerequisiteGroupState;
};

export const FlowPrerequisitesTimelineGate: FC<
  FlowPrerequisitesTimelineGateProps
> = ({ title, description, state }) => {
  const pendingItems = state.checklist.filter((item) => !item.satisfied);

  if (pendingItems.length === 0) return null;

  return (
    <div className="rounded-lg border border-red-300 bg-red-50/50 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <ShieldXIcon className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
      <PrerequisiteChecklist pendingItems={pendingItems} />
    </div>
  );
};

export default FlowPrerequisitesGate;
