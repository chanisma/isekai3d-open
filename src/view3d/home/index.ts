import type { Builder } from '../parts';
import { BUILDERS as bath } from './bath';
import { BUILDERS as decor } from './decor';
import { BUILDERS as hobby } from './hobby';
import { BUILDERS as kitchen } from './kitchen';
import { BUILDERS as play } from './play';
import { BUILDERS as rest } from './rest';
import { BUILDERS as study } from './study';

/**
 * The pieces of a home, redone a room at a time (2026-11-01, at the user's request). A workplace that
 * overrides one of these ids keeps its own (WORKPLACE_DETAIL comes first); the rest get these, at work too.
 */
export const HOME_DETAIL: Record<string, Builder> = { ...rest, ...kitchen, ...bath, ...play, ...hobby, ...study, ...decor };
