import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { Button } from "@/components/ui/button";
import CoverageEligibilityCard from "./coverage-eligibility-card";
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
};

const CoverageEncounterTab: FC<EncounterTabProps> = ({
  encounter,
  patient,
}) => {
  const { data: coverageEligibilityRequests } = useQuery({
    queryKey: ["coverage-eligibility-requests", encounter?.id],
    queryFn: () =>
      apis.coverageEligibilityRequest.list({
        // encounter: encounter?.id,
      }),
    enabled: !!encounter?.id,
  });

  const { data: healthFacility, isLoading: isHealthFacilityLoading } = useQuery(
    {
      queryKey: ["healthFacility", encounter?.facility.id],
      queryFn: () => apis.healthFacility.get(encounter?.facility.id),
      enabled: !!encounter?.facility.id,
    }
  );

  const { data: provider, isLoading: isProviderLoading } = useQuery({
    queryKey: ["provider", encounter?.facility.id],
    queryFn: () => apis.provider.get(encounter?.facility.id),
    enabled: !!encounter?.facility.id,
  });

  const isLoading = isHealthFacilityLoading || isProviderLoading;
  const hasHealthFacility = !!healthFacility;
  const hasProvider = !!provider;

  return (
    <GlobalStoreProvider
      initialStore={{
        patient,
        encounter,
      }}
    >
      <div className="min-h-screen bg-gray-50 p-6 space-y-6">
        {!isLoading && !hasHealthFacility && (
          <Alert variant="warning">
            <AlertTitle>Health Facility Required</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>
                No health facility is linked to this facility. Please go to
                Settings → General to link a health facility before proceeding.
              </p>
              <Link
                href={`/facility/${encounter?.facility.id}/settings/general`}
              >
                <Button variant="outline" size="sm">
                  Go to Settings
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && hasHealthFacility && !hasProvider && (
          <Alert variant="warning">
            <AlertTitle>NHCX Provider Required</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>
                No NHCX provider is configured for this facility. Please go to
                Settings → General to create an NHCX provider before proceeding.
              </p>
              <Link
                href={`/facility/${encounter?.facility.id}/settings/general`}
              >
                <Button variant="outline" size="sm">
                  Go to Settings
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && hasHealthFacility && hasProvider && (
          <>
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Coverage Checks
                </h1>
                <p className="text-sm text-gray-500">
                  {coverageEligibilityRequests?.count ?? 0} coverage check(s)
                  were made for this encounter.
                </p>
              </div>
              <Link href="coverages/new">
                <Button>Check Coverage</Button>
              </Link>
            </div>

            <div className="space-y-4">
              {coverageEligibilityRequests?.count === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No coverage checks were made for this encounter.
                </div>
              )}

              {coverageEligibilityRequests?.results?.map(
                (coverageEligibilityRequest) => (
                  <CoverageEligibilityCard
                    key={coverageEligibilityRequest.id}
                    coverageEligibilityRequest={coverageEligibilityRequest}
                  />
                )
              )}
            </div>
          </>
        )}
      </div>
    </GlobalStoreProvider>
  );
};

export default CoverageEncounterTab;
