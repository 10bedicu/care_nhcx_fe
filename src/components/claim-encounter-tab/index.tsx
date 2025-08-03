import { Button } from "@/components/ui/button";
import { Claim } from "@/types/claim";
import ClaimCard from "./claim-card";
import { Encounter } from "@/types/encounter";
import { FC } from "react";
import { Link } from "raviger";
import { Patient } from "@/types/patient";
import { apis } from "@/apis";
import { useQuery } from "@tanstack/react-query";

export type EncounterTabProps = {
  encounter: Encounter;
  patient: Patient;
  facilityId: string;
};

const ClaimEncounterTab: FC<EncounterTabProps> = ({ encounter }) => {
  const { data: claims } = useQuery({
    queryKey: ["claims", encounter?.id],
    queryFn: () =>
      apis.claim.list({
        encounter: encounter?.id,
      }),
    enabled: !!encounter?.id,
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Claims</h1>
          <p className="text-sm text-gray-500">
            {claims?.results?.length} claim(s) found for this encounter.
          </p>
        </div>
        <Link href="claims/new">
          <Button>Create Claim</Button>
        </Link>
      </div>

      <div className="space-y-4">
        {claims?.results?.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No claims found for this encounter.
          </div>
        )}

        {claims?.results?.map((claim: Claim) => (
          <ClaimCard key={claim.id} claim={claim} />
        ))}
      </div>
    </div>
  );
};

export default ClaimEncounterTab;
