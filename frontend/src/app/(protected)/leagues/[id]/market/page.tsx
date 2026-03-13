"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, type Listing, type SellOffer, type MyBid } from "@/lib/api";
import { RoleIcon, ROLE_COLORS, ROLE_LABEL } from "@/components/RoleIcon";
import { PlayerStatsModal } from "@/components/PlayerStatsModal";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
type Tab = "mercado" | "mis-pujas" | "ofertas";

// ---------------------------------------------------------------------------
// Hook countdown
// ---------------------------------------------------------------------------
function useCountdown(closesAt: string | null | undefined): string {
  const [label, setLabel] = useState("");
  useEffect(() => {
    if (!closesAt) return;
    const update = () => {
      const diff = new Date(closesAt).getTime() - Date.now();
      if (diff <= 0) { setLabel("Cerrado"); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setLabel(`${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [closesAt]);
  return label;
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------
export default function MarketPage() {
  const { id: leagueId } = useParams<{ id: string }>();
  const [tab, setTab]               = useState<Tab>("mercado");
  const [budget, setBudget]         = useState<number | null>(null);
  const [leagueName, setLeagueName] = useState("");
  const [statsPlayer, setStatsPlayer] = useState<{ id: string; name: string; team: string; role: string; image_url: string | null } | null>(null);

  useEffect(() => {
    api.leagues.get(leagueId).then((l) => {
      setLeagueName(l.name);
      if (l.member) setBudget(l.member.remaining_budget);
    }).catch(() => {});
  }, [leagueId]);

  const refreshBudget = useCallback(() => {
    api.leagues.get(leagueId)
      .then((l) => l.member && setBudget(l.member.remaining_budget))
      .catch(() => {});
  }, [leagueId]);

  const TABS: { key: Tab; label: string }[] = [
    { key: "mercado",   label: "Mercado"   },
    { key: "mis-pujas", label: "Mis pujas" },
    { key: "ofertas",   label: "Ofertas"   },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-[#1a1a1a] px-4 sm:px-6 py-4 flex items-center gap-2 sm:gap-3 flex-wrap">
        <Link href="/dashboard" className="text-zinc-600 hover:text-zinc-300 transition-colors text-sm whitespace-nowrap">
          ← Mis ligas
        </Link>
        <span className="text-[#2a2a2a] hidden sm:inline">/</span>
        <span className="text-sm text-white font-medium truncate max-w-[100px] sm:max-w-none">
          {leagueName || "Mercado"}
        </span>
        <div className="flex items-center gap-2 sm:gap-3 ml-auto flex-wrap">
          <Link href={`/leagues/${leagueId}/lineup`}    className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm whitespace-nowrap">Mi equipo</Link>
          <Link href={`/leagues/${leagueId}/standings`} className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm whitespace-nowrap hidden sm:inline">Clasificación</Link>
          <Link href={`/leagues/${leagueId}/activity`}  className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm whitespace-nowrap hidden sm:inline">Actividad</Link>
          {budget !== null && (
            <span className="font-mono text-amber-400 text-sm font-semibold">{budget.toFixed(1)}M</span>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-[#1a1a1a] px-4 sm:px-6">
        <nav className="flex gap-0 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 sm:px-4 py-3 text-xs sm:text-sm border-b-2 transition-colors -mb-px whitespace-nowrap ${
                tab === t.key
                  ? "border-amber-400 text-white font-medium"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenido */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {tab === "mercado"   && <MarketTab  leagueId={leagueId} onBid={refreshBudget} onShowStats={setStatsPlayer} />}
        {tab === "mis-pujas" && <MyBidsTab  leagueId={leagueId} />}
        {tab === "ofertas"   && <OffersTab  leagueId={leagueId} />}
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
// Tab Mercado
// ---------------------------------------------------------------------------
type StatsTarget = { id: string; name: string; team: string; role: string; image_url: string | null };

function MarketTab({ leagueId, onBid, onShowStats }: { leagueId: string; onBid: () => void; onShowStats: (t: StatsTarget) => void }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.market.listings(leagueId)
      .then(setListings)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [leagueId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <CardSkeleton />;
  if (error)   return <ErrorState message={error} onRetry={load} />;
  if (listings.length === 0) return (
    <EmptyState
      title="El mercado está vacío"
      description="No hay jugadores disponibles hoy. El mercado abre a medianoche con una ventana de 24 horas."
    />
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
      {listings.map((l) => (
        <PlayerCard key={l.id} listing={l} leagueId={leagueId} onBid={() => { onBid(); load(); }} onShowStats={onShowStats} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ficha de jugador — estilo trading card
// ---------------------------------------------------------------------------
function PlayerCard({ listing, leagueId, onBid, onShowStats }: { listing: Listing; leagueId: string; onBid: () => void; onShowStats: (t: StatsTarget) => void }) {
  const [expanded, setExpanded]   = useState(false);
  const [bidAmount, setBidAmount] = useState(listing.ask_price.toFixed(1));
  const [busy, setBusy]           = useState(false);
  const [err, setErr]             = useState<string | null>(null);
  const [success, setSuccess]     = useState(false);
  const inputRef  = useRef<HTMLInputElement>(null);
  const countdown = useCountdown(listing.closes_at);
  const roleColor = ROLE_COLORS[listing.players.role] ?? ROLE_COLORS.coach;
  const closed    = countdown === "Cerrado";

  const handleBid = async () => {
    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount <= 0) { setErr("Cantidad inválida"); return; }
    setBusy(true); setErr(null);
    try {
      await api.bids.place(leagueId, listing.id, amount);
      setSuccess(true);
      setExpanded(false);
      setTimeout(() => setSuccess(false), 3000);
      onBid();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error al pujar");
    } finally { setBusy(false); }
  };

  const p = listing.players;

  return (
    <div
      className={`group relative bg-[#111111] border rounded-xl overflow-hidden transition-all duration-200 flex flex-col
        ${success
          ? "border-green-500/40 shadow-[0_0_16px_rgba(34,197,94,0.08)]"
          : "border-[#1a1a1a] hover:border-[#2a2a2a] hover:shadow-[0_0_24px_rgba(251,191,36,0.04)]"}
        hover:scale-[1.02] hover:-translate-y-0.5`}
    >
      {/* Foto — proporción 3:4 */}
      <div className="relative w-full aspect-[3/4] overflow-hidden bg-[#0d0d0d] flex-shrink-0">
        {p.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.image_url}
            alt={p.name}
            className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <RoleIcon role={p.role} className={`w-16 h-16 ${roleColor.text} opacity-10`} />
          </div>
        )}

        {/* Gradiente inferior sobre la foto */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-transparent to-transparent" />

        {/* Icono de rol — esquina superior izquierda */}
        <div className={`absolute top-2 left-2 p-1.5 rounded-lg ${roleColor.bg} ${roleColor.border} border backdrop-blur-sm`}>
          <RoleIcon role={p.role} className={`w-3.5 h-3.5 ${roleColor.text}`} />
        </div>

        {/* Precio — esquina superior derecha */}
        <div className="absolute top-2 right-2 font-mono text-amber-400 text-[11px] font-bold bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded-md">
          {listing.ask_price.toFixed(1)}M
        </div>

        {/* Overlay éxito */}
        {success && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="text-green-400 text-center">
              <svg className="w-10 h-10 mx-auto mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-xs font-semibold">Puja enviada</p>
            </div>
          </div>
        )}
      </div>

      {/* Datos del jugador */}
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-bold text-sm truncate leading-tight">{p.name}</h3>
        <div className="flex items-center justify-between mt-0.5 gap-1">
          <span className="text-zinc-500 text-xs truncate">{p.team}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${roleColor.bg} ${roleColor.text}`}>
            {ROLE_LABEL[p.role] ?? p.role.toUpperCase()}
          </span>
        </div>

        {/* Countdown */}
        {listing.closes_at && !closed && countdown && (
          <p className="text-zinc-600 text-[10px] mt-1 font-mono">⏱ {countdown}</p>
        )}
        {closed && <p className="text-red-500/60 text-[10px] mt-1">Cerrado</p>}

        {/* Botones */}
        <div className="mt-2 flex-1 flex flex-col justify-end gap-1.5">
          <button
            onClick={() => onShowStats({ id: listing.player_id, name: p.name, team: p.team, role: p.role, image_url: p.image_url })}
            className="w-full py-1.5 text-xs rounded-lg border border-[#222] text-zinc-500 hover:border-zinc-600 hover:text-zinc-300 transition-all duration-150 active:scale-95"
          >
            Ver stats
          </button>
          {!expanded ? (
            <button
              onClick={() => { setExpanded(true); setTimeout(() => inputRef.current?.focus(), 50); }}
              disabled={closed}
              className={`w-full py-1.5 text-xs rounded-lg border transition-all duration-150 active:scale-95
                ${success
                  ? "border-green-500/40 text-green-400"
                  : closed
                    ? "border-[#1a1a1a] text-zinc-700 cursor-not-allowed"
                    : "border-[#222] text-zinc-500 hover:border-amber-400/40 hover:text-amber-400 hover:bg-amber-400/5"
                }`}
            >
              {success ? "✓ Puja enviada" : closed ? "Cerrado" : "Pujar"}
            </button>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1">
                <input
                  ref={inputRef}
                  type="number"
                  step="0.5"
                  min={listing.ask_price}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="flex-1 min-w-0 bg-[#0a0a0a] border border-[#2a2a2a] focus:border-amber-400/50 text-white text-xs rounded px-2 py-1.5 outline-none transition-colors"
                />
                <span className="text-zinc-600 text-xs flex-shrink-0">M</span>
              </div>
              {err && <p className="text-red-400 text-[10px]">{err}</p>}
              <div className="flex gap-1.5">
                <button
                  onClick={() => { setExpanded(false); setErr(null); }}
                  className="flex-1 py-1 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  ✕
                </button>
                <button
                  onClick={handleBid}
                  disabled={busy}
                  className="flex-[2] py-1.5 text-xs bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-black font-bold rounded-lg transition-all active:scale-95"
                >
                  {busy ? "…" : "Confirmar"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab Mis Pujas
// ---------------------------------------------------------------------------
function MyBidsTab({ leagueId }: { leagueId: string }) {
  const [bids, setBids]       = useState<MyBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.bids.myBids(leagueId)
      .then(setBids)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [leagueId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <ListSkeleton rows={3} />;
  if (error)   return <ErrorState message={error} onRetry={load} />;
  if (bids.length === 0) return (
    <EmptyState
      title="Sin pujas activas"
      description="Visita el mercado y haz una puja. El ganador se conoce al cierre (medianoche)."
    />
  );

  return (
    <div className="space-y-2">
      {bids.map((b) => <BidRow key={b.id} bid={b} leagueId={leagueId} onCancel={load} />)}
    </div>
  );
}

function BidRow({ bid, leagueId, onCancel }: { bid: MyBid; leagueId: string; onCancel: () => void }) {
  const [busy, setBusy] = useState(false);
  const countdown       = useCountdown(bid.status === "active" ? bid.listing_closes_at : null);
  const roleColor       = ROLE_COLORS[bid.player_role] ?? ROLE_COLORS.coach;

  const handleCancel = async () => {
    setBusy(true);
    try { await api.bids.cancel(leagueId, bid.listing_id); onCancel(); }
    catch { /* ignore */ }
    finally { setBusy(false); }
  };

  return (
    <div className={`flex items-center gap-3 sm:gap-4 bg-[#111111] border rounded-xl px-4 py-3 transition-all duration-150
      ${bid.status === "won" ? "border-green-500/30" : bid.status === "lost" ? "border-zinc-700/50" : "border-[#1a1a1a] hover:border-[#2a2a2a]"}`}>
      <div className="w-10 h-10 rounded-full overflow-hidden bg-[#1a1a1a] flex-shrink-0 flex items-center justify-center">
        {bid.player_image_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={bid.player_image_url} alt={bid.player_name} className="w-full h-full object-cover object-top" />
          : <RoleIcon role={bid.player_role} className={`w-5 h-5 ${roleColor.text}`} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm truncate">{bid.player_name}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${roleColor.bg} ${roleColor.text}`}>
            {ROLE_LABEL[bid.player_role] ?? bid.player_role.toUpperCase()}
          </span>
        </div>
        <p className="text-zinc-500 text-xs">{bid.player_team}</p>
        {bid.status === "active" && bid.listing_closes_at && countdown && countdown !== "Cerrado" && (
          <p className="text-zinc-600 text-[10px] mt-0.5 font-mono">⏱ {countdown}</p>
        )}
      </div>
      <div className="text-right flex-shrink-0 mr-2">
        <p className="font-mono text-amber-400 text-sm font-semibold">{bid.bid_amount.toFixed(1)}M</p>
        <p className="text-zinc-600 text-[10px]">tu puja</p>
      </div>
      {bid.status === "won" && (
        <span className="px-2.5 py-1 text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg flex-shrink-0">
          ✓ Ganada
        </span>
      )}
      {bid.status === "lost" && (
        <span className="px-2.5 py-1 text-xs font-bold text-zinc-500 bg-zinc-800/50 border border-zinc-700/40 rounded-lg flex-shrink-0">
          ✗ Perdida
        </span>
      )}
      {bid.status === "active" && (
        <button
          onClick={handleCancel}
          disabled={busy || countdown === "Cerrado"}
          className="px-3 py-1.5 text-xs text-zinc-500 border border-[#2a2a2a] hover:border-red-500/40 hover:text-red-400 rounded-lg transition-all disabled:opacity-40 active:scale-95 flex-shrink-0"
        >
          {busy ? "…" : "Cancelar"}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab Ofertas
// ---------------------------------------------------------------------------
function OffersTab({ leagueId }: { leagueId: string }) {
  const [offers, setOffers]   = useState<SellOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.market.sellOffers(leagueId)
      .then(setOffers)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [leagueId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <ListSkeleton rows={3} />;
  if (error)   return <ErrorState message={error} onRetry={load} />;
  if (offers.length === 0) return (
    <EmptyState
      title="Sin ofertas pendientes"
      description="Cuando marques un jugador para venta, el sistema te enviará una oferta aquí."
    />
  );

  return (
    <div className="space-y-2">
      {offers.map((o) => <OfferRow key={o.id} offer={o} leagueId={leagueId} onAction={load} />)}
    </div>
  );
}

function OfferRow({ offer, leagueId, onAction }: { offer: SellOffer; leagueId: string; onAction: () => void }) {
  const [busy, setBusy] = useState<"accept" | "reject" | null>(null);
  const [err, setErr]   = useState<string | null>(null);
  const roleColor = ROLE_COLORS[offer.player.role] ?? ROLE_COLORS.coach;
  const expiresIn = Math.ceil((new Date(offer.expires_at).getTime() - Date.now()) / 86_400_000);

  const handle = async (action: "accept" | "reject") => {
    setBusy(action); setErr(null);
    try {
      if (action === "accept") await api.market.acceptOffer(leagueId, offer.id);
      else await api.market.rejectOffer(leagueId, offer.id);
      onAction();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally { setBusy(null); }
  };

  const p = offer.player;
  return (
    <div className="flex items-center gap-3 sm:gap-4 bg-[#111111] border border-[#1a1a1a] hover:border-[#2a2a2a] rounded-xl px-4 py-3 transition-all duration-150">
      <div className="w-10 h-10 rounded-full overflow-hidden bg-[#1a1a1a] flex-shrink-0 flex items-center justify-center">
        {p.image_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover object-top" />
          : <RoleIcon role={p.role} className={`w-5 h-5 ${roleColor.text}`} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm truncate">{p.name}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${roleColor.bg} ${roleColor.text}`}>
            {ROLE_LABEL[p.role] ?? p.role.toUpperCase()}
          </span>
        </div>
        <p className="text-zinc-500 text-xs">{p.team}</p>
      </div>
      <div className="text-right flex-shrink-0 mr-1">
        <p className="font-mono text-amber-400 text-sm font-semibold">{offer.ask_price.toFixed(1)}M</p>
        <p className="text-zinc-600 text-xs">{expiresIn > 0 ? `${expiresIn}d` : "hoy"}</p>
      </div>
      {err && <span className="text-red-400 text-xs">{err}</span>}
      <div className="flex gap-2 flex-shrink-0">
        <button onClick={() => handle("reject")} disabled={busy !== null}
          className="px-2 sm:px-3 py-1.5 text-xs text-zinc-500 border border-[#2a2a2a] hover:border-red-500/40 hover:text-red-400 rounded-lg transition-all disabled:opacity-40 active:scale-95">
          {busy === "reject" ? "…" : "Rechazar"}
        </button>
        <button onClick={() => handle("accept")} disabled={busy !== null}
          className="px-2 sm:px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all disabled:opacity-40 font-semibold active:scale-95">
          {busy === "accept" ? "…" : "Aceptar"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared UI
// ---------------------------------------------------------------------------
function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mx-auto mb-4">
        <svg className="w-7 h-7 text-zinc-700" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
      <p className="text-white font-semibold mb-2">{title}</p>
      <p className="text-zinc-500 text-sm max-w-sm mx-auto">{description}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="py-20 text-center">
      <p className="text-zinc-500 text-sm mb-4">{message}</p>
      <button onClick={onRetry}
        className="text-sm text-zinc-400 hover:text-white border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-lg px-4 py-2 transition-all active:scale-95">
        Reintentar
      </button>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="bg-[#111111] border border-[#1a1a1a] rounded-xl overflow-hidden animate-pulse">
          <div className="w-full aspect-[3/4] bg-[#1a1a1a]" />
          <div className="p-3 space-y-2">
            <div className="h-3.5 bg-[#1a1a1a] rounded w-3/4" />
            <div className="h-3 bg-[#1a1a1a] rounded w-1/2" />
            <div className="h-7 bg-[#1a1a1a] rounded mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 bg-[#111111] border border-[#1a1a1a] rounded-xl animate-pulse" />
      ))}
    </div>
  );
}
