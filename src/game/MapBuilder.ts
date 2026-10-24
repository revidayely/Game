import * as THREE from 'three';

export interface CoverObstacle {
  box: THREE.Box3;
  mesh: THREE.Object3D;
}

export class MapBuilder {
  public obstacles: CoverObstacle[] = [];
  public mapGroup: THREE.Group;
  public steamVents: THREE.Points[] = [];
  public neonBillboards: THREE.Mesh[] = [];
  private rainParticles: THREE.Points | null = null;
  public airDropPadPosition = new THREE.Vector3(0, 0, 0);

  constructor() {
    this.mapGroup = new THREE.Group();
  }

  public buildScene(scene: THREE.Scene) {
    scene.add(this.mapGroup);

    // 1. Fog & Background
    scene.background = new THREE.Color(0x06070d);
    scene.fog = new THREE.FogExp2(0x080a12, 0.015);

    // 2. Lighting Rig
    this.setupLighting(scene);

    // 3. Ground / Rooftop Floor
    this.buildRooftopFloor();

    // 4. Tactical Cover Props (HVAC units, crates, server racks, barriers)
    this.buildCoverProps();

    // 5. Perimeter Railings & Neon Forcefield Pillars
    this.buildPerimeterBarriers();

    // 6. Cyberpunk Megacity Skyline & Billboards
    this.buildCitySkyline();

    // 7. Atmospheric Steam & Rain Particles
    this.buildAtmospherics();
  }

  private setupLighting(scene: THREE.Scene) {
    // Cool ambient hemisphere light (sky vs ground)
    const hemiLight = new THREE.HemisphereLight(0x1a2b4c, 0x0a0d14, 0.8);
    scene.add(hemiLight);

    // Directional Key Light (Moonlight / City skyglow)
    const dirLight = new THREE.DirectionalLight(0x7395c7, 1.2);
    dirLight.position.set(30, 50, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 120;
    const d = 45;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    // Neon Accent Lights
    const cyanLight = new THREE.PointLight(0x00f0ff, 2.5, 35);
    cyanLight.position.set(-18, 5, -18);
    scene.add(cyanLight);

    const magentaLight = new THREE.PointLight(0xff0055, 2.5, 35);
    magentaLight.position.set(18, 5, 18);
    scene.add(magentaLight);

    const yellowLight = new THREE.PointLight(0xfcee0a, 2.0, 30);
    yellowLight.position.set(0, 8, -25);
    scene.add(yellowLight);
  }

  private buildRooftopFloor() {
    // Canvas texture for wet asphalt with high-tech cyber grid and helipad markings
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Base dark industrial tarmac
    ctx.fillStyle = '#101319';
    ctx.fillRect(0, 0, 1024, 1024);

    // Grid lines
    ctx.strokeStyle = '#1b222d';
    ctx.lineWidth = 3;
    const step = 64;
    for (let x = 0; x <= 1024; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1024);
      ctx.stroke();
    }
    for (let y = 0; y <= 1024; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }

    // High-tech warning hazard stripes around border
    ctx.strokeStyle = '#fcee0a';
    ctx.lineWidth = 8;
    ctx.strokeRect(32, 32, 960, 960);

    // Helipad Landing Circle in Center
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(512, 512, 220, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 120px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('H', 512, 512);

    ctx.font = 'bold 32px monospace';
    ctx.fillStyle = '#fcee0a';
    ctx.fillText('ARASAKA TOWER HELIPAD // SECTOR 04', 512, 320);

    const floorTexture = new THREE.CanvasTexture(canvas);
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(1, 1);
    floorTexture.colorSpace = THREE.SRGBColorSpace;

    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.35,
      metalness: 0.7,
    });

    const floorGeom = new THREE.PlaneGeometry(70, 70);
    const floorMesh = new THREE.Mesh(floorGeom, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    this.mapGroup.add(floorMesh);
  }

  private buildCoverProps() {
    // 1. Central Elevated Helipad Platform (subtle 0.3m height)
    const padMat = new THREE.MeshStandardMaterial({ color: 0x181c24, metalness: 0.8, roughness: 0.3 });
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(8, 8.5, 0.3, 32), padMat);
    pad.position.set(0, 0.15, 0);
    pad.receiveShadow = true;
    this.mapGroup.add(pad);

    // 2. Tactical HVAC & Ventilation Server Units
    const coverLayouts = [
      { x: -14, z: -10, w: 4, h: 2.2, d: 2.5, rot: 0.2 },
      { x: 14, z: -10, w: 4, h: 2.2, d: 2.5, rot: -0.2 },
      { x: -14, z: 12, w: 3.5, h: 2.4, d: 2.5, rot: -0.1 },
      { x: 14, z: 12, w: 3.5, h: 2.4, d: 2.5, rot: 0.1 },
      { x: 0, z: -20, w: 6, h: 1.8, d: 2.0, rot: 0 },
      { x: 0, z: 20, w: 6, h: 1.8, d: 2.0, rot: 0 },
      { x: -22, z: 0, w: 2.5, h: 2.2, d: 5.0, rot: 0 },
      { x: 22, z: 0, w: 2.5, h: 2.2, d: 5.0, rot: 0 },
    ];

    const hvacMat = new THREE.MeshStandardMaterial({ color: 0x242832, metalness: 0.85, roughness: 0.25 });
    const ventMat = new THREE.MeshStandardMaterial({ color: 0x111317, metalness: 0.9, roughness: 0.5 });
    const neonCyan = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 2.0 });
    const neonYellow = new THREE.MeshStandardMaterial({ color: 0xfcee0a, emissive: 0xfcee0a, emissiveIntensity: 1.8 });

    coverLayouts.forEach((c, idx) => {
      const coverGroup = new THREE.Group();

      // Main unit body
      const body = new THREE.Mesh(new THREE.BoxGeometry(c.w, c.h, c.d), hvacMat);
      body.position.set(0, c.h / 2, 0);
      body.castShadow = true;
      body.receiveShadow = true;
      coverGroup.add(body);

      // Top fan grill
      const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.1, 16), ventMat);
      fan.position.set(0, c.h + 0.05, 0);
      coverGroup.add(fan);

      // Warning neon stripe
      const stripeMat = idx % 2 === 0 ? neonCyan : neonYellow;
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(c.w * 0.9, 0.1, c.d + 0.02), stripeMat);
      stripe.position.set(0, c.h * 0.7, 0);
      coverGroup.add(stripe);

      coverGroup.position.set(c.x, 0, c.z);
      coverGroup.rotation.y = c.rot;
      this.mapGroup.add(coverGroup);

      // Add to obstacle collision list
      const box = new THREE.Box3();
      box.setFromObject(coverGroup);
      this.obstacles.push({ box, mesh: coverGroup });
    });

    // 3. Cyberpunk Cargo Crates / Steel Barriers
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x303542, metalness: 0.7, roughness: 0.4 });
    const crateLocations = [
      { x: -7, z: -6, rot: 0.3 },
      { x: 8, z: -6, rot: -0.4 },
      { x: -8, z: 7, rot: -0.2 },
      { x: 7, z: 7, rot: 0.25 },
    ];

    crateLocations.forEach(loc => {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 1.6), crateMat);
      crate.position.set(loc.x, 0.7, loc.z);
      crate.rotation.y = loc.rot;
      crate.castShadow = true;
      crate.receiveShadow = true;
      this.mapGroup.add(crate);

      const box = new THREE.Box3();
      box.setFromObject(crate);
      this.obstacles.push({ box, mesh: crate });
    });
  }

  private buildPerimeterBarriers() {
    const postMat = new THREE.MeshStandardMaterial({ color: 0x15181f, metalness: 0.9, roughness: 0.2 });
    const neonRailMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 2.2,
    });

    const size = 35; // boundary at -35 to +35
    const edges = [
      { start: [-size, -size], end: [size, -size] },
      { start: [size, -size], end: [size, size] },
      { start: [size, size], end: [-size, size] },
      { start: [-size, size], end: [-size, -size] },
    ];

    edges.forEach(edge => {
      const sx = edge.start[0];
      const sz = edge.start[1];
      const ex = edge.end[0];
      const ez = edge.end[1];

      // Add barrier wall collision
      const isX = Math.abs(sx - ex) > 0;
      const length = isX ? Math.abs(ex - sx) : Math.abs(ez - sz);
      const midX = (sx + ex) / 2;
      const midZ = (sz + ez) / 2;

      // Glow rail
      const railGeom = new THREE.BoxGeometry(isX ? length : 0.2, 0.2, isX ? 0.2 : length);
      const railMesh = new THREE.Mesh(railGeom, neonRailMat);
      railMesh.position.set(midX, 1.2, midZ);
      this.mapGroup.add(railMesh);

      // Low solid curb
      const curbGeom = new THREE.BoxGeometry(isX ? length : 0.8, 0.8, isX ? 0.8 : length);
      const curbMesh = new THREE.Mesh(curbGeom, postMat);
      curbMesh.position.set(midX, 0.4, midZ);
      this.mapGroup.add(curbMesh);

      // Collision box for perimeter
      const pBox = new THREE.Box3();
      pBox.setFromObject(curbMesh);
      this.obstacles.push({ box: pBox, mesh: curbMesh });

      // Corner / Segment Pillars
      const numPosts = 7;
      for (let i = 0; i <= numPosts; i++) {
        const t = i / numPosts;
        const px = sx + (ex - sx) * t;
        const pz = sz + (ez - sz) * t;

        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 2.8, 8), postMat);
        post.position.set(px, 1.4, pz);
        this.mapGroup.add(post);

        // Neon cap beacon
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), neonRailMat);
        cap.position.set(px, 2.9, pz);
        this.mapGroup.add(cap);
      }
    });
  }

  private buildCitySkyline() {
    // Cyberpunk towering megabuildings surrounding the rooftop
    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0x090c12,
      roughness: 0.6,
      metalness: 0.8,
    });

    const windowColors = [0x00f0ff, 0xff0055, 0xfcee0a, 0x334466];

    // Billboards data
    const billboardBrands = [
      { text: 'ARASAKA', color: '#ff003c' },
      { text: 'KANG TAO', color: '#fcee0a' },
      { text: 'TRAUMA TEAM', color: '#00f0ff' },
      { text: 'EDGERUNNER', color: '#00ff66' },
      { text: 'MILITECH', color: '#ff3300' },
      { text: 'CYBERWARE', color: '#00e5ff' },
      { text: 'BRAINDANCE', color: '#e000ff' },
    ];

    const numBuildings = 36;
    for (let i = 0; i < numBuildings; i++) {
      const angle = (i / numBuildings) * Math.PI * 2;
      const distance = 48 + (i % 5) * 12 + Math.random() * 8;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;

      const width = 12 + Math.random() * 14;
      const depth = 12 + Math.random() * 14;
      const height = 80 + (i % 6) * 30 + Math.random() * 25;

      const building = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), buildingMat);
      building.position.set(x, height / 2 - 20, z);
      this.mapGroup.add(building);

      // Lit windows strips
      const numStrips = 2 + (i % 3);
      for (let s = 0; s < numStrips; s++) {
        const stripHeight = height * (0.3 + Math.random() * 0.4);
        const stripMat = new THREE.MeshBasicMaterial({
          color: windowColors[(i + s) % windowColors.length],
        });
        const strip = new THREE.Mesh(new THREE.BoxGeometry(width * 0.15, stripHeight, depth + 0.2), stripMat);
        strip.position.set(x + (s - 1) * 3, height / 2 - 15, z);
        this.mapGroup.add(strip);
      }

      // Occasional Massive Holographic Billboard
      if (i % 4 === 0) {
        const brand = billboardBrands[(i / 4) % billboardBrands.length];
        const bCanvas = document.createElement('canvas');
        bCanvas.width = 512;
        bCanvas.height = 128;
        const bCtx = bCanvas.getContext('2d')!;

        bCtx.fillStyle = '#05070a';
        bCtx.fillRect(0, 0, 512, 128);

        bCtx.strokeStyle = brand.color;
        bCtx.lineWidth = 6;
        bCtx.strokeRect(8, 8, 496, 112);

        bCtx.fillStyle = brand.color;
        bCtx.font = '900 64px monospace';
        bCtx.textAlign = 'center';
        bCtx.textBaseline = 'middle';
        bCtx.fillText(brand.text, 256, 64);

        const bTexture = new THREE.CanvasTexture(bCanvas);
        bTexture.colorSpace = THREE.SRGBColorSpace;
        const bMat = new THREE.MeshBasicMaterial({
          map: bTexture,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide,
        });

        const bMesh = new THREE.Mesh(new THREE.PlaneGeometry(16, 4.5), bMat);
        bMesh.position.set(x * 0.85, 25 + (i % 3) * 6, z * 0.85);
        bMesh.lookAt(0, 25, 0);
        this.mapGroup.add(bMesh);
        this.neonBillboards.push(bMesh);
      }
    }
  }

  private buildAtmospherics() {
    // 1. Steam Vents
    const ventPositions = [
      new THREE.Vector3(-14, 2.4, -10),
      new THREE.Vector3(14, 2.4, -10),
      new THREE.Vector3(-14, 2.6, 12),
      new THREE.Vector3(14, 2.6, 12),
    ];

    ventPositions.forEach(pos => {
      const particleCount = 45;
      const geom = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = pos.x + (Math.random() - 0.5) * 0.6;
        positions[i * 3 + 1] = pos.y + Math.random() * 2.5;
        positions[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.6;
      }
      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color: 0x88bbdd,
        size: 0.25,
        transparent: true,
        opacity: 0.35,
      });
      const points = new THREE.Points(geom, mat);
      this.mapGroup.add(points);
      this.steamVents.push(points);
    });

    // 2. Cyberpunk Drizzle / Rain
    const rainCount = 1200;
    const rainGeom = new THREE.BufferGeometry();
    const rainPos = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPos[i * 3] = (Math.random() - 0.5) * 80;
      rainPos[i * 3 + 1] = Math.random() * 30;
      rainPos[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    rainGeom.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x4488bb,
      size: 0.08,
      transparent: true,
      opacity: 0.45,
    });
    this.rainParticles = new THREE.Points(rainGeom, rainMat);
    this.mapGroup.add(this.rainParticles);
  }

  public update(delta: number, time: number) {
    // Animate steam particles rising
    this.steamVents.forEach(vent => {
      const attr = vent.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1] += delta * 1.5;
        if (arr[i + 1] > 6) {
          arr[i + 1] = 2.4;
        }
      }
      attr.needsUpdate = true;
    });

    // Animate rain falling
    if (this.rainParticles) {
      const attr = this.rainParticles.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1] -= delta * 35;
        if (arr[i + 1] < 0) {
          arr[i + 1] = 30;
        }
      }
      attr.needsUpdate = true;
    }

    // Billboard subtle pulse
    this.neonBillboards.forEach((b, idx) => {
      if (b.material instanceof THREE.MeshBasicMaterial) {
        b.material.opacity = 0.8 + Math.sin(time * 3 + idx) * 0.15;
      }
    });
  }
}
