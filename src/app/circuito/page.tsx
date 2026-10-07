import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { autorActual, circuitoConfigurado } from "@/lib/circuito-auth";
import { ingresarCircuito, salirCircuito } from "@/lib/actions/circuito";
import { INTRO, SECCIONES } from "@/lib/circuito-contenido";
import { NotasSeccion, type NotaItem } from "@/components/circuito/nota-form";

export const metadata: Metadata = {
  title: "Circuito",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function CircuitoPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const autor = await autorActual();

  if (!autor) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <form action={ingresarCircuito} className="flex w-full max-w-sm flex-col gap-4 rounded-md border border-border bg-card p-6">
          <h1 className="text-lg font-bold text-foreground">Circuito de .clinika</h1>
          {!circuitoConfigurado() ? (
            <p className="text-sm text-muted-foreground">Esta página todavía no está configurada.</p>
          ) : (
            <>
              <input
                name="clave"
                type="password"
                required
                autoFocus
                placeholder="Tu clave"
                className="h-11 rounded-md border border-border bg-background px-3 text-[15px] text-foreground outline-none focus:border-foreground"
              />
              {error && <p className="text-sm text-destructive">Clave incorrecta.</p>}
              <button
                type="submit"
                className="h-11 rounded-md bg-primary text-[15px] font-semibold text-primary-foreground hover:opacity-90"
              >
                Entrar
              </button>
            </>
          )}
        </form>
      </main>
    );
  }

  const notas = await prisma.circuitoNota.findMany({ orderBy: { createdAt: "asc" } });
  const porSeccion = new Map<string, NotaItem[]>();
  for (const n of notas) {
    const lista = porSeccion.get(n.seccion) ?? [];
    lista.push({
      id: n.id,
      autor: n.autor,
      texto: n.texto,
      fecha: n.createdAt.toLocaleDateString("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires",
        day: "numeric",
        month: "short",
      }),
      propia: n.autor === autor,
    });
    porSeccion.set(n.seccion, lista);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Circuito de .clinika: de la venta al paciente</h1>
          <p className="mt-2 text-sm text-muted-foreground">{INTRO}</p>
        </div>
        <form action={salirCircuito} className="shrink-0 text-right">
          <p className="text-xs text-muted-foreground">Entraste como {autor}</p>
          <button type="submit" className="text-xs font-semibold text-foreground underline underline-offset-2">
            Salir
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-6">
        {SECCIONES.map((s) => {
          const Titulo = s.nivel === 2 ? "h2" : "h3";
          return (
            <section key={s.id} className="rounded-md border border-border bg-card p-5">
              <Titulo className={s.nivel === 2 ? "text-lg font-bold text-foreground" : "text-base font-semibold text-foreground"}>
                {s.titulo}
              </Titulo>
              {s.texto && <p className="mt-2 text-sm text-foreground">{s.texto}</p>}
              {s.items && (
                <ul className="mt-2 list-disc pl-5 text-sm text-foreground">
                  {s.items.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              )}
              {s.respuesta && (
                <p className="mt-3 rounded-md border border-border bg-muted/40 p-3 text-sm text-foreground">
                  💬 {s.respuesta}
                </p>
              )}
              {s.resuelto && (
                <p className="mt-3 rounded-md border border-success/40 bg-success/10 p-3 text-sm text-foreground">
                  ✅ Resuelto: {s.resuelto}
                </p>
              )}
              {!s.sinNotas && <NotasSeccion seccion={s.id} notas={porSeccion.get(s.id) ?? []} />}
            </section>
          );
        })}
      </div>
    </main>
  );
}
