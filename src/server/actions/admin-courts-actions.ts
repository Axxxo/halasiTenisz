"use server";

import { revalidatePath } from "next/cache";

import type { AdminCourtsActionResult } from "@/lib/admin/types";
import { createClient } from "@/lib/supabase/server";
import { requireAdminContext } from "@/server/admin/require-admin";
import { listCourts } from "@/server/admin/courts-data";

type CreateCourtInput = {
  name: string;
  isActive: boolean;
};

type UpdateCourtInput = {
  courtId: string;
  name: string;
  isActive: boolean;
};

type MoveCourtInput = {
  courtId: string;
  direction: "up" | "down";
};

function fail(error: string): AdminCourtsActionResult {
  return {
    ok: false,
    error,
  };
}

async function success(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<AdminCourtsActionResult> {
  revalidatePath("/admin");
  revalidatePath("/admin/dijak");
  revalidatePath("/admin/zarasok");
  revalidatePath("/admin/tagok");
  revalidatePath("/admin/penzugyek");
  revalidatePath("/foglalas");

  return {
    ok: true,
    data: await listCourts(supabase),
  };
}

export async function createCourtAction(input: CreateCourtInput): Promise<AdminCourtsActionResult> {
  const context = await requireAdminContext();

  if (!context.ok) {
    return fail(context.error);
  }

  const name = input.name.trim();

  if (!name) {
    return fail("A pálya neve kötelező.");
  }

  const highestOrderRes = await context.supabase
    .from("courts")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSortOrder = Number(highestOrderRes.data?.sort_order ?? 0) + 1;

  const insertRes = await context.supabase.from("courts").insert({
    name,
    surface_type: null,
    is_active: input.isActive,
    sort_order: nextSortOrder,
  });

  if (insertRes.error) {
    return fail("Az új pálya létrehozása sikertelen.");
  }

  return success(context.supabase);
}

export async function updateCourtAction(input: UpdateCourtInput): Promise<AdminCourtsActionResult> {
  const context = await requireAdminContext();

  if (!context.ok) {
    return fail(context.error);
  }

  const name = input.name.trim();

  if (!name) {
    return fail("A pálya neve kötelező.");
  }

  const updateRes = await context.supabase
    .from("courts")
    .update({
      name,
      is_active: input.isActive,
    })
    .eq("id", input.courtId);

  if (updateRes.error) {
    return fail("A pálya frissítése sikertelen.");
  }

  return success(context.supabase);
}

export async function moveCourtAction(input: MoveCourtInput): Promise<AdminCourtsActionResult> {
  const context = await requireAdminContext();

  if (!context.ok) {
    return fail(context.error);
  }

  const courts = await listCourts(context.supabase);
  const index = courts.findIndex((court) => court.id === input.courtId);

  if (index < 0) {
    return fail("A pálya nem található.");
  }

  const targetIndex = input.direction === "up" ? index - 1 : index + 1;

  if (targetIndex < 0 || targetIndex >= courts.length) {
    return fail("Ebben az irányban már nem mozgatható.");
  }

  const current = courts[index];
  const target = courts[targetIndex];

  const firstUpdateRes = await context.supabase
    .from("courts")
    .update({ sort_order: target.sortOrder })
    .eq("id", current.id);

  if (firstUpdateRes.error) {
    return fail("A pálya sorrendjének frissítése sikertelen.");
  }

  const secondUpdateRes = await context.supabase
    .from("courts")
    .update({ sort_order: current.sortOrder })
    .eq("id", target.id);

  if (secondUpdateRes.error) {
    return fail("A pálya sorrendjének frissítése sikertelen.");
  }

  return success(context.supabase);
}
