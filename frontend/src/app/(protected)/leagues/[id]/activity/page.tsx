"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, type ActivityEvent } from "@/lib/api";
import { RoleIcon, ROLE_COLORS } from "@/components/RoleIcon";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `hace ${d}d`;
  if (h > 0) return `hace ${h}h`;
  if (m > 0) return `hace ${m}m`;
  return "ahora";
}

const TYPE_CONFIG: Record<string, { icon: string; color: string; label: (e: ActivityEvent) => string }> = {
  buy: {
    icon: "↑",
    color: "text-green-400 bg-green-500/10",
    label: (e) => `${e.buyer_name ?? "Alguien"} ha fichado a ${e.player_name} por ${e.price.toFixed(1)}M`,
  },
  bid_win: {
    icon: "⚡",
    color: "text-amber-400 bg-amber-500/10",
    label: (e) => `${e.buyer_name ?? "Alguien"} ganó la puja de ${e.player_name} por ${e.price.toFixed(1)}M`,
  },
  sell: {
    icon: "↓",
    color: "text-red-400 bg-red-500/10",
    label: (e) => `${e.seller_name ?? "Alguien"} vendió a ${e.player_name} por ${e.price.toFixed(1)}M`,
  },
  trade: {
    icon: "⇄",
    color: "text-blue-400 bg-blue-500/10",
    label: (e) => `${e.buyer_name ?? "Alguien"} y ${e.seller_name ?? "alguien"} intercambiaron a ${e.player_name}`,
  },
};

export default function ActivityPage() {
  const { id: leagueId } = useParams<{ id: string }>();
  const [events, setEvents]         = useState<ActivityEvent[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [leagueName, setLeagueName] = useState("");

  useEffect(() => {
    api.leagues.get(leagueId).then((l) => setLeagueName(l.name)).catch(() => {});
    api.activity.feed(leagueId)
      .then(setEvents)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [leagueId]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="border-b border-[#1a1a1a] px-4 sm:px-6 py-4 flex items-center gap-2 sm:gap-4 flex-wrap">
        <Link href="/dashboard" className="text-zinc-600 hover:text-zinc-300 transition-colors text-sm">
          ← Mis ligas
        </Link>
        <span className="text-[#2a2a2a] hidden sm:inline">/</span>
        <span className="text-sm text-white font-medium truncate max-w-[120px] sm:max-w-none">
          {leagueName}
        </span>
        <span className="text-[#2a2a2a] hidden sm:inline">/</span>
        <span className="text-sm text-amber-400 font-medium">Actividad</span>
        <div className="flex items-center gap-3 ml-auto flex-wrap">
          <Link href={`/leagues/${leagueId}/lineup`}    className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm whitespace-nowrap">Mi equipo</Link>
          <Link href={`/leagues/${leagueId}/market`}    className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm whitespace-nowrap">Mercado</Link>
          <Link href={`/leagues/${leagueId}/standings`} className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm whitespace-nowrap">Clasificación</Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <h1 className="text-xl sm:text-2xl font-bold mb-6">Actividad reciente</h1>

        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 bg-[#111111] border border-[#1a1a1a] rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {error && <p className="text-zinc-500 text-sm text-center py-20">{error}</p>}

        {!loading && !error && events.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-zinc-700" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-zinc-400 font-medium mb-2">Sin actividad todavía</p>
            <p className="text-zinc-600 text-sm">Los fichajes y ventas aparecerán aquí.</p>
          </div>
        )}

        {!loading && !error && events.length > 0 && (
          <div className="space-y-2">
            {events.map((e) => {
              const config = TYPE_CONFIG[e.type] ?? TYPE_CONFIG.buy;
              const roleColor = ROLE_COLORS[e.player_role] ?? ROLE_COLORS.coach;
              return (
                <div
                  key={e.id}
                  className="flex items-center gap-3 bg-[#111111] border border-[#1a1a1a] hover:border-[#2a2a2a] rounded-xl px-4 py-3 transition-all duration-150"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${config.color}`}>
                    {config.icon}
                  </div>

                  <div className="w-9 h-9 rounded-full overflow-hidden bg-[#1a1a1a] flex-shrink-0 flex items-center justify-center">
                    {e.player_image_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={e.player_image_url} alt={e.player_name} className="w-full h-full object-cover object-top" />
                      : <RoleIcon role={e.player_role} className={`w-4 h-4 ${roleColor.text}`} />
                    }
                  </div>

                  <p className="flex-1 text-sm text-zinc-300 leading-snug min-w-0">
                    {config.label(e)}
                  </p>

                  <span className="text-zinc-600 text-xs flex-shrink-0 font-mono whitespace-nowrap">
                    {timeAgo(e.executed_at)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
