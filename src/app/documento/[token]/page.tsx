import { notFound } from "next/navigation";
import { obtenerDocumentoPorToken } from "@/lib/actions/historia-clinica";
import { ImprimirButton } from "@/components/historia-clinica/imprimir-button";

const TIPO_LABEL: Record<string, string> = {
  RECETA: "Receta",
  ORDEN_MEDICA: "Orden médica",
};

export default async function DocumentoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const documento = await obtenerDocumentoPorToken(token);
  if (!documento) notFound();

  return (
    <div className="flex min-h-screen justify-center bg-background p-6 print:p-0">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 print:rounded-none print:border-0">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {documento.tenantNombre}
          </p>
          <ImprimirButton />
        </div>

        <h1 className="text-lg font-bold text-foreground">{TIPO_LABEL[documento.tipo] ?? documento.tipo}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {new Date(documento.fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}
        </p>

        <div className="mt-5 border-t border-border pt-4 text-sm">
          <p className="text-foreground">
            <span className="text-muted-foreground">Paciente: </span>
            {documento.paciente.apellido}, {documento.paciente.nombre}
          </p>
          <p className="text-foreground">
            <span className="text-muted-foreground">Documento: </span>
            {documento.paciente.dni}
          </p>
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <p className="whitespace-pre-wrap text-[15px] text-foreground">{documento.contenido}</p>
        </div>

        <div className="mt-6 border-t border-border pt-4 text-sm">
          <p className="text-foreground">
            {documento.profesional.apellido}, {documento.profesional.nombre}
          </p>
          {documento.profesional.matricula && (
            <p className="text-xs text-muted-foreground">Matrícula: {documento.profesional.matricula}</p>
          )}
          {documento.profesional.especialidad && (
            <p className="text-xs text-muted-foreground">{documento.profesional.especialidad}</p>
          )}
        </div>

        <p className="mt-6 text-center text-[10px] text-muted-foreground print:mt-10">
          Documento de trabajo generado por .clinika — no reemplaza la firma manuscrita.
        </p>
      </div>
    </div>
  );
}
