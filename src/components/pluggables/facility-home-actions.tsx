import { FC } from "react";
import { Facility } from "@/types/facility";
import ManageProvider from "@/components/manage-provider";

type FacilityHomeActionsProps = {
  facility: Facility;
  className?: string;
};

const FacilityHomeActions: FC<FacilityHomeActionsProps> = ({
  facility,
  className,
}) => {
  return <ManageProvider facility={facility} className={className} />;
};

export default FacilityHomeActions;
