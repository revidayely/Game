import { ChromeImplant, ChromeSlot } from '../types/game';

export const ALL_IMPLANTS: ChromeImplant[] = [
  // ARMS
  {
    id: 'arms_t1',
    slot: 'arms',
    tier: 1,
    name: 'Gorilla Arms T1 (Titanium Knuckles)',
    description: '+35% Weapon and melee damage output.',
    icon: 'Hammer',
    rarity: 'common',
    sanityReduction: 8,
  },
  {
    id: 'arms_t2',
    slot: 'arms',
    tier: 2,
    name: 'Mantis Rotor T2 (Subdermal Servos)',
    description: '+40% Attack speed and weapon fire rate.',
    icon: 'Zap',
    rarity: 'rare',
    sanityReduction: 10,
  },
  {
    id: 'arms_t3',
    slot: 'arms',
    tier: 3,
    name: 'Smart Link Feeder T3 (Micro-Reloader)',
    description: '-50% Reload duration. Ultra-fast magazine ejection.',
    icon: 'FastForward',
    rarity: 'legendary',
    sanityReduction: 12,
  },

  // LEGS
  {
    id: 'legs_t1',
    slot: 'legs',
    tier: 1,
    name: 'Reinforced Tendons T1 (Hydraulic Sprint)',
    description: '+30% Base movement and strafing speed.',
    icon: 'Footprints',
    rarity: 'common',
    sanityReduction: 8,
  },
  {
    id: 'legs_t2',
    slot: 'legs',
    tier: 2,
    name: 'Bionic Joints T2 (Micro-Battery Core)',
    description: '+75% Maximum stamina pool and faster recovery.',
    icon: 'BatteryCharging',
    rarity: 'rare',
    sanityReduction: 10,
  },
  {
    id: 'legs_t3',
    slot: 'legs',
    tier: 3,
    name: 'Lynx Paws T3 (Sandevistan Overclock)',
    description: 'Requires Sandevistan. Extends duration by 50% and doubles movement & fire rate during slow-mo.',
    icon: 'Activity',
    rarity: 'legendary',
    sanityReduction: 12,
  },

  // TORSO
  {
    id: 'torso_t1',
    slot: 'torso',
    tier: 1,
    name: 'Subdermal Armor T1 (Carbon Weave)',
    description: 'Grants 35% bullet damage resistance and +75 Max HP.',
    icon: 'Shield',
    rarity: 'rare',
    sanityReduction: 12,
  },

  // SPECIAL - SANDEVISTAN
  {
    id: 'special_sandevistan',
    slot: 'special',
    tier: 1,
    name: 'Sandevistan MK.4 (Time-Dilation Warp)',
    description: 'Slows down time by 85% for all enemies while you move at hyper speed. (+15% Cyberpsychosis on trigger)',
    icon: 'Clock',
    rarity: 'legendary',
    sanityReduction: 15,
  },

  // SPECIAL - QUICKHACK
  {
    id: 'special_quickhack_t1',
    slot: 'special',
    tier: 1,
    name: 'Cyberdeck T1: Short Circuit Stun',
    description: 'Emits a 16m EMP hack wave that stuns all caught enemies for 4s. (+18% Cyberpsychosis)',
    icon: 'Cpu',
    rarity: 'rare',
    sanityReduction: 10,
  },
  {
    id: 'special_quickhack_t2',
    slot: 'special',
    tier: 2,
    name: 'Cyberdeck T2: Mass Cyberware Glitch',
    description: 'Expands EMP hack radius to 26m and extends stun to 7s. (+20% Cyberpsychosis)',
    icon: 'Radio',
    rarity: 'legendary',
    sanityReduction: 12,
  },
  {
    id: 'special_quickhack_t3',
    slot: 'special',
    tier: 3,
    name: 'Cyberdeck T3: Synapse Burnout Overload',
    description: 'Blackwall Protocol: Instantly executes and vaporizes ALL enemies in a 30m hacking radius! (+25% Cyberpsychosis)',
    icon: 'Skull',
    rarity: 'mythic',
    sanityReduction: 15,
  },

  // CYBERSKELETON (Wave Special)
  {
    id: 'special_cyberskeleton',
    slot: 'special',
    tier: 3,
    name: 'Arasaka Cyberskeleton Prototype',
    description: 'EXPERIMENTAL CHROME: +150% Damage, 70% Armor Resistance, +40% Speed. BUT rapidly bleeds sanity continuously!',
    icon: 'Flame',
    rarity: 'mythic',
    sanityReduction: 25,
  },
];

export function getImplantById(id: string): ChromeImplant | undefined {
  return ALL_IMPLANTS.find(i => i.id === id);
}

/**
 * Roll a random implant loot drop for an Air Drop crate based on player's current equipment
 */
export function rollRandomImplant(currentImplantIds: string[], wave: number): ChromeImplant | null {
  // Check available upgrades
  const unacquired = ALL_IMPLANTS.filter(implant => {
    // Cyberskeleton handled separately on specific waves
    if (implant.id === 'special_cyberskeleton') return false;

    // Check if already equipped
    if (currentImplantIds.includes(implant.id)) return false;

    // Enforce tier progression for Quickhack
    if (implant.id === 'special_quickhack_t2' && !currentImplantIds.includes('special_quickhack_t1')) return false;
    if (implant.id === 'special_quickhack_t3' && !currentImplantIds.includes('special_quickhack_t2')) return false;

    // Legs T3 requires Sandevistan
    if (implant.id === 'legs_t3' && !currentImplantIds.includes('special_sandevistan')) return false;

    return true;
  });

  if (unacquired.length === 0) return null;

  // 75% chance of dropping an implant in an air drop
  if (Math.random() > 0.75 && wave > 1) return null;

  // Weighted random pick
  const roll = Math.random();
  if (roll < 0.45) {
    // Common / Arms / Legs T1
    const commons = unacquired.filter(i => i.rarity === 'common');
    if (commons.length > 0) return commons[Math.floor(Math.random() * commons.length)];
  } else if (roll < 0.8) {
    // Rares
    const rares = unacquired.filter(i => i.rarity === 'rare');
    if (rares.length > 0) return rares[Math.floor(Math.random() * rares.length)];
  } else {
    // Legendary / Mythic
    const epics = unacquired.filter(i => i.rarity === 'legendary' || i.rarity === 'mythic');
    if (epics.length > 0) return epics[Math.floor(Math.random() * epics.length)];
  }

  return unacquired[Math.floor(Math.random() * unacquired.length)];
}

/**
 * Calculate total sanity max limit reduction (up to 50% max reduction)
 */
export function calculateMaxSanity(equippedImplantIds: string[]): number {
  let reduction = 0;
  for (const id of equippedImplantIds) {
    const imp = getImplantById(id);
    if (imp) {
      reduction += imp.sanityReduction;
    }
  }
  // Max reduction is 50%, so min maxSanity is 50
  return Math.max(50, 100 - reduction);
}
