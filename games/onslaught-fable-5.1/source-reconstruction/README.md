# ONSLAUGHT — reconstructed + surpassed source

This directory is a maintainable reconstruction of the shipped `onslaught-fable-5.1` production build, followed by a deliberate improvement pass. The original authoring source was not committed upstream, so exact symbol names, internal class boundaries, shader layout, audio graph internals, and every tuning constant cannot be recovered losslessly. The shipped game remains the behavioral oracle; this source is the editable candidate intended to meet or beat it.

## Candidate systems

- Vite + Three.js development project
- arena scene / player camera / pointer-lock FPS movement
- VK-7, Hammer-12 and Longshot identities with ammo, reload, spread, recoil and ADS
- held automatic fire, sprint and forward slide with camera/FOV response
- spring-based viewmodel inertia, mouse sway, movement bob and recoil kick
- wave progression and four enemy archetypes
- hitscan damage, player health, melee pressure, kills and HUD feedback
- synthesized WebAudio weapon, hit, reload and hurt feedback
- adaptive procedural combat score that intensifies with wave, horde and low-health pressure
- cyan tracers, impact sparks, shell casings and persistent fading impact scars
- procedural fallback guns/robots plus GLTFLoader-based replacement through stable model paths
- separate effective first-person render path: postprocessed world followed by a depth-cleared crisp weapon overlay
- ACES world rendering plus bloom, chromatic aberration, vignette and speed-driven radial blur
- material-safe hit flash and dissolve hooks
- adaptive dynamic-resolution governor under sustained frame-time or horde pressure
- horde mesh-detail LOD and update throttling based on distance, enemy count and touch/mobile conditions
- production mobile-control bridge reused on coarse-pointer devices rather than maintaining a divergent second control scheme
- ONSLAUGHT cyan / gunmetal / warning visual language retained throughout

## Why this candidate goes beyond parity

The shipped benchmark game is treated as a baseline, not a ceiling. The reconstructed candidate adds pressure-reactive music, persistent battlefield impact language, adaptive GPU quality control, horde-aware LOD/update budgets, model hot-swapping with procedural fallbacks, and a clean module boundary between gameplay, rendering, FX, assets, audio and performance systems. Those improvements make the project easier to extend while also targeting more stable mobile behavior during large waves.

## Remaining exactness gaps

These are no longer blockers to using the reconstruction as an improvement candidate, but they remain differences from the original implementation:

1. exact original recoil pattern tables/tuning
2. exact original HDR/MSAA + 13-tap post constants
3. shader-authentic original hit/dissolve implementation
4. exact original GPU-analytic particle implementation
5. exact original gunshot/music synthesis graph
6. exact original arena geometry and wave constants
7. true instanced/skinned renderer for very large animated hordes

Build output remains isolated at `../reconstructed-build/`; do not overwrite the shipped hashed benchmark bundle until the reconstructed candidate has been play-tested side by side.

## Run

```bash
cd games/onslaught-fable-5.1/source-reconstruction
npm install
npm run dev
```

Build:

```bash
npm run build
```

## Real asset contract

`src/game/assets.js` reserves stable model paths for:

- `/models/weapons/vk7.glb`
- `/models/weapons/hammer12.glb`
- `/models/weapons/longshot.glb`
- `/models/enemies/swarm.glb`
- `/models/enemies/rusher.glb`
- `/models/enemies/heavy.glb`
- `/models/enemies/ranged.glb`

Target source is the CC0 Quaternius **Sci-Fi Essentials Kit** + **Sci-Fi Modular Gun Pack**. Imported models should be normalized to gunmetal/charcoal materials, cyan optics/idle emissives, and orange/red only for threat states. Missing assets intentionally fall back to procedural meshes so development never hard-fails on art availability.

## Evaluation rule

Judge this build against Fable 5.1 on the things a player actually feels: gun readability, responsiveness, movement, horde pressure, frame stability, combat feedback, mobile usability, visual coherence and maintainability. Preserve the original build untouched so comparisons stay honest.
