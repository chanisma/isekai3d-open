/**
 * Hired help after 참고 게임's ServiceNpcHireable tuning: who comes, when, and what it costs.
 * Costs, arrival hours and the longest stay are 참고 게임's; how long they take to turn up is ours.
 */
export type ServiceKind = 'maid' | 'repair' | 'nanny';

export interface ServiceDef {
  kind: ServiceKind;
  name: string;
  icon: string;
  /** cost_up_front and cost_hourly (참고 게임 §). */
  upFront: number;
  hourly: number;
  /** work_hours: arrivals from `from` for `hours` hours each day. */
  from: number;
  hours: number;
  /** _work_duration_min_max upper bound in minutes (nanny: stays until sent home; ours caps a day). */
  maxStay: number;
  shirt: string;
}

export const SERVICES: Record<ServiceKind, ServiceDef> = {
  // ServiceNpc_Maid: §40 + §20 an hour, 10:00 for 6 hours, up to 360 minutes.
  maid: { kind: 'maid', name: '가정부', icon: '🧹', upFront: 40, hourly: 20, from: 10, hours: 6, maxStay: 360, shirt: '#5c6bc0' },
  // ServiceNpc_Repair: §100 + §10 an hour, 8:00 for 18 hours, up to 600 minutes.
  repair: { kind: 'repair', name: '수리 서비스', icon: '🔧', upFront: 100, hourly: 10, from: 8, hours: 18, maxStay: 600, shirt: '#ef6c00' },
  // serviceNpc_Nanny ("베이비시터"): §60 + §10 an hour, any hour, until dismissed.
  nanny: { kind: 'nanny', name: '베이비시터', icon: '🍼', upFront: 60, hourly: 10, from: 4, hours: 24, maxStay: 1440, shirt: '#ec407a' },
};

/** How long after the call they turn up (ours; 참고 게임 nanny request_offset 10 minutes). */
export const SERVICE_DELAY: [number, number] = [20, 60];

/** Whether the service takes new arrivals at this minute of the day. */
export function serviceOpen(def: ServiceDef, minuteOfDay: number): boolean {
  if (def.hours >= 24) return true;
  const h = minuteOfDay / 60;
  const end = def.from + def.hours;
  return end <= 24 ? h >= def.from && h < end : h >= def.from || h < end - 24;
}

/** The next minute (absolute) the service can arrive from `now`. */
export function nextOpening(def: ServiceDef, now: number): number {
  const day = Math.floor(now / 1440);
  if (serviceOpen(def, now - day * 1440)) return now;
  const today = day * 1440 + def.from * 60;
  return today > now ? today : today + 1440;
}

/** The hourly bill for a stay, whole hours rounded up (참고 게임 bills by the hour). */
export function serviceBill(def: ServiceDef, minutes: number): number {
  return Math.max(1, Math.ceil(minutes / 60)) * def.hourly;
}
