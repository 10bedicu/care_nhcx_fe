import { lazy } from "react";
import routes from "./routes";

const manifest = {
  plugin: "care_hcx",
  routes,
  extends: [],
  components: {
    FacilityHomeActions: lazy(
      () => import("./components/pluggables/facility-home-actions")
    ),
  },
  navItems: [],
  encounterTabs: {
    claims: lazy(() => import("./components/claim-encounter-tab/index")),
    coverages: lazy(() => import("./components/coverage-encounter-tab/index")),
  },
};

export default manifest;
