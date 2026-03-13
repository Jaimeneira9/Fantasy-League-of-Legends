"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, type Roster, type RosterPlayer, type Slot, type Split } from "@/lib/api";
import { RoleIcon, ROLE_COLORS, ROLE_LABEL } from "@/components/RoleIcon";
import { PlayerStatsModal } from "@/components/PlayerStatsModal";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const STARTER_SLOTS: { slot: Slot; role: string }[] = [
  { slot: "starter_1", role: "top"     },
  { slot: "starter_2", role: "jungle"  },
  { slot: "starter_3", role: "mid"     },
  { slot: "starter_4", role: "adc"     },
  { slot: "starter_5", role: "support" },
];


// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Split reset warning banner
// ---------------------------------------------------------------------------
function SplitResetWarning({ leagueId }: { leagueId: string }) {
  const [split, setSplit] = useState<Split | null | undefined>(undefined);

  useEffect(() => {
    api.splits.active().then(setSplit).catch(() => setSplit(null));
  }, []);

  if (!split?.reset_date) return null;

  const resetDate = new Date(split.reset_date);
  const now = new Date();
  const msUntilReset = resetDate.getTime() - now.getTime();
  const hoursUntilReset = msUntilReset / (1000 * 60 * 60);

  if (hoursUntilReset > 48 || hoursUntilReset < 0) return null;

  const hoursLeft = Math.ceil(hoursUntilReset);

  return (
    <div className="mx-4 sm:mx-6 mt-4 px-4 py-3 bg-orange-500/10 border border-orange-500/30 rounded-xl animate-fade-in">
      <div className="flex items-start gap-3">
        <span className="text-orange-400 text-lg flex-shrink-0">⚠️</span>
        <div>
          <p className="text-orange-300 font-semibold text-sm">Reset de split en {hoursLeft}h</p>
          <p className="text-orange-400/70 text-xs mt-0.5">
            Los equipos se reiniciarán al comenzar el nuevo split. Puedes proteger 1 jugador para que se quede contigo.
          </p>
          <Link href={`/leagues/${leagueId}/lineup`} className="text-orange-400 text-xs underline mt-1 inline-block">
            Elegir jugador protegido →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function LineupPage() {
  const { id: leagueId } = useParams<{ id: string }>();
  const [roster, setRoster]       = useState<Roster | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [selected, setSelected]   = useState<RosterPlayer | null>(null);
  const [statsPlayer, setStatsPlayer] = useState<{ id: string; name: string; team: string; role: string; image_url: string | null } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.roster.get(leagueId)
      .then(setRoster)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [leagueId]);

  useEffect(() => { load(); }, [load]);

  const playerBySlot = (slot: Slot) => roster?.players.find((p) => p.slot === slot) ?? null;

  const handleSlotClick = async (slot: Slot) => {
    if (!roster) return;
    const target = playerBySlot(slot);
    if (!selected) { if (target) setSelected(target); return; }
    if (selected.slot === slot) { setSelected(null); return; }
    try {
      await api.roster.move(leagueId, selected.id, slot);
      setSelected(null);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al mover");
      setSelected(null);
    }
  };

  const handleSellToggle = async (rp: RosterPlayer) => {
    try {
      if (rp.for_sale) await api.roster.cancelSellIntent(leagueId, rp.id);
      else await api.roster.setSellIntent(leagueId, rp.id);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    }
  };

  const handleProtectToggle = async (rp: RosterPlayer) => {
    try {
      await api.roster.toggleProtect(leagueId, rp.id);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cambiar protección");
    }
  };

  const benchSlots: Slot[] = ["bench_1", "bench_2"];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <SplitResetWarning leagueId={leagueId} />
      {/* Header */}
      <header className="border-b border-[#1a1a1a] px-4 sm:px-6 py-4 flex items-center gap-2 sm:gap-4 flex-wrap">
        <Link href="/dashboard" className="text-zinc-600 hover:text-zinc-300 transition-colors text-sm">← Mis ligas</Link>
        <span className="text-[#2a2a2a] hidden sm:inline">/</span>
        <span className="text-sm text-white font-medium">Mi equipo</span>
        <div className="flex items-center gap-3 ml-auto flex-wrap">
          <Link href={`/leagues/${leagueId}/market`}    className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm whitespace-nowrap">Mercado</Link>
          <Link href={`/leagues/${leagueId}/standings`} className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm whitespace-nowrap hidden sm:inline">Clasificación</Link>
          <Link href={`/leagues/${leagueId}/activity`}  className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm whitespace-nowrap hidden sm:inline">Actividad</Link>
          {roster && (
            <div className="flex items-center gap-3 text-sm">
              <span className="font-mono text-amber-400 font-semibold">{roster.remaining_budget.toFixed(1)}M</span>
              <span className="font-mono text-zinc-400">{roster.total_points.toFixed(0)} pts</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Banner de movimiento */}
        {selected && (
          <div className="mb-5 px-4 py-3 bg-amber-400/10 border border-amber-400/30 rounded-xl text-sm text-amber-300 flex items-center justify-between animate-fade-in">
            <span>Moviendo <strong>{selected.player.name}</strong> — toca el slot de destino</span>
            <button onClick={() => setSelected(null)} className="text-amber-400/60 hover:text-amber-300 ml-4 transition-colors">✕ Cancelar</button>
          </div>
        )}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>
        )}

        {loading ? (
          <LineupSkeleton />
        ) : !roster || roster.players.length === 0 ? (
          <EmptyRoster leagueId={leagueId} />
        ) : (
          <>
            {/* ── Titulares ── */}
            <section>
              <h2 className="text-xs text-zinc-600 uppercase tracking-widest mb-3 font-semibold">Titulares</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {STARTER_SLOTS.map(({ slot, role }) => {
                  const rp = playerBySlot(slot);
                  return (
                    <PlayerCard
                      key={slot}
                      expectedRole={role}
                      rp={rp}
                      isSelected={selected?.slot === slot}
                      isTarget={!!selected && selected.slot !== slot}
                      onClick={() => handleSlotClick(slot)}
                      onSellToggle={rp ? () => handleSellToggle(rp) : undefined}
                      onShowStats={rp ? () => setStatsPlayer({ id: rp.player.id, name: rp.player.name, team: rp.player.team, role: rp.player.role, image_url: rp.player.image_url }) : undefined}
                      onProtectToggle={rp ? () => handleProtectToggle(rp) : undefined}
                    />
                  );
                })}
              </div>
            </section>

            {/* ── Entrenador ── */}
            <section className="mt-5">
              <h2 className="text-xs text-zinc-600 uppercase tracking-widest mb-3 font-semibold">Entrenador</h2>
              <div className="max-w-xs">
                {(() => {
                  const rp = playerBySlot("coach");
                  return (
                    <PlayerCard
                      expectedRole="coach"
                      rp={rp}
                      isSelected={selected?.slot === "coach"}
                      isTarget={!!selected && selected.slot !== "coach"}
                      onClick={() => handleSlotClick("coach")}
                      onSellToggle={rp ? () => handleSellToggle(rp) : undefined}
                      onShowStats={rp ? () => setStatsPlayer({ id: rp.player.id, name: rp.player.name, team: rp.player.team, role: rp.player.role, image_url: rp.player.image_url }) : undefined}
                      onProtectToggle={rp ? () => handleProtectToggle(rp) : undefined}
                    />
                  );
                })()}
              </div>
            </section>

            {/* ── Suplentes ── */}
            <section className="mt-5">
              <h2 className="text-xs text-zinc-600 uppercase tracking-widest mb-3 font-semibold">Suplentes</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {benchSlots.map((slot) => {
                  const rp = playerBySlot(slot);
                  return (
                    <PlayerCard
                      key={slot}
                      expectedRole="bench"
                      rp={rp}
                      isSelected={selected?.slot === slot}
                      isTarget={!!selected && selected.slot !== slot}
                      onClick={() => handleSlotClick(slot)}
                      onSellToggle={rp ? () => handleSellToggle(rp) : undefined}
                      onShowStats={rp ? () => setStatsPlayer({ id: rp.player.id, name: rp.player.name, team: rp.player.team, role: rp.player.role, image_url: rp.player.image_url }) : undefined}
                      onProtectToggle={rp ? () => handleProtectToggle(rp) : undefined}
                    />
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Modal de stats */}
      {statsPlayer && (
        <PlayerStatsModal
          playerId={statsPlayer.id}
          playerHint={{ name: statsPlayer.name, team: statsPlayer.team, role: statsPlayer.role, image_url: statsPlayer.image_url }}
          onClose={() => setStatsPlayer(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PlayerCard — ficha tipo trading card vertical
// ---------------------------------------------------------------------------
function PlayerCard({
  expectedRole,
  rp,
  isSelected,
  isTarget,
  onClick,
  onSellToggle,
  onShowStats,
  onProtectToggle,
}: {
  expectedRole: string;
  rp: RosterPlayer | null;
  isSelected: boolean;
  isTarget: boolean;
  onClick: () => void;
  onSellToggle?: () => void;
  onShowStats?: () => void;
  onProtectToggle?: () => void;
}) {
  const roleColor = ROLE_COLORS[expectedRole] ?? ROLE_COLORS.coach;

  // Slot vacío
  if (!rp) {
    return (
      <button
        onClick={onClick}
        className={`relative w-full aspect-[3/4] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all duration-200
          ${isTarget
            ? "border-amber-400/50 bg-amber-400/5 hover:bg-amber-400/10 scale-[1.02]"
            : `${roleColor.border} bg-[#0d0d0d] hover:bg-[#111] opacity-60 hover:opacity-90`
          }`}
      >
        <div className={`p-2 rounded-lg ${roleColor.bg}`}>
          <RoleIcon role={expectedRole} className={`w-6 h-6 ${roleColor.text}`} />
        </div>
        <span className={`text-xs font-bold ${isTarget ? "text-amber-400" : roleColor.text}`}>
          {isTarget ? "Mover aquí" : (ROLE_LABEL[expectedRole] ?? "BENCH")}
        </span>
      </button>
    );
  }

  const p = rp.player;
  const rc = ROLE_COLORS[p.role] ?? ROLE_COLORS.coach;

  return (
    <div
      className={`group relative w-full aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all duration-200 flex flex-col
        ${isSelected
          ? "border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.2)] scale-[1.02]"
          : isTarget
            ? "border-amber-400/40 hover:border-amber-400/70 cursor-pointer scale-[1.01] hover:scale-[1.03]"
            : `border-[#1a1a1a] hover:border-[#2a2a2a] cursor-pointer hover:scale-[1.02] hover:-translate-y-0.5`
        }`}
    >
      {/* Foto — ocupa casi todo el card */}
      <div className="absolute inset-0 bg-[#0d0d0d]">
        {p.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.image_url} alt={p.name}
            className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <RoleIcon role={p.role} className={`w-16 h-16 ${rc.text} opacity-10`} />
          </div>
        )}
        {/* Gradiente inferior pronunciado */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
      </div>

      {/* Badge rol — esquina superior izquierda */}
      <div className={`absolute top-2 left-2 flex items-center gap-1 px-1.5 py-1 rounded-lg ${rc.bg} border ${rc.border} backdrop-blur-sm`}>
        <RoleIcon role={p.role} className={`w-3 h-3 ${rc.text}`} />
        <span className={`text-[9px] font-black ${rc.text}`}>{ROLE_LABEL[p.role] ?? p.role.toUpperCase()}</span>
      </div>

      {/* Precio — esquina superior derecha */}
      <div className="absolute top-2 right-2 font-mono text-amber-400 text-[10px] font-bold bg-black/70 px-1.5 py-0.5 rounded-md backdrop-blur-sm">
        {p.current_price.toFixed(1)}M
      </div>

      {/* Badge venta */}
      {rp.for_sale && (
        <div className="absolute top-8 right-2 text-[9px] text-orange-400 bg-orange-400/20 border border-orange-400/30 px-1.5 py-0.5 rounded-md font-semibold">
          venta
        </div>
      )}

      {/* Badge protegido */}
      {rp.is_protected && (
        <div className="absolute top-2 right-10 text-[11px] bg-sky-500/20 border border-sky-400/40 px-1.5 py-0.5 rounded-md">
          🛡
        </div>
      )}

      {/* Seleccionado overlay */}
      {isSelected && (
        <div className="absolute inset-0 bg-amber-400/10 pointer-events-none" />
      )}

      {/* Info inferior */}
      <div className="absolute bottom-0 inset-x-0 p-3" onClick={onClick}>
        <p className="font-black text-sm leading-tight truncate">{p.name}</p>
        <p className="text-zinc-400 text-[11px] truncate">{p.team}</p>
      </div>

      {/* Botones acción — aparecen en hover */}
      <div className="absolute bottom-0 inset-x-0 translate-y-full group-hover:translate-y-0 transition-transform duration-200 flex flex-wrap gap-1 p-2 bg-black/90">
        <button
          onClick={(e) => { e.stopPropagation(); onShowStats?.(); }}
          className="flex-1 py-1.5 text-[10px] font-semibold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all active:scale-95"
        >
          Stats
        </button>
        {onProtectToggle && (
          <button
            onClick={(e) => { e.stopPropagation(); onProtectToggle(); }}
            title={rp.is_protected ? "Quitar protección" : "Proteger para el reset de split"}
            className={`py-1.5 px-2 text-[10px] font-semibold rounded-lg transition-all active:scale-95
              ${rp.is_protected
                ? "text-sky-300 bg-sky-500/20 hover:bg-sky-500/30"
                : "text-zinc-500 bg-zinc-800 hover:bg-zinc-700 hover:text-zinc-300"
              }`}
          >
            🛡
          </button>
        )}
        {onSellToggle && (
          <button
            onClick={(e) => { e.stopPropagation(); onSellToggle(); }}
            className={`flex-1 py-1.5 text-[10px] font-semibold rounded-lg transition-all active:scale-95
              ${rp.for_sale
                ? "text-orange-400 bg-orange-400/20 hover:bg-orange-400/30"
                : "text-zinc-400 bg-zinc-800 hover:bg-zinc-700"
              }`}
          >
            {rp.for_sale ? "✕ Venta" : "Vender"}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeletons & Empty
// ---------------------------------------------------------------------------
function LineupSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-3 w-16 bg-[#1a1a1a] rounded mb-3 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-[#111111] border border-[#1a1a1a] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
      <div>
        <div className="h-3 w-20 bg-[#1a1a1a] rounded mb-3 animate-pulse" />
        <div className="max-w-xs aspect-[3/4] bg-[#111111] border border-[#1a1a1a] rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

function EmptyRoster({ leagueId }: { leagueId: string }) {
  return (
    <div className="py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mx-auto mb-4">
        <RoleIcon role="support" className="w-7 h-7 text-zinc-700" />
      </div>
      <p className="text-zinc-400 font-semibold mb-2">Tu equipo está vacío</p>
      <p className="text-zinc-600 text-sm mb-6">Ve al mercado y ficha a tus primeros jugadores.</p>
      <Link
        href={`/leagues/${leagueId}/market`}
        className="inline-block px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-black font-bold text-sm rounded-xl transition-all active:scale-95"
      >
        Ir al mercado →
      </Link>
    </div>
  );
}
