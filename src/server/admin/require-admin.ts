import { createClient } from "@/lib/supabase/server";

type AdminContext =
  | {
      ok: true;
      supabase: Awaited<ReturnType<typeof createClient>>;
      userId: string;
    }
  | {
      ok: false;
      supabase: Awaited<ReturnType<typeof createClient>>;
      error: string;
      userId: null;
    };

export async function requireAdminContext(): Promise<AdminContext> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false,
      supabase,
      error: "Bejelentkezés szükséges.",
      userId: null,
    };
  }

  const roleRes = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();

  if (roleRes.data?.role !== "admin") {
    return {
      ok: false,
      supabase,
      error: "Ehhez admin jogosultság szükséges.",
      userId: null,
    };
  }

  return {
    ok: true,
    supabase,
    userId: user.id,
  };
}
