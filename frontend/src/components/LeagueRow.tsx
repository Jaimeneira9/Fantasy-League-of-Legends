"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, type League } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

export function LeagueRow({ league }: { league: League }) {
  const router = useRouter();
  const [editingNick, setEditingNick]   = useState(false);
  const [nick, setNick]                 = useState(league.member?.display_name ?? "");
  const [saving, setSaving]             = useState(false);
  const [displayName, setDisplayName]   = useState(league.member?.display_name ?? null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deleting, setDeleting]         = useState(false);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  const isOwner = currentUserId === league.owner_id;

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar la liga "${league.name}"? Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    try {
      await api.leagues.delete(league.id);
      router.refresh();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error al eliminar");
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveNick = async () => {
    if (!nick.trim()) return;
    setSaving(true);
    try {
      await api.market.updateNick(league.id, nick.trim());
      setDisplayName(nick.trim());
      setEditingNick(false);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-[#111111] border border-[#1a1a1a] rounded-xl px-5 py-4 hover:border-[#2a2a2a] hover:-translate-y-0.5 transition-all duration-150">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="font-semibold text-white">{league.name}</p>
          <p className="text-zinc-600 text-xs mt-0.5 font-mono">{league.invite_code}</p>
          {/* Nick del usuario en esta liga */}
          {!editingNick ? (
            <button
              onClick={() => setEditingNick(true)}
              className="mt-1.5 flex items-center gap-1.5 group"
            >
              <span className={`text-xs ${displayName ? "text-zinc-400" : "text-zinc-600 italic"}`}>
                {displayName ? `@${displayName}` : "Sin nick — toca para añadir"}
              </span>
              <span className="text-[10px] text-zinc-700 group-hover:text-zinc-500 transition-colors">✎</span>
            </button>
          ) : (
            <div className="mt-1.5 flex items-center gap-1.5">
              <input
                autoFocus
                type="text"
                maxLength={32}
                value={nick}
                onChange={(e) => setNick(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveNick(); if (e.key === "Escape") setEditingNick(false); }}
                placeholder="Tu nick en esta liga"
                className="bg-[#0a0a0a] border border-[#2a2a2a] focus:border-amber-400/50 text-white text-xs rounded-lg px-2 py-1 outline-none transition-colors w-36"
              />
              <button
                onClick={handleSaveNick}
                disabled={saving || !nick.trim()}
                className="text-xs px-2 py-1 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-black font-bold rounded-lg transition-all active:scale-95"
              >
                {saving ? "…" : "Guardar"}
              </button>
              <button onClick={() => setEditingNick(false)} className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors">✕</button>
            </div>
          )}
        </div>

        {league.member && (
          <div className="text-right flex-shrink-0 hidden sm:block">
            <p className="font-mono text-amber-400 text-sm font-semibold">
              {league.member.remaining_budget.toFixed(1)}M
            </p>
            <p className="text-zinc-600 text-xs">{league.member.total_points.toFixed(0)} pts</p>
          </div>
        )}
      </div>

      {/* Navegación */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <Link href={`/leagues/${league.id}/lineup`}
          className="px-3 py-1.5 text-xs border border-[#2a2a2a] hover:border-zinc-500/40 hover:text-zinc-300 rounded-lg transition-all active:scale-95 text-zinc-500">
          Mi equipo
        </Link>
        <Link href={`/leagues/${league.id}/market`}
          className="px-3 py-1.5 text-xs border border-[#2a2a2a] hover:border-amber-400/40 hover:text-amber-400 rounded-lg transition-all active:scale-95 text-zinc-400">
          Mercado
        </Link>
        <Link href={`/leagues/${league.id}/standings`}
          className="px-3 py-1.5 text-xs border border-[#2a2a2a] hover:border-zinc-500/40 hover:text-zinc-300 rounded-lg transition-all active:scale-95 text-zinc-500">
          Clasificación
        </Link>
        <Link href={`/leagues/${league.id}/activity`}
          className="px-3 py-1.5 text-xs border border-[#2a2a2a] hover:border-zinc-500/40 hover:text-zinc-300 rounded-lg transition-all active:scale-95 text-zinc-500">
          Actividad
        </Link>
        {isOwner && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="ml-auto px-3 py-1.5 text-xs border border-red-900/40 hover:border-red-500/50 text-red-700 hover:text-red-400 rounded-lg transition-all active:scale-95 disabled:opacity-40"
          >
            {deleting ? "Eliminando…" : "Eliminar liga"}
          </button>
        )}
      </div>
    </div>
  );
}

