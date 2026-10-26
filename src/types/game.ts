export type WeaponType = 'magnum' | 'knife' | 'shotgun' | 'rifle';

export interface WeaponConfig {
  id: WeaponType;
  name: string;
  category: 'pistol' | 'melee' | 'shotgun' | 'rifle';
  damage: number;
  fireRate: number; // rounds per second
  magSize: number;
  reloadTime: number; // seconds
  maxReserve: number;
  pellets: number; // 1 for single, >1 for shotgun
  spread: number;
  range: number;
  recoil: number;
  description: string;
  icon: string;
}

export type ChromeSlot = 'arms' | 'legs' | 'torso' | 'special';

export interface ChromeImplant {
  id: string;
  slot: ChromeSlot;
  tier: 1 | 2 | 3;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'legendary' | 'mythic';
  sanityReduction: number; // % reduction in max sanity capacity
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  armor: number;
  maxArmor: number;
  stamina: number;
  maxStamina: number;
  sanity: number; // 0 to 100 (where 100 = full cyberpsychosis trigger)
  maxSanity: number; // Reduced by installing chrome (down to 50%)
  isPsychotic: boolean;
  psychosisTimer: number;
  kills: number;
  headshots: number;
}

export type EnemyType = 'scav' | 'cyber_merc' | 'maxtac' | 'adam_smasher';

export interface DamageIndicator {
  id: number;
  angle: number; // Angle in radians relative to player camera facing
  time: number; // Duration countdown
}

export interface AirDropLoot {
  ammoRefill: boolean;
  armorShards: number;
  healthKits: number;
  immunosuppressant: boolean;
  implant?: ChromeImplant;
  cyberskeletonAvailable?: boolean;
}

export interface GameSettings {
  mouseSensitivity: number;
  sfxVolume: number;
  musicVolume: number;
  fov: number;
  invertY: boolean;
}
