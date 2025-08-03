/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

declare global {
  let __CORE_ENV__: {
    readonly apiUrl: string;
  };
}
