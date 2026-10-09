// Fecha y hora en America/Bogota. Colombia no tiene horario de verano, así que el
// desfase es fijo (UTC-5) y no hace falta una librería de zonas horarias.
// En la BD todo se guarda como timestamptz; estas funciones solo deciden qué
// instante corresponde a "el día" o "la semana" en hora local.
// Los fines son exclusivos: los intervalos se manejan como [inicio, fin).

export const BOGOTA_OFFSET = '-05:00';
const OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Mismo instante, con los campos UTC iguales a la hora local de Bogotá
function toWallClock(date: Date): Date {
  return new Date(date.getTime() - OFFSET_MS);
}

/** 00:00 en Bogotá del día al que pertenece `date`. */
export function startOfDayBogota(date: Date): Date {
  const local = toWallClock(date);
  const midnight = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
  );
  return new Date(midnight + OFFSET_MS);
}

/** 00:00 en Bogotá del día siguiente (fin exclusivo del día de `date`). */
export function endOfDayBogota(date: Date): Date {
  return new Date(startOfDayBogota(date).getTime() + DAY_MS);
}

/** Lunes 00:00 en Bogotá de la semana a la que pertenece `date`. */
export function startOfWeekBogota(date: Date): Date {
  const dayStart = startOfDayBogota(date);
  // getUTCDay del reloj local: 0 = domingo … 6 = sábado
  const daysSinceMonday = (toWallClock(date).getUTCDay() + 6) % 7;
  return new Date(dayStart.getTime() - daysSinceMonday * DAY_MS);
}

/** Lunes 00:00 en Bogotá de la semana siguiente (fin exclusivo). */
export function endOfWeekBogota(date: Date): Date {
  return new Date(startOfWeekBogota(date).getTime() + 7 * DAY_MS);
}

/** ISO 8601 en hora de Bogotá: '2026-10-09T14:30:00-05:00'. */
export function toBogotaIso(date: Date): string {
  return toWallClock(date).toISOString().slice(0, 19) + BOGOTA_OFFSET;
}
