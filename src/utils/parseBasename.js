// "VA 1.5.mp4" -> "VA_1_5"
// Fallback: usa el nombre del ejercicio o un slug básico
export function parseRecordingBasename(originalName, fallback = "ejercicio") {
  if (!originalName) {
    return fallback.toLowerCase().replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "");
  }
  const nameOnly = originalName.split("/").pop(); // por si viene con path
  const withoutExt = nameOnly.replace(/\.[^/.]+$/, "");

  // Formato esperado: CODE espacio SESSION.PIEZA  e.g. "VA 1.5"
  const m = withoutExt.match(/^([A-Za-z]+)\s+(\d+)\.(\d+)$/);
  if (m) {
    const code = m[1].toUpperCase();
    const session = m[2];
    const index = m[3];
    return `${code}_${session}_${index}`;
  }

  // Si no matchea el patrón, sanitiza y usa fallback si queda vacío
  const sanitized = withoutExt.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "");
  return sanitized || fallback.toLowerCase().replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "");
}