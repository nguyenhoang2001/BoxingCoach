// Global type declarations

interface AppConfig {
  basePath: string;
  apiUrl: string;
}

declare global {
  interface Window {
    __BASE_PATH__: string;
    __APP_CONFIG__: AppConfig;
  }
}

export {};