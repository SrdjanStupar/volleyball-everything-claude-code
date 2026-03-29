# Arcade Volleyball

A proof of concept built with the **Cursor + Claude + everything-claude-code skills framework**. The game itself is a browser-based remake of the classic 1980s Arcade Volleyball, built with Phaser 3 and TypeScript.

## Stack

- [Phaser 3](https://phaser.io/) — game framework
- [TypeScript](https://www.typescriptlang.org/) — type safety
- [Vite](https://vitejs.dev/) — dev server and bundler
- [Colyseus 0.15](https://colyseus.io/) — authoritative game server for online multiplayer

## Getting started

### Local multiplayer (same keyboard)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), choose **LOCAL** on the menu.

### Online multiplayer

Start the game server in a separate terminal:

```bash
cd server
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in **two browser tabs** (or two machines on the same network), choose **ONLINE** on the menu.

- **Tab 1** — click **CREATE ROOM**, copy the 3-character code that appears
- **Tab 2** — type the code into the join field and click **JOIN ROOM**

To point the client at a different server set `VITE_SERVER_URL` in a `.env` file:

```
VITE_SERVER_URL=ws://your-server-host:2567
```

## Controls

| Action | Player 1 | Player 2 |
|--------|----------|----------|
| Move left | `A` | `←` |
| Move right | `D` | `→` |
| Jump / Serve | `W` | `↑` |

In online mode each player controls only their own side.

## Rules

- **Side-out scoring** — only the serving player can score a point
- **Winning a rally as server** → +1 point, keep the serve
- **Winning a rally as receiver** → gain the serve, no point scored
- **First to 15 points** wins the set
- A rally ends when:
  - The ball hits the floor (the side it lands on loses)
  - A player touches the ball **4 times consecutively** without the opponent touching it (fault)

## Physics

All physics are hand-rolled (no Arcade Physics engine) for full control and easy tuning. Key values live in `src/constants.ts`.

**Hit direction** is determined by where the ball contacts the player's head relative to the head centre (contact normal). Ball above the head → goes up. Ball to the side → goes sideways over the net. Player jumps over the ball → smashes it downward. Player movement velocity adds a momentum bonus on top. The nose is purely cosmetic.

**Multi-contact prevention** — after any hit, that player has a 250 ms cooldown before they can contact the ball again, preventing phantom double-hits from the player's own jump velocity.

**Fixed timestep + render interpolation** — the simulation runs at a fixed 60 Hz tick rate with a remainder accumulator. Rendered positions are linearly interpolated between the previous and current tick, keeping motion smooth at any display refresh rate (120 Hz, 144 Hz, etc.).

## Project structure

```
shared/                         framework-agnostic simulation (client + server)
├── types.ts                    PlayerInput, GameSnapshot, MatchState
├── SimPlayer.ts                player physics (no Phaser dependency)
├── SimBall.ts                  ball physics (no Phaser dependency)
└── VolleyballSimulation.ts     game loop, collisions, scoring

server/                         Colyseus game server
├── src/
│   ├── index.ts                HTTP + WebSocket server entry point
│   ├── rooms/VolleyballRoom.ts authoritative room (60 Hz sim + state broadcast)
│   └── schema/VolleyballState.ts Colyseus delta-compressed state schema
└── package.json

src/                            Phaser 3 client
├── constants.ts                all tunable numbers and colours
├── main.ts                     Phaser game config and bootstrap
├── scenes/
│   ├── BootScene.ts
│   ├── MenuScene.ts            LOCAL / ONLINE mode selection
│   ├── GameScene.ts            local gameplay (uses shared sim + interpolation)
│   ├── OnlineLobbyScene.ts     create / join room by 3-char code
│   ├── OnlineGameScene.ts      online gameplay (sends inputs, renders server state)
│   └── GameOverScene.ts
├── objects/
│   ├── Player.ts               extends SimPlayer, adds Phaser draw()
│   └── Ball.ts                 extends SimBall, adds Phaser draw()
└── ui/
    └── Scoreboard.ts           score display with serve indicator
```
