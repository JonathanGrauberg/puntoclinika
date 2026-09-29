"use client";

import { useRouter } from "next/navigation";

export function SalaEsperaSelector({
  profesionales,
  value,
}: {
  profesionales: { id: string; nombre: string; apellido: string }[];
  value: string;
}) {
  const router = useRouter();

  return (
    <select
      value={value}
      onChange={(e) => router.push(e.target.value ? `?profesionalId=${e.target.value}` : "?")}
      className="h-10 rounded-md border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus:border-foreground"
    >
      <option value="">Todos los profesionales</option>
      {profesionales.map((p) => (
        <option key={p.id} value={p.id}>
          Dr/a. {p.apellido}, {p.nombre}
        </option>
      ))}
    </select>
  );
}
