import { createClient } from "@/lib/supabase/server";
import type { MemberCategory } from "@/lib/admin/types";
import type {
  BookingGridBooking,
  BookingGridClosure,
  BookingGridData,
  BookingGridMember,
} from "@/lib/booking/types";
import { loadFeeRules, loadNonMemberAllowedHours } from "@/server/booking/fee-settings";
import { getUserDebtFt } from "@/server/finance/debt";

const LOOKAHEAD_DAYS = 60;
const PEAK_HOURS = [17, 18, 19, 20];

function getIsoFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function normalizeName(name: string | null | undefined, fallback: string) {
  const trimmed = name?.trim();
  if (trimmed) {
    return trimmed;
  }

  return fallback;
}

export async function getBookingGridData(): Promise<BookingGridData> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Bejelentkezés szükséges.");
  }

  const todayDate = new Date().toISOString().slice(0, 10);
  const lookaheadDate = getIsoFromNow(LOOKAHEAD_DAYS).slice(0, 10);

  const [profileRes, courtsRes, membersRes, bookingsRes, closuresRes, feeRules, nonMemberAllowedHours] =
    await Promise.all([
    supabase
      .from("users")
      .select("id, full_name, member_category")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("courts")
      .select("id, name, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase.from("users").select("id, full_name").order("full_name", { ascending: true }),
    supabase
      .from("bookings")
      .select("id, court_id, starts_at, booker_user_id, game_type, is_coaching, is_peak")
      .eq("status", "active")
      .gte("starts_at", getIsoFromNow(-1))
      .lt("starts_at", getIsoFromNow(LOOKAHEAD_DAYS))
      .order("starts_at", { ascending: true }),
    supabase
      .from("court_closures")
      .select("court_id, start_date, end_date, start_hour, end_hour, reason")
      .lte("start_date", lookaheadDate)
      .gte("end_date", todayDate),
    loadFeeRules(supabase),
    loadNonMemberAllowedHours(supabase),
  ]);

  const currentUserName = normalizeName(profileRes.data?.full_name, user.email ?? "Ismeretlen");

  const debtFt = await getUserDebtFt(supabase, user.id);
  const memberCategory = ((profileRes.data?.member_category as MemberCategory | null) ?? "palyaberlo");

  const courts = (courtsRes.data ?? []).map((court) => ({
    id: String(court.id),
    name: court.name as string,
    sortOrder: Number(court.sort_order ?? 0),
  }));

  const members: BookingGridMember[] = (membersRes.data ?? [])
    .map((member) => ({
      id: member.id as string,
      name: normalizeName(member.full_name as string | null, "Névtelen játékos"),
    }))
    .filter((member) => member.id !== user.id);

  const bookingRows = bookingsRes.data ?? [];
  const bookingIds = bookingRows.map((row) => row.id as string);

  let bookingPlayersRows: { booking_id: string; user_id: string; is_booker: boolean }[] = [];

  if (bookingIds.length > 0) {
    const bookingPlayersRes = await supabase
      .from("booking_players")
      .select("booking_id, user_id, is_booker")
      .in("booking_id", bookingIds);

    bookingPlayersRows = (bookingPlayersRes.data as
      | { booking_id: string; user_id: string; is_booker: boolean }[]
      | null) ?? [];
  }

  const userIdSet = new Set<string>();

  bookingRows.forEach((row) => {
    userIdSet.add(row.booker_user_id as string);
  });

  bookingPlayersRows.forEach((row) => {
    userIdSet.add(row.user_id);
  });

  const userIds = [...userIdSet];

  const usersMap = new Map<string, string>();

  if (userIds.length > 0) {
    const userRowsRes = await supabase.from("users").select("id, full_name").in("id", userIds);

    (userRowsRes.data ?? []).forEach((row) => {
      usersMap.set(
        row.id as string,
        normalizeName(row.full_name as string | null, "Névtelen játékos"),
      );
    });
  }

  const bookingPlayersByBooking = new Map<
    string,
    { booking_id: string; user_id: string; is_booker: boolean }[]
  >();

  bookingPlayersRows.forEach((row) => {
    const existing = bookingPlayersByBooking.get(row.booking_id) ?? [];
    existing.push(row);
    bookingPlayersByBooking.set(row.booking_id, existing);
  });

  const bookings: BookingGridBooking[] = bookingRows.map((row) => {
    const bookerId = row.booker_user_id as string;
    const players = bookingPlayersByBooking.get(row.id as string) ?? [];

    const opponentIds = players
      .filter((player) => !player.is_booker && player.user_id !== bookerId)
      .map((player) => player.user_id);

    const opponents = opponentIds.map((id) => ({
      id,
      name: usersMap.get(id) ?? "Névtelen játékos",
    }));

    return {
      id: row.id as string,
      courtId: String(row.court_id),
      startsAt: row.starts_at as string,
      bookerId,
      bookerName: usersMap.get(bookerId) ?? "Névtelen játékos",
      gameType: row.game_type as "solo" | "singles" | "doubles",
      isCoaching: Boolean(row.is_coaching),
      opponents,
    };
  });

  const closures: BookingGridClosure[] = ((closuresRes.data ?? []) as {
    court_id: string;
    start_date: string;
    end_date: string;
    start_hour: number | null;
    end_hour: number | null;
    reason: string | null;
  }[]).map((row) => ({
    courtId: row.court_id,
    startDate: row.start_date,
    endDate: row.end_date,
    startHour: row.start_hour,
    endHour: row.end_hour,
    reason: row.reason,
  }));

  const now = new Date();
  const currentDay = now.getDay();
  const daysFromMonday = (currentDay + 6) % 7;
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - daysFromMonday);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const weeklyBookingsRes = await supabase
    .from("bookings")
    .select("is_peak, is_coaching")
    .eq("booker_user_id", user.id)
    .eq("status", "active")
    .gte("starts_at", weekStart.toISOString())
    .lt("starts_at", weekEnd.toISOString());

  const versenyzoiFreeHoursUsedThisWeek = ((weeklyBookingsRes.data ?? []) as {
    is_peak: boolean;
    is_coaching: boolean;
  }[]).filter((row) => !row.is_peak && !row.is_coaching).length;

  const participantBookingIds = new Set<string>();

  bookings.forEach((booking) => {
    if (booking.bookerId === user.id || booking.opponents.some((opponent) => opponent.id === user.id)) {
      participantBookingIds.add(booking.id);
    }
  });

  if (participantBookingIds.size === 0) {
    const participantRowsRes = await supabase
      .from("booking_players")
      .select("booking_id")
      .eq("user_id", user.id)
      .limit(300);

    (participantRowsRes.data ?? []).forEach((row) => {
      participantBookingIds.add(row.booking_id as string);
    });
  }

  const previousPartnerIdsSet = new Set<string>();

  const participantBookingIdList = [...participantBookingIds];

  if (participantBookingIdList.length > 0) {
    const partnerRowsRes = await supabase
      .from("booking_players")
      .select("user_id")
      .in("booking_id", participantBookingIdList)
      .neq("user_id", user.id);

    (partnerRowsRes.data ?? []).forEach((row) => {
      previousPartnerIdsSet.add(row.user_id as string);
    });
  }

  const previousPartnerIds = [...previousPartnerIdsSet];

  return {
    currentUser: {
      id: user.id,
      name: currentUserName,
      debtFt,
      memberCategory,
      versenyzoiFreeHoursUsedThisWeek,
    },
    courts,
    members,
    previousPartnerIds,
    bookings,
    closures,
    feeRules,
    nonMemberAllowedHours,
    peakHours: PEAK_HOURS,
  };
}
