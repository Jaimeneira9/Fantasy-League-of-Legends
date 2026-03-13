import { createClient } from "@/lib/supabase/server";
import { serverApi } from "@/lib/api-server";
import { logout } from "@/app/actions/auth";
import { LeagueActions } from "@/components/LeagueActions";
import { LeagueRow } from "@/components/LeagueRow";
import type { League } from "@/lib/api";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let leagues: League[] = [];
  try {
    leagues = await serverApi.leagues.list();
  } catch {
    // backend no disponible — se muestra estado vacío
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Topbar */}
      <header className="border-b border-[#1a1a1a] px-6 py-4 flex items-center justify-between">
        <span className="font-semibold tracking-tight">LoL Fantasy</span>
        <div className="flex items-center gap-4">
          <span className="text-zinc-500 text-sm">{user?.email}</span>
          <form action={logout}>
            <button
              type="submit"
              className="text-sm text-zinc-500 hover:text-white transition-colors"
            >
              Salir
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold mb-1">Mis ligas</h1>
            <p className="text-zinc-500 text-sm">
              Selecciona una liga para acceder al mercado y a tu equipo.
            </p>
          </div>
          <LeagueActions />
        </div>

        {leagues.length === 0 ? (
          <div className="border border-dashed border-[#2a2a2a] rounded-lg p-12 text-center">
            <p className="text-zinc-400 text-sm mb-1">No perteneces a ninguna liga todavía.</p>
            <p className="text-zinc-600 text-xs">Crea una nueva o únete con un código de invitación.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leagues.map((league) => (
              <LeagueRow key={league.id} league={league} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

