import { Room, Client } from 'colyseus';
import { VolleyballState } from '../schema/VolleyballState';
import { VolleyballSimulation } from '../../../shared/VolleyballSimulation';
import type { PlayerInput } from '../../../shared/types';

interface InputMessage {
  left: boolean;
  right: boolean;
  jump: boolean;
}

const TICK_MS = 1000 / 60;

export class VolleyballRoom extends Room<VolleyballState> {
  private sim!: VolleyballSimulation;

  /** Buffered inputs for the current tick, indexed by seat (0 or 1). */
  private inputs: [PlayerInput, PlayerInput] = [
    { left: false, right: false, jump: false },
    { left: false, right: false, jump: false },
  ];

  /** Maps sessionId → seat index (0 = P1, 1 = P2). */
  private clientSlots = new Map<string, 0 | 1>();

  onCreate(): void {
    this.setState(new VolleyballState());
    this.maxClients = 2;

    this.sim = new VolleyballSimulation();

    this.sim.onPointScored = (_side, _label, score, servingPlayer) => {
      this.state.score.p1 = score.p1;
      this.state.score.p2 = score.p2;
      this.state.servingPlayer = servingPlayer;
    };

    this.sim.onGameOver = (winner, score) => {
      this.state.score.p1 = score.p1;
      this.state.score.p2 = score.p2;
      this.state.matchState = 'game_over';
      this.broadcast('game_over', { winner, score });
    };

    this.sim.onServeStarted = (servingPlayer) => {
      this.state.servingPlayer = servingPlayer;
      this.state.matchState = 'serve';
    };

    this.onMessage('input', (client: Client, message: InputMessage) => {
      const slot = this.clientSlots.get(client.sessionId);
      if (slot === undefined) return;
      this.inputs[slot] = {
        left: !!message.left,
        right: !!message.right,
        // Jump is sticky: once set, keep it true until the tick consumes it
        jump: this.inputs[slot].jump || !!message.jump,
      };
    });

    this.setSimulationInterval((dt) => this.tick(dt), TICK_MS);
    this.setPatchRate(TICK_MS); // send state at 60 Hz instead of default 20 Hz
  }

  onJoin(client: Client): void {
    const slot = (this.clientSlots.size === 0 ? 0 : 1) as 0 | 1;
    this.clientSlots.set(client.sessionId, slot);
    client.send('slot', { slot });
    console.log(`Client ${client.sessionId} joined as P${slot + 1}`);

    if (this.clientSlots.size === 2) {
      // Both players connected — tell everyone to start
      this.broadcast('start', {});
    }
  }

  onLeave(client: Client): void {
    const slot = this.clientSlots.get(client.sessionId);
    this.clientSlots.delete(client.sessionId);
    // Clear inputs for the disconnected seat
    if (slot !== undefined) {
      this.inputs[slot] = { left: false, right: false, jump: false };
    }
    console.log(`Client ${client.sessionId} left`);
  }

  onDispose(): void {
    console.log(`Room ${this.roomId} disposing`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Simulation tick + state patch
  // ─────────────────────────────────────────────────────────────────────────────

  private tick(dt: number): void {
    this.sim.tick(dt / 1000, this.inputs);

    // Consume jump flags so they fire once per keypress
    this.inputs[0].jump = false;
    this.inputs[1].jump = false;

    const snap = this.sim.getSnapshot();

    const p1 = snap.players[0];
    this.state.player1.x          = p1.x;
    this.state.player1.y          = p1.y;
    this.state.player1.vx         = p1.vx;
    this.state.player1.vy         = p1.vy;
    this.state.player1.facing     = p1.facing;
    this.state.player1.isGrounded = p1.isGrounded;
    this.state.player1.walkCycle  = p1.walkCycle;

    const p2 = snap.players[1];
    this.state.player2.x          = p2.x;
    this.state.player2.y          = p2.y;
    this.state.player2.vx         = p2.vx;
    this.state.player2.vy         = p2.vy;
    this.state.player2.facing     = p2.facing;
    this.state.player2.isGrounded = p2.isGrounded;
    this.state.player2.walkCycle  = p2.walkCycle;

    const b = snap.ball;
    this.state.ball.x         = b.x;
    this.state.ball.y         = b.y;
    this.state.ball.vx        = b.vx;
    this.state.ball.vy        = b.vy;
    this.state.ball.spinAngle = b.spinAngle;

    this.state.matchState     = snap.matchState;
    this.state.servingPlayer  = snap.servingPlayer;
    this.state.pointOverTimer = snap.pointOverTimer;
  }
}
