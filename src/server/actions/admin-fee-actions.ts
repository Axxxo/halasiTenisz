"use server";

import { revalidatePath } from "next/cache";

import type { AdminFeeSettingsActionResult, FeeRules } from "@/lib/admin/types";
import { requireAdminContext } from "@/server/admin/require-admin";
import { loadFeeRules, mapFeeRulesToDb } from "@/server/booking/fee-settings";

function normalizeRules(input: FeeRules): FeeRules {
  const clampNumber = (value: number, min: number, max?: number) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return min;
    }

    if (typeof max === "number") {
      return Math.min(max, Math.max(min, Math.round(numeric)));
    }

    return Math.max(min, Math.round(numeric));
  };

  return {
    baseRateFt: clampNumber(input.baseRateFt, 0),
    nonMemberPeakRateFt: clampNumber(input.nonMemberPeakRateFt, 0),
    nonMemberOffpeakRateFt: clampNumber(input.nonMemberOffpeakRateFt, 0),
    diakOffpeakDiscountPct: clampNumber(input.diakOffpeakDiscountPct, 0, 100),
    coachingRateFt: clampNumber(input.coachingRateFt, 0),
    versenyzoiFreeOffpeakHoursPerWeek: clampNumber(input.versenyzoiFreeOffpeakHoursPerWeek, 0),
    lightingFeeFt: clampNumber(input.lightingFeeFt, 0),
    mufuvesFeeFt: clampNumber(input.mufuvesFeeFt, 0),
    debtLockoutFt: clampNumber(input.debtLockoutFt, 0),
    lateCancelMinutes: clampNumber(input.lateCancelMinutes, 0),
  };
}

export async function updateFeeSettingsAction(input: FeeRules): Promise<AdminFeeSettingsActionResult> {
  const adminContext = await requireAdminContext();

  if (!adminContext.ok) {
    return {
      ok: false,
      error: adminContext.error,
    };
  }

  const normalized = normalizeRules(input);

  const upsertRes = await adminContext.supabase.from("settings").upsert(
    {
      key: "fee_rules",
      value: mapFeeRulesToDb(normalized),
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "key",
    },
  );

  if (upsertRes.error) {
    return {
      ok: false,
      error: "A díjszabás mentése sikertelen.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/dijak");
  revalidatePath("/admin/zarasok");
  revalidatePath("/admin/tagok");
  revalidatePath("/admin/penzugyek");
  revalidatePath("/foglalas");

  return {
    ok: true,
    data: await loadFeeRules(adminContext.supabase),
  };
}
