// ─── Canvas ───────────────────────────────────────────────────────────────────
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 500;

// ─── Court layout (all y values: 0 = top of canvas) ─────────────────────────
export const HUD_HEIGHT = 44;          // scoreboard strip at top
export const FLOOR_Y = 468;            // y of the floor line
export const COURT_TOP_Y = HUD_HEIGHT; // top of playable court
export const COURT_HEIGHT = FLOOR_Y - COURT_TOP_Y; // 424 px
export const LEFT_WALL = 4;
export const RIGHT_WALL = GAME_WIDTH - 4;

// ─── Net ──────────────────────────────────────────────────────────────────────
export const NET_X = GAME_WIDTH / 2;   // 400
export const NET_WIDTH = 8;
export const NET_HEIGHT = Math.round(COURT_HEIGHT * 0.55); // ~233 px
export const NET_TOP_Y = FLOOR_Y - NET_HEIGHT;             // ~235

// ─── Player dimensions ────────────────────────────────────────────────────────
export const HEAD_RADIUS = 26;         // radius of the head circle
export const NOSE_LENGTH = 22;         // how far the nose tip extends past the head edge
export const LEG_HEIGHT = 20;          // height of each leg rectangle
export const LEG_WIDTH = 7;
// distance from head-centre to bottom of feet
export const PLAYER_FOOT_OFFSET = HEAD_RADIUS + LEG_HEIGHT;

// ─── Ball ─────────────────────────────────────────────────────────────────────
export const BALL_RADIUS = 30;         // +15% (was 26)

// ─── Serve position ───────────────────────────────────────────────────────────
// Ball sits at the centre of each half-court at a reachable height.
// Player moves under it to angle the serve; ball does NOT follow the player.
export const SERVE_BALL_Y = FLOOR_Y - 132; // +10% higher (was 120)
export const SERVE_BALL_X_P1 = LEFT_WALL + (GAME_WIDTH / 2 - LEFT_WALL) / 2;
export const SERVE_BALL_X_P2 = GAME_WIDTH / 2 + (GAME_WIDTH - 4 - GAME_WIDTH / 2) / 2;

// ─── Physics (manual integration, SI-ish units: px / s) ──────────────────────
export const GRAVITY = 1100;           // px/s² applied to players
export const BALL_GRAVITY = 900;       // px/s² applied to ball
export const PLAYER_SPEED = 266;       // horizontal px/s while airborne (+10%)
export const PLAYER_GROUND_SPEED = 293; // horizontal px/s while on the ground (+10%)
export const PLAYER_JUMP_VELOCITY = 670; // initial upward speed on jump (applied as -vy)
export const BALL_WALL_BOUNCE = 0.99;  // velocity coefficient on wall/ceiling bounce (capped — already near-perfect)
export const BALL_NET_BOUNCE = 0.95;   // velocity coefficient when ball clips net top (+10%)
export const BALL_NET_SIDE_BOUNCE = 0.99; // (+10%, capped at 0.99)

// ─── Hit mechanics ────────────────────────────────────────────────────────────
export const HIT_BASE_SPEED = 616;     // base hit speed along contact normal (all directions)
export const HIT_PLAYER_MOMENTUM = 0.44; // fraction of player velocity added to hit

// ─── Gameplay ─────────────────────────────────────────────────────────────────
export const WIN_SCORE = 15;
export const MAX_CONSECUTIVE_TOUCHES = 3; // ≥ 4 touches = fault

// ─── Colours ──────────────────────────────────────────────────────────────────
export const C_BG = 0x000000;
export const C_COURT_BORDER = 0xffffff;
export const C_NET = 0xee44ee;         // magenta, like the original
export const C_BALL = 0xdddddd;
export const C_BALL_LINES = 0x888888;
export const C_HEAD = 0x44aaee;        // same head colour for both players
export const C_NOSE_P1 = 0xee44aa;
export const C_NOSE_P2 = 0xdd3388;
export const C_LEGS = 0x9955ee;
export const C_EYE_PUPIL = 0x000022;
export const C_EYE_SHINE = 0xffffff;
export const C_SERVE_TEXT = 0xffff44;
