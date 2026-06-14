/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FAKE_AUTH?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
