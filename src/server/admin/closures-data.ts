import type { AdminClosuresActionResult, CourtClosureItem } from "@/lib/admin/types";
import { createClient } from "@/lib/supabase/server";
import { requireAdminContext } from "@/server/admin/require-admin";

export async function listCourtClosures(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<CourtClosureItem[]> {
  const rowsRes = await supabase
    .from("court_closures")
    .select("id, court_id, start_date, end_date, start_hour, end_hour, reason, created_at")
    .order("start_date", { ascending: true })
    .order("start_hour", { ascending: true })
    .order("created_at", { ascending: false });

  const closureRows = ((rowsRes.data ?? []) as {
    id: string;
    court_id: string;
    start_date: string;
    end_date: string;
    start_hour: number | null;
    end_hour: number | null;
    reason: string | null;
    created_at: string;
  }[]);

  const courtIds = [...new Set(closureRows.map((row) => row.court_id))];
  const courtNameById = new Map<string, string>();

  if (courtIds.length > 0) {
    const courtsRes = await supabase.from("courts").select("id, name").in("id", courtIds);

    (courtsRes.data ?? []).forEach((court) => {
      courtNameById.set(String(court.id), String(court.name));
    });
  }

  return closureRows.map((row) => ({
    id: row.id,
    courtId: row.court_id,
    courtName: courtNameById.get(row.court_id) ?? "Ismeretlen pálya",
    startDate: row.start_date,
    endDate: row.end_date,
    startHour: row.start_hour,
    endHour: row.end_hour,
    reason: row.reason,
    createdAt: row.created_at,
  }));
}

export async function getAdminClosuresData(): Promise<AdminClosuresActionResult> {
  const adminContext = await requireAdminContext();

  if (!adminContext.ok) {
    return {
      ok: false,
      error: adminContext.error,
    };
  }

  return {
    ok: true,
    data: await listCourtClosures(adminContext.supabase),
  };
}
