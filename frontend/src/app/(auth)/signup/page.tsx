"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { signup } from "@/app/actions/auth";

const initialState = { error: null };

export default function SignupPage() {
  const [state, formAction] = useFormState(signup, initialState);

  return (
    <div className="w-full max-w-md p-8 bg-gray-900 rounded-xl border border-gray-800">
      <h1 className="text-2xl font-bold text-white mb-2">Crear cuenta</h1>
      <p className="text-gray-400 mb-6 text-sm">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-blue-400 hover:underline">
          Inicia sesión
        </Link>
      </p>

      <form action={formAction} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            placeholder="tu@email.com"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={6}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            placeholder="Mínimo 6 caracteres"
          />
        </div>

        {state?.error && (
          <p className="text-red-400 text-sm bg-red-900/20 border border-red-900 rounded-lg p-3">
            {state.error}
          </p>
        )}

        <SubmitButton label="Crear cuenta" pendingLabel="Creando cuenta..." />
      </form>
    </div>
  );
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
