/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_STATIC_MODE?: string;
    readonly MODE?: string;
    readonly VITE_API_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
