import CreateClaimPage from "./components/create-claim-page";

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
};

export default routes;
