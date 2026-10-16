# Theory Roulette 2 — rabbit r1 Creation

A persistent health and social care theory game built for the rabbit r1 240×282 Creation viewport.

## The learning loop

**LEARN → BUILD → APPLY**

### Learn / Theory School
- Begin with 12 foundational cards.
- Study a card over four pages: explanation, limitations, meaningful links and a full APA 7 reference.
- Play **Word Hunt** to discover new theory cards.
- New cards also unlock at XP milestones.
- Browse the connection map to see why theories complement, extend or challenge one another.

### Build
- Maintain a persistent **12-card active deck**.
- Only discovered cards can enter the deck.
- The screen shows how many strong relationships exist inside the current deck.
- A minimum of six cards is retained so Apply remains playable.

### Apply / Theory Roulette
- A case is assembled from a coherent practice archetype rather than choosing one fixed vignette.
- The same person and situation continue for five chapters.
- New information is revealed between chapters.
- Draw from the deck you built.
- Reflect on how the card explains the situation, what evidence supports it, what it misses and what it might mean for practice.
- Connect the card to another card in your active deck.
- Connections have different strengths. Not every theory links equally well to every other theory.
- XP varies with the strength of the connection and the point reached in the case. There is no automatic 200 XP per round.
- Wildcards widen the formulation through power, lived experience, environment, law, communication, inequality, co-production and other lenses.

## Collection

150 cards across:
- psychology and social psychology
- sociology
- nursing theory
- social work and social care
- disability studies
- public health and health promotion
- behavioural science
- education and learning
- organisation, leadership and implementation
- practice interventions

The collection currently contains 103 informing theories/frameworks and 47 intervention/practice cards.

## Persistence

The r1 bridge saves:
- total XP
- discovered cards
- the active 12-card deck
- cards studied
- application counts
- connection counts
- word-hunt wins
- completed cases
- mastery and best chain

Storage key: `theory_roulette_r1_v2`.

## Controls

- **Wheel**: move left/right through cards, prompts and choices
- **Side button**: select/continue
- **Hold**: back in Learn/Build, or a Wildcard during Apply
- **Shake**: attempts to trigger a Wildcard when device motion is exposed by the WebView; hold remains the reliable fallback

## Reference approach

Every card contains a full reference formatted in APA 7 style. A seminal source is used when the card represents a well-established theory; later practice frameworks and interventions use an appropriate contemporary or defining source. The complete editable reference bank is also provided in `REFERENCES.md`.

The references are intended as a teaching reference bank rather than a substitute for checking a university library record before formal publication.

## Files

- `index.html` — R1 entry point
- `r1.css` — 240×282 visual design
- `r1-bridge.js` — R1 controls and persistent storage bridge
- `r1-app.js` — Learn, Build and Apply game logic
- `theoryData.js` — 150-card theory/intervention database plus relationship data
- `gameData.js` — procedural case archetypes and wildcard data
- `REFERENCES.md` — full editable reference bank
- `dev.html` — desktop simulator
- PNG files — local visual assets; no network assets are required at runtime

## Local testing

ES modules must be served over HTTP rather than opened from `file://`.

For example:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080/dev.html`.

## Design note

The game deliberately avoids pretending that reflective health and social care reasoning can always be marked right or wrong. It does, however, distinguish stronger, weaker and unusual theoretical relationships and explains why a connection may be defensible.
