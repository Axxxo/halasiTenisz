"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult, CancelBookingsResult } from "@/lib/booking/types";
import { createClient } from "@/lib/supabase/server";
import { loadFeeRules } from "@/server/booking/fee-settings";

type CancelBookingsInput = {
  bookingIds: string[];
};

function uniqueIds(ids: string[]) {
  return [...new Set(ids.map((id) => id.trim()).filter((id) => id.length > 0))];
}

export async function cancelBookingsAction(
  input: CancelBookingsInput,
): Promise<ActionResult<CancelBookingsResult>> {
  const bookingIds = uniqueIds(input.bookingIds);

  if (bookingIds.length === 0) {
    return {
      ok: false,
      error: "Válassz legalább egy foglalást a lemondáshoz.",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false,
      error: "Bejelentkezés szükséges.",
    };
  }

  const feeRules = await loadFeeRules(supabase);
  const lateCancelMs = feeRules.lateCancelMinutes * 60 * 1000;

  const bookingsRes = await supabase
    .from("bookings")
    .select("id, starts_at")
    .in("id", bookingIds)
    .eq("booker_user_id", user.id)
    .eq("status", "active");

  const ownBookingRows =
    (bookingsRes.data as { id: string; starts_at: string }[] | null) ?? [];

  if (ownBookingRows.length === 0) {
    return {
      ok: false,
      error: "Nem található lemondható saját foglalás a kijelölt elemek között.",
    };
  }

  const cancellableIds = ownBookingRows.map((row) => row.id);
  const now = Date.now();

  const lateCancelledIds = ownBookingRows
    .filter((row) => {
      const deadline = new Date(new Date(row.starts_at).getTime() - lateCancelMs).getTime();
      return now >= deadline;
    })
    .map((row) => row.id);

  const updateRes = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .in("id", cancellableIds)
    .eq("booker_user_id", user.id)
    .eq("status", "active");

  if (updateRes.error) {
    return {
      ok: false,
      error: "A lemondás mentése sikertelen.",
    };
  }

  revalidatePath("/foglalasaim");
  revalidatePath("/foglalas");

  return {
    ok: true,
    data: {
      cancelledIds: cancellableIds,
      lateCancelledIds,
    },
  };
}
