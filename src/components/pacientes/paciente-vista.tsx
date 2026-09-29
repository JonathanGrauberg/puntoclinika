import type { Paciente } from "@prisma/client";
import { formatFechaArgentina } from "@/lib/date-utils";

const TIPO_DOCUMENTO_LABEL: Record<string, string> = {
  DNI: "DNI",
  PASAPORTE: "Pasaporte",
  OTRO: "Otro",
};

const SEXO_LABEL: Record<string, string> = {
  MASCULINO: "Masculino",
  FEMENINO: "Femenino",
  OTRO: "Otro",
};

function Campo({ label, valor }: { label: string; valor: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-[15px] text-foreground">{valor || "—"}</dd>
    </div>
  );
}

/** Vista de solo lectura — la ficha se abre así por default para no exponer
 * los campos a edición accidental; "Editar" pasa al formulario. */
export function PacienteVista({ paciente, moduloObrasSociales }: { paciente: Paciente; moduloObrasSociales: boolean }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      <Campo label={TIPO_DOCUMENTO_LABEL[paciente.tipoDocumento] ?? "Documento"} valor={paciente.dni} />
      <Campo
        label="Fecha de nacimiento"
        valor={paciente.fechaNacimiento ? formatFechaArgentina(new Date(paciente.fechaNacimiento)) : null}
      />
      <Campo label="Nombre" valor={paciente.nombre} />
      <Campo label="Apellido" valor={paciente.apellido} />
      <Campo label="Sexo" valor={paciente.sexo ? SEXO_LABEL[paciente.sexo] : null} />
      <Campo label="Teléfono" valor={paciente.telefono} />
      <Campo label="Email" valor={paciente.email} />
      <div className="sm:col-span-2">
        <Campo label="Domicilio" valor={paciente.domicilio} />
      </div>
      <Campo label="Contacto de emergencia" valor={paciente.contactoEmergenciaNombre} />
      <Campo label="Teléfono de emergencia" valor={paciente.contactoEmergenciaTelefono} />
      {!moduloObrasSociales && (
        <Campo label="Obra social / seguro" valor={paciente.obraSocialTexto} />
      )}
      <div className="sm:col-span-2">
        <Campo label="Alergias declaradas" valor={paciente.alergias} />
      </div>
    </dl>
  );
}
