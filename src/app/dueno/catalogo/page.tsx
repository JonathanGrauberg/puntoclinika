import { notFound } from "next/navigation";
import { CatalogoEditor } from "@/components/dueno/catalogo-editor";
import { obtenerCatalogoDueno } from "@/lib/actions/dueno";

export default async function CatalogoPage() {
  const catalogo = await obtenerCatalogoDueno();
  if (!catalogo) notFound();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-foreground">Catálogo y planes</h1>
      <CatalogoEditor modulos={catalogo.modulos} planes={catalogo.planes} />
    </div>
  );
}
