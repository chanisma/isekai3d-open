import type { WorkplaceDef } from './workplace';
import { MEDIA_LOTS } from './branchLotsMedia';
import { MEDICAL_LOTS } from './branchLotsMedical';
import { PUBLIC_LOTS } from './branchLotsPublic';
import { SAFETY_LOTS } from './branchLotsSafety';

/**
 * The branches that work somewhere else than their career's lot (2026-11-04, the layout audit's branch sweep, at the user's
 * request): each gets its own lot, as the subway's 관제 has its 관제센터. Kept by field in four files so they can be built side
 * by side; workplace.ts joins them to their careers' `branchLots`.
 */
export const MORE_BRANCH_LOTS: Record<string, Partial<Record<number, WorkplaceDef>>> = { ...PUBLIC_LOTS, ...MEDICAL_LOTS, ...SAFETY_LOTS, ...MEDIA_LOTS };
