/// <reference types="vite/client" />

declare module 'virtual:project-file-manifest' {
  import type { ProjectManifest } from './types/projectFiles';
  const manifest: ProjectManifest;
  export default manifest;
}