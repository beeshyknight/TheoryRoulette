# Theory Roulette — Rabbit R1 Creation

A small-screen theory game for nursing, social work and wider health/social care education. It is built as a static R1 Creation using the interaction channels demonstrated by rabbit's `rabbit-hmi-oss/creations-sdk` plugin demo.

## What is in this version

- Exactly **100 cards**:
  - 55 **Theories that inform**
  - 45 **Theories / approaches that intervene**
- **40 short UK health and social care practice situations**.
- **16 shake wildcards** including lived experience, environment, power, law, culture, communication, inequality, ethics, trauma, relationships, reasonable adjustments, stigma, resources, uncertainty and co-production.
- Four run modes: Mixed Run, Theories that Inform, Theories that Intervene, and Quick Draw.
- Cards are not reused during a run.
- Horizontal wheel-driven deck with animated card drift/flick and draw animation.
- Each round asks the learner to use the card on a practice situation, then turns the card over to show:
  - what the theory/approach helps them notice;
  - what it does not explain or solve alone.
- Every round ends by building a **theory–intervention bridge** rather than treating cards as isolated definitions.
- Persistent XP, best chain and collected-card progress through Creation Storage.
- Built-in R1 LLM bridge can provide a short reflective follow-up when a spoken answer is transcribed.
- Browser fallback controls are included for development/testing.

## R1 interaction mapping

The Creation uses the event/API shape shown in the official SDK demo:

- `scrollUp` / `scrollDown`: move horizontally through cards/options.
- `sideClick`: draw/select/continue.
- `longPressStart` / `longPressEnd`: attempt voice reflection when browser speech recognition is available.
- `window.creationSensors.accelerometer.start(...)`: shake detection for Wildcards.
- `window.creationStorage.plain`: persistent progress, Base64 encoded.
- `PluginMessageHandler.postMessage(...)`: optional R1 LLM reflective feedback.
- `window.onPluginMessage(...)`: receives LLM output.

## Important voice-input note

The public SDK demo documents R1 speech **output/LLM responses**, but does not document a native speech-to-text Creation channel. This build therefore treats voice input as progressive enhancement:

1. It tries `SpeechRecognition` / `webkitSpeechRecognition` in the Creation WebView.
2. If that is not exposed by the WebView, the learner can still press the side button to complete the reflection silently and continue the full game.
3. The core game does not depend on speech recognition, so unsupported STT does not break the Creation.

If you later add a supported microphone/STT bridge, the voice handling is isolated in `js/app.js` (`setupSpeech`, `onLongPressStart`, `onLongPressEnd`) and can be replaced without changing the game loop.

## Display and performance

- Designed for **240 × 282 px portrait**.
- No external fonts, images, CDNs or runtime assets.
- CSS transforms/opacity handle the main animations.
- No WebGL or animation framework.
- Content is stored in `js/data.js` and is easy to edit.

## Files

```text
theory-roulette-r1/
├── index.html
├── preview.html
├── README.md
├── assets/
│   └── theory-roulette-icon.svg
├── css/
│   └── styles.css
└── js/
    ├── app.js
    └── data.js
```

## Test in a normal browser

Open `preview.html`, or open `index.html` directly. Outside the R1, a small touch control strip appears automatically.

Keyboard controls when testing `index.html`:

- Left/Up Arrow: wheel one way
- Right/Down Arrow: wheel the other way
- Enter: side button
- Hold Space: long press / voice reflection
- `S`: shake wildcard

## Deploy as an R1 Creation

1. Host the whole folder on an HTTPS static host such as GitHub Pages, Netlify or your own server.
2. Point the Rabbit Creations install/QR flow to the hosted `index.html` URL.
3. Test on-device, especially:
   - wheel direction;
   - side-click after a long press;
   - accelerometer shake sensitivity;
   - whether WebView speech recognition is available on the current RabbitOS build.
4. If a cached version appears after an update, use a version query string on the install URL, for example `?v=2`.

## Editing the deck

All learning content is in `js/data.js`.

Each theory card has:

```js
{
  id,
  name,
  type: 'inform' | 'intervene',
  family,
  summary,
  helps,
  limits
}
```

The `helps` and `limits` fields are deliberately central. The learner does not just see the card name; after applying it they are shown what it can illuminate and where another explanation may be needed.

## Educational intent

The scoring system rewards completing a reflective chain and connecting perspectives. It does **not** ask the R1 to decide that an ambiguous health/social care answer is simply right or wrong. Theories are treated as lenses rather than facts that automatically explain a person. Wildcards deliberately bring lived experience, rights, communication, inequality and power back into the formulation.
