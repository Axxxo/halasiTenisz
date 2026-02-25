"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";

import type { AdminPaymentsActionResult, AdminPaymentsData } from "@/lib/admin/types";

type PaymentsManagerProps = {
  initialData: AdminPaymentsData;
  createManualTransactionAction: (input: {
    userId: string;
    accountType: "membership" | "base" | "lighting" | "extra";
    amountFt: number;
    note: string;
  }) => Promise<AdminPaymentsActionResult>;
};

export function PaymentsManager({ initialData, createManualTransactionAction }: PaymentsManagerProps) {
  const [data, setData] = useState(initialData);
  const [selectedUserId, setSelectedUserId] = useState(initialData.members[0]?.userId ?? "");
  const [accountType, setAccountType] = useState<"membership" | "base" | "lighting" | "extra">("base");
  const [amountFt, setAmountFt] = useState("1000");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedMemberTransactions = useMemo(
    () => data.transactions.filter((transaction) => transaction.userId === selectedUserId),
    [data.transactions, selectedUserId],
  );

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const result = await createManualTransactionAction({
        userId: selectedUserId,
        accountType,
        amountFt: Number(amountFt),
        note,
      });

      if (!result.ok) {
        setError(result.error);
        setSuccess(null);
        return;
      }

      setData(result.data);
      setError(null);
      setSuccess("Tranzakció rögzítve.");
      setNote("");
    });
  }

  return (
    <div className="space-y-5">
      <div className="soft-card p-5">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl text-primary-strong">Manuális könyvelés</h2>
        <p className="mt-2 text-sm text-foreground/75">
          Adj hozzá terhelést vagy jóváírást a kiválasztott tag számlájához.
        </p>

        <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={onSubmit}>
          <label className="flex flex-col gap-1 text-sm md:col-span-2">
            <span className="font-semibold text-foreground/80">Tag</span>
            <select
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
              className="rounded-lg border border-border bg-white px-3 py-2"
            >
              {data.members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.fullName} ({member.balanceFt} Ft)
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-foreground/80">Számla típus</span>
            <select
              value={accountType}
              onChange={(event) =>
                setAccountType(event.target.value as "membership" | "base" | "lighting" | "extra")
              }
              className="rounded-lg border border-border bg-white px-3 py-2"
            >
              <option value="membership">Tagdíj</option>
              <option value="base">Pálya</option>
              <option value="lighting">Világítás</option>
              <option value="extra">Egyéb</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-foreground/80">Összeg (Ft)</span>
            <input
              type="number"
              value={amountFt}
              onChange={(event) => setAmountFt(event.target.value)}
              className="rounded-lg border border-border bg-white px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm md:col-span-3">
            <span className="font-semibold text-foreground/80">Megjegyzés</span>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Pl. készpénzes befizetés"
              className="rounded-lg border border-border bg-white px-3 py-2"
            />
          </label>

          <div className="md:col-span-1 flex items-end justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-primary px-4 py-2 font-semibold text-white transition-colors hover:bg-primary-strong disabled:opacity-60"
            >
              {isPending ? "Mentés..." : "Tranzakció rögzítése"}
            </button>
          </div>
        </form>
      </div>

      {success ? <p className="text-sm font-semibold text-primary-strong">{success}</p> : null}
      {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}

      <div className="soft-card p-4">
        <h3 className="font-semibold text-foreground">Legutóbbi tranzakciók (kiválasztott tag)</h3>
        {selectedMemberTransactions.length === 0 ? (
          <p className="mt-2 text-sm text-foreground/70">Nincs tranzakció.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {selectedMemberTransactions.map((transaction) => (
              <li
                key={transaction.id}
                className="rounded-lg border border-border bg-muted/40 px-3 py-2"
              >
                <p className="font-semibold text-foreground">
                  {transaction.amountFt} Ft · {transaction.accountType} · {new Date(transaction.createdAt).toLocaleString("hu-HU")}
                </p>
                <p className="text-foreground/70">{transaction.note ?? "-"}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
