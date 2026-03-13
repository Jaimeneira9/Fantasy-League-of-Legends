import { createClient } from "@/lib/supabase/server";
import type { League } from "./api";

const BASE = process.env.NEXT_PUBLIC_API_URL!;

async function serverReq<T>(path: string): Promise<T> {
  const sb = await createClient();
  const { data } = await sb.auth.getSession();
  const t = data.session?.access_token;

  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const serverApi = {
  leagues: {
    list: () => serverReq<League[]>("/leagues/"),
    get: (id: string) => serverReq<League>(`/leagues/${id}`),
  },
};
