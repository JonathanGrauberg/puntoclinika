/**
 * Trabajos de ejemplo para arrancar el catálogo de laboratorio. Salen de los
 * nombres del arancel del Colegio de Protésicos (sin precios) y se simplificaron:
 * la cantidad de dientes se indica con las piezas del pedido, no con un
 * trabajo distinto. Cada consultorio los edita, borra o agrega los suyos.
 */
export const CATALOGO_LAB_EJEMPLO: { categoria: string; trabajos: string[] }[] = [
  {
    categoria: "Prótesis removible",
    trabajos: [
      "Prótesis parcial acrílica",
      "Prótesis completa (dentadura)",
      "Prótesis flexible",
      "Armazón de cromo cobalto",
      "Retenedor o gancho",
      "Reparación de prótesis",
      "Agregar diente a una prótesis",
      "Rebasado de prótesis",
      "Rebasado con material blando",
      "Encías coloreadas",
      "Paladar transparente",
      "Articulación balanceada",
    ],
  },
  {
    categoria: "Cubetas y modelos",
    trabajos: [
      "Cubeta individual de acrílico",
      "Cubeta individual fotocurada",
      "Modelo de estudio",
      "Modelo para vitrina",
      "Encerado de diagnóstico",
    ],
  },
  {
    categoria: "Prótesis fija",
    trabajos: [
      "Corona provisoria",
      "Corona colada (metal)",
      "Corona de acrílico",
      "Corona de porcelana sobre metal",
      "Corona de zirconio",
      "Corona de disilicato",
      "Corona de porcelana sobre zirconio",
      "Carilla de resina",
      "Carilla de disilicato",
      "Incrustación (inlay / onlay)",
      "Perno muñón",
      "Puente fijo",
    ],
  },
  {
    categoria: "Implantes",
    trabajos: [
      "Corona sobre implante (atornillada)",
      "Barra sobre implantes",
      "Prótesis híbrida",
      "Guía quirúrgica",
      "Pilar de titanio fresado",
      "Ucla calcinable",
    ],
  },
  {
    categoria: "Ortodoncia y ortopedia",
    trabajos: [
      "Placa Hawley",
      "Placa con tornillo",
      "Placa de relajación (bruxismo)",
      "Quad-Helix",
      "Disyuntor",
      "Botón de Nance",
      "Mantenedor de espacio",
      "Arco lingual (Goshgarian)",
      "Formador de Bimler",
      "Activador elástico de Klammt",
    ],
  },
];

export const CATEGORIA_NUEVA_POR_DEFECTO = "Otros";
