"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";


export default function OnboardingPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  }

  function validateUsername(value: string): string | null {
    if (value.length < 3) return "Mínimo 3 caracteres";
    if (value.length > 20) return "Máximo 20 caracteres";
    if (!/^[a-zA-Z0-9_]+$/.test(value)) return "Solo letras, números y guiones bajos";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const uError = validateUsername(username);
    if (uError) {
      setUsernameError(uError);
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError("Sesión expirada. Vuelve a iniciar sesión.");
        return;
      }

      let avatar_url: string | null = null;

      // Subir avatar si se seleccionó uno
      if (avatarFile) {
        // TODO: crear el bucket 'avatars' en Supabase Storage antes de usar esto
        const ext = avatarFile.name.split(".").pop() ?? "webp";
        const path = `${user.id}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true });

        if (uploadError) {
          setError(`Error al subir el avatar: ${uploadError.message}`);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(path);

        avatar_url = publicUrlData.publicUrl;
      }

      // Actualizar perfil en la tabla profiles
      const profileUpdate: { username: string; avatar_url?: string } = { username };
      if (avatar_url) profileUpdate.avatar_url = avatar_url;

      const { error: profileError } = await supabase
        .from("profiles")
        .update(profileUpdate)
        .eq("id", user.id);

      if (profileError) {
        setError(`Error al guardar el perfil: ${profileError.message}`);
        return;
      }

      // Marcar onboarding como completado en user_metadata
      const { error: metaError } = await supabase.auth.updateUser({
        data: { onboarding_completed: true },
      });

      if (metaError) {
        setError(`Error al finalizar el onboarding: ${metaError.message}`);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    });
  }

  const initials = username.slice(0, 2).toUpperCase() || "?";

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--bg-base)" }}
    >
      <div
        className="w-full max-w-[480px] rounded-2xl p-8"
        style={{
          background: "#1e1b1e",
          border: "1px solid var(--border-medium)",
        }}
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <h1
            className="text-3xl font-bold mb-2"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              color: "var(--text-primary)",
            }}
          >
            Configura tu perfil
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Elige cómo te van a conocer en tus ligas
          </p>
        </div>

        {/* Error global */}
        {error && (
          <div
            className="mb-6 p-3 rounded-xl text-sm"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "#f87171",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar upload */}
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative w-24 h-24 rounded-full overflow-hidden flex items-center justify-center transition-all hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-[#fcd400]/50"
              style={{
                background: avatarPreview ? "transparent" : "var(--bg-panel)",
                border: "2px dashed var(--border-medium)",
              }}
              title="Subir foto de perfil"
            >
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreview}
                  alt="Avatar preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span
                  className="text-2xl font-black select-none"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: "var(--text-muted)",
                  }}
                >
                  {username ? initials : (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  )}
                </span>
              )}

              {/* Overlay con ícono de cámara */}
              <div
                className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-full"
                style={{ background: "rgba(0,0,0,0.5)" }}
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
              </div>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />

            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Opcional · Click para subir foto
            </p>
          </div>

          {/* Username */}
          <div>
            <label
              className="block text-xs font-bold uppercase tracking-widest mb-1.5"
              htmlFor="username"
              style={{ color: "var(--text-secondary)" }}
            >
              Nombre de usuario
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setUsernameError(validateUsername(e.target.value));
              }}
              placeholder="ej: crack9000"
              minLength={3}
              maxLength={20}
              required
              className="w-full px-4 py-3 rounded-xl text-sm transition-all focus:outline-none"
              style={{
                background: "var(--bg-panel)",
                border: `1px solid ${usernameError ? "rgba(239,68,68,0.5)" : "var(--border-medium)"}`,
                color: "var(--text-primary)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = usernameError
                  ? "rgba(239,68,68,0.8)"
                  : "rgba(252,212,0,0.5)";
                e.currentTarget.style.boxShadow = usernameError
                  ? "0 0 0 2px rgba(239,68,68,0.1)"
                  : "0 0 0 2px rgba(252,212,0,0.08)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = usernameError
                  ? "rgba(239,68,68,0.5)"
                  : "var(--border-medium)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            {usernameError && username.length > 0 && (
              <p className="mt-1.5 text-xs" style={{ color: "#f87171" }}>
                {usernameError}
              </p>
            )}
            <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              Solo letras, números y guiones bajos · 3-20 caracteres
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending || !username || !!usernameError}
            className="w-full py-3 px-6 rounded-xl font-bold text-sm transition-all active:scale-95"
            style={{
              background:
                isPending || !username || !!usernameError
                  ? "rgba(252,212,0,0.3)"
                  : "#fcd400",
              color:
                isPending || !username || !!usernameError ? "#888" : "#000",
              cursor:
                isPending || !username || !!usernameError
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {isPending ? "Guardando..." : "Guardar y continuar"}
          </button>
        </form>
      </div>
    </div>
  );
}
