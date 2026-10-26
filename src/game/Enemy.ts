import * as THREE from 'three';
import { EnemyType } from '../types/game';

export interface EnemyHitResult {
  killed: boolean;
  isHeadshot: boolean;
  damageDealt: number;
  remainingHp: number;
}

export class Enemy {
  public group: THREE.Group;
  public type: EnemyType;
  public hp: number;
  public maxHp: number;
  public armor: number; // damage reduction % (0 to 0.7)
  public speed: number;
  public attackDamage: number;
  public attackRange: number;
  public attackCooldown: number = 0;
  public isDead: boolean = false;
  public isStunned: boolean = false;
  public stunTimer: number = 0;

  // Boss specific
  public isBoss: boolean = false;
  public isMiniBoss: boolean = false;
  public name: string;
  public rocketCooldown: number = 0;

  // Hitbox Meshes for raycasting
  public headMesh!: THREE.Mesh;
  public bodyMeshes: THREE.Mesh[] = [];
  public allMeshes: THREE.Mesh[] = [];

  // Animation & Visuals
  public attackAnimTimer: number = 0;
  private materials: THREE.MeshStandardMaterial[] = [];
  private flashTimer: number = 0;
  private walkTime: number = Math.random() * 10;
  private leftLeg!: THREE.Mesh;
  private rightLeg!: THREE.Mesh;
  public leftArm!: THREE.Mesh;
  public rightArm!: THREE.Mesh;
  private shoulderPod?: THREE.Mesh;
  public weaponTip?: THREE.Object3D;

  public triggerAttack() {
    this.attackAnimTimer = 0.38;
  }

  public getMuzzleWorldPos(): THREE.Vector3 {
    if (this.weaponTip) {
      const v = new THREE.Vector3();
      this.weaponTip.getWorldPosition(v);
      return v;
    }
    const pos = this.group.position.clone();
    pos.y += (this.isBoss ? 2.2 : 1.3);
    return pos;
  }

  constructor(type: EnemyType, wave: number, spawnPos: THREE.Vector3) {
    this.type = type;
    this.group = new THREE.Group();
    this.group.position.copy(spawnPos);

    // Wave scaling factors
    const waveHpMult = 1 + (wave - 1) * 0.12;
    const waveDmgMult = 1 + (wave - 1) * 0.08;

    if (type === 'scav') {
      this.name = 'Scavenger Ganger';
      this.maxHp = Math.round(110 * waveHpMult);
      this.hp = this.maxHp;
      this.armor = 0;
      this.speed = 3.6;
      this.attackDamage = Math.round(14 * waveDmgMult);
      this.attackRange = 16;
      this.buildScavModel();
    } else if (type === 'cyber_merc') {
      this.name = 'Arasaka Cyber-Merc';
      this.maxHp = Math.round(220 * waveHpMult);
      this.hp = this.maxHp;
      this.armor = 0.25; // 25% armor
      this.speed = 4.4;
      this.attackDamage = Math.round(22 * waveDmgMult);
      this.attackRange = 22;
      this.buildCyberMercModel();
    } else if (type === 'maxtac') {
      this.name = 'MaxTac Squad Leader';
      this.isMiniBoss = true;
      this.maxHp = Math.round(850 * waveHpMult);
      this.hp = this.maxHp;
      this.armor = 0.45;
      this.speed = 5.2; // very fast dash
      this.attackDamage = Math.round(35 * waveDmgMult);
      this.attackRange = 18;
      this.buildMaxTacModel();
    } else {
      // adam_smasher
      this.name = 'ADAM SMASHER';
      this.isBoss = true;
      this.maxHp = Math.round(2800 * waveHpMult);
      this.hp = this.maxHp;
      this.armor = 0.6; // 60% armor resistance
      this.speed = 3.8;
      this.attackDamage = Math.round(55 * waveDmgMult);
      this.attackRange = 30;
      this.buildAdamSmasherModel();
    }

    // Register mesh references for Raycaster
    this.allMeshes = [this.headMesh, ...this.bodyMeshes];
  }

  // --- PROCEDURAL 3D ENEMY MODELS (Composite 3-12 parts) ---

  private buildScavModel() {
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x2e1a12, roughness: 0.8 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0x5a6370, metalness: 0.85, roughness: 0.3 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xc8987b, roughness: 0.7 });
    const mohawkMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 1.5 });
    this.materials.push(leatherMat, chromeMat, skinMat, mohawkMat);

    // Torso (leather jacket)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.3), leatherMat);
    torso.position.set(0, 1.25, 0);
    torso.castShadow = true;
    (torso as unknown as { isHead: boolean; enemyRef: Enemy }).isHead = false;
    (torso as unknown as { isHead: boolean; enemyRef: Enemy }).enemyRef = this;
    this.group.add(torso);
    this.bodyMeshes.push(torso);

    // Head
    const headGeom = new THREE.BoxGeometry(0.32, 0.35, 0.32);
    const headMat = skinMat.clone();
    this.materials.push(headMat);
    this.headMesh = new THREE.Mesh(headGeom, headMat);
    this.headMesh.position.set(0, 1.78, 0);
    this.headMesh.castShadow = true;
    (this.headMesh as unknown as { isHead: boolean; enemyRef: Enemy }).isHead = true;
    (this.headMesh as unknown as { isHead: boolean; enemyRef: Enemy }).enemyRef = this;
    this.group.add(this.headMesh);

    // Mohawk / Cyber optic
    const mohawk = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.36), mohawkMat);
    mohawk.position.set(0, 0.22, 0);
    this.headMesh.add(mohawk);

    const eyeOptic = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.06), mohawkMat);
    eyeOptic.position.set(0.08, 0.05, 0.16);
    this.headMesh.add(eyeOptic);

    // Limbs
    this.leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 0.18), chromeMat);
    this.leftArm.position.set(-0.38, 1.25, 0);
    (this.leftArm as unknown as { isHead: boolean; enemyRef: Enemy }).isHead = false;
    (this.leftArm as unknown as { isHead: boolean; enemyRef: Enemy }).enemyRef = this;
    this.group.add(this.leftArm);
    this.bodyMeshes.push(this.leftArm);

    this.rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 0.18), leatherMat);
    this.rightArm.position.set(0.38, 1.25, 0);
    (this.rightArm as unknown as { isHead: boolean; enemyRef: Enemy }).isHead = false;
    (this.rightArm as unknown as { isHead: boolean; enemyRef: Enemy }).enemyRef = this;
    this.group.add(this.rightArm);
    this.bodyMeshes.push(this.rightArm);

    // Legs
    const jeansMat = new THREE.MeshStandardMaterial({ color: 0x182030, roughness: 0.9 });
    this.materials.push(jeansMat);

    this.leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.85, 0.2), jeansMat);
    this.leftLeg.position.set(-0.16, 0.45, 0);
    (this.leftLeg as unknown as { isHead: boolean; enemyRef: Enemy }).isHead = false;
    (this.leftLeg as unknown as { isHead: boolean; enemyRef: Enemy }).enemyRef = this;
    this.group.add(this.leftLeg);
    this.bodyMeshes.push(this.leftLeg);

    this.rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.85, 0.2), jeansMat);
    this.rightLeg.position.set(0.16, 0.45, 0);
    (this.rightLeg as unknown as { isHead: boolean; enemyRef: Enemy }).isHead = false;
    (this.rightLeg as unknown as { isHead: boolean; enemyRef: Enemy }).enemyRef = this;
    this.group.add(this.rightLeg);
    this.bodyMeshes.push(this.rightLeg);
  }

  private buildCyberMercModel() {
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x16181d, metalness: 0.9, roughness: 0.2 });
    const redVisor = new THREE.MeshStandardMaterial({ color: 0xff003c, emissive: 0xff003c, emissiveIntensity: 2.5 });
    const subArmorMat = new THREE.MeshStandardMaterial({ color: 0x333742, metalness: 0.8, roughness: 0.3 });
    this.materials.push(armorMat, redVisor, subArmorMat);

    // Armored Torso with Arasaka plating
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.75, 0.35), armorMat);
    torso.position.set(0, 1.3, 0);
    torso.castShadow = true;
    (torso as unknown as { isHead: boolean; enemyRef: Enemy }).isHead = false;
    (torso as unknown as { isHead: boolean; enemyRef: Enemy }).enemyRef = this;
    this.group.add(torso);
    this.bodyMeshes.push(torso);

    // Tactical Helmet Head
    const headGeom = new THREE.BoxGeometry(0.36, 0.38, 0.38);
    const headMat = armorMat.clone();
    this.materials.push(headMat);
    this.headMesh = new THREE.Mesh(headGeom, headMat);
    this.headMesh.position.set(0, 1.85, 0);
    this.headMesh.castShadow = true;
    (this.headMesh as unknown as { isHead: boolean; enemyRef: Enemy }).isHead = true;
    (this.headMesh as unknown as { isHead: boolean; enemyRef: Enemy }).enemyRef = this;
    this.group.add(this.headMesh);

    // Glowing Horizontal Visor
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.09, 0.08), redVisor);
    visor.position.set(0, 0.04, 0.18);
    this.headMesh.add(visor);

    // Limbs with cyber servo joints
    this.leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), subArmorMat);
    this.leftArm.position.set(-0.45, 1.3, 0);
    (this.leftArm as unknown as { isHead: boolean; enemyRef: Enemy }).isHead = false;
    (this.leftArm as unknown as { isHead: boolean; enemyRef: Enemy }).enemyRef = this;
    this.group.add(this.leftArm);
    this.bodyMeshes.push(this.leftArm);

    this.rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), subArmorMat);
    this.rightArm.position.set(0.45, 1.3, 0);
    (this.rightArm as unknown as { isHead: boolean; enemyRef: Enemy }).isHead = false;
    (this.rightArm as unknown as { isHead: boolean; enemyRef: Enemy }).enemyRef = this;
    this.group.add(this.rightArm);
    this.bodyMeshes.push(this.rightArm);

    // Cyber Weapon held in right arm
    const weapon = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.45), armorMat);
    weapon.position.set(0, -0.3, 0.2);
    this.rightArm.add(weapon);

    // Armored Legs
    this.leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.9, 0.22), armorMat);
    this.leftLeg.position.set(-0.18, 0.45, 0);
    (this.leftLeg as unknown as { isHead: boolean; enemyRef: Enemy }).isHead = false;
    (this.leftLeg as unknown as { isHead: boolean; enemyRef: Enemy }).enemyRef = this;
    this.group.add(this.leftLeg);
    this.bodyMeshes.push(this.leftLeg);

    this.rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.9, 0.22), armorMat);
    this.rightLeg.position.set(0.18, 0.45, 0);
    (this.rightLeg as unknown as { isHead: boolean; enemyRef: Enemy }).isHead = false;
    (this.rightLeg as unknown as { isHead: boolean; enemyRef: Enemy }).enemyRef = this;
    this.group.add(this.rightLeg);
    this.bodyMeshes.push(this.rightLeg);
  }

  private buildMaxTacModel() {
    const policeArmorMat = new THREE.MeshStandardMaterial({ color: 0x0a101f, metalness: 0.95, roughness: 0.2 });
    const blueStrobe = new THREE.MeshStandardMaterial({ color: 0x0088ff, emissive: 0x0088ff, emissiveIntensity: 3.0 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.3 });
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 2.8 });
    this.materials.push(policeArmorMat, blueStrobe, goldMat, bladeMat);

    // Bulky Heavy Exoskeleton Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.9, 0.45), policeArmorMat);
    torso.position.set(0, 1.45, 0);
    torso.castShadow = true;
    (torso as unknown as { isHead: boolean; enemyRef: Enemy }).isHead = false;
    (torso as unknown as { isHead: boolean; enemyRef: Enemy }).enemyRef = this;
    this.group.add(torso);
    this.bodyMeshes.push(torso);

    // Blue Police Strobe Beacons on shoulders
    const strobeL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.12), blueStrobe);
    strobeL.position.set(-0.48, 0.48, 0);
    torso.add(strobeL);

    const strobeR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.12), blueStrobe);
    strobeR.position.set(0.48, 0.48, 0);
    torso.add(strobeR);

    // Head
    const headGeom = new THREE.BoxGeometry(0.42, 0.42, 0.42);
    const headMat = policeArmorMat.clone();
    this.materials.push(headMat);
    this.headMesh = new THREE.Mesh(headGeom, headMat);
    this.headMesh.position.set(0, 2.1, 0);
    this.headMesh.castShadow = true;
    (this.headMesh as unknown as { isHead: boolean; enemyRef: Enemy }).isHead = true;
    (this.headMesh as unknown as { isHead: boolean; enemyRef: Enemy }).enemyRef = this;
    this.group.add(this.headMesh);

    // Mantis Blades deployed from forearms
    this.leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.8, 0.26), policeArmorMat);
    this.leftArm.position.set(-0.6, 1.45, 0);
    (this.leftArm as unknown as { isHead: boolean; enemyRef: Enemy }).isHead = false;
    (this.leftArm as unknown as { isHead: boolean; enemyRef: Enemy }).enemyRef = this;
    this.group.add(this.leftArm);
    this.bodyMeshes.push(this.leftArm);

    const bladeL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.9, 0.1), bladeMat);
    bladeL.position.set(0, -0.2, 0.3);
    bladeL.rotation.x = -0.4;
    this.leftArm.add(bladeL);

    this.rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.8, 0.26), policeArmorMat);
    this.rightArm.position.set(0.6, 1.45, 0);
    (this.rightArm as unknown as { isHead: boolean; enemyRef: Enemy }).isHead = false;
    (this.rightArm as unknown as { isHead: boolean; enemyRef: Enemy }).enemyRef = this;
    this.group.add(this.rightArm);
    this.bodyMeshes.push(this.rightArm);

    const bladeR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.9, 0.1), bladeMat);
    bladeR.position.set(0, -0.2, 0.3);
    bladeR.rotation.x = -0.4;
    this.rightArm.add(bladeR);

    // Legs
    this.leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.0, 0.28), policeArmorMat);
    this.leftLeg.position.set(-0.25, 0.5, 0);
    (this.leftLeg as unknown as { isHead: boolean; enemyRef: Enemy }).isHead = false;
    (this.leftLeg as unknown as { isHead: boolean; enemyRef: Enemy }).enemyRef = this;
    this.group.add(this.leftLeg);
    this.bodyMeshes.push(this.leftLeg);

    this.rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.0, 0.28), policeArmorMat);
    this.rightLeg.position.set(0.25, 0.5, 0);
    (this.rightLeg as unknown as { isHead: boolean; enemyRef: Enemy }).isHead = false;
    (this.rightLeg as unknown as { isHead: boolean; enemyRef: Enemy }).enemyRef = this;
    this.group.add(this.rightLeg);
    this.bodyMeshes.push(this.rightLeg);
  }

  private buildAdamSmasherModel() {
    // 3.5 meter towering cybernetic juggernaut
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0x828892, metalness: 0.95, roughness: 0.15 });
    const darkSteel = new THREE.MeshStandardMaterial({ color: 0x1b1d22, metalness: 0.9, roughness: 0.3 });
    const redOptics = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 3.5 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0x997722, metalness: 0.85, roughness: 0.35 });
    this.materials.push(chromeMat, darkSteel, redOptics, brassMat);

    // Massive Chest Plate with exposed cybernetic spine
    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.0), darkSteel);
    torso.position.set(0, 2.3, 0);
    torso.castShadow = true;
    (torso as unknown as { isHead: boolean; enemyRef: Enemy }).isHead = false;
    (torso as unknown as { isHead: boolean; enemyRef: Enemy }).enemyRef = this;
    this.group.add(torso);
    this.bodyMeshes.push(torso);

    const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 0.3), chromeMat);
    chestPlate.position.set(0, 0.1, 0.5);
    torso.add(chestPlate);

    // Shoulder Missile Pod (Fires explosive rockets)
    this.shoulderPod = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.8), darkSteel);
    this.shoulderPod.position.set(-0.95, 0.8, 0);
    torso.add(this.shoulderPod);

    // Quad rocket holes
    for (let r = 0; r < 4; r++) {
      const rx = (r % 2 === 0 ? -0.15 : 0.15);
      const ry = (r < 2 ? 0.15 : -0.15);
      const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 8), redOptics);
      hole.rotation.x = Math.PI / 2;
      hole.position.set(rx, ry, 0.42);
      this.shoulderPod.add(hole);
    }

    // Heavy Autocannon Right Arm
    this.rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.5), chromeMat);
    this.rightArm.position.set(1.1, 2.2, 0);
    (this.rightArm as unknown as { isHead: boolean; enemyRef: Enemy }).isHead = false;
    (this.rightArm as unknown as { isHead: boolean; enemyRef: Enemy }).enemyRef = this;
    this.group.add(this.rightArm);
    this.bodyMeshes.push(this.rightArm);

    const barrel1 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 8), darkSteel);
    barrel1.rotation.x = Math.PI / 2;
    barrel1.position.set(0, -0.6, 0.5);
    this.rightArm.add(barrel1);

    // Massive Cybernetic Left Arm
    this.leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.5), chromeMat);
    this.leftArm.position.set(-1.1, 2.2, 0);
    (this.leftArm as unknown as { isHead: boolean; enemyRef: Enemy }).isHead = false;
    (this.leftArm as unknown as { isHead: boolean; enemyRef: Enemy }).enemyRef = this;
    this.group.add(this.leftArm);
    this.bodyMeshes.push(this.leftArm);

    // Head (Skull-shaped cybernetic head with cluster of glowing red ocular optics)
    const headGeom = new THREE.BoxGeometry(0.58, 0.65, 0.58);
    const headMat = chromeMat.clone();
    this.materials.push(headMat);
    this.headMesh = new THREE.Mesh(headGeom, headMat);
    this.headMesh.position.set(0, 3.4, 0.05);
    this.headMesh.castShadow = true;
    (this.headMesh as unknown as { isHead: boolean; enemyRef: Enemy }).isHead = true;
    (this.headMesh as unknown as { isHead: boolean; enemyRef: Enemy }).enemyRef = this;
    this.group.add(this.headMesh);

    // 4 red optic eyes
    const eyeOffsets = [
      [-0.14, 0.1, 0.3],
      [0.14, 0.1, 0.3],
      [-0.08, -0.08, 0.3],
      [0.08, -0.08, 0.3],
    ];
    eyeOffsets.forEach(([ex, ey, ez]) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), redOptics);
      eye.position.set(ex, ey, ez);
      this.headMesh.add(eye);
    });

    // Gigantic Hydraulic Legs
    this.leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 0.5), darkSteel);
    this.leftLeg.position.set(-0.45, 0.8, 0);
    (this.leftLeg as unknown as { isHead: boolean; enemyRef: Enemy }).isHead = false;
    (this.leftLeg as unknown as { isHead: boolean; enemyRef: Enemy }).enemyRef = this;
    this.group.add(this.leftLeg);
    this.bodyMeshes.push(this.leftLeg);

    this.rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 0.5), darkSteel);
    this.rightLeg.position.set(0.45, 0.8, 0);
    (this.rightLeg as unknown as { isHead: boolean; enemyRef: Enemy }).isHead = false;
    (this.rightLeg as unknown as { isHead: boolean; enemyRef: Enemy }).enemyRef = this;
    this.group.add(this.rightLeg);
    this.bodyMeshes.push(this.rightLeg);
  }

  // --- DAMAGE & HITBOX CALCULATION ---

  public takeDamage(amount: number, isHeadshot: boolean): EnemyHitResult {
    if (this.isDead) {
      return { killed: false, isHeadshot: false, damageDealt: 0, remainingHp: 0 };
    }

    let actualDamage = amount;

    if (isHeadshot) {
      if (!this.isBoss && !this.isMiniBoss) {
        // One-shot, one-kill on regular enemies!
        actualDamage = this.hp;
      } else {
        // High critical multiplier on Bosses
        actualDamage = Math.round(amount * 3.5);
      }
    } else {
      // Standard body shot with armor reduction
      actualDamage = Math.max(1, Math.round(amount * (1 - this.armor)));
    }

    this.hp -= actualDamage;
    this.triggerHurtFlash();

    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
      return {
        killed: true,
        isHeadshot,
        damageDealt: actualDamage,
        remainingHp: 0,
      };
    }

    return {
      killed: false,
      isHeadshot,
      damageDealt: actualDamage,
      remainingHp: this.hp,
    };
  }

  public applyStun(duration: number) {
    this.isStunned = true;
    this.stunTimer = duration;
    // Visually tint materials to cyber-glitch cyan/yellow
    this.materials.forEach(mat => {
      mat.color.setHex(0x00f0ff);
      mat.wireframe = true;
    });
  }

  private triggerHurtFlash() {
    this.flashTimer = 0.12;
    this.materials.forEach(mat => {
      mat.emissive.setHex(0xffffff);
      mat.emissiveIntensity = 2.0;
    });
  }

  public update(delta: number, playerPos: THREE.Vector3, timeScale: number = 1.0) {
    if (this.isDead) return;

    // Handle stun status
    if (this.isStunned) {
      this.stunTimer -= delta * timeScale;
      if (this.stunTimer <= 0) {
        this.isStunned = false;
        this.materials.forEach(mat => {
          mat.wireframe = false;
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0;
        });
      }
      return; // Can't move or attack while stunned!
    }

    // Cooldown timers
    if (this.attackCooldown > 0) this.attackCooldown -= delta * timeScale;
    if (this.rocketCooldown > 0) this.rocketCooldown -= delta * timeScale;

    // Flash recovery
    if (this.flashTimer > 0) {
      this.flashTimer -= delta;
      if (this.flashTimer <= 0) {
        this.materials.forEach(mat => {
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0;
        });
      }
    }

    // AI Movement towards player
    const distToPlayer = this.group.position.distanceTo(playerPos);
    this.group.lookAt(playerPos.x, this.group.position.y, playerPos.z);

    // Attack animation handling
    if (this.attackAnimTimer > 0) {
      this.attackAnimTimer -= delta * timeScale;
      if (this.rightArm) {
        if (this.type === 'maxtac') {
          // Double Mantis Blade forward slash
          this.rightArm.rotation.x = -Math.PI / 2.5 + Math.sin(this.attackAnimTimer * 18) * 0.8;
          if (this.leftArm) this.leftArm.rotation.x = -Math.PI / 2.5 - Math.sin(this.attackAnimTimer * 18) * 0.8;
        } else {
          // Weapon raised recoil kick
          this.rightArm.rotation.x = -Math.PI / 2.1 + (0.38 - this.attackAnimTimer) * 0.3;
        }
      }
    }

    // Stop and fire if in attack range, or close in if far
    const stopDist = this.type === 'maxtac' ? 2.5 : this.isBoss ? 8 : 7;
    const effectiveSpeed = this.speed * timeScale;

    if (distToPlayer > stopDist) {
      const moveDir = new THREE.Vector3().subVectors(playerPos, this.group.position).normalize();
      moveDir.y = 0;
      this.group.position.addScaledVector(moveDir, effectiveSpeed * delta);

      // Walk cycle animation (only if not actively slashing)
      if (this.attackAnimTimer <= 0) {
        this.walkTime += delta * 6 * timeScale;
        const legAngle = Math.sin(this.walkTime) * 0.45;
        if (this.leftLeg) this.leftLeg.rotation.x = legAngle;
        if (this.rightLeg) this.rightLeg.rotation.x = -legAngle;
        if (this.leftArm) this.leftArm.rotation.x = -legAngle * 0.7;
        if (this.rightArm) this.rightArm.rotation.x = legAngle * 0.7;
      }
    } else {
      // Idle breathing
      if (this.leftLeg) this.leftLeg.rotation.x = 0;
      if (this.rightLeg) this.rightLeg.rotation.x = 0;
    }
  }

  public dispose() {
    this.group.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
      }
    });
    this.materials.forEach(m => m.dispose());
  }
}
