export const ACTIVE_ORGANIZATION_KEY = "project-forge.active-organization";

export function getActiveOrganizationId() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_ORGANIZATION_KEY);
  } catch {
    return null;
  }
}

export function setActiveOrganizationId(id: string) {
  try {
    window.localStorage.setItem(ACTIVE_ORGANIZATION_KEY, id);
  } catch {
    // Keep the selected organization in memory when storage is unavailable.
  }
}

export function addOrganizationHeader(headers: Headers) {
  const id = getActiveOrganizationId();
  if (id) headers.set("X-Organization-Id", id);
  return headers;
}
