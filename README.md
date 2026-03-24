# Arcade Volleyball

A browser-based remake of the classic 1980s Arcade Volleyball game, built with Phaser 3 and TypeScript.

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
