import type { MyBookingItem, MyBookingsData } from "@/lib/booking/types";
import { createClient } from "@/lib/supabase/server";
import { loadFeeRules } from "@/server/booking/fee-settings";

function normalizeName(name: string | null | undefined) {
  const trimmed = name?.trim();
  if (trimmed) {
    return trimmed;
  }

  return "Névtelen játékos";
}

export async function getMyBookingsData(): Promise<MyBookingsData> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Bejelentkezés szükséges.");
  }

  const feeRules = await loadFeeRules(supabase);
  const lateCancelMs = feeRules.lateCancelMinutes * 60 * 1000;

  const bookingsRes = await supabase
    .from("bookings")
    .select("id, court_id, starts_at, game_type")
    .eq("status", "active")
    .eq("booker_user_id", user.id)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  const bookingRows =
    (bookingsRes.data as
      | { id: string; court_id: string; starts_at: string; game_type: "solo" | "singles" | "doubles" }[]
      | null) ?? [];

  if (bookingRows.length === 0) {
    return {
      items: [],
      lateCancelMinutes: feeRules.lateCancelMinutes,
    };
  }

  const bookingIds = bookingRows.map((row) => row.id);
  const courtIds = [...new Set(bookingRows.map((row) => row.court_id))];

  const [courtsRes, bookingPlayersRes] = await Promise.all([
    supabase.from("courts").select("id, name").in("id", courtIds),
    supabase
      .from("booking_players")
      .select("booking_id, user_id, is_booker")
      .in("booking_id", bookingIds)
      .eq("is_booker", false),
  ]);

  const courtsMap = new Map<string, string>();
  ((courtsRes.data as { id: string; name: string }[] | null) ?? []).forEach((court) => {
    courtsMap.set(court.id, court.name);
  });

  const bookingPlayersRows =
    (bookingPlayersRes.data as
      | { booking_id: string; user_id: string; is_booker: boolean }[]
      | null) ?? [];

  const opponentUserIds = [...new Set(bookingPlayersRows.map((row) => row.user_id))];

  const opponentsMap = new Map<string, string>();
  if (opponentUserIds.length > 0) {
    const usersRes = await supabase.from("users").select("id, full_name").in("id", opponentUserIds);

    ((usersRes.data as { id: string; full_name: string | null }[] | null) ?? []).forEach((row) => {
      opponentsMap.set(row.id, normalizeName(row.full_name));
    });
  }

  const opponentsByBooking = new Map<string, string[]>();
  bookingPlayersRows.forEach((row) => {
    const existing = opponentsByBooking.get(row.booking_id) ?? [];
    existing.push(opponentsMap.get(row.user_id) ?? "Névtelen játékos");
    opponentsByBooking.set(row.booking_id, existing);
  });

  const items: MyBookingItem[] = bookingRows.map((row) => {
    const startsAtDate = new Date(row.starts_at);
    const cancellationDeadlineDate = new Date(startsAtDate.getTime() - lateCancelMs);

    return {
      id: row.id,
      courtName: courtsMap.get(row.court_id) ?? "Ismeretlen pálya",
      startsAt: row.starts_at,
      cancellationDeadline: cancellationDeadlineDate.toISOString(),
      isLateCancellation: Date.now() >= cancellationDeadlineDate.getTime(),
      gameType: row.game_type,
      opponents: opponentsByBooking.get(row.id) ?? [],
    };
  });

  return {
    items,
    lateCancelMinutes: feeRules.lateCancelMinutes,
  };
}
