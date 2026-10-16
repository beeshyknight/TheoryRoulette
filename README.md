# Theory Roulette r1

A Rabbit r1 Creation built using the same project structure and R1 bridge pattern as the known-working Theory Lab r1 port and Rabbit's public Creations SDK demo.

## Files

- `index.html` — R1 entry point
- `css/r1.css` — 240×282 interface
- `js/r1-bridge.js` — wheel / side button / long-press / storage bridge
- `js/r1-app.js` — game engine
- `js/theoryData.js` — 100 theory/intervention cards
- `js/gameData.js` — practice situations, modifiers and wildcards
- `assets/images/` — local PNG assets used on-screen
- `dev.html` — desktop R1 simulator

## Controls

- Wheel up/down: move through modes/cards/prompts/link choices
- Side click: select / continue
- Long press: jump to the critical-challenge reflection prompt
- Shake: wildcard during case/reflection/link stages

The public Creations SDK documents wheel events (`scrollUp`, `scrollDown`), side-button events (`sideClick`, `longPressStart`, `longPressEnd`), `creationStorage`, `PluginMessageHandler` and `creationSensors.accelerometer`.

## Local test

Serve this folder rather than double-clicking `index.html`, because the app uses ES modules:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/dev.html`.
