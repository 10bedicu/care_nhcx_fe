import { Button } from "@/components/ui/button";
import { Encounter } from "@/types/encounter";
import { FC } from "react";
import { GlobalStoreProvider } from "@/hooks/use-global-store";
import { Link } from "raviger";
import { Patient } from "@/types/patient";
import { apis } from "@/apis";
import { useQuery } from "@tanstack/react-query";

export type EncounterTabProps = {
  encounter: Encounter;
  patient: Patient;
  facilityId: string;
};

const CoverageEncounterTab: FC<EncounterTabProps> = ({
  encounter,
  patient,
  facilityId,
}) => {
  const { data: coverageEligibilityRequests } = useQuery({
    queryKey: ["coverage-eligibility-requests", encounter?.id],
    queryFn: () =>
      apis.coverageEligibilityRequest.list({
        encounter: encounter?.id,
      }),
    enabled: !!encounter?.id,
  });

  return (
    <GlobalStoreProvider
      initialStore={{
        patient,
        encounter,
        facilityId,
      }}
    >
      <div className="min-h-screen bg-gray-50 p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Coverage Checks
            </h1>
            <p className="text-sm text-gray-500">
              {coverageEligibilityRequests?.count ?? 0} coverage check(s) were
              made for this encounter.
            </p>
          </div>
          <Link href="coverages/new">
            <Button>Check Coverage</Button>
          </Link>
        </div>

        <div className="space-y-4">
          <div className="text-center py-8 text-gray-500">
            No coverage checks were made for this encounter.
          </div>
        </div>
      </div>
    </GlobalStoreProvider>
  );
};

export default CoverageEncounterTab;
