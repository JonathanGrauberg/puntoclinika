import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

// R2 es compatible con la API de S3 — mismo SDK, solo cambia el endpoint.
// El bucket se mantiene PRIVADO a propósito: los estudios son datos de
// salud, así que en vez de URLs públicas generamos URLs firmadas de
// corta duración tanto para subir como para descargar, y cada descarga
// queda auditada (ver auditoria.ts / acciones/estudios.ts).
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
});

const BUCKET = process.env.R2_BUCKET_NAME ?? "";
const URL_EXPIRACION_SEGUNDOS = 300; // 5 min: alcanza para subir/ver, no queda una URL viva dando vueltas

function sanitizarNombreArchivo(nombre: string) {
  return nombre.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
}

/** Genera la key del objeto y la URL firmada para subir directo a R2 desde el navegador. */
export async function crearUrlSubidaEstudio(params: {
  tenantId: string;
  nombreArchivo: string;
  contentType: string;
}) {
  const key = `estudios/${params.tenantId}/${randomUUID()}-${sanitizarNombreArchivo(params.nombreArchivo)}`;
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: params.contentType,
  });
  const url = await getSignedUrl(r2, command, { expiresIn: URL_EXPIRACION_SEGUNDOS });
  return { key, url };
}

/** URL firmada de solo lectura para ver/descargar un estudio ya subido. */
export async function crearUrlDescargaEstudio(key: string) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(r2, command, { expiresIn: URL_EXPIRACION_SEGUNDOS });
}
