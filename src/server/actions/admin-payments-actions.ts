"use server";

import { revalidatePath } from "next/cache";

import type { AdminPaymentsActionResult } from "@/lib/admin/types";
import { listAdminPaymentsData } from "@/server/admin/payments-data";
import { requireAdminContext } from "@/server/admin/require-admin";

type CreateManualTransactionInput = {
  userId: string;
  accountType: "membership" | "base" | "lighting" | "extra";
  amountFt: number;
  note: string;
};

function fail(error: string): AdminPaymentsActionResult {
  return {
    ok: false,
    error,
  };
}

async function success(): Promise<AdminPaymentsActionResult> {
  const adminContext = await requireAdminContext();

  if (!adminContext.ok) {
    return fail(adminContext.error);
  }

  revalidatePath("/statisztika");
  revalidatePath("/admin/penzugyek");

  return {
    ok: true,
    data: await listAdminPaymentsData(adminContext.supabase),
  };
}

export async function createManualTransactionAction(
  input: CreateManualTransactionInput,
): Promise<AdminPaymentsActionResult> {
  const adminContext = await requireAdminContext();

  if (!adminContext.ok) {
    return fail(adminContext.error);
  }

  const amountFt = Math.round(Number(input.amountFt));

  if (!input.userId) {
    return fail("Válassz tagot.");
  }

  if (!Number.isFinite(amountFt) || amountFt === 0) {
    return fail("Az összeg nem lehet nulla.");
  }

  const accountRes = await adminContext.supabase
    .from("accounts")
    .select("id")
    .eq("user_id", input.userId)
    .eq("account_type", input.accountType)
    .maybeSingle();

  let accountId = accountRes.data?.id as string | undefined;

  if (!accountId) {
    const insertAccountRes = await adminContext.supabase
      .from("accounts")
      .insert({
        user_id: input.userId,
        account_type: input.accountType,
        is_active: true,
      })
      .select("id")
      .single();

    if (insertAccountRes.error || !insertAccountRes.data?.id) {
      return fail("A számla létrehozása sikertelen.");
    }

    accountId = insertAccountRes.data.id as string;
  }

  const insertTxRes = await adminContext.supabase.from("transactions").insert({
    account_id: accountId,
    amount: amountFt,
    currency: "HUF",
    status_code: amountFt >= 0 ? "H" : "I",
    note: input.note.trim() || "Admin manuális könyvelés",
    created_by: adminContext.userId,
  });

  if (insertTxRes.error) {
    return fail("A tranzakció mentése sikertelen.");
  }

  return success();
}
