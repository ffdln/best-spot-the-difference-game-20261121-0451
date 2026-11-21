// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between title, play, paused, round-complete, victory and
// game-over screens.
//
// ?seed=N fixes the scene. ?shot=start|play|play2|end (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady.
import { BEST_KEY, FIELD, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld,
  EVENT_FOUND,
  EVENT_GAME_DONE,
  EVENT_MISS,
  EVENT_ROUND_DONE,
  EVENT_TIME_UP,
  SCREEN_OVER,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_ROUND,
  SCREEN_TITLE,
  SCREEN_VICTORY,
} from './world.js';
import { ACTION_CONFIRM, ACTION_HINT, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;
/** Crosshair speed in logical pixels per second. */
const CROSSHAIR_SPEED = 460;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, null);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, renderer.toLogical);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let lastTickSecond = -1;
  const crosshair = { x: FIELD.width / 2, y: 380, visible: false };

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    screen = SCREEN_PLAY;
    lastTickSecond = -1;
    announce('Playing. Find the differences.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Time's up. Score ${world.state.score}. Best ${best}.`);
  }

  function handleFound(events) {
    if (events & EVENT_FOUND) {
      audio.find();
      announce(`Found ${world.state.found.length} of ${[7, 8, 9][world.state.round]}.`);
    }
    if (events & EVENT_MISS) audio.miss();
    if (events & EVENT_ROUND_DONE) {
      audio.win();
      screen = SCREEN_ROUND;
      announce(`Round complete. Time bonus ${world.state.roundBonus}.`);
    }
    if (events & EVENT_GAME_DONE) {
      audio.win();
      screen = SCREEN_VICTORY;
      if (world.state.score > best) {
        best = world.state.score;
        saveBest(best);
      }
      announce(`All 24 differences found. Score ${world.state.score}.`);
    }
    if (events & EVENT_TIME_UP) endGame();
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      audio.toggleMute();
      announce(audio.muted ? 'Muted.' : 'Sound on.');
    }
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_VICTORY) {
      if (actions & ACTION_CONFIRM) startGame();
    } else if (screen === SCREEN_ROUND) {
      if (actions & ACTION_CONFIRM) {
        world.nextRound();
        screen = SCREEN_PLAY;
        lastTickSecond = -1;
        announce('Playing the next round.');
      }
    } else if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (actions & ACTION_HINT) {
        if (world.useHint()) announce('Hint used. Ten seconds off the clock.');
      } else if (actions & ACTION_CONFIRM && crosshair.visible) {
        handleFound(world.click(crosshair.x, crosshair.y));
      }
    } else if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    const point = input.takeClick();
    if (point) {
      if (screen === SCREEN_PLAY) {
        handleFound(world.click(point.x, point.y));
      } else if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_VICTORY) {
        startGame();
      } else if (screen === SCREEN_ROUND) {
        world.nextRound();
        screen = SCREEN_PLAY;
        lastTickSecond = -1;
      }
    }
  }

  function moveCrosshair(dt) {
    const dir = input.direction();
    if (dir.x === 0 && dir.y === 0) return;
    crosshair.visible = true;
    crosshair.x = Math.min(FIELD.width - 4, Math.max(4, crosshair.x + dir.x * CROSSHAIR_SPEED * dt));
    crosshair.y = Math.min(FIELD.height - 4, Math.max(4, crosshair.y + dir.y * CROSSHAIR_SPEED * dt));
  }

  function step(dt) {
    if (screen === SCREEN_TITLE) {
      world.step(dt, true);
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    moveCrosshair(dt);
    const events = world.step(dt, false);
    if (events & EVENT_TIME_UP) endGame();
    if (world.state.timeLeft <= 30 && world.state.timeLeft > 0) {
      const s = Math.ceil(world.state.timeLeft);
      if (s !== lastTickSecond) {
        lastTickSecond = s;
        audio.tick();
      }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
      step(STEP);
      accumulator -= STEP;
    }
    if (screen !== SCREEN_TITLE && screen !== SCREEN_PLAY) accumulator = 0;
    renderer.draw(world.state, screen, best, crosshair);
  }

  // Leaving the tab pauses a running game rather than letting the clock run unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Lantern Row. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
