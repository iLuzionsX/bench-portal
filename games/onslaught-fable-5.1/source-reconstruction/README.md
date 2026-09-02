# ONSLAUGHT — reconstructed source

This directory is a maintainable reconstruction of the shipped `onslaught-fable-5.1` production build. The original authoring source was not committed upstream, so minified symbol names, exact internal class boundaries, shader source layout, audio graph internals, and every tuning constant cannot be recovered losslessly.

## What is reconstructed

- Vite + Three.js development project
- arena scene / player camera / pointer-lock FPS movement
- VK-7, Hammer-12 and Longshot weapon identities
- magazine / reserve ammo, reload, fire-rate, spread, recoil and ADS behavior
- wave progression and four enemy archetypes
- hitscan damage, kills, player health and enemy melee damage
- procedural fallback viewmodel and robot bodies
- ONSLAUGHT cyan / gunmetal / warning palette and HUD language
- `window.game` development hook, matching the retrofit scripts' expectation
- normalized GLB asset manifest for the planned Quaternius CC0 weapon/robot pass

## What still belongs to parity work

The shipped build describes/contains systems that should be ported into named modules before this reconstruction replaces production:

1. spring-based viewmodel inertia/sway and original recoil patterns
2. sprint + slide state machine and movement tuning
3. separate viewmodel render pass
4. original HDR/MSAA + bloom/chromatic/radial/ACES post pipeline
5. hit-flash and dissolve enemy shaders
6. GPU analytic particles, tracers, decals and shell casings
7. synthesized WebAudio gunshots/music
8. exact mobile-control bridge behavior from `../assets/mobile-controls.js`
9. exact arena geometry and wave tuning from the minified bundle

Until those parity gates are met, **do not overwrite the shipped hashed bundle**. Build output is intentionally written to `../reconstructed-build/`.

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

## Asset contract

`src/assets/manifest.js` reserves stable model paths for:

- `vk7.glb`
- `hammer12.glb`
- `longshot.glb`
- `swarm.glb`
- `rusher.glb`
- `heavy.glb`
- `ranged.glb`

Target source is the CC0 Quaternius Sci-Fi Essentials Kit + Sci-Fi Modular Gun Pack. Imported models should be normalized to gunmetal/charcoal materials, cyan optics/idle emissives, and orange/red only for threat states.

## Reconstruction principle

Treat the existing production game as the behavioral oracle. Port one system at a time, compare it against the shipped build, then remove the corresponding reconstruction approximation. This keeps recovery incremental and avoids turning 'reconstruct source' into an unrelated rewrite.
