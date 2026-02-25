import type { FeeRules, MemberCategory } from "@/lib/admin/types";

export type BookingFeeInput = {
  feeRules: FeeRules;
  memberCategory: MemberCategory;
  isPeak: boolean;
  isCoaching: boolean;
  versenyzoiFreeHoursUsedThisWeek: number;
  hasLightingFee?: boolean;
  isMufuves?: boolean;
};

export type BookingFeeOutput = {
  courtFeeFt: number;
  lightingFeeFt: number;
  mufuvesFeeFt: number;
  totalFeeFt: number;
};

export function calculateBookingFee(input: BookingFeeInput): BookingFeeOutput {
  const { feeRules } = input;

  let courtFeeFt = feeRules.baseRateFt;

  if (input.isCoaching) {
    courtFeeFt = feeRules.coachingRateFt;
  } else if (input.memberCategory === "palyaberlo") {
    courtFeeFt = input.isPeak ? feeRules.nonMemberPeakRateFt : feeRules.nonMemberOffpeakRateFt;
  } else if (input.memberCategory === "diak" && !input.isPeak) {
    const discountPct = Math.min(100, Math.max(0, feeRules.diakOffpeakDiscountPct));
    courtFeeFt = Math.round((feeRules.baseRateFt * (100 - discountPct)) / 100);
  } else if (input.memberCategory === "versenyzoi" && !input.isPeak) {
    if (input.versenyzoiFreeHoursUsedThisWeek < feeRules.versenyzoiFreeOffpeakHoursPerWeek) {
      courtFeeFt = 0;
    }
  }

  const lightingFeeFt = input.hasLightingFee ? feeRules.lightingFeeFt : 0;
  const mufuvesFeeFt = input.isMufuves ? feeRules.mufuvesFeeFt : 0;
  const totalFeeFt = Math.max(0, Math.round(courtFeeFt + lightingFeeFt + mufuvesFeeFt));

  return {
    courtFeeFt,
    lightingFeeFt,
    mufuvesFeeFt,
    totalFeeFt,
  };
}
