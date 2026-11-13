/**
 * The rocket ship after 참고 게임 (object_RocketShip, rocketShip_BuildStart "건축",
 * rocketShip_Explore "우주 탐사하기"): building it trains Rocket Science (로켓 공학, Focused) and
 * fills the build at about 0.35 a minute; a finished rocket flies off for a couple of hours. 참고 게임
 * lands safely 95% of the time (a landing computer, Rocket Science 8, makes it certain) with one of
 * several adventures, paying $100 / $200 / $500 rewards; a crash sets the rocket back. Moodlets and
 * their Korean names from the game; the adventure odds are ours.
 */
export const BUILD_RATE = 0.347;
export const FLIGHT_MINUTES = 120;
export const SAFE_LANDING = 0.95;
/** Rocket Science level that installs 참고 게임's landing computer (no more crashes). */
export const LANDING_COMPUTER_LEVEL = 8;

export interface Adventure {
  id: string;
  text: string;
  buff: string;
  money: number;
  weight: number;
}

export const ADVENTURES: Adventure[] = [
  { id: 'explored', text: '무사히 우주를 탐사하고 돌아왔어요', buff: 'exploredSpace', money: 100, weight: 4 },
  { id: 'moon', text: '달 궤도를 돌고 왔어요', buff: 'orbitedMoon', money: 200, weight: 3 },
  { id: 'battle', text: '우주 전쟁에서 이기고 돌아왔어요!', buff: 'spaceBattleWin', money: 500, weight: 1 },
  { id: 'alien', text: '외계 생물에게 물렸어요…', buff: 'bittenByAlien', money: 0, weight: 1 },
  { id: 'police', text: '우주 경찰에게 걸려 벌금을 냈어요', buff: 'bustedBySpacePolice', money: -100, weight: 1 },
];

export function rollAdventure(skill: number, rng: () => number): Adventure | null {
  if (skill < LANDING_COMPUTER_LEVEL && rng() >= SAFE_LANDING) return null;
  // Skill steers towards the better outings (ours): the good ones weigh more at high levels.
  const w = ADVENTURES.map((a) => a.weight * (a.money > 0 ? 1 + skill * 0.1 : 1));
  let x = rng() * w.reduce((s, v) => s + v, 0);
  for (let i = 0; i < ADVENTURES.length; i++) {
    x -= w[i];
    if (x <= 0) return ADVENTURES[i];
  }
  return ADVENTURES[0];
}
