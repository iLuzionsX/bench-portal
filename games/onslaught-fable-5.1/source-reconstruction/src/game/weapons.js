export const WEAPONS = {
  vk7: {
    id: 'vk7',
    name: 'VK-7 ASSAULT RIFLE',
    shortName: 'VK-7',
    fireMode: 'auto',
    damage: 24,
    rpm: 720,
    magSize: 30,
    reserve: 180,
    reload: 1.65,
    spreadHip: 0.018,
    spreadAds: 0.004,
    recoil: { pitch: 0.014, yaw: 0.004 },
    adsFov: 58,
    art: { silhouette: 'angular modular assault rifle', body: '#182129', optic: '#5ef2ff' }
  },
  hammer12: {
    id: 'hammer12',
    name: 'HAMMER-12 PUMP SHOTGUN',
    shortName: 'HAMMER-12',
    fireMode: 'pump',
    damage: 15,
    pellets: 9,
    rpm: 78,
    magSize: 8,
    reserve: 48,
    reload: 0.55,
    spreadHip: 0.055,
    spreadAds: 0.032,
    recoil: { pitch: 0.052, yaw: 0.009 },
    adsFov: 64,
    art: { silhouette: 'short wide pump shotgun', body: '#0b1117', accent: '#ff9d3c' }
  },
  longshot: {
    id: 'longshot',
    name: 'LONGSHOT DMR',
    shortName: 'LONGSHOT',
    fireMode: 'semi',
    damage: 72,
    rpm: 220,
    magSize: 12,
    reserve: 72,
    reload: 2.0,
    spreadHip: 0.025,
    spreadAds: 0.0015,
    recoil: { pitch: 0.034, yaw: 0.003 },
    adsFov: 44,
    art: { silhouette: 'long clean DMR', body: '#182129', optic: '#5ef2ff' }
  }
};

export const WEAPON_ORDER = ['vk7', 'hammer12', 'longshot'];
