import packageJson from "../../package.json";

/** App version from package.json — bump there when shipping user-facing changes. */
export const APP_VERSION = packageJson.version;

export function formatAppVersion(version: string = APP_VERSION): string {
  return version.startsWith("v") ? version : `v${version}`;
}
