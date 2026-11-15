/// <reference types="vite/client" />

// Environment variables this app reads (see .env.example).
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_AS_OF?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
