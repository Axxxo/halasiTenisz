import Image from "next/image";
import Link from "next/link";

import imageClubCourts from "@/images/1.png";
import imageMobileBooking from "@/images/2.png";
import imageBallLine from "@/images/3.png";
import imageClubhouse from "@/images/4.png";
import imageMatch from "@/images/5.png";
import { createClient } from "@/lib/supabase/server";
import { loadFeeRules } from "@/server/booking/fee-settings";

const highlights = [
  {
    title: "Gyors pályafoglalás",
    description: "Dátum, pálya, játéktípus: néhány kattintással kész, mobilról is.",
    image: imageMobileBooking,
    alt: "Játékos mobiltelefonnal a pálya mellett",
  },
  {
    title: "Átlátható foglalásaim",
    description: "Egy helyen látod a meccseidet, és több foglalást is lemondhatsz egyszerre.",
    image: imageMatch,
    alt: "Mérkőzés közbeni jelenet közönséggel",
  },
  {
    title: "Klubélet egy helyen",
    description: "Szabályok, versenyek, galéria és fontos információk tisztán, gyorsan elérhetők.",
    image: imageBallLine,
    alt: "Teniszlabda a vonalon közelről",
  },
];

const steps = [
  {
    number: "01",
    title: "Regisztráció",
    text: "Hozd létre fiókodat: pályabérlőként azonnal foglalhatsz az engedélyezett idősávokban, teljes tagsági joghoz admin jóváhagyás kell.",
  },
  {
    number: "02",
    title: "Belépés és foglalás",
    text: "Válassz dátumot, pályát és játéktípust. A rendszer azonnal ellenőrzi a foglalhatóságot.",
  },
  {
    number: "03",
    title: "Kezeld a foglalásaid",
    text: "A Foglalásaim oldalon több tételt is egyszerre lemondhatsz, dinamikus szabályjelzéssel.",
  },
];

export default async function Home() {
  const supabase = await createClient();
  const feeRules = await loadFeeRules(supabase);

  return (
    <div className="pb-10">
      <section className="relative isolate overflow-hidden border-b border-border bg-[radial-gradient(circle_at_88%_8%,#d7e9d2_0%,transparent_36%),radial-gradient(circle_at_8%_84%,#ebdccf_0%,transparent_34%),linear-gradient(165deg,#f9fcf6_0%,#f6f4ef_100%)]">
        <div className="shell-container grid gap-10 py-14 md:grid-cols-[1.05fr_0.95fr] md:py-20">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Megújult weboldal · Kiskunhalas
            </p>
            <h1 className="max-w-2xl font-[family-name:var(--font-heading)] text-5xl leading-[0.92] text-primary-strong md:text-7xl">
              Üdv a Halasi Tenisz Klub megújult online felületén
            </h1>
            <p className="mt-4 max-w-xl text-lg text-foreground/80">
              Regisztrálj, foglalj pályabérlőként az engedélyezett idősávokban, majd kérj
              klubtagságot admin jóváhagyással a teljes tagsági jogosultságokhoz.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/regisztracio"
                className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-strong"
              >
                Regisztrálok a foglaláshoz
              </Link>
              <Link
                href="/belepes"
                className="rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-foreground/85 transition-colors hover:bg-muted"
              >
                Már van fiókom, belépek
              </Link>
            </div>

            <div className="mt-7 grid max-w-xl grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-border bg-surface/80 p-3">
                <p className="font-[family-name:var(--font-heading)] text-3xl text-primary">4</p>
                <p className="text-xs text-foreground/70">nézet egy helyen</p>
              </div>
              <div className="rounded-xl border border-border bg-surface/80 p-3">
                <p className="font-[family-name:var(--font-heading)] text-3xl text-primary">24/7</p>
                <p className="text-xs text-foreground/70">elérhető foglalás</p>
              </div>
              <div className="rounded-xl border border-border bg-surface/80 p-3">
                <p className="font-[family-name:var(--font-heading)] text-3xl text-primary">
                  {feeRules.lateCancelMinutes}p
                </p>
                <p className="text-xs text-foreground/70">aktuális lemondási szabály</p>
              </div>
            </div>
          </div>

          <div className="relative flex min-h-[350px] items-center justify-center md:min-h-[460px]">
            <div className="absolute inset-8 rounded-[2rem] bg-[linear-gradient(150deg,#e2edd9_0%,#f4efe7_100%)] blur-2xl" />

            <div className="relative z-10 w-full max-w-xl rounded-2xl border border-border bg-surface shadow-[0_14px_48px_rgba(22,50,35,0.16)]">
              <div className="flex items-center gap-2 border-b border-border px-4 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff8b73]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#f3c969]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#7bc38f]" />
                <p className="ml-3 text-xs text-foreground/60">halasitenisz.hu/foglalas</p>
              </div>

              <div className="grid gap-3 p-4">
                <div className="rounded-xl border border-border bg-[#f8fbf5] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    Napi pályanézet
                  </p>
                  <div className="mt-2 grid grid-cols-4 gap-1.5">
                    {Array.from({ length: 16 }, (_, idx) => (
                      <span
                        key={idx}
                        className={`h-6 rounded-md ${
                          idx % 5 === 0
                            ? "bg-primary/25"
                            : idx % 3 === 0
                              ? "bg-accent/25"
                              : "bg-white"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">Foglalásaim</p>
                    <div className="mt-2 space-y-1.5">
                      <div className="h-3 rounded bg-muted" />
                      <div className="h-3 rounded bg-muted" />
                      <div className="h-3 w-3/4 rounded bg-muted" />
                    </div>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">Egyenleg</p>
                    <p className="mt-2 font-[family-name:var(--font-heading)] text-3xl text-primary-strong">
                      0 Ft
                    </p>
                    <p className="text-xs text-foreground/65">átlátható terhelések</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-3 -right-2 hidden w-44 rounded-2xl border border-border bg-surface p-3 shadow-xl md:block">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Mobil nézet</p>
              <div className="mt-2 space-y-1.5">
                <div className="h-2.5 rounded bg-muted" />
                <div className="h-2.5 rounded bg-muted" />
                <div className="h-2.5 w-2/3 rounded bg-primary/25" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="shell-container mt-16 space-y-8 pb-6 md:mt-20 md:space-y-10">
        <section>
          <div className="rounded-3xl border border-border bg-[linear-gradient(165deg,#f7fbf4_0%,#ffffff_100%)] p-6 shadow-[0_14px_28px_rgba(27,62,45,0.06)] md:p-8">
            <div className="grid gap-6 md:grid-cols-[1.05fr_0.95fr] md:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Mi újult meg?</p>
                <h2 className="mt-2 font-[family-name:var(--font-heading)] text-4xl leading-[0.95] text-primary-strong md:text-5xl">
                  A megszokott klub, egy átláthatóbb online felületen
                </h2>
                <p className="mt-3 text-foreground/75">
                  Az új oldal célja egyszerű: gyorsabban tudj foglalni, könnyebben lásd a saját
                  meccseidet, és minden klubinformációt egy helyen érj el.
                </p>
              </div>

              <figure className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
                <Image
                  src={imageClubhouse}
                  alt="Klubház és pálya a Halasi Tenisz Klub hangulatával"
                  className="h-48 w-full origin-top scale-[1.12] object-cover object-top md:h-56"
                  sizes="(max-width: 768px) 100vw, 46vw"
                  priority
                />
                <figcaption className="absolute bottom-3 left-3 rounded-full bg-surface/90 px-3 py-1 text-xs font-semibold text-primary">
                  Klubhangulat · Kiskunhalas
                </figcaption>
              </figure>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {highlights.map((item) => (
                <article key={item.title} className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                  <h3 className="text-xl font-semibold text-primary-strong">{item.title}</h3>
                  <p className="mt-2 text-foreground/75">{item.description}</p>

                  <div className="mt-4 overflow-hidden rounded-xl border border-border">
                    <Image
                      src={item.image}
                      alt={item.alt}
                      className="h-36 w-full object-cover object-top"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="rounded-3xl border border-border bg-surface p-6 shadow-[0_14px_28px_rgba(27,62,45,0.06)] md:p-8">
            <h2 className="font-[family-name:var(--font-heading)] text-4xl leading-[0.95] text-primary-strong md:text-5xl">
              Így indulj el 3 lépésben
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {steps.map((step) => (
                <article key={step.number} className="rounded-2xl border border-border bg-muted/35 p-5">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 font-[family-name:var(--font-heading)] text-2xl text-accent">
                    {step.number}
                  </div>
                  <h3 className="mt-3 text-2xl font-semibold text-primary-strong">{step.title}</h3>
                  <p className="mt-2 text-foreground/75">{step.text}</p>
                </article>
              ))}
            </div>

          </div>
        </section>

        <section>
          <div className="rounded-3xl border border-border bg-[linear-gradient(165deg,#eff5e8_0%,#f8f5f0_100%)] p-6 shadow-[0_14px_28px_rgba(27,62,45,0.06)] md:p-8">
            <div className="grid gap-6 md:grid-cols-[1.15fr_0.85fr] md:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Próbáld ki most</p>
                <h2 className="mt-2 font-[family-name:var(--font-heading)] text-4xl leading-[0.95] text-primary-strong md:text-5xl">
                  Fedezd fel a megújult foglalási felületet
                </h2>
                <p className="mt-3 text-foreground/75">
                  Regisztráció után minden foglalási és lemondási funkció elérhető számodra.
                  A felületet kifejezetten a klub működésére hangoltuk.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href="/regisztracio"
                    className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-strong"
                  >
                    Regisztráció
                  </Link>
                  <Link
                    href="/foglalas"
                    className="rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-foreground/85 transition-colors hover:bg-muted"
                  >
                    Foglalási felület megnyitása
                  </Link>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border bg-surface/85">
                <Image
                  src={imageClubCourts}
                  alt="Pályák és játékosok a klubban"
                  className="h-32 w-full origin-top scale-[1.12] object-cover object-top"
                  sizes="(max-width: 768px) 100vw, 40vw"
                />
                <div className="p-5">
                  <p className="text-sm font-semibold text-primary">Mit találsz bent?</p>
                  <ul className="mt-3 space-y-2 text-sm text-foreground/80">
                    <li>• Napi pályanézet valós foglalásokkal</li>
                    <li>• Saját foglalások módosítása</li>
                    <li>• Tömeges lemondás figyelmeztetéssel</li>
                    <li>• Kluboldalak és hírek egy helyen</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
