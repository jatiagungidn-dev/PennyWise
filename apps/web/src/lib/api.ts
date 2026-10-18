import { supabase } from "./supabase";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  const token = data.session?.access_token;

  if (!token) {
    throw new Error("Please sign in first");
  }

  const headers = new Headers(init.headers);

  headers.set("Authorization", `Bearer ${token}`);

  if (init.body !== null && !headers.has("Content-Type")) {
    headers.set("Contenty-Type", "application/json");
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(`Api request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}
