"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type Mode = "idle" | "create" | "join";

export function LeagueActions() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("idle");

  const close = () => setMode("idle");
  const done = () => { close(); router.refresh(); };

  return (
    <div>
      {mode === "idle" && (
        <div className="flex gap-2">
          <button
            onClick={() => setMode("create")}
            className="px-4 py-2 text-sm bg-amber-400 hover:bg-amber-300 text-black font-semibold rounded transition-colors"
          >
            Crear liga
          </button>
          <button
            onClick={() => setMode("join")}
            className="px-4 py-2 text-sm border border-[#2a2a2a] hover:border-[#3a3a3a] text-zinc-400 hover:text-white rounded transition-colors"
          >
            Unirse con código
          </button>
        </div>
      )}

      {mode === "create" && <CreateForm onDone={done} onCancel={close} />}
      {mode === "join"   && <JoinForm   onDone={done} onCancel={close} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Crear liga
// ---------------------------------------------------------------------------

function CreateForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [maxMembers, setMaxMembers] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.leagues.create(name.trim(), maxMembers);
      onDone();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al crear la liga");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#111111] border border-[#1a1a1a] rounded-lg p-5 space-y-4">
      <h2 className="font-semibold text-white">Nueva liga</h2>

      <div className="space-y-1">
        <label className="text-xs text-zinc-500 uppercase tracking-wider">Nombre</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={3}
          maxLength={60}
          placeholder="Mi liga de la LEC"
          className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-400/50"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-zinc-500 uppercase tracking-wider">
          Jugadores máx. <span className="text-zinc-600 normal-case">(2–20)</span>
        </label>
        <input
          type="number"
          value={maxMembers}
          onChange={(e) => setMaxMembers(Number(e.target.value))}
          min={2}
          max={20}
          className="w-32 bg-[#0a0a0a] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400/50"
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={busy || name.trim().length < 3}
          className="px-4 py-2 text-sm bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-black font-semibold rounded transition-colors"
        >
          {busy ? "Creando…" : "Crear liga"}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Unirse con código
// ---------------------------------------------------------------------------

function JoinForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.leagues.join(code.trim(), displayName.trim() || undefined);
      onDone();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al unirse");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#111111] border border-[#1a1a1a] rounded-lg p-5 space-y-4">
      <h2 className="font-semibold text-white">Unirse a una liga</h2>

      <div className="space-y-1">
        <label className="text-xs text-zinc-500 uppercase tracking-wider">Código de invitación</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          placeholder="ej. a3f9c1b2"
          className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-amber-400/50"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-zinc-500 uppercase tracking-wider">
          Nombre en la liga <span className="text-zinc-600 normal-case">(opcional)</span>
        </label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={40}
          placeholder="Tu apodo"
          className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-400/50"
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={busy || code.trim().length === 0}
          className="px-4 py-2 text-sm bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-black font-semibold rounded transition-colors"
        >
          {busy ? "Uniéndose…" : "Unirse"}
        </button>
      </div>
    </form>
  );
}
