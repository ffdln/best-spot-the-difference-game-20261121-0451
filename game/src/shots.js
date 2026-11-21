// The screenshot scenes behind ?shot=start|play|play2|end. Each one plays the real
// rules forward from a fresh world — the finds are made by calling the real click
// handler at the real hotspot centres — so the frame is what a short game really
// looks like and the same seed always gives the same frame.

import { PANEL } from './config.js';
import { DIFFERENCES } from './scenes.js';
import { SCREEN_PLAY, SCREEN_TITLE, SCREEN_VICTORY } from './world.js';

/** Click a difference on the left panel by index, through the real rules. */
function findDifference(world, round, index) {
  const d = DIFFERENCES[round][index];
  world.click(PANEL.leftX + d.x, PANEL.y + d.y);
}

/**
 * Set `world` to the named scene (start, play, play2 or end) and return the
 * screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'play2' && name !== 'end') {
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    world.state.screen = SCREEN_PLAY;
    findDifference(world, 0, 0);
    findDifference(world, 0, 2);
    findDifference(world, 0, 4);
    world.state.timeLeft = 120; // 2:00 left on the clock
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'play2') {
    world.resetRound(1);
    world.state.screen = SCREEN_PLAY;
    findDifference(world, 1, 1);
    findDifference(world, 1, 5);
    world.state.timeLeft = 90; // 1:30 left on the clock
    return { screen: SCREEN_PLAY, best: 0 };
  }
  // end: play the whole game through — all 24 differences, round by round —
  // so the victory screen shows a real total score.
  world.state.screen = SCREEN_PLAY;
  for (let i = 0; i < DIFFERENCES[0].length; i += 1) findDifference(world, 0, i);
  world.nextRound();
  for (let i = 0; i < DIFFERENCES[1].length; i += 1) findDifference(world, 1, i);
  world.nextRound();
  for (let i = 0; i < DIFFERENCES[2].length; i += 1) findDifference(world, 2, i);
  return { screen: SCREEN_VICTORY, best: world.state.score };
}
