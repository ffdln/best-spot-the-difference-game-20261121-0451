// Lantern Row: one night-market alley drawn procedurally on canvas 2D, three times
// of night. The left panel is the original; the right panel is the same scene with
// the round's differences applied (the `altered` flag). All art is code — no images,
// no network. Every element is placed from the same seeded RNG in both panels, so
// the two panels agree except for the deliberate differences.

import { PALETTE } from './config.js';
import { createRandom } from './random.js';

/** Difference data per round: id, hotspot centre (panel coords) and radius. */
export const DIFFERENCES = [
  [
    { id: 'lantern-missing', x: 90, y: 115, r: 28 },
    { id: 'cat-tail', x: 470, y: 220, r: 30 },
    { id: 'sign-glyph', x: 120, y: 275, r: 28 },
    { id: 'window-dark', x: 170, y: 340, r: 30 },
    { id: 'flower-color', x: 70, y: 368, r: 26 },
    { id: 'bird-wire', x: 330, y: 143, r: 24 },
    { id: 'flag-flip', x: 210, y: 205, r: 26 },
  ],
  [
    { id: 'umbrella', x: 430, y: 330, r: 30 },
    { id: 'puddle-reflection', x: 300, y: 545, r: 30 },
    { id: 'poster-torn', x: 233, y: 382, r: 26 },
    { id: 'bell', x: 95, y: 465, r: 24 },
    { id: 'steam', x: 430, y: 375, r: 28 },
    { id: 'window-cat', x: 70, y: 340, r: 28 },
    { id: 'neon-letter', x: 500, y: 298, r: 28 },
    { id: 'barrel-lid', x: 582, y: 495, r: 26 },
  ],
  [
    { id: 'firework-color', x: 450, y: 90, r: 30 },
    { id: 'mask', x: 380, y: 470, r: 26 },
    { id: 'kite-string', x: 195, y: 140, r: 26 },
    { id: 'lantern-swap', x: 180, y: 110, r: 28 },
    { id: 'mouse', x: 540, y: 565, r: 24 },
    { id: 'stars', x: 120, y: 60, r: 26 },
    { id: 'drum-pattern', x: 360, y: 542, r: 28 },
    { id: 'bunting-flag', x: 300, y: 42, r: 24 },
    { id: 'shoe', x: 290, y: 560, r: 24 },
  ],
];

const LANTERN_X = [90, 180, 270, 360, 450];
const LANTERN_Y = [115, 111, 107, 103, 99];

/** Lantern string y at a given x (gentle sag). */
function stringY(x) {
  return 120 - (x - 20) * 0.045;
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/** Draw one paper lantern at (x, y) in the given colour. */
function drawLantern(ctx, x, y, colour) {
  ctx.save();
  ctx.shadowColor = colour;
  ctx.shadowBlur = 18;
  ctx.fillStyle = colour;
  ellipse(ctx, x, y, 13, 17);
  ctx.restore();
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(x - 5, y - 20, 10, 4);
  ctx.fillRect(x - 5, y + 16, 10, 4);
  ctx.strokeStyle = 'rgba(120, 40, 20, 0.55)';
  ctx.lineWidth = 1;
  line(ctx, x - 11, y - 8, x - 11, y + 8);
  line(ctx, x + 11, y - 8, x + 11, y + 8);
}

/** The alley cat sitting on the right roof edge; tail up (original) or curled down. */
function drawCat(ctx, x, y, tailUp) {
  ctx.fillStyle = '#2b2f38';
  ellipse(ctx, x, y + 6, 26, 14); // body
  circle(ctx, x + 16, y - 8, 11); // head
  ctx.beginPath();
  ctx.moveTo(x + 8, y - 14);
  ctx.lineTo(x + 11, y - 24);
  ctx.lineTo(x + 15, y - 14);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 18, y - 16);
  ctx.lineTo(x + 22, y - 25);
  ctx.lineTo(x + 25, y - 15);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#2b2f38';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (tailUp) {
    ctx.moveTo(x - 24, y + 4);
    ctx.quadraticCurveTo(x - 34, y - 12, x - 26, y - 26);
  } else {
    ctx.moveTo(x - 24, y + 4);
    ctx.quadraticCurveTo(x - 30, y + 16, x - 16, y + 18);
  }
  ctx.stroke();
  ctx.fillStyle = '#f2c94c';
  circle(ctx, x + 19, y - 10, 1.6);
}

/**
 * Draw the whole 600x600 scene for one panel.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} roundIndex 0, 1 or 2
 * @param {boolean} altered whether this is the right (altered) panel
 */
export function drawScene(ctx, roundIndex, altered) {
  const rng = createRandom(1234 + roundIndex * 7919);
  const isRain = roundIndex === 1;
  const isFestival = roundIndex === 2;

  // --- sky ---
  const sky = ctx.createLinearGradient(0, 0, 0, 600);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(0.6, PALETTE.skyBottom);
  sky.addColorStop(1, PALETTE.nightDim);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 600, 600);

  // --- stars (festival round: 3 stars missing on the altered panel) ---
  ctx.fillStyle = '#dceef7';
  let skipped = 0;
  for (let i = 0; i < 42; i += 1) {
    const sx = 12 + rng() * 576;
    const sy = 8 + rng() * 170;
    const sr = 0.8 + rng() * 1.4;
    if (isFestival && altered && i % 14 === 0 && skipped < 3) {
      skipped += 1;
      continue;
    }
    circle(ctx, sx, sy, sr);
  }

  // --- moon ---
  ctx.fillStyle = '#f4ead0';
  circle(ctx, 490, 64, 30);
  ctx.fillStyle = '#e2d3ae';
  circle(ctx, 480, 56, 6);
  circle(ctx, 498, 74, 4);

  // --- festival: bunting across the top ---
  if (isFestival) {
    ctx.strokeStyle = '#8a6d3b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, 50);
    ctx.quadraticCurveTo(300, 66, 570, 34);
    ctx.stroke();
    const flagColours = ['#e5534b', '#f2c94c', '#4fc3c3', '#9b7ede'];
    for (let i = 0; i < 12; i += 1) {
      const fx = 48 + i * 44;
      const fy = 52 + Math.sin((fx - 30) / 540 * Math.PI) * 14;
      if (altered && i === 6) continue; // the missing bunting flag
      ctx.fillStyle = flagColours[i % 4];
      ctx.beginPath();
      ctx.moveTo(fx - 9, fy);
      ctx.lineTo(fx + 9, fy);
      ctx.lineTo(fx, fy + 18);
      ctx.closePath();
      ctx.fill();
    }
  }

  // --- festival: kite (string missing on the altered panel) ---
  if (isFestival) {
    ctx.fillStyle = '#e5534b';
    ctx.beginPath();
    ctx.moveTo(150, 62);
    ctx.lineTo(178, 92);
    ctx.lineTo(150, 122);
    ctx.lineTo(122, 92);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f2c94c';
    ctx.beginPath();
    ctx.moveTo(150, 62);
    ctx.lineTo(178, 92);
    ctx.lineTo(150, 92);
    ctx.closePath();
    ctx.fill();
    if (!altered) {
      ctx.strokeStyle = '#d8cdb4';
      ctx.lineWidth = 1.5;
      line(ctx, 150, 122, 240, 200);
    }
  }

  // --- festival: fireworks (the big burst changes colour on the altered panel) ---
  if (isFestival) {
    const bursts = [
      { x: 450, y: 90, r: 55, colour: altered ? PALETTE.fireworkC : PALETTE.fireworkA },
      { x: 120, y: 130, r: 40, colour: PALETTE.fireworkB },
    ];
    for (const b of bursts) {
      ctx.save();
      ctx.globalAlpha = 0.9;
      for (let i = 0; i < 14; i += 1) {
        const a = (i / 14) * Math.PI * 2;
        const len = b.r * (0.55 + ((i * 37) % 10) / 22);
        ctx.strokeStyle = b.colour;
        ctx.lineWidth = 2;
        line(ctx, b.x, b.y, b.x + Math.cos(a) * len, b.y + Math.sin(a) * len);
      }
      ctx.fillStyle = '#fff6d8';
      circle(ctx, b.x, b.y, 5);
      ctx.restore();
    }
  }

  // --- wire with a bird (bird absent on the altered panel, round 1) ---
  ctx.strokeStyle = '#3a4552';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 150);
  ctx.quadraticCurveTo(300, 158, 600, 140);
  ctx.stroke();
  if (!(roundIndex === 0 && altered)) {
    ctx.fillStyle = '#1c222c';
    ellipse(ctx, 330, 141, 12, 7);
    circle(ctx, 340, 135, 4.5);
    ctx.beginPath();
    ctx.moveTo(344, 134);
    ctx.lineTo(350, 136);
    ctx.lineTo(344, 138);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1c222c';
    ctx.lineWidth = 2;
    line(ctx, 328, 147, 326, 152);
    line(ctx, 333, 147, 332, 152);
  }

  // --- lantern string (round 1: first lantern missing on the altered panel;
  //     festival: lanterns 2 and 4 swap colours on the altered panel) ---
  ctx.strokeStyle = '#5a4632';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(20, stringY(20));
  ctx.quadraticCurveTo(300, stringY(300) + 14, 580, stringY(580));
  ctx.stroke();
  const festivalColours = [PALETTE.lantern, '#4fc3c3', PALETTE.lantern, '#e58aa0', PALETTE.lantern];
  for (let i = 0; i < 5; i += 1) {
    if (roundIndex === 0 && altered && i === 0) continue;
    let colour = PALETTE.lantern;
    if (isFestival) {
      colour = altered
        ? [PALETTE.lantern, '#e58aa0', PALETTE.lantern, '#4fc3c3', PALETTE.lantern][i]
        : festivalColours[i];
    }
    drawLantern(ctx, LANTERN_X[i], LANTERN_Y[i], colour);
  }

  // --- distant rooftops silhouette ---
  ctx.fillStyle = '#12202e';
  ctx.beginPath();
  ctx.moveTo(0, 340);
  ctx.lineTo(120, 315);
  ctx.lineTo(260, 335);
  ctx.lineTo(400, 312);
  ctx.lineTo(520, 332);
  ctx.lineTo(600, 318);
  ctx.lineTo(600, 600);
  ctx.lineTo(0, 600);
  ctx.closePath();
  ctx.fill();

  // --- left building ---
  ctx.fillStyle = PALETTE.building;
  ctx.fillRect(0, 260, 250, 340);
  ctx.fillStyle = PALETTE.buildingEdge;
  ctx.beginPath();
  ctx.moveTo(0, 262);
  ctx.lineTo(250, 240);
  ctx.lineTo(250, 262);
  ctx.lineTo(0, 282);
  ctx.closePath();
  ctx.fill();
  // flag pole on the left roof (points left originally, right when altered, round 1)
  ctx.strokeStyle = '#6b7686';
  ctx.lineWidth = 3;
  line(ctx, 210, 250, 210, 200);
  ctx.fillStyle = '#e5534b';
  ctx.beginPath();
  if (roundIndex === 0 && altered) {
    ctx.moveTo(210, 202);
    ctx.lineTo(236, 210);
    ctx.lineTo(210, 218);
  } else {
    ctx.moveTo(210, 202);
    ctx.lineTo(184, 210);
    ctx.lineTo(210, 218);
  }
  ctx.closePath();
  ctx.fill();

  // shop sign (round 1: RAMEN vs RANEN on the altered panel)
  ctx.fillStyle = PALETTE.signRed;
  rr(ctx, 35, 255, 170, 40, 6);
  ctx.fillStyle = PALETTE.signCream;
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(roundIndex === 0 && altered ? 'RANEN' : 'RAMEN', 120, 276);

  // windows (round 1: window B dark on the altered panel;
  //          round 2: a cat sits in window A, absent on the altered panel)
  const windowA = { x: 40, y: 300, w: 60, h: 80 };
  const windowB = { x: 140, y: 300, w: 60, h: 80 };
  ctx.fillStyle = PALETTE.windowLit;
  ctx.fillRect(windowA.x, windowA.y, windowA.w, windowA.h);
  ctx.fillStyle = roundIndex === 0 && altered ? PALETTE.windowDark : PALETTE.windowLit;
  ctx.fillRect(windowB.x, windowB.y, windowB.w, windowB.h);
  ctx.strokeStyle = '#0f141c';
  ctx.lineWidth = 3;
  ctx.strokeRect(windowA.x, windowA.y, windowA.w, windowA.h);
  ctx.strokeRect(windowB.x, windowB.y, windowB.w, windowB.h);
  line(ctx, windowA.x + windowA.w / 2, windowA.y, windowA.x + windowA.w / 2, windowA.y + windowA.h);
  line(ctx, windowB.x + windowB.w / 2, windowB.y, windowB.x + windowB.w / 2, windowB.y + windowB.h);
  if (roundIndex === 1 && !altered) {
    ctx.fillStyle = '#2b2f38';
    ellipse(ctx, 70, 372, 18, 12);
    circle(ctx, 78, 356, 8);
    ctx.beginPath();
    ctx.moveTo(72, 350);
    ctx.lineTo(74, 342);
    ctx.lineTo(78, 350);
    ctx.closePath();
    ctx.fill();
  }
  // flower pot on the sill under window A (round 1: red vs violet blooms)
  ctx.fillStyle = '#8a5a3b';
  ctx.beginPath();
  ctx.moveTo(45, 384);
  ctx.lineTo(95, 384);
  ctx.lineTo(90, 408);
  ctx.lineTo(50, 408);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = roundIndex === 0 && altered ? PALETTE.flowerViolet : PALETTE.flowerRed;
  circle(ctx, 58, 372, 7);
  circle(ctx, 72, 364, 8);
  circle(ctx, 86, 372, 7);
  ctx.strokeStyle = '#3f7a4a';
  ctx.lineWidth = 2;
  line(ctx, 58, 378, 58, 384);
  line(ctx, 72, 372, 72, 384);
  line(ctx, 86, 378, 86, 384);

  // door
  ctx.fillStyle = '#10161f';
  ctx.fillRect(150, 470, 70, 130);
  ctx.fillStyle = '#c9a86a';
  circle(ctx, 210, 535, 4);

  // poster on the left wall (round 2: torn corner on the altered panel)
  ctx.fillStyle = '#e8dcc0';
  ctx.fillRect(210, 350, 46, 64);
  ctx.fillStyle = '#c0392b';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FEST', 233, 372);
  ctx.fillStyle = '#2c3848';
  ctx.fillRect(216, 380, 34, 3);
  ctx.fillRect(216, 388, 34, 3);
  ctx.fillRect(216, 396, 24, 3);
  if (roundIndex === 1 && altered) {
    ctx.fillStyle = PALETTE.building;
    ctx.beginPath();
    ctx.moveTo(256, 350);
    ctx.lineTo(256, 366);
    ctx.lineTo(240, 350);
    ctx.closePath();
    ctx.fill();
  }

  // --- right building (behind the cart) ---
  ctx.fillStyle = '#18222e';
  ctx.fillRect(380, 240, 220, 360);
  ctx.fillStyle = PALETTE.buildingEdge;
  ctx.beginPath();
  ctx.moveTo(380, 242);
  ctx.lineTo(600, 220);
  ctx.lineTo(600, 242);
  ctx.lineTo(380, 262);
  ctx.closePath();
  ctx.fill();
  // neon sign (round 2: the A goes dark on the altered panel)
  ctx.save();
  ctx.shadowColor = '#ff5a7a';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#ff7a9a';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const neon = ['R', 'A', 'M', 'E', 'N'];
  let nx = 448;
  for (let i = 0; i < neon.length; i += 1) {
    if (roundIndex === 1 && altered && i === 1) {
      ctx.fillStyle = '#4a2b33';
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = '#ff7a9a';
      ctx.shadowBlur = 14;
    }
    ctx.fillText(neon[i], nx, 298);
    nx += 22;
  }
  ctx.restore();
  // cat on the right roof edge (round 1: tail up vs curled down)
  drawCat(ctx, 470, 222, !(roundIndex === 0 && altered));

  // --- ground ---
  ctx.fillStyle = PALETTE.ground;
  ctx.fillRect(0, 480, 600, 120);
  ctx.fillStyle = PALETTE.cobble;
  for (let gy = 490; gy < 600; gy += 22) {
    for (let gx = (gy % 44 === 0 ? 0 : -14); gx < 600; gx += 28) {
      ctx.fillRect(gx, gy, 24, 3);
    }
  }
  // puddle (round 2: reflection streaks missing on the altered panel)
  ctx.fillStyle = '#1e3a4d';
  ellipse(ctx, 300, 545, 70, 13);
  if (!(roundIndex === 1 && altered)) {
    ctx.fillStyle = 'rgba(247, 198, 90, 0.5)';
    ctx.fillRect(272, 540, 8, 10);
    ctx.fillRect(292, 538, 6, 12);
    ctx.fillRect(312, 541, 9, 9);
    ctx.fillRect(330, 539, 5, 11);
  }

  // --- bicycle, left foreground (round 2: bell absent on the altered panel) ---
  ctx.strokeStyle = '#c8ccd4';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(62, 520, 26, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(148, 520, 26, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(62, 520);
  ctx.lineTo(105, 480);
  ctx.lineTo(148, 520);
  ctx.moveTo(105, 480);
  ctx.lineTo(88, 480);
  ctx.moveTo(105, 480);
  ctx.lineTo(118, 452);
  ctx.moveTo(118, 452);
  ctx.lineTo(138, 452);
  ctx.stroke();
  ctx.fillStyle = '#c8ccd4';
  ctx.fillRect(84, 476, 10, 5);
  if (!(roundIndex === 1 && altered)) {
    ctx.fillStyle = PALETTE.gold;
    circle(ctx, 95, 465, 6);
    ctx.fillStyle = '#8a6d1f';
    ctx.fillRect(93, 471, 4, 6);
  }

  // --- barrel (round 2: lid off on the altered panel) ---
  ctx.fillStyle = '#6b4a2f';
  rr(ctx, 560, 500, 44, 64, 6);
  ctx.fillStyle = '#54371f';
  ctx.fillRect(560, 522, 44, 5);
  ctx.fillRect(560, 544, 44, 5);
  if (roundIndex === 1 && altered) {
    ctx.fillStyle = '#0d1117';
    ellipse(ctx, 582, 502, 20, 5);
  } else {
    ctx.fillStyle = '#8a5a3b';
    ellipse(ctx, 582, 500, 21, 6);
  }

  // --- noodle cart with awning (round 2: umbrella closed / steam off on altered) ---
  // umbrella
  if (roundIndex === 1 && altered) {
    ctx.fillStyle = '#7a2e2e';
    ctx.beginPath();
    ctx.moveTo(430, 316);
    ctx.lineTo(442, 372);
    ctx.lineTo(418, 372);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.moveTo(360, 372);
    ctx.quadraticCurveTo(430, 306, 500, 372);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f6e8c8';
    ctx.beginPath();
    ctx.moveTo(392, 372);
    ctx.quadraticCurveTo(430, 322, 468, 372);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = '#5a4632';
  ctx.lineWidth = 4;
  line(ctx, 430, 330, 430, 372);
  // steam (round 2: absent on the altered panel)
  if (!(roundIndex === 1 && altered)) {
    ctx.strokeStyle = 'rgba(230, 240, 245, 0.75)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(415, 392);
    ctx.quadraticCurveTo(408, 376, 416, 362);
    ctx.quadraticCurveTo(422, 350, 415, 340);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(445, 392);
    ctx.quadraticCurveTo(452, 378, 444, 364);
    ctx.quadraticCurveTo(438, 352, 446, 342);
    ctx.stroke();
  }
  // cart body + awning + counter
  ctx.fillStyle = '#7a4a2e';
  ctx.fillRect(360, 420, 140, 110);
  ctx.fillStyle = '#a8643c';
  ctx.fillRect(360, 420, 140, 14);
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.moveTo(350, 420);
  ctx.lineTo(510, 420);
  ctx.lineTo(500, 396);
  ctx.lineTo(360, 396);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f6e8c8';
  for (let i = 0; i < 5; i += 1) {
    ctx.fillRect(360 + i * 28, 396, 14, 24);
  }
  // pot on the cart
  ctx.fillStyle = '#3a4552';
  ellipse(ctx, 430, 424, 26, 8);
  // festival mask on the cart front (round 3: absent on the altered panel)
  if (isFestival && !altered) {
    ctx.fillStyle = '#9b7ede';
    ellipse(ctx, 380, 470, 16, 20);
    ctx.fillStyle = '#f2c94c';
    circle(ctx, 374, 466, 3);
    circle(ctx, 386, 466, 3);
    ctx.strokeStyle = '#6b4fa0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(380, 474, 7, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
  // festival drum (round 3: stripes vs dots on the altered panel)
  if (isFestival) {
    ctx.fillStyle = '#a8643c';
    ellipse(ctx, 360, 520, 32, 22);
    ctx.fillStyle = '#f6e8c8';
    ellipse(ctx, 360, 518, 32, 16);
    if (altered) {
      ctx.fillStyle = '#c0392b';
      circle(ctx, 344, 516, 3);
      circle(ctx, 360, 518, 3);
      circle(ctx, 376, 516, 3);
      circle(ctx, 352, 522, 3);
      circle(ctx, 368, 522, 3);
    } else {
      ctx.strokeStyle = '#c0392b';
      ctx.lineWidth = 3;
      line(ctx, 336, 506, 336, 530);
      line(ctx, 352, 504, 352, 532);
      line(ctx, 368, 504, 368, 532);
      line(ctx, 384, 506, 384, 530);
    }
  }
  // festival shoe on the step (round 3: absent on the altered panel)
  if (isFestival && !altered) {
    ctx.fillStyle = '#4a6b8a';
    ctx.beginPath();
    ctx.moveTo(276, 566);
    ctx.lineTo(306, 566);
    ctx.lineTo(306, 556);
    ctx.lineTo(292, 552);
    ctx.lineTo(276, 556);
    ctx.closePath();
    ctx.fill();
  }
  // festival mouse in the corner (round 3: absent on the altered panel)
  if (isFestival && !altered) {
    ctx.fillStyle = '#8a8f96';
    ellipse(ctx, 540, 566, 12, 7);
    circle(ctx, 550, 560, 5);
    ctx.beginPath();
    ctx.moveTo(552, 556);
    ctx.lineTo(556, 549);
    ctx.lineTo(558, 556);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#8a8f96';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(528, 566);
    ctx.quadraticCurveTo(516, 570, 512, 562);
    ctx.stroke();
  }

  // --- rain (round 2 only): diagonal streaks + dimmer light ---
  if (isRain) {
    ctx.strokeStyle = 'rgba(159, 198, 216, 0.5)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 46; i += 1) {
      const rx = rng() * 620 - 10;
      const ry = rng() * 600;
      line(ctx, rx, ry, rx - 8, ry + 22);
    }
    ctx.fillStyle = 'rgba(8, 18, 28, 0.22)';
    ctx.fillRect(0, 0, 600, 600);
  }
}
