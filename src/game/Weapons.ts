import * as THREE from 'three';
import { WeaponConfig, WeaponType } from '../types/game';

export const WEAPON_CONFIGS: Record<WeaponType, WeaponConfig> = {
  magnum: {
    id: 'magnum',
    name: 'RT-46 Burya Magnum',
    category: 'pistol',
    damage: 95,
    fireRate: 2.2, // ~2.2 shots/sec
    magSize: 6,
    reloadTime: 1.8,
    maxReserve: 60,
    pellets: 1,
    spread: 0.012,
    range: 120,
    recoil: 0.08,
    description: 'High-caliber tech revolver. High damage and extreme headshot lethality.',
    icon: 'Crosshair',
  },
  knife: {
    id: 'knife',
    name: 'Thermal Cyber-Tanto',
    category: 'melee',
    damage: 120,
    fireRate: 3.5, // fast slashes
    magSize: 999, // infinite
    reloadTime: 0.1,
    maxReserve: 999,
    pellets: 1,
    spread: 0.05,
    range: 4.5,
    recoil: 0.02,
    description: 'Heated monomolecular blade. High speed, devastating close-quarters emergency attack.',
    icon: 'Scissors',
  },
  shotgun: {
    id: 'shotgun',
    name: 'Carnage Tech Shotgun',
    category: 'shotgun',
    damage: 24, // 24 * 8 = 192 point-blank!
    fireRate: 1.2,
    magSize: 6,
    reloadTime: 2.4,
    maxReserve: 48,
    pellets: 8,
    spread: 0.075,
    range: 45,
    recoil: 0.14,
    description: 'Devastating close-range multi-pellet spread. Pulverizes aggressive cyberware.',
    icon: 'Zap',
  },
  rifle: {
    id: 'rifle',
    name: 'M-179 Achilles Rifle',
    category: 'rifle',
    damage: 38,
    fireRate: 9.5, // fully automatic
    magSize: 30,
    reloadTime: 2.0,
    maxReserve: 180,
    pellets: 1,
    spread: 0.024,
    range: 100,
    recoil: 0.04,
    description: 'High rate-of-fire smart rifle. Sustained suppression and precision bursts.',
    icon: 'ShieldAlert',
  },
};

export class WeaponModelManager {
  public rootGroup: THREE.Group;
  private weaponMeshes: Map<WeaponType, THREE.Group> = new Map();
  private muzzleFlashes: Map<WeaponType, THREE.Mesh> = new Map();
  private muzzleLights: Map<WeaponType, THREE.PointLight> = new Map();
  public currentType: WeaponType = 'magnum';

  // Animation values
  public recoilOffset = new THREE.Vector3();
  public recoilRotation = new THREE.Euler();
  public swayOffset = new THREE.Vector3();
  public isReloading: boolean = false;
  public reloadProgress: number = 0; // 0 to 1
  public isSwingingKnife: boolean = false;
  private knifeSwingTimer: number = 0;

  constructor() {
    this.rootGroup = new THREE.Group();
    this.buildAllWeapons();
    this.switchWeapon('magnum');
  }

  private buildAllWeapons() {
    // 1. Magnum
    const magnumGroup = this.createMagnumModel();
    this.weaponMeshes.set('magnum', magnumGroup);
    this.rootGroup.add(magnumGroup);

    // 2. Knife
    const knifeGroup = this.createKnifeModel();
    this.weaponMeshes.set('knife', knifeGroup);
    this.rootGroup.add(knifeGroup);

    // 3. Shotgun
    const shotgunGroup = this.createShotgunModel();
    this.weaponMeshes.set('shotgun', shotgunGroup);
    this.rootGroup.add(shotgunGroup);

    // 4. Rifle
    const rifleGroup = this.createRifleModel();
    this.weaponMeshes.set('rifle', rifleGroup);
    this.rootGroup.add(rifleGroup);
  }

  public switchWeapon(type: WeaponType) {
    this.currentType = type;
    this.weaponMeshes.forEach((mesh, key) => {
      mesh.visible = key === type;
    });
    this.isReloading = false;
    this.reloadProgress = 0;
  }

  // --- PROCEDURAL 3D WEAPONS CREATION ---

  private createMagnumModel(): THREE.Group {
    const group = new THREE.Group();

    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x22252a,
      metalness: 0.9,
      roughness: 0.2,
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0x99a0a8,
      metalness: 0.95,
      roughness: 0.15,
    });
    const neonCyan = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 2.0,
    });
    const gripMat = new THREE.MeshStandardMaterial({
      color: 0x111115,
      roughness: 0.8,
    });

    // Barrel
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.35), chromeMat);
    barrel.position.set(0, 0.02, -0.18);
    group.add(barrel);

    // Cylinder
    const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.12, 12), metalMat);
    cylinder.rotation.x = Math.PI / 2;
    cylinder.position.set(0, 0.01, -0.01);
    group.add(cylinder);

    // Frame & Receiver
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.1, 0.16), metalMat);
    receiver.position.set(0, -0.01, -0.02);
    group.add(receiver);

    // Ergonomic Grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.18, 0.08), gripMat);
    grip.rotation.x = 0.35;
    grip.position.set(0, -0.12, 0.06);
    group.add(grip);

    // Glowing Neon Accent Rails
    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.015, 0.28), neonCyan);
    railL.position.set(0.033, 0.03, -0.18);
    group.add(railL);

    const railR = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.015, 0.28), neonCyan);
    railR.position.set(-0.033, 0.03, -0.18);
    group.add(railR);

    // Muzzle Flash
    const flashGeom = new THREE.SphereGeometry(0.08, 8, 8);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffea00, transparent: true, opacity: 0 });
    const flash = new THREE.Mesh(flashGeom, flashMat);
    flash.position.set(0, 0.02, -0.38);
    group.add(flash);
    this.muzzleFlashes.set('magnum', flash);

    const muzzleLight = new THREE.PointLight(0xffcc00, 0, 8);
    muzzleLight.position.set(0, 0.02, -0.4);
    group.add(muzzleLight);
    this.muzzleLights.set('magnum', muzzleLight);

    // Position in first-person camera space
    group.position.set(0.25, -0.22, -0.45);
    return group;
  }

  private createKnifeModel(): THREE.Group {
    const group = new THREE.Group();

    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.9,
      roughness: 0.2,
    });
    const thermalEdgeMat = new THREE.MeshStandardMaterial({
      color: 0xff3b00,
      emissive: 0xff5500,
      emissiveIntensity: 3.5,
    });
    const handleMat = new THREE.MeshStandardMaterial({
      color: 0x090a0f,
      roughness: 0.85,
    });

    // Blade spine
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.05, 0.32), bladeMat);
    spine.position.set(0, 0.02, -0.2);
    group.add(spine);

    // Glowing thermal edge
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.02, 0.32), thermalEdgeMat);
    edge.position.set(0, -0.015, -0.2);
    group.add(edge);

    // Guard & Hilt
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.02), bladeMat);
    guard.position.set(0, 0.01, -0.04);
    group.add(guard);

    // Handle
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.16, 8), handleMat);
    handle.rotation.x = Math.PI / 2;
    handle.position.set(0, 0.01, 0.06);
    group.add(handle);

    // Thermal battery glow ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.006, 8, 16), thermalEdgeMat);
    ring.position.set(0, 0.01, -0.02);
    group.add(ring);

    group.position.set(0.28, -0.24, -0.4);
    group.rotation.set(-0.2, -0.2, 0.2);
    return group;
  }

  private createShotgunModel(): THREE.Group {
    const group = new THREE.Group();

    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x1f2126,
      metalness: 0.85,
      roughness: 0.3,
    });
    const heatShieldMat = new THREE.MeshStandardMaterial({
      color: 0x3b3d45,
      metalness: 0.9,
      roughness: 0.2,
    });
    const neonMagenta = new THREE.MeshStandardMaterial({
      color: 0xff0055,
      emissive: 0xff0055,
      emissiveIntensity: 2.2,
    });

    // Dual heavy barrels
    const barrelL = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.48, 12), metalMat);
    barrelL.rotation.x = Math.PI / 2;
    barrelL.position.set(-0.022, 0.02, -0.26);
    group.add(barrelL);

    const barrelR = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.48, 12), metalMat);
    barrelR.rotation.x = Math.PI / 2;
    barrelR.position.set(0.022, 0.02, -0.26);
    group.add(barrelR);

    // Heat shield / upper vent
    const heatShield = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, 0.42), heatShieldMat);
    heatShield.position.set(0, 0.045, -0.25);
    group.add(heatShield);

    // Heavy Receiver
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.22), metalMat);
    receiver.position.set(0, -0.01, -0.02);
    group.add(receiver);

    // Tactical Pump Handguard
    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.16), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 }));
    pump.position.set(0, -0.02, -0.24);
    group.add(pump);

    // Stock & Grip
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.22), metalMat);
    stock.position.set(0, -0.04, 0.18);
    group.add(stock);

    // Holographic Sight Mount
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.06), neonMagenta);
    sight.position.set(0, 0.075, -0.05);
    group.add(sight);

    // Muzzle Flash
    const flashGeom = new THREE.SphereGeometry(0.14, 8, 8);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0 });
    const flash = new THREE.Mesh(flashGeom, flashMat);
    flash.position.set(0, 0.02, -0.52);
    group.add(flash);
    this.muzzleFlashes.set('shotgun', flash);

    const muzzleLight = new THREE.PointLight(0xff5500, 0, 10);
    muzzleLight.position.set(0, 0.02, -0.54);
    group.add(muzzleLight);
    this.muzzleLights.set('shotgun', muzzleLight);

    group.position.set(0.26, -0.22, -0.46);
    return group;
  }

  private createRifleModel(): THREE.Group {
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1a1c23,
      metalness: 0.8,
      roughness: 0.25,
    });
    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x2b2e38,
      metalness: 0.9,
      roughness: 0.2,
    });
    const neonYellow = new THREE.MeshStandardMaterial({
      color: 0xfcee0a,
      emissive: 0xfcee0a,
      emissiveIntensity: 2.5,
    });

    // Bullpup Main Receiver
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.44), bodyMat);
    receiver.position.set(0, 0, -0.12);
    group.add(receiver);

    // Extended Shrouded Barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 10), carbonMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.45);
    group.add(barrel);

    // Top Tactical Rail with Integrated Holo Optic
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.32), carbonMat);
    rail.position.set(0, 0.07, -0.15);
    group.add(rail);

    // Holographic Reticle Emitter
    const reticle = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.01), neonYellow);
    reticle.position.set(0, 0.08, -0.22);
    group.add(reticle);

    // Magazine (Rear Bullpup design)
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.08), carbonMat);
    mag.rotation.x = 0.2;
    mag.position.set(0, -0.1, 0.06);
    group.add(mag);

    // Front Grip
    const fGrip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.05), carbonMat);
    fGrip.position.set(0, -0.07, -0.26);
    group.add(fGrip);

    // Digital Ammo Display Panel
    const ammoScreen = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.03), neonYellow);
    ammoScreen.position.set(0.038, 0.05, -0.04);
    group.add(ammoScreen);

    // Muzzle Flash
    const flashGeom = new THREE.SphereGeometry(0.09, 8, 8);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffdd22, transparent: true, opacity: 0 });
    const flash = new THREE.Mesh(flashGeom, flashMat);
    flash.position.set(0, 0.02, -0.64);
    group.add(flash);
    this.muzzleFlashes.set('rifle', flash);

    const muzzleLight = new THREE.PointLight(0xffcc22, 0, 8);
    muzzleLight.position.set(0, 0.02, -0.66);
    group.add(muzzleLight);
    this.muzzleLights.set('rifle', muzzleLight);

    group.position.set(0.24, -0.22, -0.42);
    return group;
  }

  // --- TRIGGER SHOOT ANIMATION ---
  public triggerShootEffect() {
    const config = WEAPON_CONFIGS[this.currentType];

    if (this.currentType === 'knife') {
      this.isSwingingKnife = true;
      this.knifeSwingTimer = 0.25;
      return;
    }

    // Apply recoil kick
    this.recoilOffset.z += config.recoil;
    this.recoilRotation.x += config.recoil * 1.5;

    // Trigger muzzle flash
    const flash = this.muzzleFlashes.get(this.currentType);
    const light = this.muzzleLights.get(this.currentType);
    if (flash && flash.material instanceof THREE.MeshBasicMaterial) {
      flash.material.opacity = 1.0;
      flash.scale.set(1.2 + Math.random() * 0.4, 1.2 + Math.random() * 0.4, 1.2 + Math.random() * 0.4);
    }
    if (light) {
      light.intensity = 3.0;
    }
  }

  // --- TRIGGER RELOAD ANIMATION ---
  public startReload() {
    this.isReloading = true;
    this.reloadProgress = 0;
  }

  // --- UPDATE FRAME ANIMATION ---
  public update(delta: number, isMoving: boolean, moveTime: number) {
    // Fade out muzzle flashes quickly
    this.muzzleFlashes.forEach(flash => {
      if (flash.material instanceof THREE.MeshBasicMaterial && flash.material.opacity > 0) {
        flash.material.opacity = Math.max(0, flash.material.opacity - delta * 18);
      }
    });
    this.muzzleLights.forEach(light => {
      if (light.intensity > 0) {
        light.intensity = Math.max(0, light.intensity - delta * 30);
      }
    });

    // Recover recoil smoothly
    this.recoilOffset.z = THREE.MathUtils.damp(this.recoilOffset.z, 0, 16, delta);
    this.recoilRotation.x = THREE.MathUtils.damp(this.recoilRotation.x, 0, 18, delta);

    // Knife swing animation
    if (this.isSwingingKnife) {
      this.knifeSwingTimer -= delta;
      if (this.knifeSwingTimer <= 0) {
        this.isSwingingKnife = false;
      }
    }

    // Weapon breathing & walking sway
    const swayAmp = isMoving ? 0.015 : 0.003;
    const swayFreq = isMoving ? 8 : 2;
    this.swayOffset.x = Math.sin(moveTime * swayFreq) * swayAmp;
    this.swayOffset.y = Math.cos(moveTime * swayFreq * 2) * (swayAmp * 0.7);

    // Active weapon group transform
    const activeGroup = this.weaponMeshes.get(this.currentType);
    if (!activeGroup) return;

    // Base positions per weapon
    let baseX = 0.25;
    let baseY = -0.22;
    let baseZ = -0.45;
    let baseRotX = 0;
    let baseRotY = 0;
    let baseRotZ = 0;

    if (this.currentType === 'knife') {
      baseX = 0.28;
      baseY = -0.24;
      baseZ = -0.4;
      baseRotX = -0.2;
      baseRotY = -0.2;
      baseRotZ = 0.2;

      if (this.isSwingingKnife) {
        // Slash curve
        const progress = (0.25 - this.knifeSwingTimer) / 0.25;
        baseRotX += Math.sin(progress * Math.PI) * 1.2;
        baseRotY += Math.cos(progress * Math.PI) * 0.8;
        baseZ += Math.sin(progress * Math.PI) * -0.15;
      }
    } else if (this.currentType === 'shotgun') {
      baseX = 0.26;
      baseZ = -0.46;
    } else if (this.currentType === 'rifle') {
      baseX = 0.24;
      baseZ = -0.42;
    }

    // Reload animation dip
    if (this.isReloading) {
      const dip = Math.sin(this.reloadProgress * Math.PI) * 0.22;
      baseY -= dip;
      baseRotX -= dip * 1.5;
      baseRotZ += dip * 0.8;
    }

    activeGroup.position.set(
      baseX + this.swayOffset.x,
      baseY + this.swayOffset.y,
      baseZ + this.recoilOffset.z
    );

    activeGroup.rotation.set(
      baseRotX + this.recoilRotation.x,
      baseRotY,
      baseRotZ
    );
  }
}
