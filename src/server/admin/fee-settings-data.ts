import type { AdminFeeSettingsActionResult } from "@/lib/admin/types";
import { requireAdminContext } from "@/server/admin/require-admin";
import { loadFeeRules } from "@/server/booking/fee-settings";

export async function getAdminFeeSettingsData(): Promise<AdminFeeSettingsActionResult> {
  const adminContext = await requireAdminContext();

  if (!adminContext.ok) {
    return {
      ok: false,
      error: adminContext.error,
    };
  }

  const feeRules = await loadFeeRules(adminContext.supabase);

  return {
    ok: true,
    data: feeRules,
  };
}
