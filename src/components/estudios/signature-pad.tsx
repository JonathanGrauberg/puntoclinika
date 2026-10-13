"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";

/**
 * Recuadro para firmar con mouse, touchpad o dedo. Devuelve un PNG con fondo
 * transparente y trazo oscuro (se muestra siempre sobre papel blanco).
 */
export function SignaturePad({
  onChange,
  disabled,
}: {
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dibujando = useRef(false);
  const [hayTrazo, setHayTrazo] = useState(false);

  // Ajusta la resolución real del canvas al tamaño en pantalla (nítido en
  // pantallas retina y celulares) sin perder lo dibujado al redimensionar.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ajustar = () => {
      const ratio = window.devicePixelRatio || 1;
      const { width, height } = canvas.getBoundingClientRect();
      if (width === 0) return;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#111111";
      setHayTrazo(false);
      onChange(null);
    };
    ajustar();
    const obs = new ResizeObserver(ajustar);
    obs.observe(canvas);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const punto = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const empezar = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dibujando.current = true;
    const { x, y } = punto(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    // Un toque sin arrastrar también deja un punto.
    ctx.lineTo(x + 0.01, y + 0.01);
    ctx.stroke();
  };

  const mover = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dibujando.current) return;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const { x, y } = punto(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const terminar = useCallback(() => {
    if (!dibujando.current) return;
    dibujando.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setHayTrazo(true);
    onChange(canvas.toDataURL("image/png"));
  }, [onChange]);

  const limpiar = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    setHayTrazo(false);
    onChange(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative overflow-hidden rounded-md border border-border bg-white">
        <canvas
          ref={canvasRef}
          onPointerDown={empezar}
          onPointerMove={mover}
          onPointerUp={terminar}
          onPointerCancel={terminar}
          className="block h-44 w-full touch-none cursor-crosshair sm:h-52"
          aria-label="Recuadro para firmar"
        />
        {!hayTrazo && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-neutral-400">
            Firmá acá con el mouse, el touchpad o el dedo
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={limpiar}
        disabled={disabled || !hayTrazo}
        className="flex h-8 w-fit items-center gap-1.5 rounded-md border border-border px-3 text-xs font-semibold text-muted-foreground hover:bg-muted disabled:opacity-40"
      >
        <Eraser className="h-3.5 w-3.5" />
        Borrar y volver a firmar
      </button>
    </div>
  );
}
