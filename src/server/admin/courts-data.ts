import type { AdminCourt, AdminCourtsActionResult } from "@/lib/admin/types";
import { createClient } from "@/lib/supabase/server";
import { requireAdminContext } from "@/server/admin/require-admin";

function mapCourtRow(row: {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
}): AdminCourt {
  return {
    id: row.id,
    name: row.name,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

export async function listCourts(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<AdminCourt[]> {
  const courtsRes = await supabase
    .from("courts")
    .select("id, name, is_active, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return ((courtsRes.data ?? []) as {
    id: string;
    name: string;
    is_active: boolean;
    sort_order: number;
  }[]).map(mapCourtRow);
}

export async function getAdminCourtsData(): Promise<AdminCourtsActionResult> {
  const adminContext = await requireAdminContext();

  if (!adminContext.ok) {
    return {
      ok: false,
      error: adminContext.error,
    };
  }

  const courts = await listCourts(adminContext.supabase);

  return {
    ok: true,
    data: courts,
  };
}
