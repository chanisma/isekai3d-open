/**
 * Characters come one at a time, with a breath between: parsing a VRM and dressing it holds up the
 * frame, and several in one go is what's felt as a hitch. Those wanted on screen now go first.
 */
const GAP_MS = 120;
const urgent: Array<() => Promise<void>> = [];
const later: Array<() => Promise<void>> = [];
let running = false;

async function pump() {
  if (running) return;
  running = true;
  for (;;) {
    const job = urgent.shift() ?? later.shift();
    if (!job) break;
    await job();
    await new Promise((res) => setTimeout(res, GAP_MS));
  }
  running = false;
}

/** Runs `load` in its turn; settles as it does. */
export function inTurn<T>(load: () => Promise<T>, now = true): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    (now ? urgent : later).push(() => load().then(resolve, reject));
    void pump();
  });
}

/** Whether anything is still loading or waiting its turn. */
export const loadsPending = () => running || urgent.length > 0 || later.length > 0;
