export interface SeccionCircuito {
  id: string;
  nivel: 2 | 3;
  titulo: string;
  texto?: string;
  items?: string[];
  /** Respuesta o aclaración de Claude / Jona sobre este paso. */
  respuesta?: string;
  /** Se completa cuando algo del paso se resuelve en la app (ej: "Hecho el 7/10: ..."). */
  resuelto?: string;
  sinNotas?: boolean;
}

// Contenido del circuito. Se actualiza acá a medida que se resuelven cosas;
// las notas de Jona y su papá viven aparte (tabla CircuitoNota).
export const INTRO =
  "Caso de ejemplo: un centro con 2 traumatólogos, 1 radiólogo y 1 médico que hace ecografías y densitometrías. Debajo de cada paso podés escribir una nota con sugerencias, dudas o pasos que faltan.";

export const SECCIONES: SeccionCircuito[] = [
  {
    id: "0",
    nivel: 2,
    titulo: "0. Venta y alta del centro (hoy es manual)",
    texto:
      "El dueño del sistema crea el centro con un script en la base: nombre, slug, módulos contratados (Turnos, Estudios, Facturación, Obras Sociales) y un primer usuario ADMIN. No hay pantalla de alta de clínicas ni panel de dueño.",
  },
  { id: "1", nivel: 2, titulo: "1. Día 1: el administrador del centro configura", texto: "Entra con el ADMIN y trabaja en Configuración.", sinNotas: true },
  {
    id: "1.1",
    nivel: 3,
    titulo: "1.1 Profesionales",
    texto:
      "Carga a los 2 traumatólogos, al radiólogo y al médico de ecografías (nombre, matrícula, especialidad).",
  },
  {
    id: "1.2",
    nivel: 3,
    titulo: "1.2 Usuarios",
    texto:
      "Crea un usuario de login para cada uno, con rol MÉDICO, y lo vincula a su profesional. Sin ese vínculo no pueden firmar informes. También crea las secretarias con rol SECRETARIA.",
    respuesta:
      "Pregunta de Jona: ¿es necesario vincularlo después? ¿No se puede crear el usuario y ya indicar que es médico y su especialidad, en vez de hacer dos pasos? Hoy son dos pasos porque Profesional y Usuario son cosas distintas: un profesional puede existir sin tener login (por ejemplo, uno que solo figura en la agenda). Pero el formulario de Usuarios ya exige elegir un profesional existente al crear un MÉDICO, así que hay que cargar el profesional primero. Se puede unir en un solo paso: al crear un usuario con rol MÉDICO, pedir ahí mismo matrícula y especialidad y crear el profesional automáticamente. Queda pendiente de hacer.",
  },
  {
    id: "1.3",
    nivel: 3,
    titulo: "1.3 Prácticas",
    texto:
      "Carga Consulta traumatológica, Radiografía, Ecografía, Densitometría, con duración y precio. Define también las mediciones sugeridas de cada informe.",
    resuelto: "Las mediciones sugeridas ya se cargan en Configuración → Prácticas y precargan el informe.",
  },
  {
    id: "1.4",
    nivel: 3,
    titulo: "1.4 Consultorios y obras sociales",
    texto: "Carga los consultorios y las obras sociales con las que trabaja el centro.",
  },
  { id: "2", nivel: 2, titulo: "2. Llega un paciente", sinNotas: true },
  {
    id: "2.1",
    nivel: 3,
    titulo: "2.1 Turno",
    texto:
      "La secretaria lo agenda en Turnos, eligiendo médico, práctica y consultorio. Si es nuevo, antes carga su ficha.",
  },
  {
    id: "2.2",
    nivel: 3,
    titulo: "2.2 Llegada",
    texto:
      'La secretaria lo marca "En espera" en Sala de espera, o el paciente se registra solo en el kiosco. El médico ve la campanita titilar.',
    resuelto: "Sala de espera, kiosco y campanita de notificaciones ya funcionan.",
  },
  {
    id: "2.3",
    nivel: 3,
    titulo: "2.3 Consulta (traumatólogo)",
    texto:
      "El médico lo llama desde su sala de espera y abre el Panel de consulta: escribe nota, diagnóstico y receta, y puede pedir una orden médica de radiografía. Cierra la consulta. La secretaria puede imprimir o mandar por WhatsApp la receta y la orden, pero no ve las notas clínicas.",
  },
  {
    id: "2.4",
    nivel: 3,
    titulo: "2.4 Cobro",
    texto: "La secretaria registra el coseguro o la consulta en Facturación.",
  },
  { id: "3", nivel: 2, titulo: "3. El estudio", sinNotas: true },
  {
    id: "3.1",
    nivel: 3,
    titulo: "3.1 Carga",
    texto:
      "El paciente se hace la radiografía. La secretaria o el técnico carga el estudio con las imágenes en Estudios, y queda Pendiente.",
    resuelto: "Se pueden subir varias imágenes y varios PDF de informe por estudio, y el estudio puede crearse sin archivos.",
  },
  {
    id: "3.2",
    nivel: 3,
    titulo: "3.2 Informe y firma",
    texto:
      "El radiólogo, a la tarde o en su casa, entra a Estudios, toca Informar, completa hallazgos y mediciones, y firma. Pasa a Informado. El médico de ecografías y densitometría hace lo mismo con sus mediciones propias.",
    resuelto:
      "Pantalla de informe grande con mediciones sugeridas por práctica. Falta: firma dibujable y plantillas por especialidad.",
  },
  {
    id: "4",
    nivel: 2,
    titulo: "4. El paciente",
    texto:
      "La secretaria le genera el acceso al portal desde su ficha. El paciente entra por /portal/login y ve sus turnos, su estudio informado y lo que el médico decidió mostrarle.",
  },
  {
    id: "5",
    nivel: 2,
    titulo: "5. Qué ve cada rol al entrar",
    items: [
      "Admin: todo.",
      "Secretaria: agenda, sala de espera, pacientes y facturación.",
      "Médico: su agenda, su sala de espera y sus pacientes.",
      "Auditor: lectura y auditoría.",
    ],
    resuelto: "El inicio ya muestra cards de atajos según el rol (falta el inicio del portal del paciente).",
  },
  {
    id: "huecos",
    nivel: 2,
    titulo: "Huecos conocidos hoy",
    items: [
      "No hay alta de clínicas ni panel de dueño.",
      "El médico que informa tiene que estar vinculado a un profesional, y eso se hace en dos pasos.",
      "La firma es solo «informado por»: falta el recuadro dibujable (mouse, touchpad o dedo).",
      "Los informes todavía no se adaptan a la especialidad.",
      "El portal del paciente no muestra el nombre ni el logo de cada clínica.",
    ],
  },
];
