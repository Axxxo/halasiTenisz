export type AdminCourt = {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

export type AdminCourtsActionResult =
  | {
      ok: true;
      data: AdminCourt[];
    }
  | {
      ok: false;
      error: string;
    };

export type MemberCategory = "normal" | "diak" | "versenyzoi" | "palyaberlo";

export type FeeRules = {
  baseRateFt: number;
  nonMemberPeakRateFt: number;
  nonMemberOffpeakRateFt: number;
  diakOffpeakDiscountPct: number;
  coachingRateFt: number;
  versenyzoiFreeOffpeakHoursPerWeek: number;
  lightingFeeFt: number;
  mufuvesFeeFt: number;
  debtLockoutFt: number;
  lateCancelMinutes: number;
};

export type AdminFeeSettingsActionResult =
  | {
      ok: true;
      data: FeeRules;
    }
  | {
      ok: false;
      error: string;
    };

export type CourtClosureItem = {
  id: string;
  courtId: string;
  courtName: string;
  startDate: string;
  endDate: string;
  startHour: number | null;
  endHour: number | null;
  reason: string | null;
  createdAt: string;
};

export type AdminClosuresActionResult =
  | {
      ok: true;
      data: CourtClosureItem[];
    }
  | {
      ok: false;
      error: string;
    };

export type AdminMemberItem = {
  id: string;
  fullName: string;
  email: string;
  role: "member" | "admin";
  memberCategory: MemberCategory;
  isActive: boolean;
  membershipRequested: boolean;
  balanceFt: number;
  debtFt: number;
};

export type AdminMembersActionResult =
  | {
      ok: true;
      data: AdminMemberItem[];
    }
  | {
      ok: false;
      error: string;
    };

export type AdminMemberPaymentSummary = {
  userId: string;
  fullName: string;
  email: string;
  balanceFt: number;
  debtFt: number;
};

export type AdminPaymentTransactionItem = {
  id: string;
  userId: string;
  userName: string;
  accountType: "membership" | "base" | "lighting" | "extra";
  amountFt: number;
  note: string | null;
  createdAt: string;
};

export type AdminPaymentsData = {
  members: AdminMemberPaymentSummary[];
  transactions: AdminPaymentTransactionItem[];
};

export type AdminPaymentsActionResult =
  | {
      ok: true;
      data: AdminPaymentsData;
    }
  | {
      ok: false;
      error: string;
    };
