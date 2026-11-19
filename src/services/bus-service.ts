import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, handleFirestoreError, isQuotaError, OperationType } from '../lib/firebase';
import { BusSchedule, BusOperator, BusType, MemberName, WeekdayShort } from '../types';
import { getISTMinutesOfDay, getISTWeekday, parseHHMMToMinutes } from '../utils/istTime';

const BUS_SCHEDULES_COLLECTION = 'busSchedules';
const LOCAL_CACHE_KEY = 'friends_bus_schedules_cache_v1';
const LOCAL_PENDING_KEY = 'friends_bus_schedules_pending_v1';

export const ALL_WEEKDAYS: WeekdayShort[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export type DepartureTimeWindow = 'all' | 'upcoming' | 'morning' | 'afternoon' | 'evening' | 'night';

interface PendingBusOp {
  type: 'save' | 'delete';
  payload: any;
  timestamp: number;
}

function readLocalCache(): BusSchedule[] {
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalCache(items: BusSchedule[]): void {
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('[BusService] Failed to cache bus schedules locally:', e);
  }
}

function queuePendingOp(op: PendingBusOp): void {
  try {
    const raw = localStorage.getItem(LOCAL_PENDING_KEY);
    const list: PendingBusOp[] = raw ? JSON.parse(raw) : [];
    list.push(op);
    localStorage.setItem(LOCAL_PENDING_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export async function flushPendingBusOps(): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  try {
    const raw = localStorage.getItem(LOCAL_PENDING_KEY);
    if (!raw) return;
    const ops: PendingBusOp[] = JSON.parse(raw);
    if (!ops.length) return;

    const remaining: PendingBusOp[] = [];
    for (const op of ops) {
      try {
        if (op.type === 'save') {
          await setDoc(doc(db, BUS_SCHEDULES_COLLECTION, op.payload.id), op.payload);
        } else if (op.type === 'delete') {
          await deleteDoc(doc(db, BUS_SCHEDULES_COLLECTION, op.payload.id));
        }
      } catch (err) {
        if (isQuotaError(err)) {
          remaining.push(op);
          break;
        }
        remaining.push(op);
      }
    }
    localStorage.setItem(LOCAL_PENDING_KEY, JSON.stringify(remaining));
  } catch {
    // ignore
  }
}

export function getCachedBusSchedules(): BusSchedule[] {
  return sortBusesByDeparture(readLocalCache());
}

export function sortBusesByDeparture(buses: BusSchedule[]): BusSchedule[] {
  return [...buses].sort(
    (a, b) => parseHHMMToMinutes(a.departureTime) - parseHHMMToMinutes(b.departureTime)
  );
}

/**
 * Validates and sanitizes a BusSchedule payload against Firestore blueprint bounds.
 */
export function validateBusScheduleInput(input: {
  busName: string;
  busNumber: string;
  operator: BusOperator;
  fromLocation: string;
  toLocation: string;
  departureTime: string;
  arrivalTime: string;
  ticketPrice: number;
  busType: BusType;
  operatingDays: WeekdayShort[];
  notes?: string;
}): { valid: boolean; error?: string } {
  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

  if (!input.busName.trim()) return { valid: false, error: 'Bus Name is required.' };
  if (input.busName.trim().length > 120) return { valid: false, error: 'Bus Name must be 120 characters or fewer.' };
  if (input.busNumber.trim().length > 40) return { valid: false, error: 'Bus Number must be 40 characters or fewer.' };
  if (!input.fromLocation.trim()) return { valid: false, error: 'From Location is required.' };
  if (!input.toLocation.trim()) return { valid: false, error: 'To Location is required.' };
  if (input.fromLocation.trim().length > 120 || input.toLocation.trim().length > 120) {
    return { valid: false, error: 'Locations must be 120 characters or fewer.' };
  }
  if (!timeRegex.test(input.departureTime)) return { valid: false, error: 'Departure Time must be in HH:mm format.' };
  if (!timeRegex.test(input.arrivalTime)) return { valid: false, error: 'Arrival Time must be in HH:mm format.' };
  if (typeof input.ticketPrice !== 'number' || Number.isNaN(input.ticketPrice) || input.ticketPrice < 0 || input.ticketPrice > 50000) {
    return { valid: false, error: 'Ticket Price must be a valid amount between ₹0 and ₹50,000.' };
  }
  if (!['Government', 'Private'].includes(input.operator)) {
    return { valid: false, error: 'Invalid bus operator.' };
  }
  if (!['Ordinary', 'Express', 'AC', 'Deluxe'].includes(input.busType)) {
    return { valid: false, error: 'Invalid bus type.' };
  }
  if (!Array.isArray(input.operatingDays) || input.operatingDays.length === 0) {
    return { valid: false, error: 'Select at least one operating day.' };
  }
  if (input.notes && input.notes.trim().length > 400) {
    return { valid: false, error: 'Additional Notes must be 400 characters or fewer.' };
  }

  return { valid: true };
}

/**
 * Subscribes to shared group bus schedules in Firestore with local offline cache fallback.
 */
export function subscribeToBusSchedules(
  callback: (buses: BusSchedule[]) => void
): () => void {
  // Immediately hydrate from local cache to avoid empty flicker
  callback(getCachedBusSchedules());

  const q = query(collection(db, BUS_SCHEDULES_COLLECTION), orderBy('departureTime', 'asc'));

  const handleOnline = () => {
    flushPendingBusOps();
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
  }

  const unsub = onSnapshot(
    q,
    (snapshot) => {
      const items: BusSchedule[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as BusSchedule);
      });
      const sorted = sortBusesByDeparture(items);
      writeLocalCache(sorted);
      callback(sorted);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, BUS_SCHEDULES_COLLECTION);
      // Fallback to cached schedules if offline or transient error
      callback(getCachedBusSchedules());
    }
  );

  return () => {
    unsub();
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handleOnline);
    }
  };
}

/**
 * Adds a new bus schedule to Firestore (optimistically cached locally for offline resilience).
 */
export async function addBusSchedule(
  input: Omit<BusSchedule, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
  createdBy: MemberName
): Promise<{ success: boolean; bus?: BusSchedule; error?: string }> {
  const check = validateBusScheduleInput(input);
  if (!check.valid) {
    return { success: false, error: check.error };
  }

  const now = new Date().toISOString();
  const id = `bus-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const payload: BusSchedule = {
    id,
    busName: input.busName.trim().slice(0, 120),
    busNumber: input.busNumber.trim().slice(0, 40),
    operator: input.operator,
    fromLocation: input.fromLocation.trim().slice(0, 120),
    toLocation: input.toLocation.trim().slice(0, 120),
    departureTime: input.departureTime,
    arrivalTime: input.arrivalTime,
    ticketPrice: Math.round(Number(input.ticketPrice) * 100) / 100,
    busType: input.busType,
    operatingDays: Array.from(new Set(input.operatingDays)).filter((d) =>
      ALL_WEEKDAYS.includes(d)
    ) as WeekdayShort[],
    createdBy,
    createdAt: now,
    updatedAt: now,
  };

  if (input.notes && input.notes.trim()) {
    payload.notes = input.notes.trim().slice(0, 400);
  }

  // Optimistic local cache write
  const current = readLocalCache();
  writeLocalCache(sortBusesByDeparture([...current, payload]));

  try {
    await setDoc(doc(db, BUS_SCHEDULES_COLLECTION, id), payload);
    return { success: true, bus: payload };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${BUS_SCHEDULES_COLLECTION}/${id}`);
    queuePendingOp({ type: 'save', payload, timestamp: Date.now() });
    return { success: true, bus: payload };
  }
}

/**
 * Updates an existing bus schedule in Firestore.
 */
export async function updateBusSchedule(
  existingBus: BusSchedule,
  updates: Omit<BusSchedule, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>
): Promise<{ success: boolean; bus?: BusSchedule; error?: string }> {
  const check = validateBusScheduleInput(updates);
  if (!check.valid) {
    return { success: false, error: check.error };
  }

  const now = new Date().toISOString();
  const payload: BusSchedule = {
    id: existingBus.id,
    busName: updates.busName.trim().slice(0, 120),
    busNumber: updates.busNumber.trim().slice(0, 40),
    operator: updates.operator,
    fromLocation: updates.fromLocation.trim().slice(0, 120),
    toLocation: updates.toLocation.trim().slice(0, 120),
    departureTime: updates.departureTime,
    arrivalTime: updates.arrivalTime,
    ticketPrice: Math.round(Number(updates.ticketPrice) * 100) / 100,
    busType: updates.busType,
    operatingDays: Array.from(new Set(updates.operatingDays)).filter((d) =>
      ALL_WEEKDAYS.includes(d)
    ) as WeekdayShort[],
    createdBy: existingBus.createdBy,
    createdAt: existingBus.createdAt,
    updatedAt: now,
  };

  if (updates.notes && updates.notes.trim()) {
    payload.notes = updates.notes.trim().slice(0, 400);
  }

  // Optimistic local cache update
  const current = readLocalCache().map((b) => (b.id === existingBus.id ? payload : b));
  writeLocalCache(sortBusesByDeparture(current));

  try {
    await setDoc(doc(db, BUS_SCHEDULES_COLLECTION, existingBus.id), payload);
    return { success: true, bus: payload };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${BUS_SCHEDULES_COLLECTION}/${existingBus.id}`);
    queuePendingOp({ type: 'save', payload, timestamp: Date.now() });
    return { success: true, bus: payload };
  }
}

/**
 * Deletes a bus schedule from Firestore.
 */
export async function deleteBusSchedule(busId: string): Promise<{ success: boolean; error?: string }> {
  const current = readLocalCache().filter((b) => b.id !== busId);
  writeLocalCache(current);

  try {
    await deleteDoc(doc(db, BUS_SCHEDULES_COLLECTION, busId));
    return { success: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${BUS_SCHEDULES_COLLECTION}/${busId}`);
    queuePendingOp({ type: 'delete', payload: { id: busId }, timestamp: Date.now() });
    return { success: true };
  }
}

/**
 * Normalizes a route string for grouping and fare comparison.
 */
export function getRouteKey(fromLocation: string, toLocation: string): string {
  return `${fromLocation.trim().toLowerCase()}→${toLocation.trim().toLowerCase()}`;
}

/**
 * Checks whether a bus operates today (IST) and departs later than current IST time.
 */
export function isBusUpcomingToday(bus: BusSchedule, now: Date = new Date()): boolean {
  const todayWeekday = getISTWeekday(now);
  if (!bus.operatingDays.includes(todayWeekday)) return false;
  const nowMinutes = getISTMinutesOfDay(now);
  const depMinutes = parseHHMMToMinutes(bus.departureTime);
  return depMinutes >= nowMinutes;
}

/**
 * Returns departure time-of-day bucket for filtering.
 */
export function getDepartureWindow(hhmm: string): Exclude<DepartureTimeWindow, 'all' | 'upcoming'> {
  const mins = parseHHMMToMinutes(hhmm);
  if (mins >= 5 * 60 && mins < 12 * 60) return 'morning';
  if (mins >= 12 * 60 && mins < 17 * 60) return 'afternoon';
  if (mins >= 17 * 60 && mins < 21 * 60) return 'evening';
  return 'night';
}

/**
 * Formats operating days concisely (e.g., "Daily", "Weekdays", "Mon, Wed, Fri").
 */
export function formatOperatingDays(days: WeekdayShort[]): string {
  if (days.length === 7) return 'Daily';
  const weekdays: WeekdayShort[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const weekends: WeekdayShort[] = ['Sat', 'Sun'];
  if (days.length === 5 && weekdays.every((d) => days.includes(d))) return 'Mon – Fri';
  if (days.length === 2 && weekends.every((d) => days.includes(d))) return 'Weekends';
  return ALL_WEEKDAYS.filter((d) => days.includes(d)).join(', ');
}
