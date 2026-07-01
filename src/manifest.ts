import { lazy } from "react";
import routes from "./routes";

const manifest = {
  plugin: "care_nhcx",
  routes,
  extends: [],
  components: {
    FacilityHomeActions: lazy(
      () => import("./components/pluggables/facility-home-actions"),
    ),
    PatientHomeQuickActions: lazy(
      () => import("./components/pluggables/patient-home-policy-verification"),
    ),
  },
  navItems: [],
  encounterTabs: {
    claims: lazy(() => import("./components/nhcx-encounter-tab/index")),
  },
};

export default manifest;
