const highlights = [
  "A klub 1987 óta működik Kiskunhalason, közösségi és versenysport fókuszú működéssel.",
  "A tagság admin jóváhagyással aktiválódik a tagdíj rendezése után.",
  "A pályafoglalás és elszámolás a klub online rendszerén keresztül történik.",
  "A klub célja a fair play, a közösségi részvétel és az utánpótlás támogatása.",
];

export default function BylawsPage() {
  return (
    <section className="shell-container py-10">
      <h1 className="font-[family-name:var(--font-heading)] text-4xl text-primary-strong">
        Alapszabály
      </h1>
      <p className="mt-3 max-w-3xl text-foreground/80">
        Ez az oldal a klub történetét és hivatalos működési alapelveit tartalmazza. A
        végleges, adminból szerkeszthető tartalom a következő iterációban kerül
        bekötésre.
      </p>

      <div className="mt-6 grid gap-3">
        {highlights.map((item) => (
          <article key={item} className="soft-card p-4 text-foreground/85">
            {item}
          </article>
        ))}
      </div>
    </section>
  );
}
