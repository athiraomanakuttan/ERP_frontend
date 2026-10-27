import { AttendanceSession } from '@/types/entities';

/** Worked seconds for one session = (checkout - checkin) minus any break time, per spec section 10. */
export function sessionWorkedSeconds(session: AttendanceSession, now = Date.now()): number {
  const checkIn = new Date(session.checkInTime).getTime();
  const checkOut = session.checkOutTime ? new Date(session.checkOutTime).getTime() : now;
  const breakSeconds = session.breaks.reduce((total, b) => {
    const start = new Date(b.breakStart).getTime();
    const end = b.breakEnd ? new Date(b.breakEnd).getTime() : now;
    return total + Math.max(0, (end - start) / 1000);
  }, 0);
  return Math.max(0, (checkOut - checkIn) / 1000 - breakSeconds);
}

export function totalWorkedSeconds(sessions: AttendanceSession[], now = Date.now()): number {
  return sessions.reduce((sum, s) => sum + sessionWorkedSeconds(s, now), 0);
}

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export function isOnBreak(session: AttendanceSession): boolean {
  return session.breaks.some((b) => !b.breakEnd);
}
