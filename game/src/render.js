// The renderer: scales the fixed 1280x720 field to the window, paints the header
// (title, round, counter, timer bar, hints, score), both panels of the alley, the
// gold rings on found differences, hint rings, miss marks and particles, and the
// title / paused / round-complete / victory / game-over screens over it all.

import { FIELD, FONT, HEADER, PALETTE, PANEL, ROUNDS } from './config.js';
import { drawScene, DIFFERENCES } from './scenes.js';
import {
  SCREEN_OVER,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_ROUND,
  SCREEN_TITLE,
  SCREEN_VICTORY,
} from './world.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;
    scale = Math.min(w / FIELD.width, h / FIELD.height);
    offsetX = (w - FIELD.width * scale) / 2;
    offsetY = (h - FIELD.height * scale) / 2;
  }
  resize();
  window.addEventListener('resize', resize);

  /** Window (CSS) coords → logical field coords. */
  function toLogical(x, y) {
    return { x: (x - offsetX) / scale, y: (y - offsetY) / scale };
  }

  function formatTime(seconds) {
    const s = Math.max(0, Math.ceil(seconds));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  function drawTimerBar(state) {
    const round = ROUNDS[state.round];
    const frac = Math.max(0, state.timeLeft / round.seconds);
    const x = 780;
    const y = 20;
    const w = 200;
    const h = 14;
    ctx.fillStyle = '#1b2431';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = state.timeLeft <= 30 ? PALETTE.red : PALETTE.gold;
    ctx.fillRect(x, y, w * frac, h);
    ctx.strokeStyle = '#3a4552';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 20px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(formatTime(state.timeLeft), x + w + 10, y + h / 2);
  }

  function drawHeader(state) {
    ctx.fillStyle = '#0d141d';
    ctx.fillRect(0, 0, FIELD.width, HEADER.height);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 24px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('LANTERN ROW', 20, HEADER.height / 2 + 1);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `18px ${FONT}`;
    ctx.fillText(ROUNDS[state.round].name, 240, HEADER.height / 2 + 1);
    const diffs = state.found.length;
    const total = [7, 8, 9][state.round];
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 26px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(`Found ${diffs} / ${total}`, FIELD.width / 2, HEADER.height / 2 + 1);
    drawTimerBar(state);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `18px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(`Hints ${state.hintsLeft}  ·  Score ${state.score}`, 1260, HEADER.height / 2 + 1);
  }

  function drawFoundRings(state) {
    const list = state.found;
    const all = DIFFERENCES[state.round];
    for (const index of list) {
      const d = all[index];
      for (let panel = 0; panel < 2; panel += 1) {
        const ox = panel === 0 ? PANEL.leftX : PANEL.rightX;
        const cx = ox + d.x;
        const cy = PANEL.y + d.y;
        ctx.strokeStyle = PALETTE.goldRing;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, cy, d.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = PALETTE.goldRing;
        ctx.beginPath();
        ctx.arc(cx, cy - d.r - 2, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1b2431';
        ctx.font = `bold 13px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(list.indexOf(index) + 1), cx, cy - d.r - 2);
      }
    }
  }

  function drawHintRing(state) {
    if (!state.hint) return;
    const pulse = 1 + 0.12 * Math.sin(state.elapsed * 8);
    const d = state.hint;
    for (let panel = 0; panel < 2; panel += 1) {
      const ox = panel === 0 ? PANEL.leftX : PANEL.rightX;
      ctx.strokeStyle = PALETTE.goldRing;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(ox + d.x, PANEL.y + d.y, 30 * pulse, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawMisses(state) {
    for (const m of state.misses) {
      const alpha = Math.max(0, (m.until - state.elapsed) / 0.9);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = PALETTE.red;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x - 12, m.y - 12);
      ctx.lineTo(m.x + 12, m.y + 12);
      ctx.moveTo(m.x + 12, m.y - 12);
      ctx.lineTo(m.x - 12, m.y + 12);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = PALETTE.goldRing;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawPanel(state, panel) {
    const ox = panel === 0 ? PANEL.leftX : PANEL.rightX;
    ctx.save();
    ctx.beginPath();
    ctx.rect(ox, PANEL.y, PANEL.size, PANEL.size);
    ctx.clip();
    ctx.translate(ox, PANEL.y);
    drawScene(ctx, state.round, panel === 1);
    ctx.restore();
    ctx.strokeStyle = '#3a4552';
    ctx.lineWidth = 2;
    ctx.strokeRect(ox, PANEL.y, PANEL.size, PANEL.size);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `14px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(panel === 0 ? 'ORIGINAL' : 'FIND THE DIFFERENCES', ox + 8, PANEL.y + PANEL.size + 20);
  }

  function dim(alpha) {
    ctx.fillStyle = `rgba(6, 12, 18, ${alpha})`;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function centreTitle(text, sub, hint) {
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 56px ${FONT}`;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, FIELD.width / 2, 300);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `22px ${FONT}`;
    ctx.fillText(sub, FIELD.width / 2, 360);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText(hint, FIELD.width / 2, 420);
  }

  function drawScreen(state, screen, best) {
    if (screen === SCREEN_TITLE) {
      dim(0.55);
      centreTitle(
        'LANTERN ROW',
        'Two alleys, one night. Find 7 differences in Dusk Market — then 8, then 9.',
        best > 0 ? `Best score ${best}  ·  Press Space or click to start` : 'Press Space or click to start',
      );
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `16px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('Click a difference on either panel  ·  H hint (−10 s)  ·  P pause  ·  M mute', FIELD.width / 2, 470);
    } else if (screen === SCREEN_PAUSED) {
      dim(0.55);
      centreTitle('PAUSED', 'The lanterns wait for you.', 'Press P to resume');
    } else if (screen === SCREEN_ROUND) {
      dim(0.55);
      centreTitle(
        `${ROUNDS[state.round].name} complete!`,
        `Time bonus +${state.roundBonus}  ·  Score ${state.score}`,
        'Press Space for the next round',
      );
    } else if (screen === SCREEN_VICTORY) {
      dim(0.55);
      centreTitle(
        'FESTIVAL NIGHT COMPLETE!',
        `All 24 differences found  ·  Score ${state.score}${state.score > best ? ' — a new best!' : `  ·  Best ${best}`}`,
        'Press Space to play again',
      );
    } else if (screen === SCREEN_OVER) {
      dim(0.55);
      centreTitle(
        "TIME'S UP",
        `You found ${state.found.length} of ${[7, 8, 9][state.round]} in ${ROUNDS[state.round].name}  ·  Score ${state.score}`,
        'Press Space to try again',
      );
    }
  }

  function drawCrosshair(crosshair) {
    if (!crosshair || !crosshair.visible) return;
    ctx.strokeStyle = PALETTE.goldRing;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(crosshair.x, crosshair.y, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(crosshair.x - 18, crosshair.y);
    ctx.lineTo(crosshair.x - 7, crosshair.y);
    ctx.moveTo(crosshair.x + 7, crosshair.y);
    ctx.lineTo(crosshair.x + 18, crosshair.y);
    ctx.moveTo(crosshair.x, crosshair.y - 18);
    ctx.lineTo(crosshair.x, crosshair.y - 7);
    ctx.moveTo(crosshair.x, crosshair.y + 7);
    ctx.lineTo(crosshair.x, crosshair.y + 18);
    ctx.stroke();
  }

  function draw(state, screen, best, crosshair) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    drawHeader(state);
    drawPanel(state, 0);
    drawPanel(state, 1);
    drawFoundRings(state);
    drawHintRing(state);
    drawMisses(state);
    drawParticles(state);
    drawCrosshair(crosshair);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `15px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('Click a difference on either panel  ·  Arrow keys move the crosshair, Enter marks  ·  H hint  ·  P pause  ·  M mute', FIELD.width / 2, 700);
    if (screen !== SCREEN_PLAY) drawScreen(state, screen, best);
  }

  return { draw, toLogical, resize };
}
