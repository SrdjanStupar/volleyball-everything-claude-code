import { Schema, type } from '@colyseus/schema';

export class PlayerState extends Schema {
  @type('float32') x: number = 0;
  @type('float32') y: number = 0;
  @type('float32') vx: number = 0;
  @type('float32') vy: number = 0;
  @type('string')  facing: string = 'right';
  @type('boolean') isGrounded: boolean = true;
  @type('float32') walkCycle: number = 0;
}

export class BallState extends Schema {
  @type('float32') x: number = 0;
  @type('float32') y: number = 0;
  @type('float32') vx: number = 0;
  @type('float32') vy: number = 0;
  @type('float32') spinAngle: number = 0;
}

export class ScoreState extends Schema {
  @type('int8') p1: number = 0;
  @type('int8') p2: number = 0;
}

export class VolleyballState extends Schema {
  @type(PlayerState) player1 = new PlayerState();
  @type(PlayerState) player2 = new PlayerState();
  @type(BallState)   ball = new BallState();
  @type(ScoreState)  score = new ScoreState();
  @type('string')    matchState: string = 'serve';
  @type('int8')      servingPlayer: number = 1;
  @type('float32')   pointOverTimer: number = 0;
}
