const principles = [
  {
    title: "Tisztelet",
    description:
      "Minden játékos, edző és vendég tiszteletteljes kommunikációra és sportszerű viselkedésre köteles.",
  },
  {
    title: "Fair play",
    description:
      "A klub minden pályán a szabálykövető, korrekt és együttműködő játékstílust támogatja.",
  },
  {
    title: "Közösségi felelősség",
    description:
      "A pályák, öltözők és közös terek rendjének megőrzése közös felelősség.",
  },
  {
    title: "Utánpótlás támogatása",
    description:
      "A klub prioritásként kezeli a fiatal játékosok fejlődését és mentorálását.",
  },
];

export default function EthicsPage() {
  return (
    <section className="shell-container py-10">
      <h1 className="font-[family-name:var(--font-heading)] text-4xl text-primary-strong">
        Etikai kódex
      </h1>
      <p className="mt-3 max-w-3xl text-foreground/80">
        A Halasi Tenisz Klub közössége a tisztelet, a sportszerűség és a felelős
        közösségi jelenlét elveit követi.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {principles.map((principle) => (
          <article key={principle.title} className="soft-card p-5">
            <h2 className="text-lg font-semibold text-primary">{principle.title}</h2>
            <p className="mt-2 text-foreground/80">{principle.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
