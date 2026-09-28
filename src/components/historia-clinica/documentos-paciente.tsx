import { formatFechaArgentina } from "@/lib/date-utils";

const TIPO_LABEL: Record<string, string> = {
  RECETA: "Receta",
  ORDEN_MEDICA: "Orden médica",
};

export interface DocumentoPaciente {
  id: string;
  tipo: string;
  fecha: Date;
  profesional: { nombre: string; apellido: string };
  shareUrl: string | null;
}

/** Pantalla acotada para secretaría: solo recetas/órdenes ya generadas, para imprimir o mandar. */
export function DocumentosPaciente({ documentos }: { documentos: DocumentoPaciente[] }) {
  if (documentos.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay recetas ni órdenes generadas.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {documentos.map((d) => {
        const mensaje = encodeURIComponent(`Te comparto tu ${TIPO_LABEL[d.tipo].toLowerCase()}: ${d.shareUrl ?? ""}`);
        return (
          <div
            key={d.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3"
          >
            <div>
              <p className="text-sm font-semibold text-foreground">{TIPO_LABEL[d.tipo] ?? d.tipo}</p>
              <p className="text-xs text-muted-foreground">
                {formatFechaArgentina(new Date(d.fecha))} — {d.profesional.apellido}, {d.profesional.nombre}
              </p>
            </div>
            {d.shareUrl && (
              <div className="flex gap-2">
                <a
                  href={d.shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 rounded-md border border-border px-3 text-xs font-semibold leading-8 text-foreground hover:bg-muted"
                >
                  Ver / Imprimir
                </a>
                <a
                  href={`https://wa.me/?text=${mensaje}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 rounded-md border border-border px-3 text-xs font-semibold leading-8 text-foreground hover:bg-muted"
                >
                  WhatsApp
                </a>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
