import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center px-4"
      style={{ background: "var(--bg-base)" }}
    >
      <ProfileForm
        userId={user.id}
        email={user.email ?? ""}
        initialUsername={profile?.username ?? ""}
        initialAvatarUrl={profile?.avatar_url ?? null}
      />
    </div>
  );
}
