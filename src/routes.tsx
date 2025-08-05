import CreateClaimPage from "./components/create-claim-page";
import CreateCoverageEligibilityRequestPage from "./components/create-coverage-eligibility-request-page";

const routes = {
  "/facility/:facilityId/patient/:patientId/encounter/:encounterId/claims/new":
    ({
      facilityId,
      patientId,
      encounterId,
    }: {
      facilityId: string;
      patientId: string;
      encounterId: string;
    }) => (
      <CreateClaimPage
        facilityId={facilityId}
        patientId={patientId}
        encounterId={encounterId}
      />
    ),
  "/facility/:facilityId/patient/:patientId/encounter/:encounterId/coverages/new":
    ({
      facilityId,
      patientId,
      encounterId,
    }: {
      facilityId: string;
      patientId: string;
      encounterId: string;
    }) => (
      <CreateCoverageEligibilityRequestPage
        facilityId={facilityId}
        patientId={patientId}
        encounterId={encounterId}
      />
    ),
};

export default routes;
