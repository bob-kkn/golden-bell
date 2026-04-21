const BASE_URL = import.meta.env.BASE_URL;

function trimLeadingSlash(value: string): string {
  return value.replace(/^\/+/, "");
}

export function getHomePath(): string {
  return "/";
}

export function getHostPath(sessionId: string): string {
  return `/host/${sessionId}`;
}

export function getPlayPath(sessionId: string): string {
  return `/play/${sessionId}`;
}

export function getScreenPath(sessionId: string): string {
  return `/screen/${sessionId}`;
}

export function getPublicAssetUrl(path: string): string {
  return `${BASE_URL}${trimLeadingSlash(path)}`;
}

export function getAppUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(`${BASE_URL}#${normalizedPath}`, window.location.origin).toString();
}
