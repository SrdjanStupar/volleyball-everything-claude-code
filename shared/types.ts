export type PlayerSide = 1 | 2;
export type Facing = 'left' | 'right';
export type MatchState = 'serve' | 'rally' | 'point_over' | 'game_over';

export interface PlayerInput {
  left: boolean;
  right: boolean;
  jump: boolean;
}

export interface PlayerSnapshot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: Facing;
  isGrounded: boolean;
  walkCycle: number;
}

export interface BallSnapshot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spinAngle: number;
  consecutiveTouches: number;
  lastTouchedBy: PlayerSide | null;
  hitCooldown: [number, number];
}

export interface GameSnapshot {
  players: [PlayerSnapshot, PlayerSnapshot];
  ball: BallSnapshot;
  score: { p1: number; p2: number };
  matchState: MatchState;
  servingPlayer: PlayerSide;
  pointOverTimer: number;
}
