/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare global {
  const __CORE_ENV__: {
    readonly apiUrl: string;
  };

  interface Window {
    __CORE_ENV__?: {
      readonly apiUrl: string;
    };
  }
}

export {};
