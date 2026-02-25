import Link from "next/link";

const items = [
  { href: "/admin", label: "Pályák" },
  { href: "/admin/dijak", label: "Díjszabás" },
  { href: "/admin/zarasok", label: "Pálya zárások" },
  { href: "/admin/tagok", label: "Tagok és jogok" },
  { href: "/admin/penzugyek", label: "Pénzügyek" },
];

type AdminNavProps = {
  activeHref: string;
};

export function AdminNav({ activeHref }: AdminNavProps) {
  return (
    <nav className="soft-card p-3">
      <ul className="flex flex-wrap gap-2 text-sm font-semibold">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`rounded-lg px-3 py-2 transition-colors ${
                activeHref === item.href
                  ? "bg-primary text-white"
                  : "bg-muted text-foreground/80 hover:bg-muted/70"
              }`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
