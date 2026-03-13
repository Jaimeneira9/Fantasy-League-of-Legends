"use client";

import { useEffect, useState } from "react";
import { api, type PlayerSplitHistory } from "@/lib/api";
import { ROLE_COLORS, ROLE_LABEL } from "@/components/RoleIcon";

type PlayerStats = {
  player: {
    id: string;
    name: string;
    team: string;
    role: string;
    image_url: string | null;
    current_price: number;
  };
  stats: {
    kills: number;
    deaths: number;
    assists: number;
    cs: number;
    vision_score: number;
    fantasy_points: number;
    matches?: { scheduled_at: string; team_1: string; team_2: string };
  }[];
  total_points: number;
};

type StatsTab = "splits" | "matches";

function StatCell({ label, value, color = "text-zinc-300" }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-[#111] rounded-lg px-1.5 py-1.5">
      <p className={`font-mono text-xs font-bold truncate ${color}`}>{value}</p>
      <p className="text-zinc-600 text-[9px] mt-0.5">{label}</p>
    </div>
  );
}

type PlayerHint = { name: string; team?: string; role?: string; image_url?: string | null };

export function PlayerStatsModal({
  playerId,
  playerHint,
  onClose,
}: {
  playerId: string;
  playerHint?: PlayerHint;
  onClose: () => void;
}) {
  const [data, setData] = useState<PlayerStats | null>(null);
  const [splitHistory, setSplitHistory] = useState<PlayerSplitHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<StatsTab>("splits");

  useEffect(() => {
    Promise.all([
      api.scoring.playerHistory(playerId).catch(() => null),
      api.splits.playerHistory(playerId).catch(() => []),
    ]).then(([matchData, splitData]) => {
      setData(matchData);
      setSplitHistory(splitData as PlayerSplitHistory[]);
    }).finally(() => setLoading(false));
  }, [playerId]);

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#111111] border border-[#2a2a2a] rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="p-8 text-center text-zinc-500 text-sm">Cargando estadísticas…</div>
        ) : !data && splitHistory.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-sm">Sin datos disponibles</div>
        ) : (
          <>
            {/* Header con foto */}
            {(() => {
              const name      = data?.player.name      ?? playerHint?.name      ?? "";
              const team      = data?.player.team      ?? playerHint?.team      ?? "";
              const role      = data?.player.role      ?? playerHint?.role      ?? "";
              const image_url = data?.player.image_url ?? playerHint?.image_url ?? null;
              const rc = role ? (ROLE_COLORS[role] ?? ROLE_COLORS.coach) : null;
              return (
            <div className="relative h-40 overflow-hidden rounded-t-2xl bg-[#0d0d0d]">
              {image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image_url}
                  alt={name}
                  className="w-full h-full object-cover object-top opacity-60"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/40 to-transparent" />
              <div className="absolute bottom-4 left-4">
                <p className="text-xl font-black">{name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-zinc-400 text-sm">{team}</span>
                  {rc && role && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${rc.bg} ${rc.text}`}>
                      {ROLE_LABEL[role] ?? role.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="absolute top-3 right-3 text-zinc-500 hover:text-white transition-colors text-lg"
              >
                ✕
              </button>
            </div>
              );
            })()}

            <div className="p-4">
              {/* Totales */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-[#1a1a1a] rounded-xl p-3 text-center">
                  <p className="font-mono text-amber-400 text-2xl font-black">
                    {(data?.total_points ?? 0).toFixed(1)}
                  </p>
                  <p className="text-zinc-500 text-xs mt-0.5">pts totales</p>
                </div>
                <div className="bg-[#1a1a1a] rounded-xl p-3 text-center">
                  <p className="font-mono text-white text-2xl font-black">{data?.stats.length ?? 0}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">partidas</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-4 bg-[#0d0d0d] rounded-lg p-1">
                <button
                  onClick={() => setTab("splits")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    tab === "splits" ? "bg-[#1a1a1a] text-white" : "text-zinc-600 hover:text-zinc-400"
                  }`}
                >
                  Por split
                </button>
                <button
                  onClick={() => setTab("matches")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    tab === "matches" ? "bg-[#1a1a1a] text-white" : "text-zinc-600 hover:text-zinc-400"
                  }`}
                >
                  Partidas
                </button>
              </div>

              {/* Tab: splits históricos */}
              {tab === "splits" && (
                splitHistory.length === 0 ? (
                  <p className="text-zinc-600 text-sm text-center py-4">Sin historial de splits.</p>
                ) : (
                  <div className="space-y-4">
                    {splitHistory.map((s) => {
                      const winPct = s.games_played > 0
                        ? Math.round((s.wins / s.games_played) * 100)
                        : 0;
                      return (
                        <div key={s.split_id} className="bg-[#1a1a1a] rounded-xl overflow-hidden">
                          <div className="px-3 py-2 bg-[#222] flex items-center justify-between">
                            <p className="text-xs font-bold text-zinc-200">{s.split_name}</p>
                            <span className="text-[10px] text-zinc-500">
                              {s.games_played} partidas · {winPct}% victorias
                            </span>
                          </div>
                          <div className="px-3 pt-2.5 pb-1">
                            <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1.5">Combate</p>
                            <div className="grid grid-cols-4 gap-1.5 text-center">
                              <StatCell label="K/D/A" value={`${s.kills}/${s.deaths}/${s.assists}`} color="text-amber-400" />
                              <StatCell label="KDA" value={s.kda != null ? s.kda.toFixed(2) : "—"} color="text-green-400" />
                              <StatCell label="KP%" value={s.kill_participation != null ? `${(s.kill_participation * 100).toFixed(0)}%` : "—"} />
                              <StatCell label="DMG%" value={s.damage_pct != null ? `${(s.damage_pct * 100).toFixed(0)}%` : "—"} />
                            </div>
                          </div>
                          <div className="px-3 pt-1 pb-2.5">
                            <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1.5">Economía</p>
                            <div className="grid grid-cols-3 gap-1.5 text-center">
                              <StatCell label="DPM" value={s.dpm != null ? Math.round(s.dpm).toString() : "—"} color="text-red-400" />
                              <StatCell label="CS/min" value={s.cspm != null ? s.cspm.toFixed(1) : "—"} />
                              <StatCell label="WPM" value={s.wards_per_min != null ? s.wards_per_min.toFixed(2) : "—"} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              {/* Tab: historial de partidas */}
              {tab === "matches" && (
                !data || data.stats.length === 0 ? (
                  <p className="text-zinc-600 text-sm text-center py-4">Sin partidas registradas aún.</p>
                ) : (
                  <div className="space-y-2">
                    {data.stats.map((s, i) => (
                      <div key={i} className="flex items-center gap-3 bg-[#1a1a1a] rounded-lg px-3 py-2.5">
                        <div className="flex gap-1.5 text-sm font-mono flex-shrink-0">
                          <span className="text-green-400">{s.kills}</span>
                          <span className="text-zinc-600">/</span>
                          <span className="text-red-400">{s.deaths}</span>
                          <span className="text-zinc-600">/</span>
                          <span className="text-blue-400">{s.assists}</span>
                        </div>
                        <div className="flex-1 text-xs text-zinc-500 min-w-0">
                          <span className="text-zinc-400">{s.cs} CS</span>
                          {s.vision_score ? <span className="ml-2">{s.vision_score} vis</span> : null}
                        </div>
                        <div className="font-mono text-amber-400 text-sm font-bold flex-shrink-0">
                          {(s.fantasy_points ?? 0).toFixed(1)}pts
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
