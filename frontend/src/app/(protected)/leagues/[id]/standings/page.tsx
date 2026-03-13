"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, type LeaderboardEntry, type MemberRoster } from "@/lib/api";
import { RoleIcon, ROLE_COLORS, ROLE_LABEL } from "@/components/RoleIcon";

const MEDAL = ["🥇", "🥈", "🥉"];

// ---------------------------------------------------------------------------
// Modal: equipo de un miembro
// ---------------------------------------------------------------------------
function TeamModal({ leagueId, memberId, memberName, onClose }: {
  leagueId: string;
  memberId: string;
  memberName: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<MemberRoster | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.leagues.memberRoster(leagueId, memberId)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [leagueId, memberId]);

  const SLOT_ORDER = ["starter_1","starter_2","starter_3","starter_4","starter_5","coach","bench_1","bench_2"];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#111111] border border-[#2a2a2a] rounded-2xl w-full max-w-sm max-h-[80vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[#1a1a1a]">
          <div>
            <p className="font-bold">{memberName}</p>
            {data && <p className="text-zinc-500 text-xs">{data.member.total_points.toFixed(1)} pts · {data.players.length} jugadores</p>}
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">✕</button>
        </div>

        {loading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-[#1a1a1a] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !data || data.players.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-sm">Sin jugadores en el equipo.</div>
        ) : (
          <div className="p-3 space-y-1.5">
            {[...data.players]
              .sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot))
              .map((rp, i) => {
                const p = rp.players;
                const rc = ROLE_COLORS[p.role] ?? ROLE_COLORS.coach;
                return (
                  <div key={i} className="flex items-center gap-3 bg-[#1a1a1a] rounded-xl px-3 py-2.5">
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-[#2a2a2a] flex-shrink-0 flex items-center justify-center">
                      {p.image_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover object-top" />
                        : <RoleIcon role={p.role} className={`w-4 h-4 ${rc.text}`} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{p.name}</p>
                      <p className="text-zinc-500 text-xs">{p.team}</p>
                    </div>
                    <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${rc.bg} ${rc.text}`}>
                      {ROLE_LABEL[p.role] ?? p.role.toUpperCase()}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function StandingsPage() {
  const { id: leagueId } = useParams<{ id: string }>();
  const [entries, setEntries]           = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [leagueName, setLeagueName]     = useState("");
  const [myMemberId, setMyMemberId]     = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    api.leagues.get(leagueId).then((l) => {
      setLeagueName(l.name);
      if (l.member) setMyMemberId(l.member.id);
    }).catch(() => {});

    api.scoring.leaderboard(leagueId)
      .then(setEntries)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [leagueId]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="border-b border-[#1a1a1a] px-4 sm:px-6 py-4 flex items-center gap-2 sm:gap-4 flex-wrap">
        <Link href="/dashboard" className="text-zinc-600 hover:text-zinc-300 transition-colors text-sm">← Mis ligas</Link>
        <span className="text-[#2a2a2a] hidden sm:inline">/</span>
        <span className="text-sm text-white font-medium truncate max-w-[120px] sm:max-w-none">{leagueName}</span>
        <span className="text-[#2a2a2a] hidden sm:inline">/</span>
        <span className="text-sm text-amber-400 font-medium">Clasificación</span>
        <div className="flex items-center gap-3 ml-auto flex-wrap">
          <Link href={`/leagues/${leagueId}/lineup`}   className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm whitespace-nowrap">Mi equipo</Link>
          <Link href={`/leagues/${leagueId}/market`}   className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm whitespace-nowrap">Mercado</Link>
          <Link href={`/leagues/${leagueId}/activity`} className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm whitespace-nowrap">Actividad</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <h1 className="text-xl sm:text-2xl font-bold mb-1">Clasificación</h1>
        <p className="text-zinc-500 text-sm mb-6">Toca un manager para ver su equipo.</p>

        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-[#111111] border border-[#1a1a1a] rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {error && <p className="text-zinc-500 text-sm text-center py-20">{error}</p>}

        {!loading && !error && entries.length === 0 && (
          <div className="py-20 text-center">
            <span className="text-4xl mb-4 block">🏆</span>
            <p className="text-zinc-400 font-medium mb-2">Sin datos aún</p>
            <p className="text-zinc-600 text-sm">Los puntos se actualizan tras cada jornada de LEC.</p>
          </div>
        )}

        {/* Podio top 3 */}
        {!loading && !error && entries.length >= 3 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {([entries[1], entries[0], entries[2]] as LeaderboardEntry[]).map((e, i) => {
              const podiumRank = [2, 1, 3][i];
              const heights = ["h-24", "h-32", "h-20"];
              const borders = [
                "border-zinc-500/30 bg-zinc-500/5",
                "border-amber-400/30 bg-amber-400/5",
                "border-orange-700/30 bg-orange-700/5",
              ];
              const isMe = e.member_id === myMemberId;
              return (
                <button
                  key={e.member_id}
                  onClick={() => setSelectedMember({ id: e.member_id, name: e.display_name ?? "Manager" })}
                  className={`flex flex-col items-center justify-end ${heights[i]} rounded-xl border ${borders[i]} pb-3 px-2 transition-all duration-200 hover:scale-[1.02] hover:brightness-110 cursor-pointer w-full`}
                >
                  <span className="text-2xl mb-1">{MEDAL[podiumRank - 1]}</span>
                  <p className={`text-xs font-bold truncate w-full text-center ${isMe ? "text-amber-400" : ""}`}>
                    {e.display_name ?? "Manager"}
                  </p>
                  <p className="font-mono text-xs text-zinc-400">{e.total_points.toFixed(1)} pts</p>
                </button>
              );
            })}
          </div>
        )}

        {/* Lista */}
        {!loading && !error && entries.length > 0 && (
          <div className="space-y-1.5">
            {entries.map((e) => {
              const isMe = e.member_id === myMemberId;
              return (
                <button
                  key={e.member_id}
                  onClick={() => setSelectedMember({ id: e.member_id, name: e.display_name ?? "Manager" })}
                  className={`flex items-center gap-3 sm:gap-4 px-4 py-3 rounded-xl border w-full text-left transition-all duration-150 hover:border-[#2a2a2a] hover:-translate-y-0.5 active:scale-[0.99]
                    ${isMe ? "bg-amber-400/5 border-amber-400/20" : "bg-[#111111] border-[#1a1a1a]"}`}
                >
                  <span className="w-7 text-center font-bold text-sm text-zinc-500 flex-shrink-0">
                    {e.rank <= 3 ? MEDAL[e.rank - 1] : e.rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm truncate ${isMe ? "text-amber-400" : "text-white"}`}>
                      {e.display_name ?? "Manager"}
                      {isMe && <span className="text-xs font-normal text-zinc-500 ml-1.5">(tú)</span>}
                    </p>
                    <p className="text-zinc-600 text-xs">{e.player_count} jugadores · toca para ver el equipo</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono text-sm font-bold">{e.total_points.toFixed(1)} pts</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      {selectedMember && (
        <TeamModal
          leagueId={leagueId}
          memberId={selectedMember.id}
          memberName={selectedMember.name}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </div>
  );
}
