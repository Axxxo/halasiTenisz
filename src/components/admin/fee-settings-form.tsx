"use client";

import { FormEvent, useState, useTransition } from "react";

import type { AdminFeeSettingsActionResult, FeeRules } from "@/lib/admin/types";

type FeeSettingsFormProps = {
  initialRules: FeeRules;
  updateFeeSettingsAction: (input: FeeRules) => Promise<AdminFeeSettingsActionResult>;
};

type RulesForm = {
  baseRateFt: string;
  nonMemberPeakRateFt: string;
  nonMemberOffpeakRateFt: string;
  diakOffpeakDiscountPct: string;
  coachingRateFt: string;
  versenyzoiFreeOffpeakHoursPerWeek: string;
  lightingFeeFt: string;
  mufuvesFeeFt: string;
  debtLockoutFt: string;
  lateCancelMinutes: string;
};

function toForm(rules: FeeRules): RulesForm {
  return {
    baseRateFt: String(rules.baseRateFt),
    nonMemberPeakRateFt: String(rules.nonMemberPeakRateFt),
    nonMemberOffpeakRateFt: String(rules.nonMemberOffpeakRateFt),
    diakOffpeakDiscountPct: String(rules.diakOffpeakDiscountPct),
    coachingRateFt: String(rules.coachingRateFt),
    versenyzoiFreeOffpeakHoursPerWeek: String(rules.versenyzoiFreeOffpeakHoursPerWeek),
    lightingFeeFt: String(rules.lightingFeeFt),
    mufuvesFeeFt: String(rules.mufuvesFeeFt),
    debtLockoutFt: String(rules.debtLockoutFt),
    lateCancelMinutes: String(rules.lateCancelMinutes),
  };
}

function toRules(form: RulesForm): FeeRules {
  const numberOf = (value: string) => Number(value.trim() || "0");

  return {
    baseRateFt: numberOf(form.baseRateFt),
    nonMemberPeakRateFt: numberOf(form.nonMemberPeakRateFt),
    nonMemberOffpeakRateFt: numberOf(form.nonMemberOffpeakRateFt),
    diakOffpeakDiscountPct: numberOf(form.diakOffpeakDiscountPct),
    coachingRateFt: numberOf(form.coachingRateFt),
    versenyzoiFreeOffpeakHoursPerWeek: numberOf(form.versenyzoiFreeOffpeakHoursPerWeek),
    lightingFeeFt: numberOf(form.lightingFeeFt),
    mufuvesFeeFt: numberOf(form.mufuvesFeeFt),
    debtLockoutFt: numberOf(form.debtLockoutFt),
    lateCancelMinutes: numberOf(form.lateCancelMinutes),
  };
}

export function FeeSettingsForm({ initialRules, updateFeeSettingsAction }: FeeSettingsFormProps) {
  const [form, setForm] = useState<RulesForm>(toForm(initialRules));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const result = await updateFeeSettingsAction(toRules(form));

      if (!result.ok) {
        setError(result.error);
        setSuccess(null);
        return;
      }

      setForm(toForm(result.data));
      setError(null);
      setSuccess("Díjszabás mentve.");
    });
  }

  return (
    <div className="soft-card p-5">
      <h2 className="font-[family-name:var(--font-heading)] text-2xl text-primary-strong">Díjszabás</h2>
      <p className="mt-2 text-sm text-foreground/75">
        Minden mező dinamikusan módosítható. A foglalási díjszámítás ezeket az értékeket használja.
      </p>

      <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-foreground/80">Alap pályadíj (Ft / óra)</span>
          <input
            type="number"
            min={0}
            value={form.baseRateFt}
            onChange={(event) => setForm((prev) => ({ ...prev, baseRateFt: event.target.value }))}
            className="rounded-lg border border-border bg-white px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-foreground/80">Pályabérlő díj főidőben (Ft / óra)</span>
          <input
            type="number"
            min={0}
            value={form.nonMemberPeakRateFt}
            onChange={(event) => setForm((prev) => ({ ...prev, nonMemberPeakRateFt: event.target.value }))}
            className="rounded-lg border border-border bg-white px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-foreground/80">Pályabérlő díj főidőn kívül (Ft / óra)</span>
          <input
            type="number"
            min={0}
            value={form.nonMemberOffpeakRateFt}
            onChange={(event) => setForm((prev) => ({ ...prev, nonMemberOffpeakRateFt: event.target.value }))}
            className="rounded-lg border border-border bg-white px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-foreground/80">Diák kedvezmény off-peak (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            value={form.diakOffpeakDiscountPct}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, diakOffpeakDiscountPct: event.target.value }))
            }
            className="rounded-lg border border-border bg-white px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-foreground/80">Oktatás díj (Ft / óra)</span>
          <input
            type="number"
            min={0}
            value={form.coachingRateFt}
            onChange={(event) => setForm((prev) => ({ ...prev, coachingRateFt: event.target.value }))}
            className="rounded-lg border border-border bg-white px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-foreground/80">Versenyző free off-peak (óra / hét)</span>
          <input
            type="number"
            min={0}
            value={form.versenyzoiFreeOffpeakHoursPerWeek}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                versenyzoiFreeOffpeakHoursPerWeek: event.target.value,
              }))
            }
            className="rounded-lg border border-border bg-white px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-foreground/80">Világítási díj (Ft / óra)</span>
          <input
            type="number"
            min={0}
            value={form.lightingFeeFt}
            onChange={(event) => setForm((prev) => ({ ...prev, lightingFeeFt: event.target.value }))}
            className="rounded-lg border border-border bg-white px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-foreground/80">Műfüves felár (Ft / óra)</span>
          <input
            type="number"
            min={0}
            value={form.mufuvesFeeFt}
            onChange={(event) => setForm((prev) => ({ ...prev, mufuvesFeeFt: event.target.value }))}
            className="rounded-lg border border-border bg-white px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-foreground/80">Tartozás limit (Ft)</span>
          <input
            type="number"
            min={0}
            value={form.debtLockoutFt}
            onChange={(event) => setForm((prev) => ({ ...prev, debtLockoutFt: event.target.value }))}
            className="rounded-lg border border-border bg-white px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-foreground/80">Díjmentes lemondás (perc)</span>
          <input
            type="number"
            min={0}
            value={form.lateCancelMinutes}
            onChange={(event) => setForm((prev) => ({ ...prev, lateCancelMinutes: event.target.value }))}
            className="rounded-lg border border-border bg-white px-3 py-2"
          />
        </label>

        <div className="md:col-span-2 mt-2 flex items-center justify-end gap-2">
          {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
          {success ? <p className="text-sm font-semibold text-primary-strong">{success}</p> : null}
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-primary px-4 py-2 font-semibold text-white transition-colors hover:bg-primary-strong disabled:opacity-70"
          >
            {isPending ? "Mentés..." : "Mentés"}
          </button>
        </div>
      </form>
    </div>
  );
}
