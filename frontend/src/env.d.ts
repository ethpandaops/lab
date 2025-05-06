/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATA_SOURCE_TYPE: 'local' | 'github';
  readonly VITE_GITHUB_REPO: string;
  readonly VITE_GITHUB_BRANCH: string;
  readonly VITE_GITHUB_DATA_PATH: string;
  readonly VITE_LOCAL_DATA_PATH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
