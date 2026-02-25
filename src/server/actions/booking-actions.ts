"use server";

import { revalidatePath } from "next/cache";

import type { MemberCategory } from "@/lib/admin/types";
import { isNonMemberHourAllowed } from "@/lib/booking/non-member-hours";
import type { ActionResult, BookingGridBooking, GameType } from "@/lib/booking/types";
import { calculateBookingFee } from "@/lib/booking/fee-calculator";
import { createClient } from "@/lib/supabase/server";
import { loadFeeRules, loadNonMemberAllowedHours } from "@/server/booking/fee-settings";
import { getUserDebtFt } from "@/server/finance/debt";

type CreateBookingInput = {
  date: string;
  courtId: string;
  hour: number;
  timezoneOffsetMinutes: number;
  gameType: GameType;
  isCoaching: boolean;
  opponentIds: string[];
};

type UpdateBookingInput = {
  bookingId: string;
  gameType: GameType;
  opponentIds: string[];
};

const PEAK_HOURS = new Set([17, 18, 19, 20]);

function requiredOpponents(gameType: GameType) {
  if (gameType === "solo") {
    return 0;
  }

  if (gameType === "singles") {
    return 1;
  }

  return 3;
}

function normalizeOpponentIds(opponentIds: string[]) {
  return [...new Set(opponentIds.filter((id) => id.trim().length > 0))];
}

function toIsoStart(date: string, hour: number, timezoneOffsetMinutes: number) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

  if (!dateMatch || Number.isNaN(hour) || hour < 0 || hour > 23) {
    throw new Error("Érvénytelen dátum vagy időpont.");
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);

  const utcTimestamp =
    Date.UTC(year, month - 1, day, hour, 0, 0, 0) + timezoneOffsetMinutes * 60 * 1000;
  const parsed = new Date(utcTimestamp);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Érvénytelen dátum vagy időpont.");
  }

  return parsed.toISOString();
}

function addHour(startIso: string) {
  return new Date(new Date(startIso).getTime() + 60 * 60 * 1000).toISOString();
}

function getWeekRangeFromIso(targetIso: string) {
  const baseDate = new Date(targetIso);
  const currentDay = baseDate.getDay();
  const daysFromMonday = (currentDay + 6) % 7;
  const weekStart = new Date(baseDate);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - daysFromMonday);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  return {
    weekStartIso: weekStart.toISOString(),
    weekEndIso: weekEnd.toISOString(),
  };
}

async function getOrCreateBaseAccountId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const accountRes = await supabase
    .from("accounts")
    .select("id")
    .eq("user_id", userId)
    .eq("account_type", "base")
    .maybeSingle();

  if (accountRes.data?.id) {
    return accountRes.data.id as string;
  }

  const insertAccountRes = await supabase
    .from("accounts")
    .insert({
      user_id: userId,
      account_type: "base",
      is_active: true,
    })
    .select("id")
    .single();

  if (insertAccountRes.error || !insertAccountRes.data?.id) {
    throw new Error("A játékos alap számlájának létrehozása sikertelen.");
  }

  return insertAccountRes.data.id as string;
}

async function getCurrentUserContext() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      supabase,
      error: "Bejelentkezés szükséges.",
      user: null,
    };
  }

  const profileRes = await supabase
    .from("users")
    .select("id, full_name, member_category")
    .eq("id", user.id)
    .maybeSingle();

  return {
    supabase,
    error: null,
    user,
    userName: (profileRes.data?.full_name as string | null) ?? user.email ?? "Névtelen játékos",
    memberCategory: ((profileRes.data?.member_category as MemberCategory | null) ?? "palyaberlo"),
  };
}

async function resolveMemberNames(supabase: Awaited<ReturnType<typeof createClient>>, ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, string>();
  }

  const rowsRes = await supabase.from("users").select("id, full_name").in("id", ids);
  const map = new Map<string, string>();

  (rowsRes.data ?? []).forEach((row) => {
    map.set(row.id as string, ((row.full_name as string | null) ?? "Névtelen játékos").trim());
  });

  return map;
}

export async function createBookingAction(
  input: CreateBookingInput,
): Promise<ActionResult<BookingGridBooking>> {
  const context = await getCurrentUserContext();

  if (context.error || !context.user) {
    return {
      ok: false,
      error: context.error ?? "Bejelentkezés szükséges.",
    };
  }

  const { supabase, user, userName } = context;
  const [feeRules, nonMemberAllowedHours] = await Promise.all([
    loadFeeRules(supabase),
    loadNonMemberAllowedHours(supabase),
  ]);

  const opponentIds = normalizeOpponentIds(input.opponentIds);
  const expectedOpponents = requiredOpponents(input.gameType);

  if (opponentIds.length !== expectedOpponents) {
    return {
      ok: false,
      error: `A kiválasztott játéktípushoz ${expectedOpponents} ellenfél szükséges.`,
    };
  }

  if (opponentIds.includes(user.id)) {
    return {
      ok: false,
      error: "Saját magadat nem adhatod hozzá ellenfélként.",
    };
  }

  const debtFt = await getUserDebtFt(supabase, user.id);

  if (debtFt >= feeRules.debtLockoutFt) {
    return {
      ok: false,
      error: `Foglalás nem lehetséges: a tartozásod eléri a ${feeRules.debtLockoutFt} Ft-ot.`,
    };
  }

  let startsAt = "";

  try {
    startsAt = toIsoStart(input.date, input.hour, input.timezoneOffsetMinutes);
  } catch {
    return {
      ok: false,
      error: "Érvénytelen dátum vagy időpont.",
    };
  }

  const endsAt = addHour(startsAt);
  const isPeak = PEAK_HOURS.has(input.hour);

  if (
    context.memberCategory === "palyaberlo" &&
    !isNonMemberHourAllowed(input.date, input.hour, nonMemberAllowedHours)
  ) {
    return {
      ok: false,
      error: "Pályabérlő kategóriával ez az időpont nem foglalható az aktuális napi szabályok alapján.",
    };
  }

  const closureRes = await supabase
    .from("court_closures")
    .select("id, start_hour, end_hour")
    .eq("court_id", input.courtId)
    .lte("start_date", input.date)
    .gte("end_date", input.date)
    .limit(100);

  if (closureRes.error) {
    return {
      ok: false,
      error: "A pályazárás ellenőrzése sikertelen.",
    };
  }

  const isClosedForHour = ((closureRes.data ?? []) as {
    id: string;
    start_hour: number | null;
    end_hour: number | null;
  }[]).some((closure) => {
    if (closure.start_hour === null || closure.end_hour === null) {
      return true;
    }

    return input.hour >= closure.start_hour && input.hour < closure.end_hour;
  });

  if (isClosedForHour) {
    return {
      ok: false,
      error: "Ez a pálya a kiválasztott időpontban zárva van.",
    };
  }

  const conflictRes = await supabase
    .from("bookings")
    .select("id")
    .eq("court_id", input.courtId)
    .eq("starts_at", startsAt)
    .eq("status", "active")
    .maybeSingle();

  if (conflictRes.data?.id) {
    return {
      ok: false,
      error: "Ez az időpont már foglalt. Válassz másik pályát vagy időpontot.",
    };
  }

  const weekRange = getWeekRangeFromIso(startsAt);
  const weeklyUsageRes = await supabase
    .from("bookings")
    .select("is_peak, is_coaching")
    .eq("booker_user_id", user.id)
    .eq("status", "active")
    .gte("starts_at", weekRange.weekStartIso)
    .lt("starts_at", weekRange.weekEndIso);

  const versenyzoiFreeHoursUsedThisWeek = ((weeklyUsageRes.data ?? []) as {
    is_peak: boolean;
    is_coaching: boolean;
  }[]).filter((row) => !row.is_peak && !row.is_coaching).length;

  const fee = calculateBookingFee({
    feeRules,
    memberCategory: context.memberCategory,
    isPeak,
    isCoaching: input.isCoaching,
    versenyzoiFreeHoursUsedThisWeek,
    hasLightingFee: false,
    isMufuves: false,
  });

  const insertBookingRes = await supabase
    .from("bookings")
    .insert({
      court_id: input.courtId,
      booker_user_id: user.id,
      starts_at: startsAt,
      ends_at: endsAt,
      game_type: input.gameType,
      status: "active",
      is_peak: isPeak,
      is_coaching: input.isCoaching,
    })
    .select("id, court_id, starts_at, booker_user_id, game_type, is_coaching")
    .single();

  if (insertBookingRes.error || !insertBookingRes.data) {
    return {
      ok: false,
      error: "A foglalás mentése sikertelen.",
    };
  }

  const bookingId = insertBookingRes.data.id as string;

  const bookingPlayersRows = [
    {
      booking_id: bookingId,
      user_id: user.id,
      is_booker: true,
    },
    ...opponentIds.map((opponentId) => ({
      booking_id: bookingId,
      user_id: opponentId,
      is_booker: false,
    })),
  ];

  const insertPlayersRes = await supabase.from("booking_players").insert(bookingPlayersRows);

  if (insertPlayersRes.error) {
    await supabase
      .from("bookings")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", bookingId);

    return {
      ok: false,
      error: "A foglalás mentése közben hiba történt (játékoslista).",
    };
  }

  if (fee.totalFeeFt > 0) {
    try {
      const baseAccountId = await getOrCreateBaseAccountId(supabase, user.id);

      const insertTxRes = await supabase.from("transactions").insert({
        account_id: baseAccountId,
        booking_id: bookingId,
        amount: -fee.totalFeeFt,
        currency: "HUF",
        status_code: "N",
        note: input.isCoaching
          ? "Oktatás foglalás díja"
          : context.memberCategory === "palyaberlo"
            ? "Pályabérlő foglalás díja"
            : "Pályafoglalás díja",
        created_by: user.id,
      });

      if (insertTxRes.error) {
        await supabase
          .from("bookings")
          .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
          .eq("id", bookingId);

        return {
          ok: false,
          error: "A foglalás díjkönyvelése sikertelen.",
        };
      }
    } catch {
      await supabase
        .from("bookings")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("id", bookingId);

      return {
        ok: false,
        error: "A foglalás díjkönyvelése sikertelen.",
      };
    }
  }

  const namesMap = await resolveMemberNames(supabase, opponentIds);

  revalidatePath("/foglalas");

  return {
    ok: true,
    data: {
      id: bookingId,
      courtId: String(insertBookingRes.data.court_id),
      startsAt: insertBookingRes.data.starts_at as string,
      bookerId: insertBookingRes.data.booker_user_id as string,
      bookerName: userName,
      gameType: insertBookingRes.data.game_type as GameType,
      isCoaching: Boolean(insertBookingRes.data.is_coaching),
      opponents: opponentIds.map((id) => ({
        id,
        name: namesMap.get(id) ?? "Névtelen játékos",
      })),
    },
  };
}

export async function updateBookingOpponentsAction(
  input: UpdateBookingInput,
): Promise<ActionResult<BookingGridBooking>> {
  const context = await getCurrentUserContext();

  if (context.error || !context.user) {
    return {
      ok: false,
      error: context.error ?? "Bejelentkezés szükséges.",
    };
  }

  const { supabase, user, userName } = context;

  const opponentIds = normalizeOpponentIds(input.opponentIds);
  const expectedOpponents = requiredOpponents(input.gameType);

  if (opponentIds.length !== expectedOpponents) {
    return {
      ok: false,
      error: `A kiválasztott játéktípushoz ${expectedOpponents} ellenfél szükséges.`,
    };
  }

  if (opponentIds.includes(user.id)) {
    return {
      ok: false,
      error: "Saját magadat nem adhatod hozzá ellenfélként.",
    };
  }

  const bookingRes = await supabase
    .from("bookings")
    .select("id, court_id, starts_at, booker_user_id, game_type, status, is_coaching")
    .eq("id", input.bookingId)
    .maybeSingle();

  const booking = bookingRes.data;

  if (!booking || booking.status !== "active") {
    return {
      ok: false,
      error: "A foglalás nem található vagy már nem aktív.",
    };
  }

  if ((booking.booker_user_id as string) !== user.id) {
    return {
      ok: false,
      error: "Csak a saját foglalásodat módosíthatod.",
    };
  }

  const updateBookingRes = await supabase
    .from("bookings")
    .update({ game_type: input.gameType })
    .eq("id", input.bookingId)
    .eq("booker_user_id", user.id);

  if (updateBookingRes.error) {
    return {
      ok: false,
      error: "A foglalás módosítása sikertelen.",
    };
  }

  const deleteOpponentsRes = await supabase
    .from("booking_players")
    .delete()
    .eq("booking_id", input.bookingId)
    .eq("is_booker", false);

  if (deleteOpponentsRes.error) {
    return {
      ok: false,
      error: "A korábbi ellenfelek törlése sikertelen.",
    };
  }

  if (opponentIds.length > 0) {
    const insertOpponentsRes = await supabase.from("booking_players").insert(
      opponentIds.map((opponentId) => ({
        booking_id: input.bookingId,
        user_id: opponentId,
        is_booker: false,
      })),
    );

    if (insertOpponentsRes.error) {
      return {
        ok: false,
        error: "Az új ellenfelek mentése sikertelen.",
      };
    }
  }

  const namesMap = await resolveMemberNames(supabase, opponentIds);

  revalidatePath("/foglalas");

  return {
    ok: true,
    data: {
      id: input.bookingId,
      courtId: String(booking.court_id),
      startsAt: booking.starts_at as string,
      bookerId: booking.booker_user_id as string,
      bookerName: userName,
      gameType: input.gameType,
      isCoaching: Boolean(booking.is_coaching),
      opponents: opponentIds.map((id) => ({
        id,
        name: namesMap.get(id) ?? "Névtelen játékos",
      })),
    },
  };
}
