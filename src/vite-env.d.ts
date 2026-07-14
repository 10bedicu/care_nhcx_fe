/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface CareNhcxFePluginConfig {
  faceAuthUrl?: string;
}

interface CarePluginRuntimeMeta {
  care_nhcx_fe?: {
    config?: CareNhcxFePluginConfig;
  };
}

interface CarePluginRuntime {
  meta?: CarePluginRuntimeMeta;
}

declare global {
  const __CORE_ENV__: {
    readonly apiUrl: string;
  };

  interface Window {
    __CORE_ENV__?: {
      readonly apiUrl: string;
    };
    __CARE_PLUGIN_RUNTIME__?: CarePluginRuntime;
  }
}

export {};
