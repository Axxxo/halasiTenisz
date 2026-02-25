import type { FeeRules } from "@/lib/admin/types";
import type { HourRange, NonMemberAllowedHours, WeekdayKey } from "@/lib/booking/types";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_FEE_RULES: FeeRules = {
  baseRateFt: 1000,
  nonMemberPeakRateFt: 5000,
  nonMemberOffpeakRateFt: 4000,
  diakOffpeakDiscountPct: 50,
  coachingRateFt: 1000,
  versenyzoiFreeOffpeakHoursPerWeek: 6,
  lightingFeeFt: 0,
  mufuvesFeeFt: 0,
  debtLockoutFt: 5000,
  lateCancelMinutes: 20,
};

const WEEKDAY_KEYS: WeekdayKey[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const DEFAULT_NON_MEMBER_ALLOWED_HOURS: NonMemberAllowedHours = {
  monday: [{ start: 6, end: 16 }],
  tuesday: [{ start: 6, end: 16 }],
  wednesday: [{ start: 6, end: 16 }],
  thursday: [{ start: 6, end: 16 }],
  friday: [{ start: 6, end: 16 }],
  saturday: [],
  sunday: [
    { start: 6, end: 8 },
    { start: 10, end: 16 },
  ],
};

function toNumber(value: unknown, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.round(numeric);
}

function cloneNonMemberAllowedHours(hours: NonMemberAllowedHours): NonMemberAllowedHours {
  return {
    monday: [...hours.monday],
    tuesday: [...hours.tuesday],
    wednesday: [...hours.wednesday],
    thursday: [...hours.thursday],
    friday: [...hours.friday],
    saturday: [...hours.saturday],
    sunday: [...hours.sunday],
  };
}

function toHourRange(value: unknown): HourRange | null {
  const data = (value as Record<string, unknown> | null) ?? {};
  const start = toNumber(data.start, -1);
  const end = toNumber(data.end, -1);

  if (start < 0 || end > 24 || start >= end) {
    return null;
  }

  return { start, end };
}

function toHourRanges(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  return value
    .map(toHourRange)
    .filter((range): range is HourRange => range !== null);
}

export function mapNonMemberAllowedHoursFromDb(value: unknown): NonMemberAllowedHours {
  const data = (value as Record<string, unknown> | null) ?? {};

  const mapped = WEEKDAY_KEYS.reduce(
    (accumulator, day) => {
      const parsed = toHourRanges(data[day]);
      accumulator[day] = parsed ?? [...DEFAULT_NON_MEMBER_ALLOWED_HOURS[day]];
      return accumulator;
    },
    {} as NonMemberAllowedHours,
  );

  return mapped;
}

export function mapFeeRulesFromDb(value: unknown): FeeRules {
  const data = (value as Record<string, unknown> | null) ?? {};

  return {
    baseRateFt: toNumber(data.base_rate_ft, DEFAULT_FEE_RULES.baseRateFt),
    nonMemberPeakRateFt: Math.max(
      0,
      toNumber(data.non_member_peak_rate_ft, DEFAULT_FEE_RULES.nonMemberPeakRateFt),
    ),
    nonMemberOffpeakRateFt: Math.max(
      0,
      toNumber(data.non_member_offpeak_rate_ft, DEFAULT_FEE_RULES.nonMemberOffpeakRateFt),
    ),
    diakOffpeakDiscountPct: Math.min(
      100,
      Math.max(0, toNumber(data.diak_offpeak_discount_pct, DEFAULT_FEE_RULES.diakOffpeakDiscountPct)),
    ),
    coachingRateFt: toNumber(data.coaching_rate_ft, DEFAULT_FEE_RULES.coachingRateFt),
    versenyzoiFreeOffpeakHoursPerWeek: Math.max(
      0,
      toNumber(
        data.versenyzoi_free_offpeak_hours_per_week,
        DEFAULT_FEE_RULES.versenyzoiFreeOffpeakHoursPerWeek,
      ),
    ),
    lightingFeeFt: Math.max(0, toNumber(data.lighting_fee_ft, DEFAULT_FEE_RULES.lightingFeeFt)),
    mufuvesFeeFt: Math.max(0, toNumber(data.mufuves_fee_ft, DEFAULT_FEE_RULES.mufuvesFeeFt)),
    debtLockoutFt: Math.max(0, toNumber(data.debt_lockout_ft, DEFAULT_FEE_RULES.debtLockoutFt)),
    lateCancelMinutes: Math.max(0, toNumber(data.late_cancel_minutes, DEFAULT_FEE_RULES.lateCancelMinutes)),
  };
}

export function mapFeeRulesToDb(rules: FeeRules) {
  return {
    base_rate_ft: rules.baseRateFt,
    non_member_peak_rate_ft: rules.nonMemberPeakRateFt,
    non_member_offpeak_rate_ft: rules.nonMemberOffpeakRateFt,
    diak_offpeak_discount_pct: rules.diakOffpeakDiscountPct,
    coaching_rate_ft: rules.coachingRateFt,
    versenyzoi_free_offpeak_hours_per_week: rules.versenyzoiFreeOffpeakHoursPerWeek,
    lighting_fee_ft: rules.lightingFeeFt,
    mufuves_fee_ft: rules.mufuvesFeeFt,
    debt_lockout_ft: rules.debtLockoutFt,
    late_cancel_minutes: rules.lateCancelMinutes,
  };
}

export async function loadFeeRules(supabase: Awaited<ReturnType<typeof createClient>>): Promise<FeeRules> {
  const settingsRes = await supabase.from("settings").select("value").eq("key", "fee_rules").maybeSingle();

  if (!settingsRes.data?.value) {
    return DEFAULT_FEE_RULES;
  }

  return mapFeeRulesFromDb(settingsRes.data.value);
}

export async function loadNonMemberAllowedHours(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<NonMemberAllowedHours> {
  const settingsRes = await supabase
    .from("settings")
    .select("value")
    .eq("key", "non_member_allowed_hours")
    .maybeSingle();

  if (!settingsRes.data?.value) {
    return cloneNonMemberAllowedHours(DEFAULT_NON_MEMBER_ALLOWED_HOURS);
  }

  return mapNonMemberAllowedHoursFromDb(settingsRes.data.value);
}

export function getDefaultFeeRules() {
  return DEFAULT_FEE_RULES;
}

export function getDefaultNonMemberAllowedHours() {
  return cloneNonMemberAllowedHours(DEFAULT_NON_MEMBER_ALLOWED_HOURS);
}
