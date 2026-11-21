// The game state: which round, what was found, the clock, the score, hints and
// the little marks a wrong click leaves behind. Pure rules — no drawing here.

import {
  HINT_COST_SECONDS,
  HINT_SHOW_SECONDS,
  MISS_MARK_SECONDS,
  PANEL,
  PENALTY_MISS_SECONDS,
  ROUNDS,
  SCORE_COMBO_STEP,
  SCORE_FIND,
  SCORE_TIME_BONUS,
  STEP,
} from './config.js';
import { DIFFERENCES } from './scenes.js';

export const EVENT_NONE = 0;
export const EVENT_FOUND = 1;
export const EVENT_MISS = 2;
export const EVENT_ROUND_DONE = 4;
export const EVENT_GAME_DONE = 8;
export const EVENT_TIME_UP = 16;

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_ROUND = 3;
export const SCREEN_VICTORY = 4;
export const SCREEN_OVER = 5;

export function createWorld(random) {
  const state = {
    screen: SCREEN_TITLE,
    round: 0,
    found: [],
    score: 0,
    combo: 0,
    timeLeft: ROUNDS[0].seconds,
    hintsLeft: ROUNDS[0].hints,
    hint: null, // { x, y, until } in panel coords while a hint ring is showing
    misses: [], // { x, y, until } in logical coords, fading red X marks
    particles: [], // { x, y, vx, vy, life, maxLife } in logical coords
    elapsed: 0,
    muted: false,
    roundBonus: 0,
    best: 0,
  };

  /** The differences of the current round. */
  function currentDifferences() {
    return DIFFERENCES[state.round];
  }

  function resetRound(round) {
    state.round = round;
    state.found = [];
    state.combo = 0;
    state.timeLeft = ROUNDS[round].seconds;
    state.hintsLeft = ROUNDS[round].hints;
    state.hint = null;
    state.misses = [];
    state.particles = [];
    state.elapsed = 0;
    state.roundBonus = 0;
  }

  function reset() {
    state.score = 0;
    state.screen = SCREEN_TITLE;
    resetRound(0);
  }

  function burst(x, y) {
    for (let i = 0; i < 14; i += 1) {
      const angle = random() * Math.PI * 2;
      const speed = 40 + random() * 90;
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        life: 0.6,
        maxLife: 0.6,
      });
    }
  }

  /**
   * A click at logical coords. Returns an event mask; the caller reads
   * state.found / state.score afterwards. A click on either panel counts.
   */
  function click(lx, ly) {
    if (state.screen !== SCREEN_PLAY) return EVENT_NONE;
    const diffs = currentDifferences();
    for (let panel = 0; panel < 2; panel += 1) {
      const ox = panel === 0 ? PANEL.leftX : PANEL.rightX;
      const px = lx - ox;
      const py = ly - PANEL.y;
      if (px < 0 || px > PANEL.size || py < 0 || py > PANEL.size) continue;
      for (let i = 0; i < diffs.length; i += 1) {
        if (state.found.includes(i)) continue;
        const d = diffs[i];
        const dx = px - d.x;
        const dy = py - d.y;
        if (dx * dx + dy * dy <= d.r * d.r) {
          state.found.push(i);
          state.combo += 1;
          state.score += SCORE_FIND + SCORE_COMBO_STEP * (state.combo - 1);
          burst(lx, ly);
          if (state.found.length === diffs.length) {
            state.roundBonus = Math.round(state.timeLeft) * SCORE_TIME_BONUS;
            state.score += state.roundBonus;
            if (state.round === ROUNDS.length - 1) {
              state.screen = SCREEN_VICTORY;
              return EVENT_FOUND | EVENT_GAME_DONE;
            }
            state.screen = SCREEN_ROUND;
            return EVENT_FOUND | EVENT_ROUND_DONE;
          }
          return EVENT_FOUND;
        }
      }
      // Inside a panel but on no difference: a miss.
      state.combo = 0;
      state.timeLeft = Math.max(0, state.timeLeft - PENALTY_MISS_SECONDS);
      state.misses.push({ x: lx, y: ly, until: state.elapsed + MISS_MARK_SECONDS });
      if (state.timeLeft <= 0) {
        state.screen = SCREEN_OVER;
        return EVENT_MISS | EVENT_TIME_UP;
      }
      return EVENT_MISS;
    }
    return EVENT_NONE;
  }

  /** Use a hint: ring one random unfound difference for a couple of seconds. */
  function useHint() {
    if (state.screen !== SCREEN_PLAY || state.hintsLeft <= 0) return false;
    const remaining = currentDifferences()
      .map((d, i) => i)
      .filter((i) => !state.found.includes(i));
    if (remaining.length === 0) return false;
    const pick = remaining[Math.floor(random() * remaining.length)];
    const d = currentDifferences()[pick];
    state.hint = { x: d.x, y: d.y, until: state.elapsed + HINT_SHOW_SECONDS };
    state.hintsLeft -= 1;
    state.timeLeft = Math.max(0, state.timeLeft - HINT_COST_SECONDS);
    if (state.timeLeft <= 0) state.screen = SCREEN_OVER;
    return true;
  }

  function nextRound() {
    resetRound(state.round + 1);
    state.screen = SCREEN_PLAY;
  }

  /** Advance the clock and the little animations by one fixed step. */
  function step(dt, inTitle) {
    state.elapsed += dt;
    for (const p of state.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 160 * dt;
      p.life -= dt;
    }
    state.particles = state.particles.filter((p) => p.life > 0);
    state.misses = state.misses.filter((m) => m.until > state.elapsed);
    if (state.hint && state.hint.until <= state.elapsed) state.hint = null;
    if (inTitle || state.screen !== SCREEN_PLAY) return EVENT_NONE;
    state.timeLeft -= dt;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      state.screen = SCREEN_OVER;
      return EVENT_TIME_UP;
    }
    return EVENT_NONE;
  }

  return {
    state,
    reset,
    resetRound,
    click,
    useHint,
    nextRound,
    step,
    currentDifferences,
  };
}
