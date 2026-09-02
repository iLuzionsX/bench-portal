# ONSLAUGHT — reconstructed source

This directory is a maintainable reconstruction of the shipped `onslaught-fable-5.1` production build. The original authoring source was not committed upstream, so minified symbol names, exact internal class boundaries, shader source layout, audio graph internals, and every tuning constant cannot be recovered losslessly.

## What is reconstructed now

- Vite + Three.js development project
- arena scene / player camera / pointer-lock FPS movement
- VK-7, Hammer-12 and Longshot weapon identities
- magazine / reserve ammo, reload, fire-rate, spread, recoil and ADS behavior
- held-fire behavior for the VK-7
- sprint + forward slide state with camera-height/FOV response
- spring-based viewmodel inertia, mouse sway, movement bob and recoil kick
- wave progression and four enemy archetypes
- hitscan damage, kills, player health and enemy melee damage
- procedural fallback viewmodel and robot bodies
- GLTFLoader-based optional weapon/enemy model replacement with stable paths
- synthesized WebAudio weapon, hit, reload and hurt feedback
- cyan tracers, impact sparks and physical shell-casing effects
- ONSLAUGHT cyan / gunmetal / warning palette and HUD language
- `window.game` development hook, matching the retrofit scripts' expectation

## Remaining parity gates

The shipped build still has systems that need to be recovered before this source can replace production:

1. exact original recoil pattern tables and weapon tuning
2. separate viewmodel render pass
3. original HDR/MSAA + 13-tap bloom/chromatic/radial/ACES post pipeline
4. hit-flash and dissolve enemy shaders
5. GPU-analytic particle implementation and persistent decals
6. synthesized music layer and exact production gunshot graph
7. exact mobile-control bridge behavior from `../assets/mobile-controls.js`
8. exact arena geometry and wave tuning from the minified bundle
9. performance pass: instancing/LOD for large robot hordes

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

## Real asset contract

`src/game/assets.js` reserves stable model paths for:

- `/models/weapons/vk7.glb`
- `/models/weapons/hammer12.glb`
- `/models/weapons/longshot.glb`
- `/models/enemies/swarm.glb`
- `/models/enemies/rusher.glb`
- `/models/enemies/heavy.glb`
- `/models/enemies/ranged.glb`

Target source is the CC0 Quaternius **Sci-Fi Essentials Kit** + **Sci-Fi Modular Gun Pack**. Poly Pizza also republishes individual Quaternius GLTF/GLB models under CC0, which is useful for selecting only the final production meshes rather than shipping entire packs.

Imported models should be normalized to gunmetal/charcoal materials, cyan optics/idle emissives, and orange/red only for threat states. The loader intentionally falls back to procedural meshes when an asset is absent so development never hard-fails on missing art.

## Reconstruction principle

Treat the existing production game as the behavioral oracle. Port one system at a time, compare it against the shipped build, then remove the corresponding reconstruction approximation. This keeps recovery incremental and avoids turning “reconstruct source” into an unrelated rewrite.
