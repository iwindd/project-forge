import { cookies } from "next/headers";

const apiOrigin =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5050";

export async function apiServerFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const cookieStore = await cookies();
  const response = await fetch(`${apiOrigin}/api/v1/${path.replace(/^\//, "")}`, {
    ...init,
    headers: {
      cookie: cookieStore.toString(),
      "content-type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `API request failed with ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
