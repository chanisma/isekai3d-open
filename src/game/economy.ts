import { getDef } from './catalog';
import type { PlacedObject } from './types';

/**
 * Household bills after 참고 게임 (docs/ref-game/05 §3): a weekly bill every Monday at 05:00 made of
 * a tiered property tax on the home's value plus metered power and water. Unpaid bills get a
 * warning after a day, cut the power after two and the water two days later.
 */

export type Utility = 'power' | 'water';

export interface Bill {
  amount: number;
  issuedAt: number;
  warned: boolean;
  cut: Utility[];
}

export interface Economy {
  /** Utility units used since the last bill. */
  usage: Record<Utility, number>;
  lastBillDay: number;
  bill: Bill | null;
}

/** 참고 게임 dwellers.bills.Bills.BILL_BRACKETS: tax rate per slice of the home's value. */
const BRACKETS: Array<[number, number]> = [
  [20000, 0.018],
  [30000, 0.027],
  [50000, 0.0315],
  [Infinity, 0.049],
];

/** 참고 게임 UTILITY_INFO unit cost. */
export const UTILITY_UNIT_COST = 0.6;

/**
 * Value of the lot and house shell, which 참고 게임 taxes along with the furniture. Our starter home
 * is small, so this is our own figure (docs/ref-game/05 §5 suggests ~§150–200 a week).
 */
export const HOME_VALUE = 8000;

/** 참고 게임: power goes 48h after delivery, the next utility every 48h after; a warning comes at 24h. */
export const WARNING_AFTER = 24 * 60;
export const POWER_CUT_AFTER = 48 * 60;
export const WATER_CUT_AFTER = 96 * 60;

export function newEconomy(): Economy {
  return { usage: { power: 0, water: 0 }, lastBillDay: 0, bill: null };
}

export function propertyTax(value: number): number {
  let tax = 0;
  let floor = 0;
  for (const [ceiling, rate] of BRACKETS) {
    if (value <= floor) break;
    tax += (Math.min(value, ceiling) - floor) * rate;
    floor = ceiling;
  }
  return tax;
}

/** 참고 게임 depreciation: full price until you leave buy mode, then 80% (INITIAL_DEPRECIATION 20%). */
export function objectValue(o: PlacedObject): number {
  const price = getDef(o.defId).price;
  return o.fresh ? price : Math.floor(price * 0.8);
}

/** The home's value: the house and land (the lot plan's), and the household's own furniture. */
export function homeValue(objects: PlacedObject[], landValue = HOME_VALUE): number {
  return landValue + objects.reduce((sum, o) => sum + (o.landlord ? 0 : objectValue(o)), 0);
}

/**
 * The weekly bill: property tax on the home's value and the utilities used (참고 게임); a rented home
 * pays its rent instead of the tax (참고 게임 For Rent), on the same bill.
 */
export function billAmount(objects: PlacedObject[], usage: Record<Utility, number>, home: { value?: number; rent?: number } = {}): number {
  const housing = home.rent ?? propertyTax(homeValue(objects, home.value ?? HOME_VALUE));
  return Math.ceil(housing + (usage.power + usage.water) * UTILITY_UNIT_COST);
}
