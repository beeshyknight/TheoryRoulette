# Theory Roulette — Rabbit r1 Creation

This package is intentionally structured so `index.html` is at the ROOT of the ZIP/archive.

## Required runtime entry point

`/index.html`

The runtime is self-contained: all HTML, CSS, the 100-card theory/intervention deck, cases, wildcards and JavaScript are inside `index.html`. The `assets/` directory contains editable SVG artwork plus PNG fallbacks/reference assets, but the game does not depend on external network files to display its first screen.

## r1 layout and controls

- Viewport: 240 × 282 pixels
- Wheel up/down: move left/right through modes and cards (`scrollUp`, `scrollDown`)
- Side button: select/draw/continue (`sideClick`)
- Side-button long press: reflection input attempt where the WebView exposes speech recognition (`longPressStart`, `longPressEnd`)
- Accelerometer: shake to draw a wildcard when `window.creationSensors.accelerometer` is available
- Browser fallback controls appear only outside the r1 Creation environment.

## Game content

- 100 cards total
- 55 “theories that inform”
- 45 “approaches that intervene”
- UK health and social care practice situations
- Wildcards including lived experience, power, law, environment, culture, communication, inequality, ethics, trauma, relationships, reasonable adjustments and uncertainty
- Theory → practice → limitation → theory/intervention-link game loop
- XP, chain scoring and no-repeat run logic

## Blank-screen safeguard

The first home screen is literal static HTML already present in `index.html`; it does not wait for JavaScript to create the interface. If JavaScript fails, that static screen remains visible. The archive also contains no external CSS or JavaScript dependencies.

## Important packaging detail

Do NOT wrap these files inside another folder when creating an import ZIP. The archive root must contain `index.html` directly.

Correct:

```
/index.html
/README.md
/assets/...
/screenshots/...
```

Incorrect:

```
/theory-roulette/index.html
```

The previous build used the second structure, which can leave an importer with no root entry page.
