import { createClient } from "@/lib/supabase/server";
import type { HourRange, WeekdayKey } from "@/lib/booking/types";
import { loadFeeRules, loadNonMemberAllowedHours } from "@/server/booking/fee-settings";

function formatFt(value: number) {
  return new Intl.NumberFormat("hu-HU").format(value);
}

function formatHour(hour: number) {
  return `${hour.toString().padStart(2, "0")}:00`;
}

function formatRanges(ranges: HourRange[]) {
  if (ranges.length === 0) {
    return "Nincs korlátozva";
  }

  return ranges.map((range) => `${formatHour(range.start)} - ${formatHour(range.end)}`).join(", ");
}

export default async function CourtUsagePage() {
  const supabase = await createClient();
  const [feeRules, nonMemberAllowedHours] = await Promise.all([
    loadFeeRules(supabase),
    loadNonMemberAllowedHours(supabase),
  ]);

  const dayLabels: Record<WeekdayKey, string> = {
    monday: "Hétfő",
    tuesday: "Kedd",
    wednesday: "Szerda",
    thursday: "Csütörtök",
    friday: "Péntek",
    saturday: "Szombat",
    sunday: "Vasárnap",
  };

  const bookingRules = [
    "A pályafoglalás online, a halasitenisz.hu rendszerén keresztül történik.",
    `Az alap pályadíj ${formatFt(feeRules.baseRateFt)} Ft / pálya / óra.`,
    "A pályabérlő (nem klubtag) kategória csak a beállított napi idősávokban foglalhat önállóan.",
    "Az elszámolás minden megkezdett teljes órában, az előzetes foglalás alapján történik.",
    "A foglalást indító játékos állítja be a feltételeket, és a rendszer minden megjelölt játékosnál könyveli a díjat.",
    `A foglalás legkésőbb ${feeRules.lateCancelMinutes} perccel a kezdés előtt lemondható díjmentesen.`,
    `${feeRules.lateCancelMinutes} percen belüli lemondás esetén a díj terhelése megtörténik.`,
    "Minden játékos online követheti a pályahasználati, műfüves és világítási egyenlegét.",
    `${formatFt(feeRules.debtLockoutFt)} Ft vagy annál magasabb tartozás esetén új foglalás nem indítható a tartozás rendezéséig.`,
  ];

  const paymentRules = [
    "A pályahasználat rendezhető előre feltöltött egyenlegről vagy érkezéskor fizetéssel.",
    "A feltöltés a gondnoknál történik.",
    `Pályabérlő eseti díj főidőn kívül: ${formatFt(feeRules.nonMemberOffpeakRateFt)} Ft / óra.`,
    `Pályabérlő eseti díj főidőben: ${formatFt(feeRules.nonMemberPeakRateFt)} Ft / óra (csak klub jóváhagyással/eltéréssel).`,
    `Diákoknak csúcsidőn kívül ${feeRules.diakOffpeakDiscountPct}% kedvezmény jár.`,
    `Edzés (coaching) esetén a díj egységesen ${formatFt(feeRules.coachingRateFt)} Ft / pálya / óra, diák/felnőtt bontástól függetlenül.`,
    `Regisztrált versenyzők számára heti ${feeRules.versenyzoiFreeOffpeakHoursPerWeek} óra edzés célú ingyenes pályahasználat biztosított csúcsidőn kívül.`,
  ];

  return (
    <section className="shell-container py-10">
      <h1 className="font-[family-name:var(--font-heading)] text-4xl text-primary-strong">
        Pályahasználat
      </h1>
      <p className="mt-3 max-w-3xl text-foreground/80">
        Az alábbi szabályok a Halasi Tenisz Klub pályahasználatának és elszámolásának
        alapját adják.
      </p>

      <article id="dijszabas" className="mt-6 soft-card p-5">
        <h2 className="text-lg font-semibold text-primary">Aktuális díjtábla</h2>
        <div className="mt-3 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <p className="rounded-lg border border-border bg-muted/35 px-3 py-2">
            <span className="font-semibold">Alapdíj:</span> {formatFt(feeRules.baseRateFt)} Ft / óra
          </p>
          <p className="rounded-lg border border-border bg-muted/35 px-3 py-2">
            <span className="font-semibold">Pályabérlő (off-peak):</span> {formatFt(feeRules.nonMemberOffpeakRateFt)} Ft / óra
          </p>
          <p className="rounded-lg border border-border bg-muted/35 px-3 py-2">
            <span className="font-semibold">Pályabérlő (peak):</span> {formatFt(feeRules.nonMemberPeakRateFt)} Ft / óra
          </p>
          <p className="rounded-lg border border-border bg-muted/35 px-3 py-2">
            <span className="font-semibold">Coaching:</span> {formatFt(feeRules.coachingRateFt)} Ft / óra
          </p>
          <p className="rounded-lg border border-border bg-muted/35 px-3 py-2">
            <span className="font-semibold">Világítás:</span> {formatFt(feeRules.lightingFeeFt)} Ft / óra
          </p>
          <p className="rounded-lg border border-border bg-muted/35 px-3 py-2">
            <span className="font-semibold">Műfüves felár:</span> {formatFt(feeRules.mufuvesFeeFt)} Ft / óra
          </p>
        </div>
      </article>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <article className="soft-card p-5">
          <h2 className="text-lg font-semibold text-primary">Foglalási és elszámolási szabályok</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-foreground/85">
            {bookingRules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </article>

        <article className="soft-card p-5">
          <h2 className="text-lg font-semibold text-primary">Fizetés és kedvezmények</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-foreground/85">
            {paymentRules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>

          <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <p className="font-semibold text-foreground">Pályabérlő foglalható idősávok</p>
            <ul className="mt-2 space-y-1 text-foreground/80">
              {(Object.keys(dayLabels) as WeekdayKey[]).map((day) => (
                <li key={day}>
                  <span className="font-semibold">{dayLabels[day]}:</span>{" "}
                  {formatRanges(nonMemberAllowedHours[day])}
                </li>
              ))}
            </ul>
          </div>
        </article>
      </div>
    </section>
  );
}
