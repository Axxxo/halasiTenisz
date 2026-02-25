import Link from "next/link";

import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <section className="shell-container py-10">
      <div className="mx-auto max-w-md soft-card p-6">
        <h1 className="font-[family-name:var(--font-heading)] text-3xl text-primary-strong">
          Regisztráció
        </h1>
        <p className="mt-2 text-foreground/75">
          Regisztráció után pályabérlőként azonnal foglalhatsz az engedélyezett idősávokban,
          klubtagsághoz admin jóváhagyás szükséges.
        </p>

        <RegisterForm />

        <div className="mt-5 text-sm">
          <Link
            href="/belepes"
            className="rounded-lg border border-border px-4 py-2 font-semibold text-primary transition-colors hover:bg-muted"
          >
            Már van fiókod? Belépés
          </Link>
        </div>
      </div>
    </section>
  );
}
