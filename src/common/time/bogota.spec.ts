import {
  endOfDayBogota,
  endOfWeekBogota,
  startOfDayBogota,
  startOfWeekBogota,
  toBogotaIso,
} from './bogota';

const utc = (iso: string) => new Date(iso);

describe('bogota', () => {
  describe('startOfDayBogota / endOfDayBogota', () => {
    it('debería usar el día local aunque en UTC ya sea el día siguiente', () => {
      // 2026-10-09 22:30 en Bogotá
      const date = utc('2026-10-10T03:30:00Z');
      expect(startOfDayBogota(date)).toEqual(utc('2026-10-09T05:00:00Z'));
      expect(endOfDayBogota(date)).toEqual(utc('2026-10-10T05:00:00Z'));
    });

    it('debería tomar la medianoche local como inicio del día', () => {
      const midnight = utc('2026-10-09T05:00:00Z');
      expect(startOfDayBogota(midnight)).toEqual(midnight);
    });

    it('debería cambiar de mes en la medianoche local, no en la de UTC', () => {
      // 2026-10-31 23:59:59.999 y 2026-11-01 00:00 en Bogotá
      expect(startOfDayBogota(utc('2026-11-01T04:59:59.999Z'))).toEqual(
        utc('2026-10-31T05:00:00Z'),
      );
      expect(startOfDayBogota(utc('2026-11-01T05:00:00Z'))).toEqual(
        utc('2026-11-01T05:00:00Z'),
      );
    });

    it('debería cambiar de año en la medianoche local', () => {
      // 2026-12-31 20:00 en Bogotá
      const date = utc('2027-01-01T01:00:00Z');
      expect(startOfDayBogota(date)).toEqual(utc('2026-12-31T05:00:00Z'));
      expect(endOfDayBogota(date)).toEqual(utc('2027-01-01T05:00:00Z'));
    });
  });

  describe('startOfWeekBogota / endOfWeekBogota', () => {
    it('debería empezar la semana el lunes a las 00:00', () => {
      // Viernes 2026-10-09 10:00 en Bogotá
      const date = utc('2026-10-09T15:00:00Z');
      expect(startOfWeekBogota(date)).toEqual(utc('2026-10-05T05:00:00Z'));
      expect(endOfWeekBogota(date)).toEqual(utc('2026-10-12T05:00:00Z'));
    });

    it('debería dejar el domingo en la noche en la semana que termina', () => {
      // Domingo 2026-11-01 23:00 en Bogotá (en UTC ya es lunes)
      const date = utc('2026-11-02T04:00:00Z');
      expect(startOfWeekBogota(date)).toEqual(utc('2026-10-26T05:00:00Z'));
      expect(endOfWeekBogota(date)).toEqual(utc('2026-11-02T05:00:00Z'));
    });

    it('debería ubicar el lunes a las 00:00 en su propia semana', () => {
      const monday = utc('2026-12-28T05:00:00Z');
      expect(startOfWeekBogota(monday)).toEqual(monday);
    });

    it('debería cruzar el cambio de año', () => {
      // Viernes 2027-01-01 08:00 en Bogotá
      expect(startOfWeekBogota(utc('2027-01-01T13:00:00Z'))).toEqual(
        utc('2026-12-28T05:00:00Z'),
      );
    });
  });

  describe('toBogotaIso', () => {
    it('debería formatear con la hora local y el offset -05:00', () => {
      expect(toBogotaIso(utc('2026-10-09T19:30:00Z'))).toBe('2026-10-09T14:30:00-05:00');
    });

    it('debería mostrar el día local cerca de la medianoche', () => {
      expect(toBogotaIso(utc('2026-11-01T04:59:59Z'))).toBe('2026-10-31T23:59:59-05:00');
    });

    it('debería representar el mismo instante al volver a leerse', () => {
      const date = utc('2026-10-09T19:30:00Z');
      expect(new Date(toBogotaIso(date))).toEqual(date);
    });
  });
});
