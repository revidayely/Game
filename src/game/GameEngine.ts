import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { AirDropLoot, ChromeImplant, DamageIndicator, EnemyType, PlayerStats, WeaponType } from '../types/game';
import { sound } from '../audio/SoundSystem';
import { calculateMaxSanity, getImplantById, rollRandomImplant } from './Cyberware';
import { Enemy } from './Enemy';
import { MapBuilder } from './MapBuilder';
import { WEAPON_CONFIGS, WeaponModelManager } from './Weapons';

export interface RocketProjectile {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  targetPos: THREE.Vector3;
  life: number;
}

export interface EnemyLaserProjectile {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  damage: number;
  life: number;
  shooterType: EnemyType;
  shooterPos: THREE.Vector3;
}

export interface BulletTracer {
  mesh: THREE.Line;
  life: number;
  maxLife: number;
}

export interface SparkParticle {
  mesh: THREE.Points;
  velocities: Float32Array;
  life: number;
}

export class GameEngine {
  // Three.js Core
  public renderer!: THREE.WebGLRenderer;
  public scene!: THREE.Scene;
  public camera!: THREE.PerspectiveCamera;
  public canvasMount: HTMLElement;
  private isSoftwareGl: boolean = false;
  private frameId: number = 0;

  // Subsystems
  public mapBuilder!: MapBuilder;
  public weaponManager!: WeaponModelManager;

  // Player State
  public playerStats: PlayerStats = {
    hp: 150,
    maxHp: 150,
    armor: 100,
    maxArmor: 100,
    stamina: 100,
    maxStamina: 100,
    sanity: 0,
    maxSanity: 100,
    isPsychotic: false,
    psychosisTimer: 0,
    kills: 0,
    headshots: 0,
  };

  // Player Kinematics
  public playerPosition = new THREE.Vector3(0, 1.7, 10);
  public playerVelocity = new THREE.Vector3();
  public pitch: number = 0;
  public yaw: number = 0;
  public isSprinting: boolean = false;
  public isGrounded: boolean = true;
  private moveTime: number = 0;

  // Controls & Inputs
  public isLocked: boolean = false;
  public isMobileMode: boolean = false;
  public mobileMoveDir = new THREE.Vector2(0, 0);
  public mobileSprint: boolean = false;
  public mobileShootActive: boolean = false;
  public mobileJumpRequested: boolean = false;
  private keys: Record<string, boolean> = {};
  public mouseSensitivity: number = 0.0022;

  // Weapons & Ammo Inventory
  public ammoInventory: Record<WeaponType, { current: number; reserve: number }> = {
    magnum: { current: 6, reserve: 36 },
    knife: { current: 999, reserve: 999 },
    shotgun: { current: 6, reserve: 24 },
    rifle: { current: 30, reserve: 120 },
  };
  private shootCooldown: number = 0;
  private reloadTimer: number = 0;

  // Implants & Cyberware Equipped
  public equippedImplantIds: string[] = [];

  // Special Abilities State
  public isSandevistanActive: boolean = false;
  public sandevistanTimer: number = 0;
  public sandevistanCooldown: number = 0;
  public quickhackCooldown: number = 0;

  // Waves & Enemies
  public currentWave: number = 1;
  public maxWaves: number = 50;
  public waveState: 'pre_wave' | 'active_wave' | 'wave_cleared' | 'game_over' | 'victory' = 'pre_wave';
  public waveTimer: number = 3.0; // countdown before first wave
  public enemies: Enemy[] = [];
  public enemiesRemainingToSpawn: number = 0;
  private enemySpawnTimer: number = 0;

  // Active Boss Reference
  public activeBoss: Enemy | null = null;

  // Air Drop Pod
  public airDropMesh: THREE.Group | null = null;
  public airDropAvailable: boolean = false;
  public airDropPosition = new THREE.Vector3(0, 0, 0);
  public pendingAirDropLoot: AirDropLoot | null = null;

  // Visual FX Arrays
  private rockets: RocketProjectile[] = [];
  public enemyProjectiles: EnemyLaserProjectile[] = [];
  private tracers: BulletTracer[] = [];
  private sparks: SparkParticle[] = [];
  public damageIndicators: DamageIndicator[] = [];
  public damageFlashTimer: number = 0;

  // Reusable Math Helpers (Zero GC)
  private _forward = new THREE.Vector3();
  private _side = new THREE.Vector3();
  private _moveDir = new THREE.Vector3();
  private _raycaster = new THREE.Raycaster();
  private _screenCenter = new THREE.Vector2(0, 0);

  // Callbacks to React UI
  public onStateChange?: () => void;
  public onHitMarker?: (isHeadshot: boolean) => void;
  public onAirDropInteract?: (loot: AirDropLoot) => void;
  public onGameOver?: (victory: boolean) => void;

  constructor(container: HTMLElement) {
    this.canvasMount = container;
    this.initWebGL();
    this.initScene();
    this.initEventListeners();
  }

  private initWebGL() {
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.renderer.setSize(this.canvasMount.clientWidth, this.canvasMount.clientHeight);
    this.canvasMount.appendChild(this.renderer.domElement);
  }

  private initScene() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.canvasMount.clientWidth / this.canvasMount.clientHeight,
      0.1,
      400
    );
    this.camera.position.copy(this.playerPosition);

    // Studio Reflection Environment
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Night City Map
    this.mapBuilder = new MapBuilder();
    this.mapBuilder.buildScene(this.scene);

    // 1st Person Weapon Manager attached to Camera
    this.weaponManager = new WeaponModelManager();
    this.camera.add(this.weaponManager.rootGroup);
    this.scene.add(this.camera);

    this.startLoop();
  }

  private initEventListeners() {
    // Pointer Lock
    this.canvasMount.addEventListener('click', () => {
      if (!this.isLocked && this.waveState !== 'game_over' && this.waveState !== 'victory') {
        this.canvasMount.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.canvasMount;
      if (this.onStateChange) this.onStateChange();
    });

    window.addEventListener('mousemove', e => {
      if (!this.isLocked) return;
      this.yaw -= e.movementX * this.mouseSensitivity;
      this.pitch -= e.movementY * this.mouseSensitivity;
      // Clamp vertical pitch to avoid flipping
      this.pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, this.pitch));
    });

    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;

      // Weapon switching (1, 2, 3, 4)
      if (e.code === 'Digit1') this.switchWeapon('magnum');
      if (e.code === 'Digit2') this.switchWeapon('knife');
      if (e.code === 'Digit3') this.switchWeapon('shotgun');
      if (e.code === 'Digit4') this.switchWeapon('rifle');

      // Reload
      if (e.code === 'KeyR') this.tryReload();

      // Interact (E)
      if (e.code === 'KeyE') this.tryInteractAirDrop();

      // Sandevistan (Q)
      if (e.code === 'KeyQ') this.activateSandevistan();

      // Quickhack (F)
      if (e.code === 'KeyF') this.activateQuickhack();
    });

    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
    });

    window.addEventListener('mousedown', e => {
      if (e.button === 0 && this.isLocked) {
        this.keys['Mouse0'] = true;
      }
    });

    window.addEventListener('mouseup', e => {
      if (e.button === 0) {
        this.keys['Mouse0'] = false;
      }
    });

    window.addEventListener('resize', () => {
      if (!this.canvasMount) return;
      const w = this.canvasMount.clientWidth;
      const h = this.canvasMount.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  // --- WEAPONS LOGIC ---

  public switchWeapon(type: WeaponType) {
    if (this.weaponManager.currentType === type) return;
    this.weaponManager.switchWeapon(type);
    sound.playReload();
    if (this.onStateChange) this.onStateChange();
  }

  public tryReload() {
    const curType = this.weaponManager.currentType;
    if (curType === 'knife') return; // knife has no reload
    const inv = this.ammoInventory[curType];
    const config = WEAPON_CONFIGS[curType];

    if (inv.current >= config.magSize || inv.reserve <= 0 || this.weaponManager.isReloading) {
      return;
    }

    // Check Arms T3 implant (-50% reload duration)
    let reloadDuration = config.reloadTime;
    if (this.equippedImplantIds.includes('arms_t3')) {
      reloadDuration *= 0.5;
    }

    this.reloadTimer = reloadDuration;
    this.weaponManager.startReload();
    sound.playReload();
  }

  private tryShoot() {
    if (this.shootCooldown > 0 || this.weaponManager.isReloading || this.playerStats.isPsychotic) return;

    const curType = this.weaponManager.currentType;
    const inv = this.ammoInventory[curType];
    const config = WEAPON_CONFIGS[curType];

    // Check ammo
    if (curType !== 'knife') {
      if (inv.current <= 0) {
        sound.playEmptyClick();
        this.tryReload();
        this.shootCooldown = 0.4;
        return;
      }
      inv.current--;
    }

    // Set cooldown based on fire rate (+ Arms T2 bonus: +40% fire rate)
    let effectiveFireRate = config.fireRate;
    if (this.equippedImplantIds.includes('arms_t2')) {
      effectiveFireRate *= 1.4;
    }
    // Legs T3 bonus during Sandevistan: doubles fire rate in slow-mo!
    if (this.isSandevistanActive && this.equippedImplantIds.includes('legs_t3')) {
      effectiveFireRate *= 2.0;
    }
    this.shootCooldown = 1 / effectiveFireRate;

    // Trigger visual weapon animation
    this.weaponManager.triggerShootEffect();

    // Play weapon sound
    if (curType === 'magnum') sound.playMagnumShot();
    else if (curType === 'rifle') sound.playRifleShot();
    else if (curType === 'shotgun') sound.playShotgunShot();
    else if (curType === 'knife') sound.playKnifeSlash();

    // Camera recoil kick
    this.pitch += config.recoil * 0.35;

    // Calculate Damage Multipliers (Arms T1: +35% damage, Cyberskeleton: +150% damage)
    let damageMultiplier = 1.0;
    if (this.equippedImplantIds.includes('arms_t1')) damageMultiplier += 0.35;
    if (this.equippedImplantIds.includes('special_cyberskeleton')) damageMultiplier += 1.5;

    // Perform Raycast for each pellet
    const pellets = config.pellets;
    const isMelee = curType === 'knife';

    for (let p = 0; p < pellets; p++) {
      // Add spread
      const spreadX = (Math.random() - 0.5) * config.spread;
      const spreadY = (Math.random() - 0.5) * config.spread;
      this._screenCenter.set(spreadX, spreadY);

      this._raycaster.setFromCamera(this._screenCenter, this.camera);
      this._raycaster.far = config.range;

      // Collect all enemy hitboxes
      const candidateMeshes: THREE.Mesh[] = [];
      this.enemies.forEach(enemy => {
        if (!enemy.isDead) {
          candidateMeshes.push(...enemy.allMeshes);
        }
      });

      const intersects = this._raycaster.intersectObjects(candidateMeshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0];
        const hitMesh = hit.object as unknown as { isHead?: boolean; enemyRef?: Enemy };
        const enemy = hitMesh.enemyRef;

        if (enemy && !enemy.isDead) {
          const isHead = hitMesh.isHead === true;
          const baseDamage = Math.round(config.damage * damageMultiplier);
          const result = enemy.takeDamage(baseDamage, isHead);

          if (result.killed) {
            this.playerStats.kills++;
            if (result.isHeadshot) this.playerStats.headshots++;
            this.spawnDeathSparks(hit.point, result.isHeadshot);
          }

          if (isHead) {
            sound.playHeadshotSound();
            if (this.onHitMarker) this.onHitMarker(true);
          } else {
            sound.playHitMarker();
            if (this.onHitMarker) this.onHitMarker(false);
          }

          // Bullet impact sparks
          this.spawnImpactSparks(hit.point);
        }

        // Draw tracer to hit point
        if (!isMelee) {
          this.createBulletTracer(this.camera.position, hit.point);
        }
      } else {
        // Tracer to max range
        if (!isMelee) {
          const endPoint = this._raycaster.ray.origin.clone().addScaledVector(this._raycaster.ray.direction, config.range);
          this.createBulletTracer(this.camera.position, endPoint);
        }
      }
    }

    if (this.onStateChange) this.onStateChange();
  }

  // --- SPECIAL ABILITIES ---

  public activateSandevistan() {
    if (!this.equippedImplantIds.includes('special_sandevistan')) return;
    if (this.sandevistanCooldown > 0 || this.isSandevistanActive || this.playerStats.isPsychotic) return;

    // Base duration: 5 seconds (+50% if Legs T3 equipped = 7.5 seconds)
    let duration = 5.0;
    if (this.equippedImplantIds.includes('legs_t3')) duration *= 1.5;

    this.isSandevistanActive = true;
    this.sandevistanTimer = duration;
    this.sandevistanCooldown = 15.0; // 15s cooldown

    // Build up Cyberpsychosis bar (+15%)
    this.addCyberpsychosis(15);
    sound.playSandevistanEnter();
    if (this.onStateChange) this.onStateChange();
  }

  public activateQuickhack() {
    // Find highest tier equipped
    let tier = 0;
    if (this.equippedImplantIds.includes('special_quickhack_t3')) tier = 3;
    else if (this.equippedImplantIds.includes('special_quickhack_t2')) tier = 2;
    else if (this.equippedImplantIds.includes('special_quickhack_t1')) tier = 1;

    if (tier === 0 || this.quickhackCooldown > 0 || this.playerStats.isPsychotic) return;

    sound.playQuickhack();
    this.quickhackCooldown = 12.0;

    let radius = 16;
    let stunDuration = 4.0;
    let psychosisCost = 18;

    if (tier === 2) {
      radius = 26;
      stunDuration = 7.0;
      psychosisCost = 20;
    } else if (tier === 3) {
      radius = 30;
      psychosisCost = 25;
    }

    this.addCyberpsychosis(psychosisCost);

    // Apply quickhack to all enemies in radius
    this.enemies.forEach(enemy => {
      if (!enemy.isDead) {
        const dist = enemy.group.position.distanceTo(this.playerPosition);
        if (dist <= radius) {
          if (tier === 3) {
            // Tier 3: Instantly executes all caught enemies (or massive damage to bosses)!
            if (enemy.isBoss || enemy.isMiniBoss) {
              enemy.takeDamage(750, false);
            } else {
              enemy.takeDamage(enemy.hp + 100, false);
            }
            this.playerStats.kills++;
            this.spawnDeathSparks(enemy.group.position, false);
          } else {
            enemy.applyStun(stunDuration);
          }
        }
      }
    });

    if (this.onStateChange) this.onStateChange();
  }

  // --- CYBERPSYCHOSIS SYSTEM ---

  public addCyberpsychosis(amount: number) {
    this.playerStats.sanity = Math.min(100, this.playerStats.sanity + amount);

    // Recalculate max sanity based on implants
    this.playerStats.maxSanity = calculateMaxSanity(this.equippedImplantIds);

    // Check if triggered
    if (this.playerStats.sanity >= this.playerStats.maxSanity && !this.playerStats.isPsychotic) {
      this.triggerCyberpsychicEpisode();
    }
  }

  private triggerCyberpsychicEpisode() {
    this.playerStats.isPsychotic = true;
    this.playerStats.psychosisTimer = 4.0; // 4 seconds of paralysis & hallucination
    sound.playPsychosisGlitch();
    sound.speak('Warning! Cyberpsychosis threshold exceeded! Neural overload imminent!', 0.6, 1.2);
  }

  public resetCyberpsychosis() {
    this.playerStats.sanity = 0;
    this.playerStats.isPsychotic = false;
    this.playerStats.psychosisTimer = 0;
    sound.playImmunosuppressant();
  }

  // --- AIR DROP SYSTEM ---

  public spawnAirDrop() {
    if (this.airDropMesh) {
      this.scene.remove(this.airDropMesh);
    }

    const dropGroup = new THREE.Group();

    // Supply Crate Mesh (Carbon & Gold with glowing cyber locks)
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x181c22, metalness: 0.95, roughness: 0.15 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfcee0a, metalness: 0.85, roughness: 0.3 });
    const cyanBeaconMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.65 });

    const crate = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.5, 2.0), crateMat);
    crate.position.set(0, 0.75, 0);
    crate.castShadow = true;
    dropGroup.add(crate);

    // Golden lock trims
    const trim = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.3, 2.1), goldMat);
    trim.position.set(0, 0.75, 0);
    dropGroup.add(trim);

    // Sky Holographic Beacon Beam (tall cylinder reaching into sky)
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.6, 60, 16), cyanBeaconMat);
    beam.position.set(0, 30, 0);
    dropGroup.add(beam);

    // Position drop at helipad or random open spot
    const dropX = (Math.random() - 0.5) * 20;
    const dropZ = (Math.random() - 0.5) * 20;
    this.airDropPosition.set(dropX, 0, dropZ);
    dropGroup.position.copy(this.airDropPosition);

    this.scene.add(dropGroup);
    this.airDropMesh = dropGroup;
    this.airDropAvailable = true;

    // Prepare loot roll
    const isCyberskeletonWave = [9, 19, 29, 39, 49].includes(this.currentWave);
    const rolledImplant = rollRandomImplant(this.equippedImplantIds, this.currentWave);

    this.pendingAirDropLoot = {
      ammoRefill: true,
      armorShards: 50,
      healthKits: 60,
      immunosuppressant: true,
      implant: rolledImplant || undefined,
      cyberskeletonAvailable: isCyberskeletonWave && !this.equippedImplantIds.includes('special_cyberskeleton'),
    };

    sound.playAirDropLanded();
    sound.speak('Trauma Team Supply Drop has arrived on the roof.', 1.1, 1.0);
  }

  public tryInteractAirDrop() {
    if (!this.airDropAvailable || !this.pendingAirDropLoot) return;

    const dist = this.playerPosition.distanceTo(this.airDropPosition);
    if (dist <= 4.5) {
      // Open loot modal
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
      if (this.onAirDropInteract) {
        this.onAirDropInteract(this.pendingAirDropLoot);
      }
    }
  }

  public claimAirDrop(choice: 'chrome' | 'human_supplies', equipImplantId?: string) {
    if (!this.pendingAirDropLoot) return;

    if (choice === 'human_supplies') {
      // OPTION B: PURE HUMAN RESUPPLY (No Cyberware / Sanity-Preserving Build)
      // Refills all ammunition completely
      Object.keys(this.ammoInventory).forEach(key => {
        const wKey = key as WeaponType;
        const config = WEAPON_CONFIGS[wKey];
        this.ammoInventory[wKey].reserve = config.maxReserve;
        this.ammoInventory[wKey].current = config.magSize;
      });

      // Massive Health & Armor boost
      this.playerStats.hp = Math.min(this.playerStats.maxHp, this.playerStats.hp + 80);
      this.playerStats.armor = Math.min(this.playerStats.maxArmor, this.playerStats.armor + 75);

      // Immunosuppressant resets any active cyberpsychosis build-up to 0
      this.resetCyberpsychosis();
      sound.speak('Chrome refused. Organic neural integrity preserved. Full tactical resupply granted.', 1.1, 1.05);
    } else {
      // OPTION A: CYBERWARE UPGRADE (Chrome Build)
      // Standard ammo refill
      Object.keys(this.ammoInventory).forEach(key => {
        const wKey = key as WeaponType;
        const config = WEAPON_CONFIGS[wKey];
        this.ammoInventory[wKey].reserve = config.maxReserve;
        this.ammoInventory[wKey].current = config.magSize;
      });

      // Modest health & armor repair
      this.playerStats.hp = Math.min(this.playerStats.maxHp, this.playerStats.hp + 45);
      this.playerStats.armor = Math.min(this.playerStats.maxArmor, this.playerStats.armor + 40);

      // Install chosen Chrome
      if (equipImplantId && !this.equippedImplantIds.includes(equipImplantId)) {
        this.equipChrome(equipImplantId);
      }
    }

    // Remove air drop mesh from scene
    if (this.airDropMesh) {
      this.scene.remove(this.airDropMesh);
      this.airDropMesh = null;
    }
    this.airDropAvailable = false;
    this.pendingAirDropLoot = null;

    sound.playImmunosuppressant();
    if (this.onStateChange) this.onStateChange();
  }

  public equipChrome(id: string) {
    if (this.equippedImplantIds.includes(id)) return;
    this.equippedImplantIds.push(id);

    // Torso T1 HP bonus
    if (id === 'torso_t1') {
      this.playerStats.maxHp += 75;
      this.playerStats.hp += 75;
    }

    // Legs T2 stamina bonus
    if (id === 'legs_t2') {
      this.playerStats.maxStamina = 175;
      this.playerStats.stamina = 175;
    }

    // Update max sanity penalty
    this.playerStats.maxSanity = calculateMaxSanity(this.equippedImplantIds);
    sound.speak('Cyberware implant integrated into neural harness.', 1.1, 1.1);
  }

  // --- WAVE PROGRESSION (WAVES 1 TO 50) ---

  public startWave(waveNumber: number) {
    this.currentWave = waveNumber;
    this.waveState = 'active_wave';
    this.activeBoss = null;

    // Determine enemies for this wave
    const isMainBoss = waveNumber % 10 === 0; // Waves 10, 20, 30, 40, 50 (Adam Smasher)
    const isMiniBoss = waveNumber % 5 === 0 && !isMainBoss; // Waves 5, 15, 25, 35, 45 (MaxTac)

    if (isMainBoss) {
      this.enemiesRemainingToSpawn = 1;
      sound.playBossAlarm(true);
      sound.speak('Warning! Heavy Arasaka threat detected: Adam Smasher!', 0.7, 0.9);
    } else if (isMiniBoss) {
      this.enemiesRemainingToSpawn = 1 + Math.floor(waveNumber / 8); // MaxTac + occasional escort
      sound.playBossAlarm(false);
      sound.speak('MaxTac priority tactical response inbound!', 0.9, 1.0);
    } else {
      // Normal wave: 4 + wave * 1.5 enemies
      this.enemiesRemainingToSpawn = Math.min(25, 4 + Math.floor(waveNumber * 1.2));
      sound.speak(`Wave ${waveNumber} initiated.`, 1.0, 1.1);
    }

    this.enemySpawnTimer = 0.5;

    // Spawn an Air Drop on wave start for specific waves, or guarantee one before Adam Smasher
    if ([1, 5, 9, 15, 19, 25, 29, 35, 39, 45, 49].includes(waveNumber)) {
      this.spawnAirDrop();
    }

    if (this.onStateChange) this.onStateChange();
  }

  private spawnNextEnemy() {
    if (this.enemiesRemainingToSpawn <= 0) return;

    let type: EnemyType = 'scav';
    const isMainBoss = this.currentWave % 10 === 0;
    const isMiniBoss = this.currentWave % 5 === 0 && !isMainBoss;

    if (isMainBoss) {
      type = 'adam_smasher';
    } else if (isMiniBoss) {
      type = 'maxtac';
    } else if (this.currentWave >= 11) {
      // Waves 11-21: Upgraded Cyber-Enemies
      type = Math.random() < 0.65 ? 'cyber_merc' : 'scav';
    }

    // Spawn position along rooftop perimeter
    const angle = Math.random() * Math.PI * 2;
    const dist = 28 + Math.random() * 4;
    const spawnX = Math.cos(angle) * dist;
    const spawnZ = Math.sin(angle) * dist;

    const enemy = new Enemy(type, this.currentWave, new THREE.Vector3(spawnX, 0, spawnZ));
    this.scene.add(enemy.group);
    this.enemies.push(enemy);

    if (enemy.isBoss || enemy.isMiniBoss) {
      this.activeBoss = enemy;
    }

    this.enemiesRemainingToSpawn--;
  }

  // --- TRACERS & PARTICLES ---

  private createBulletTracer(start: THREE.Vector3, end: THREE.Vector3) {
    const geom = new THREE.BufferGeometry().setFromPoints([start, end]);
    const mat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.9 });
    const line = new THREE.Line(geom, mat);
    this.scene.add(line);
    this.tracers.push({ mesh: line, life: 0.08, maxLife: 0.08 });
  }

  private spawnImpactSparks(point: THREE.Vector3) {
    const count = 12;
    const geom = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      pos[i * 3] = point.x;
      pos[i * 3 + 1] = point.y;
      pos[i * 3 + 2] = point.z;

      vel[i * 3] = (Math.random() - 0.5) * 6;
      vel[i * 3 + 1] = Math.random() * 5 + 1;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }

    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xfcee0a, size: 0.12, transparent: true, opacity: 1 });
    const points = new THREE.Points(geom, mat);
    this.scene.add(points);
    this.sparks.push({ mesh: points, velocities: vel, life: 0.25 });
  }

  private spawnDeathSparks(point: THREE.Vector3, isHeadshot: boolean) {
    const count = isHeadshot ? 45 : 25;
    const geom = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      pos[i * 3] = point.x;
      pos[i * 3 + 1] = point.y + (isHeadshot ? 1.5 : 0.8);
      pos[i * 3 + 2] = point.z;

      vel[i * 3] = (Math.random() - 0.5) * 10;
      vel[i * 3 + 1] = Math.random() * 8 + 2;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }

    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const color = isHeadshot ? 0xff003c : 0x00f0ff;
    const mat = new THREE.PointsMaterial({ color, size: 0.22, transparent: true, opacity: 1 });
    const points = new THREE.Points(geom, mat);
    this.scene.add(points);
    this.sparks.push({ mesh: points, velocities: vel, life: 0.5 });
  }

  // --- VISIBLE ENEMY ATTACK & PROJECTILES ---
  private fireEnemyProjectile(enemy: Enemy) {
    const startPos = enemy.getMuzzleWorldPos();
    // Aim towards player body with small spread
    const targetPos = this.playerPosition.clone().add(new THREE.Vector3(
      (Math.random() - 0.5) * 0.4,
      -0.2 + (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.4
    ));
    const dir = new THREE.Vector3().subVectors(targetPos, startPos).normalize();

    let boltColor = 0xff7700;
    let boltSpeed = 26;
    let boltRadius = 0.08;
    let boltLength = 1.0;

    if (enemy.type === 'cyber_merc') {
      boltColor = 0xff003c; // Crimson Red laser
      boltSpeed = 32;
      boltRadius = 0.07;
      boltLength = 1.3;
    } else if (enemy.type === 'maxtac') {
      boltColor = 0x0088ff; // Electric Blue plasma
      boltSpeed = 30;
      boltRadius = 0.1;
      boltLength = 1.1;
    } else if (enemy.isBoss) {
      boltColor = 0xff2200; // Adam Smasher Heavy Autocannon
      boltSpeed = 36;
      boltRadius = 0.14;
      boltLength = 1.8;
    }

    const geom = new THREE.CylinderGeometry(boltRadius, boltRadius, boltLength, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: boltColor,
      transparent: true,
      opacity: 0.95,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(startPos);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    this.scene.add(mesh);

    this.enemyProjectiles.push({
      mesh,
      position: startPos,
      velocity: dir.multiplyScalar(boltSpeed),
      damage: enemy.attackDamage,
      life: 2.2,
      shooterType: enemy.type,
      shooterPos: enemy.group.position.clone(),
    });
  }

  private createMeleeSlashEffect(startPos: THREE.Vector3, targetPos: THREE.Vector3) {
    const mid = new THREE.Vector3().addVectors(startPos, targetPos).multiplyScalar(0.5);
    mid.y += 1.2;
    const geom = new THREE.RingGeometry(0.8, 1.4, 12, 1, 0, Math.PI);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const slash = new THREE.Mesh(geom, mat);
    slash.position.copy(mid);
    slash.lookAt(targetPos);
    this.scene.add(slash);

    setTimeout(() => {
      this.scene.remove(slash);
      geom.dispose();
      mat.dispose();
    }, 200);
  }

  // --- ADAM SMASHER MISSILE LAUNCH ---
  private fireAdamSmasherMissile(boss: Enemy) {
    const launchPos = boss.group.position.clone().add(new THREE.Vector3(0, 3.2, 0));
    const rocketGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 8);
    const rocketMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff3300, emissiveIntensity: 2.5 });
    const rocketMesh = new THREE.Mesh(rocketGeom, rocketMat);
    rocketMesh.position.copy(launchPos);
    this.scene.add(rocketMesh);

    const dir = new THREE.Vector3().subVectors(this.playerPosition, launchPos).normalize();
    rocketMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

    this.rockets.push({
      mesh: rocketMesh,
      position: launchPos,
      velocity: dir.multiplyScalar(16),
      targetPos: this.playerPosition.clone(),
      life: 3.5,
    });
  }

  // --- MAIN SIMULATION LOOP ---

  private startLoop() {
    let lastTime = performance.now();

    const tick = () => {
      const now = performance.now();
      const rawDelta = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      this.update(rawDelta);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        // Safe paced callback for software WebGL
        const gl = this.renderer.getContext() as WebGL2RenderingContext;
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            this.frameId = window.setTimeout(poll, 5);
          } else {
            gl.deleteSync(sync);
            this.frameId = window.setTimeout(tick, 60);
          }
        };
        this.frameId = window.setTimeout(poll, 5);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      tick();
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private update(delta: number) {
    // 1. Bullet-Time time scale
    let worldTimeScale = 1.0;
    if (this.isSandevistanActive) {
      worldTimeScale = 0.15; // Extreme slow-mo for enemies & world!
      this.sandevistanTimer -= delta;
      if (this.sandevistanTimer <= 0) {
        this.isSandevistanActive = false;
        sound.playSandevistanExit();
      }
    }

    if (this.sandevistanCooldown > 0) this.sandevistanCooldown -= delta;
    if (this.quickhackCooldown > 0) this.quickhackCooldown -= delta;
    if (this.shootCooldown > 0) this.shootCooldown -= delta;

    // 2. Weapon reload progress
    if (this.weaponManager.isReloading) {
      this.reloadTimer -= delta;
      const curType = this.weaponManager.currentType;
      const config = WEAPON_CONFIGS[curType];
      const maxTime = this.equippedImplantIds.includes('arms_t3') ? config.reloadTime * 0.5 : config.reloadTime;
      this.weaponManager.reloadProgress = 1 - Math.max(0, this.reloadTimer / maxTime);

      if (this.reloadTimer <= 0) {
        // Complete reload
        this.weaponManager.isReloading = false;
        const inv = this.ammoInventory[curType];
        const needed = config.magSize - inv.current;
        const toTake = Math.min(needed, inv.reserve);
        inv.current += toTake;
        inv.reserve -= toTake;
        if (this.onStateChange) this.onStateChange();
      }
    }

    // 3. Cyberskeleton passive cyberpsychosis drain
    if (this.equippedImplantIds.includes('special_cyberskeleton')) {
      this.addCyberpsychosis(delta * 2.5); // rapid passive sanity buildup
    }

    // 4. Cyberpsychic episode handling
    if (this.playerStats.isPsychotic) {
      this.playerStats.psychosisTimer -= delta;
      // Continuous health bleed (-12 HP/s)
      this.playerStats.hp -= delta * 12;
      if (this.playerStats.hp <= 0) {
        this.playerDied();
      }
      if (this.playerStats.psychosisTimer <= 0) {
        this.playerStats.isPsychotic = false;
      }
    }

    // 5. Player Kinematics & Movement
    this.updatePlayerMovement(delta);

    // 6. Shooting check (hold for automatic rifle or mobile fire button)
    if ((this.keys['Mouse0'] && (this.isLocked || this.isMobileMode)) || this.mobileShootActive) {
      this.tryShoot();
    }

    // 7. Weapon Model update (sway & recoil)
    const isMoving = this.playerVelocity.lengthSq() > 0.1;
    if (isMoving) this.moveTime += delta;
    this.weaponManager.update(delta, isMoving, this.moveTime);

    // 8. Waves & Enemy Spawning
    if (this.waveState === 'pre_wave') {
      this.waveTimer -= delta;
      if (this.waveTimer <= 0) {
        this.startWave(1);
      }
    } else if (this.waveState === 'active_wave') {
      // Enemy Spawner
      if (this.enemiesRemainingToSpawn > 0) {
        this.enemySpawnTimer -= delta * worldTimeScale;
        if (this.enemySpawnTimer <= 0) {
          this.spawnNextEnemy();
          this.enemySpawnTimer = 2.2;
        }
      }

      // Check if wave cleared
      const allDead = this.enemiesRemainingToSpawn === 0 && this.enemies.every(e => e.isDead);
      if (allDead) {
        this.waveCleared();
      }
    } else if (this.waveState === 'wave_cleared') {
      this.waveTimer -= delta;
      if (this.waveTimer <= 0) {
        if (this.currentWave >= this.maxWaves) {
          this.triggerVictory();
        } else {
          this.startWave(this.currentWave + 1);
        }
      }
    }

    // 9. Update Enemies AI & Combat
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.isDead) continue;

      enemy.update(delta, this.playerPosition, worldTimeScale);

      // Enemy Attacks (Visible projectiles & animations, avoiding invisible damage!)
      const dist = enemy.group.position.distanceTo(this.playerPosition);
      if (dist <= enemy.attackRange && enemy.attackCooldown <= 0 && !enemy.isStunned) {
        enemy.attackCooldown = 1.6 + Math.random() * 0.6;
        enemy.triggerAttack();

        if (enemy.type === 'maxtac' && dist <= 3.2) {
          // Mantis Blade Melee Dash
          this.createMeleeSlashEffect(enemy.group.position, this.playerPosition);
          this.playerTakeDamage(enemy.attackDamage, enemy.group.position);
        } else {
          // Visible laser/plasma projectile
          this.fireEnemyProjectile(enemy);
        }

        // Adam Smasher Missile Attack
        if (enemy.isBoss && enemy.rocketCooldown <= 0) {
          enemy.rocketCooldown = 4.2;
          this.fireAdamSmasherMissile(enemy);
        }
      }
    }

    // 10. Update Enemy Projectiles
    for (let p = this.enemyProjectiles.length - 1; p >= 0; p--) {
      const proj = this.enemyProjectiles[p];
      proj.life -= delta * worldTimeScale;
      proj.position.addScaledVector(proj.velocity, delta * worldTimeScale);
      proj.mesh.position.copy(proj.position);

      const distToPlayer = proj.position.distanceTo(this.playerPosition);
      if (distToPlayer <= 1.0) {
        // Hit player!
        this.scene.remove(proj.mesh);
        proj.mesh.geometry.dispose();
        this.spawnImpactSparks(proj.position);
        this.playerTakeDamage(proj.damage, proj.shooterPos);
        this.enemyProjectiles.splice(p, 1);
        continue;
      }

      // Check collision with ground or obstacle boxes
      let hitTerrain = proj.position.y <= 0.1;
      if (!hitTerrain) {
        for (const obs of this.mapBuilder.obstacles) {
          if (obs.box.containsPoint(proj.position)) {
            hitTerrain = true;
            break;
          }
        }
      }

      if (hitTerrain || proj.life <= 0) {
        this.scene.remove(proj.mesh);
        proj.mesh.geometry.dispose();
        if (hitTerrain) this.spawnImpactSparks(proj.position);
        this.enemyProjectiles.splice(p, 1);
      }
    }

    // 11. Update Rockets
    for (let r = this.rockets.length - 1; r >= 0; r--) {
      const rock = this.rockets[r];
      rock.life -= delta * worldTimeScale;
      rock.position.addScaledVector(rock.velocity, delta * worldTimeScale);
      rock.mesh.position.copy(rock.position);

      const distToPlayer = rock.position.distanceTo(this.playerPosition);
      if (distToPlayer <= 2.2 || rock.life <= 0) {
        // Explode
        this.scene.remove(rock.mesh);
        this.spawnImpactSparks(rock.position);
        if (distToPlayer <= 5.0) {
          this.playerTakeDamage(Math.round(45 * (1 - distToPlayer / 5.0)), rock.position);
        }
        this.rockets.splice(r, 1);
      }
    }

    // 12. Update Damage Indicators & Damage Flash Timer
    for (let d = this.damageIndicators.length - 1; d >= 0; d--) {
      this.damageIndicators[d].time -= delta;
      if (this.damageIndicators[d].time <= 0) {
        this.damageIndicators.splice(d, 1);
      }
    }
    if (this.damageFlashTimer > 0) {
      this.damageFlashTimer -= delta;
    }

    // 11. Update Tracers & Sparks
    for (let t = this.tracers.length - 1; t >= 0; t--) {
      const tracer = this.tracers[t];
      tracer.life -= delta;
      if (tracer.life <= 0) {
        this.scene.remove(tracer.mesh);
        tracer.mesh.geometry.dispose();
        this.tracers.splice(t, 1);
      }
    }

    for (let s = this.sparks.length - 1; s >= 0; s--) {
      const sp = this.sparks[s];
      sp.life -= delta;
      const attr = sp.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < sp.velocities.length; i += 3) {
        arr[i] += sp.velocities[i] * delta;
        arr[i + 1] += sp.velocities[i + 1] * delta;
        arr[i + 2] += sp.velocities[i + 2] * delta;
        sp.velocities[i + 1] -= 9.8 * delta; // gravity
      }
      attr.needsUpdate = true;

      if (sp.life <= 0) {
        this.scene.remove(sp.mesh);
        sp.mesh.geometry.dispose();
        this.sparks.splice(s, 1);
      }
    }

    // 12. Map Atmospherics (rain, steam, billboards)
    this.mapBuilder.update(delta, performance.now() / 1000);
  }

  // --- PLAYER MOVEMENT & COLLISION ---

  private updatePlayerMovement(delta: number) {
    // Paralyzed if in Cyberpsychic episode
    if (this.playerStats.isPsychotic) {
      // Add heavy disorienting camera jitter
      this.pitch += (Math.random() - 0.5) * 0.04;
      this.yaw += (Math.random() - 0.5) * 0.04;
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.set(this.pitch, this.yaw, (Math.random() - 0.5) * 0.08);
      return;
    }

    // Stamina & Sprinting (+ Legs T1 speed, Legs T2 max stamina, Cyberskeleton speed)
    let moveSpeed = 5.5;
    if (this.equippedImplantIds.includes('legs_t1')) moveSpeed *= 1.3;
    if (this.equippedImplantIds.includes('special_cyberskeleton')) moveSpeed *= 1.4;

    this.isSprinting = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.mobileSprint) && this.playerStats.stamina > 5;
    if (this.isSprinting) {
      moveSpeed *= 1.6;
      this.playerStats.stamina = Math.max(0, this.playerStats.stamina - delta * 20);
    } else {
      // Recover stamina (+ faster if Legs T2)
      const regenRate = this.equippedImplantIds.includes('legs_t2') ? 25 : 15;
      this.playerStats.stamina = Math.min(this.playerStats.maxStamina, this.playerStats.stamina + delta * regenRate);
    }

    // Calculate forward & side vectors from camera yaw
    this._forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    this._side.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();

    this._moveDir.set(0, 0, 0);
    if (this.keys['KeyW']) this._moveDir.add(this._forward);
    if (this.keys['KeyS']) this._moveDir.sub(this._forward);
    if (this.keys['KeyA']) this._moveDir.sub(this._side);
    if (this.keys['KeyD']) this._moveDir.add(this._side);

    // Mobile Virtual Joystick input
    if (this.mobileMoveDir.lengthSq() > 0.01) {
      this._moveDir.addScaledVector(this._forward, this.mobileMoveDir.y);
      this._moveDir.addScaledVector(this._side, this.mobileMoveDir.x);
    }

    if (this._moveDir.lengthSq() > 0) {
      this._moveDir.normalize();
    }

    // Jump
    if ((this.keys['Space'] || this.mobileJumpRequested) && this.isGrounded) {
      this.playerVelocity.y = 6.2;
      this.isGrounded = false;
      this.mobileJumpRequested = false;
    }

    // Gravity
    if (!this.isGrounded) {
      this.playerVelocity.y -= 18 * delta;
    }

    // Horizontal velocity
    this.playerVelocity.x = this._moveDir.x * moveSpeed;
    this.playerVelocity.z = this._moveDir.z * moveSpeed;

    // Apply movement
    const nextPos = this.playerPosition.clone();
    nextPos.x += this.playerVelocity.x * delta;
    nextPos.z += this.playerVelocity.z * delta;
    nextPos.y += this.playerVelocity.y * delta;

    // Arena boundary collision (-34 to +34)
    nextPos.x = Math.max(-33.5, Math.min(33.5, nextPos.x));
    nextPos.z = Math.max(-33.5, Math.min(33.5, nextPos.z));

    // Obstacle Box Collisions
    const playerRadius = 0.5;
    for (const obs of this.mapBuilder.obstacles) {
      if (
        nextPos.x + playerRadius > obs.box.min.x &&
        nextPos.x - playerRadius < obs.box.max.x &&
        nextPos.z + playerRadius > obs.box.min.z &&
        nextPos.z - playerRadius < obs.box.max.z &&
        nextPos.y < obs.box.max.y + 1.7
      ) {
        // Resolve horizontal push-back
        nextPos.x = this.playerPosition.x;
        nextPos.z = this.playerPosition.z;
        break;
      }
    }

    // Floor height
    if (nextPos.y <= 1.7) {
      nextPos.y = 1.7;
      this.playerVelocity.y = 0;
      this.isGrounded = true;
    }

    this.playerPosition.copy(nextPos);
    this.camera.position.copy(this.playerPosition);

    // Apply camera rotation
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  // --- DAMAGE TO PLAYER ---

  public playerTakeDamage(rawAmount: number, attackerPos?: THREE.Vector3) {
    if (this.waveState === 'game_over' || this.waveState === 'victory') return;

    // Calculate resistances (Torso T1: 35%, Cyberskeleton: 70%)
    let reduction = 0;
    if (this.equippedImplantIds.includes('torso_t1')) reduction += 0.35;
    if (this.equippedImplantIds.includes('special_cyberskeleton')) reduction += 0.7;
    reduction = Math.min(0.85, reduction); // cap at 85%

    let damage = Math.max(1, Math.round(rawAmount * (1 - reduction)));

    // Armor absorbs 70% of remaining damage
    if (this.playerStats.armor > 0) {
      const absorbed = Math.min(this.playerStats.armor, Math.round(damage * 0.7));
      this.playerStats.armor -= absorbed;
      damage -= absorbed;
    }

    this.playerStats.hp -= damage;
    this.damageFlashTimer = 0.45;
    sound.playPlayerHurt();

    // Directional damage indicator
    if (attackerPos) {
      const dx = attackerPos.x - this.playerPosition.x;
      const dz = attackerPos.z - this.playerPosition.z;
      // angle in world space (0 is -Z)
      const worldAngle = Math.atan2(dx, -dz);
      let relAngle = worldAngle - this.yaw;
      while (relAngle > Math.PI) relAngle -= Math.PI * 2;
      while (relAngle < -Math.PI) relAngle += Math.PI * 2;

      this.damageIndicators.push({
        id: Math.random(),
        angle: relAngle,
        time: 1.2,
      });
    }

    if (this.playerStats.hp <= 0) {
      this.playerStats.hp = 0;
      this.playerDied();
    }

    if (this.onStateChange) this.onStateChange();
  }

  private waveCleared() {
    this.waveState = 'wave_cleared';
    this.waveTimer = 4.0;
    sound.speak(`Wave ${this.currentWave} Cleared! Chrome performance nominal.`, 1.1, 1.1);

    // Reward health & armor regeneration between waves
    this.playerStats.hp = Math.min(this.playerStats.maxHp, this.playerStats.hp + 35);
    this.playerStats.armor = Math.min(this.playerStats.maxArmor, this.playerStats.armor + 30);

    // Clean up old dead enemy meshes
    this.enemies.forEach(e => {
      this.scene.remove(e.group);
      e.dispose();
    });
    this.enemies = [];

    if (this.onStateChange) this.onStateChange();
  }

  private playerDied() {
    this.waveState = 'game_over';
    sound.speak('Flatlined. Vital signs extinguished.', 0.8, 0.9);
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    if (this.onGameOver) {
      this.onGameOver(false);
    }
  }

  private triggerVictory() {
    this.waveState = 'victory';
    sound.speak('Wave 50 Complete! Night City Legend verified. You smashed the monster!', 1.1, 1.0);
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    if (this.onGameOver) {
      this.onGameOver(true);
    }
  }

  public restartGame(chosenWeapon: WeaponType = 'magnum') {
    this.currentWave = 1;
    this.waveState = 'pre_wave';
    this.waveTimer = 2.0;
    this.equippedImplantIds = [];

    this.playerStats = {
      hp: 150,
      maxHp: 150,
      armor: 100,
      maxArmor: 100,
      stamina: 100,
      maxStamina: 100,
      sanity: 0,
      maxSanity: 100,
      isPsychotic: false,
      psychosisTimer: 0,
      kills: 0,
      headshots: 0,
    };

    this.ammoInventory = {
      magnum: { current: 6, reserve: 36 },
      knife: { current: 999, reserve: 999 },
      shotgun: { current: 6, reserve: 24 },
      rifle: { current: 30, reserve: 120 },
    };

    this.playerPosition.set(0, 1.7, 10);
    this.playerVelocity.set(0, 0, 0);
    this.pitch = 0;
    this.yaw = 0;

    // Reset enemies
    this.enemies.forEach(e => {
      this.scene.remove(e.group);
      e.dispose();
    });
    this.enemies = [];
    this.activeBoss = null;

    if (this.airDropMesh) {
      this.scene.remove(this.airDropMesh);
      this.airDropMesh = null;
    }
    this.airDropAvailable = false;

    this.switchWeapon(chosenWeapon);
    if (this.onStateChange) this.onStateChange();
  }

  // --- MOBILE / ANDROID TOUCH CONTROLS API ---

  public addMobileLook(dx: number, dy: number) {
    this.yaw -= dx * this.mouseSensitivity * 1.6;
    this.pitch -= dy * this.mouseSensitivity * 1.6;
    this.pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, this.pitch));
  }

  public setMobileMove(x: number, y: number, sprint: boolean = false) {
    this.mobileMoveDir.set(x, y);
    this.mobileSprint = sprint;
  }

  public setMobileShoot(active: boolean) {
    this.mobileShootActive = active;
  }

  public triggerMobileJump() {
    if (this.isGrounded) {
      this.mobileJumpRequested = true;
    }
  }

  public dispose() {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      clearTimeout(this.frameId);
    }
    this.renderer.dispose();
  }
}
