# Theory Roulette — fixed R1 build

This build is intentionally **single-file at runtime**. `index.html` contains the CSS, the 100-card data set and the interaction code, so the R1 cannot lose the interface because a separate CSS or JS path failed to resolve.

The visible home screen is also present directly in the HTML before JavaScript starts. If JavaScript is disabled or fails, the Creation still shows a designed screen rather than a blank page.

## R1 controls
- Wheel: move through modes/cards
- Side click: select / continue
- Long press: reflection voice attempt where WebView speech recognition is available
- Shake: wildcard during a practice round

## SDK channels used
- `scrollUp` / `scrollDown`
- `sideClick`
- `longPressStart` / `longPressEnd`
- `window.creationSensors.accelerometer.start`
- `window.creationStorage.plain`
- `PluginMessageHandler.postMessage` / `window.onPluginMessage`

The assets folder contains editable SVG artwork, but the Creation does not depend on external assets to render.
