export default function CompetitionsPage() {
  const seasons = [
    {
      year: 2026,
      categories: ["A egyéni liga", "A páros liga", "B egyéni liga", "B páros liga", "Versenynaptár"],
    },
    {
      year: 2025,
      categories: ["A egyéni liga", "A páros liga", "B egyéni liga", "B páros liga", "Versenynaptár"],
    },
  ];

  return (
    <section className="shell-container py-10">
      <h1 className="font-[family-name:var(--font-heading)] text-4xl text-primary-strong">
        Versenyek
      </h1>
      <p className="mt-3 max-w-3xl text-foreground/80">
        Szezononként és kategóriánként érhetők el a versenykiírások, állások és
        eredmények. A dokumentumok admin felületről frissíthetők.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {seasons.map((season) => (
          <article key={season.year} className="soft-card p-5">
            <h2 className="text-xl font-semibold text-primary">{season.year}. szezon</h2>
            <ul className="mt-3 space-y-2 text-foreground/80">
              {season.categories.map((category) => (
                <li key={category} className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2">
                  <span>{category}</span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-primary/80">PDF / tartalom</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
