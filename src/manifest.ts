import { lazy } from "react";
import routes from "./routes";

const manifest = {
  plugin: "care_hcx",
  routes,
  extends: [],
  components: {},
  navItems: [],
  encounterTabs: {
    claims: lazy(() => import("./components/claim-encounter-tab/index")),
  },
};

export default manifest;
