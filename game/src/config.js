// Dusk Murmuration — tuning constants. One place for every number that
// shapes how the game feels, so balance changes never touch the logic.
export const W = 1280;
export const H = 720;

export const NIGHT_SECONDS = 90; // dusk to dawn: survive this long to win
export const START_BIRDS = 12;
export const MAX_BIRDS = 40;
export const COMBO_MAX = 5;
export const COMBO_WINDOW = 4; // seconds without a mote before the combo fades
export const CLOUD_HIT_LOSS = 3; // birds lost per storm touch
export const INVULN_SECONDS = 1.5; // grace after a storm hit
export const MOTE_SCORE = 10;

export const LEADER_SPEED = 560; // px/s top speed of the lead bird
export const LEADER_ACCEL = 2600; // px/s^2 toward the pointer
export const FOLLOW_STIFFNESS = 42; // spring pull of each bird to the one ahead
export const FOLLOW_DAMPING = 13;
export const TRAIL_SPACING = 22; // px between birds in the ribbon

export const MOTE_CLUSTER = 5; // motes per cluster
export const MOTE_SPAWN_EVERY = 1.6; // seconds between clusters
export const MOTE_LIFE = 14; // seconds before a mote fades out

export const CLOUD_SPAWN_EVERY = 4.2; // seconds at the start of the night
export const CLOUD_SPAWN_LATE = 2.4; // seconds near dawn (more storms)
export const CLOUD_SPEED = 42; // px/s base drift
export const CLOUD_SPEED_LATE = 78;

export const WIND_EVERY_MIN = 9;
export const WIND_EVERY_MAX = 14;
export const WIND_WARN = 1.3; // seconds of warning before a gust
export const WIND_GUST = 1.6; // seconds a gust lasts
export const WIND_FORCE = 260; // px/s^2 base push
export const WIND_FORCE_LATE = 430;

// Dusk palette (nightT = 0) fades into dawn palette (nightT = 1).
export const SKY_DUSK = ['#141033', '#3b2360', '#7a3a6e', '#e07a4e'];
export const SKY_DAWN = ['#2a4a7a', '#7a6aa8', '#e89a7a', '#ffd98a'];
export const HILL_FAR = '#241a3d';
export const HILL_NEAR = '#160f28';
