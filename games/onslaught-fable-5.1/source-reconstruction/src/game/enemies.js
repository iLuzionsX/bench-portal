export const ENEMY_ARCHETYPES = {
  swarm: {
    id: 'swarm',
    hp: 70,
    speed: 3.2,
    damage: 10,
    radius: 0.38,
    score: 100,
    color: '#182129',
    emissive: '#5ef2ff',
    silhouette: 'lean angular humanoid bot'
  },
  rusher: {
    id: 'rusher',
    hp: 48,
    speed: 5.3,
    damage: 16,
    radius: 0.34,
    score: 140,
    color: '#111820',
    emissive: '#5ef2ff',
    silhouette: 'low tripod/quadruped bot'
  },
  heavy: {
    id: 'heavy',
    hp: 260,
    speed: 1.7,
    damage: 24,
    radius: 0.65,
    score: 350,
    color: '#1b252e',
    emissive: '#ff9d3c',
    silhouette: 'broad armored bot'
  },
  ranged: {
    id: 'ranged',
    hp: 105,
    speed: 2.1,
    damage: 14,
    radius: 0.45,
    score: 220,
    color: '#101820',
    emissive: '#ff3b3b',
    silhouette: 'turret/drone'
  }
};

export function archetypeForWave(wave, index) {
  if (wave >= 5 && index % 11 === 0) return ENEMY_ARCHETYPES.heavy;
  if (wave >= 4 && index % 7 === 0) return ENEMY_ARCHETYPES.ranged;
  if (wave >= 2 && index % 4 === 0) return ENEMY_ARCHETYPES.rusher;
  return ENEMY_ARCHETYPES.swarm;
}
