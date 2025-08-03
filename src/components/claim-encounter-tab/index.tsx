import { Encounter } from "@/types/encounter";
import { FC } from "react";
import { Link } from "raviger";
import { Patient } from "@/types/patient";

export type EncounterTabProps = {
  encounter: Encounter;
  patient: Patient;
  facilityId: string;
};

const ClaimEncounterTab: FC<EncounterTabProps> = ({
  encounter,
  patient,
  facilityId,
}) => {
  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-12">
      <h1>Claims</h1>
      <div className="space-y-4">
        <p>
          <strong>Facility ID:</strong> {facilityId}
        </p>
        <p>
          <strong>Patient Name:</strong> {patient.name}
        </p>
        <p>
          <strong>Encounter ID:</strong> {encounter.id}
        </p>
      </div>
      <Link href="claims/new">Create Claim</Link>
    </div>
  );
};

export default ClaimEncounterTab;
