# Arcade Volleyball

A proof of concept built with the **Cursor + Claude + everything-claude-code skills framework**. The game itself is a browser-based remake of the classic 1980s Arcade Volleyball, built with Phaser 3 and TypeScript.

## Stack

- [Phaser 3](https://phaser.io/) — game framework
- [TypeScript](https://www.typescriptlang.org/) — type safety
- [Vite](https://vitejs.dev/) — dev server and bundler

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Controls

| Action | Player 1 | Player 2 |
|--------|----------|----------|
| Move left | `A` | `←` |
| Move right | `D` | `→` |
| Jump / Serve | `W` | `↑` |

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

## Project structure

```
src/
├── constants.ts          all tunable numbers and colours
├── main.ts               Phaser game config and bootstrap
├── scenes/
│   ├── BootScene.ts
│   ├── MenuScene.ts
│   ├── GameScene.ts      main gameplay loop
│   └── GameOverScene.ts
├── objects/
│   ├── Player.ts         physics, animation, hit calculation
│   └── Ball.ts           physics, spin animation
└── ui/
    └── Scoreboard.ts     score display with serve indicator
```
