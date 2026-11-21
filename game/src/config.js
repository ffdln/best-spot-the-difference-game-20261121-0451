// Every tuning number and colour in one place. The playfield is a fixed 1280x720
// logical area; the renderer scales it to the window, so no rule below depends on
// the screen size. Two panels (600x600 each) show the same alley twice.

export const FIELD = { width: 1280, height: 720 };

export const HEADER = { height: 56 };

/** Panel geometry: left panel at (20, 64), right panel at (660, 64), 600x600 each. */
export const PANEL = { size: 600, leftX: 20, rightX: 660, y: 64, gap: 24 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Three rounds of the same street, later in the night. Each round: name, seconds, differences. */
export const ROUNDS = [
  { name: 'Dusk Market', seconds: 180, hints: 3, hotspot: 30 },
  { name: 'Rainy Alley', seconds: 150, hints: 3, hotspot: 27 },
  { name: 'Festival Night', seconds: 120, hints: 3, hotspot: 24 },
];

export const SCORE_FIND = 100;
export const SCORE_COMBO_STEP = 25;
export const SCORE_TIME_BONUS = 10;
export const PENALTY_MISS_SECONDS = 5;
export const HINT_COST_SECONDS = 10;
export const HINT_SHOW_SECONDS = 2;
export const MISS_MARK_SECONDS = 0.9;

export const PALETTE = {
  backdrop: '#0a1620',
  skyTop: '#0d2a3d',
  skyBottom: '#16425c',
  nightDim: '#0a1a26',
  ground: '#1d2733',
  cobble: '#28323f',
  building: '#1b2431',
  buildingEdge: '#2c3848',
  windowLit: '#f7c65a',
  windowDark: '#141c26',
  lantern: '#f2a541',
  lanternGlow: '#ffd98a',
  signRed: '#c0392b',
  signCream: '#f6e8c8',
  flowerRed: '#e5534b',
  flowerViolet: '#9b7ede',
  gold: '#f2c94c',
  goldRing: '#ffd94d',
  text: '#eef1f5',
  muted: '#93a1b3',
  red: '#e5534b',
  teal: '#4fc3c3',
  rain: '#9fc6d8',
  fireworkA: '#ff6b6b',
  fireworkB: '#ffd94d',
  fireworkC: '#7ed0ff',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'lantern-row.best';
