"use server";

import { revalidatePath } from "next/cache";

import type { AdminClosuresActionResult } from "@/lib/admin/types";
import { listCourtClosures } from "@/server/admin/closures-data";
import { requireAdminContext } from "@/server/admin/require-admin";

type CreateClosureInput = {
  courtId: string;
  startDate: string;
  endDate: string;
  startHour: number | null;
  endHour: number | null;
  reason: string;
};

type DeleteClosureInput = {
  closureId: string;
};

function fail(error: string): AdminClosuresActionResult {
  return {
    ok: false,
    error,
  };
}

async function success(): Promise<AdminClosuresActionResult> {
  const adminContext = await requireAdminContext();

  if (!adminContext.ok) {
    return fail(adminContext.error);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/zarasok");
  revalidatePath("/foglalas");

  return {
    ok: true,
    data: await listCourtClosures(adminContext.supabase),
  };
}

export async function createClosureAction(input: CreateClosureInput): Promise<AdminClosuresActionResult> {
  const adminContext = await requireAdminContext();

  if (!adminContext.ok) {
    return fail(adminContext.error);
  }

  if (!input.courtId) {
    return fail("Válassz pályát.");
  }

  if (!input.startDate || !input.endDate) {
    return fail("Válassz dátumtartományt.");
  }

  if (input.startDate > input.endDate) {
    return fail("A zárás kezdő dátuma nem lehet későbbi, mint a záró dátum.");
  }

  if ((input.startHour === null) !== (input.endHour === null)) {
    return fail("Órás zárásnál add meg a kezdő és záró órát is.");
  }

  if (
    input.startHour !== null &&
    input.endHour !== null &&
    (input.startHour < 0 || input.endHour > 24 || input.startHour >= input.endHour)
  ) {
    return fail("Érvénytelen óra tartomány.");
  }

  const insertRes = await adminContext.supabase.from("court_closures").insert({
    court_id: input.courtId,
    start_date: input.startDate,
    end_date: input.endDate,
    start_hour: input.startHour,
    end_hour: input.endHour,
    reason: input.reason.trim() || null,
    created_by: adminContext.userId,
  });

  if (insertRes.error) {
    return fail("A pályazárás mentése sikertelen. Lehet, hogy ez az idősáv már rögzítve van.");
  }

  return success();
}

export async function deleteClosureAction(input: DeleteClosureInput): Promise<AdminClosuresActionResult> {
  const adminContext = await requireAdminContext();

  if (!adminContext.ok) {
    return fail(adminContext.error);
  }

  const deleteRes = await adminContext.supabase
    .from("court_closures")
    .delete()
    .eq("id", input.closureId);

  if (deleteRes.error) {
    return fail("A pályazárás törlése sikertelen.");
  }

  return success();
}
