import type { FeeRules, MemberCategory } from "@/lib/admin/types";

export type GameType = "solo" | "singles" | "doubles";

export type WeekdayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type HourRange = {
  start: number;
  end: number;
};

export type NonMemberAllowedHours = Record<WeekdayKey, HourRange[]>;

export type BookingGridMember = {
  id: string;
  name: string;
};

export type BookingGridCourt = {
  id: string;
  name: string;
  sortOrder: number;
};

export type BookingGridBooking = {
  id: string;
  courtId: string;
  startsAt: string;
  bookerId: string;
  bookerName: string;
  gameType: GameType;
  isCoaching: boolean;
  opponents: BookingGridMember[];
};

export type BookingGridClosure = {
  courtId: string;
  startDate: string;
  endDate: string;
  startHour: number | null;
  endHour: number | null;
  reason: string | null;
};

export type BookingGridData = {
  currentUser: {
    id: string;
    name: string;
    debtFt: number;
    memberCategory: MemberCategory;
    versenyzoiFreeHoursUsedThisWeek: number;
  };
  courts: BookingGridCourt[];
  members: BookingGridMember[];
  previousPartnerIds: string[];
  bookings: BookingGridBooking[];
  closures: BookingGridClosure[];
  feeRules: FeeRules;
  nonMemberAllowedHours: NonMemberAllowedHours;
  peakHours: number[];
};

export type MyBookingItem = {
  id: string;
  courtName: string;
  startsAt: string;
  cancellationDeadline: string;
  isLateCancellation: boolean;
  gameType: GameType;
  opponents: string[];
};

export type MyBookingsData = {
  items: MyBookingItem[];
  lateCancelMinutes: number;
};

export type CancelBookingsResult = {
  cancelledIds: string[];
  lateCancelledIds: string[];
};

export type ActionResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: string;
    };
