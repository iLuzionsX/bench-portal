# ONSLAUGHT production model slots

The reconstructed runtime loads these GLB files if present and falls back to procedural meshes if they are absent:

## Weapons
- `weapons/vk7.glb` — Quaternius sci-fi modular assault-rifle direction
- `weapons/hammer12.glb` — short/wide sci-fi shotgun direction
- `weapons/longshot.glb` — long sci-fi sniper/DMR direction

## Enemies
- `enemies/swarm.glb` — lean humanoid robot
- `enemies/rusher.glb` — low tripod/quadruped robot
- `enemies/heavy.glb` — broad armored robot
- `enemies/ranged.glb` — turret/drone robot

Primary art sources: Quaternius Sci-Fi Essentials Kit and Sci-Fi Modular Gun Pack. Both are CC0. Individual Quaternius models are also available from Poly Pizza as GLTF/GLB under CC0.

Keep these filenames stable. The loader handles scaling/centering and conservative material tuning at runtime.
