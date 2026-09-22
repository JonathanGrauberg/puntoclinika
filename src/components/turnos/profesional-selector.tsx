"use client";

import { useRouter } from "next/navigation";

export function ProfesionalSelector({
  profesionales,
  value,
  week,
}: {
  profesionales: { id: string; nombre: string; apellido: string }[];
  value: string;
  week: string;
}) {
  const router = useRouter();

  return (
    <select
      value={value}
      onChange={(e) => router.push(`?profesionalId=${e.target.value}&week=${week}`)}
      className="h-10 rounded-md border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus:border-foreground"
    >
      {profesionales.map((p) => (
        <option key={p.id} value={p.id}>
          Dr/a. {p.apellido}, {p.nombre}
        </option>
      ))}
    </select>
  );
}
