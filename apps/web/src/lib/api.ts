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

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Api request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}
