/**
 * Three.js WebGL 3D Globe & Satellite Orbital Render Engine
 */
class Globe3DEngine {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    
    this.earth = null;
    this.atmosphere = null;
    this.satelliteGroup = new THREE.Group();
    this.orbitLinesGroup = new THREE.Group();
    
    this.satellitesData = [];
    this.satMeshList = [];
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    this.autoRotate = true;
    this.showOrbits = true;
    this.showAtmosphere = true;
    
    this.onSatClickCallback = null;
    this.onSatHoverCallback = null;

    this.init();
  }

  init() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.add(this.satelliteGroup);
    this.scene.add(this.orbitLinesGroup);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 15, 25);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 12;
    this.controls.maxDistance = 60;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(20, 20, 20);
    this.scene.add(dirLight);

    // 6. Build Earth & Stars
    this.createStarfield();
    this.createEarth();
    this.createAtmosphere();

    // 7. Event Listeners
    window.addEventListener('resize', () => this.onWindowResize());
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.renderer.domElement.addEventListener('click', (e) => this.onMouseClick(e));

    // 8. Render Loop
    this.animate();
  }

  // Create Procedural Procedural Earth Sphere
  createEarth() {
    const radius = 8;
    const geometry = new THREE.SphereGeometry(radius, 64, 64);

    // Canvas procedural Earth texture generator for instant crisp loading
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Deep Ocean Background
    ctx.fillStyle = '#081226';
    ctx.fillRect(0, 0, 1024, 512);

    // Grid lines for high-tech HUD look
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.15)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= 1024; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    for (let y = 0; y <= 512; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }

    // Procedural continents approximation
    ctx.fillStyle = '#0f2b48';
    // North America
    ctx.beginPath(); ctx.ellipse(250, 180, 120, 70, 0, 0, Math.PI * 2); ctx.fill();
    // Eurasia / Africa
    ctx.beginPath(); ctx.ellipse(650, 190, 220, 100, 0, 0, Math.PI * 2); ctx.fill();
    // South America
    ctx.beginPath(); ctx.ellipse(320, 340, 60, 90, 0, 0, Math.PI * 2); ctx.fill();
    // Australia
    ctx.beginPath(); ctx.ellipse(820, 360, 60, 45, 0, 0, Math.PI * 2); ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.MeshPhongMaterial({
      map: texture,
      shininess: 25,
      specular: new THREE.Color(0x00f3ff)
    });

    this.earth = new THREE.Mesh(geometry, material);
    this.scene.add(this.earth);
  }

  // Create Glow Atmosphere Outer Shell
  createAtmosphere() {
    const radius = 8.3;
    const geometry = new THREE.SphereGeometry(radius, 48, 48);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide
    });
    this.atmosphere = new THREE.Mesh(geometry, material);
    this.scene.add(this.atmosphere);
  }

  // Create Background Starfield
  createStarfield() {
    const count = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 300;
      positions[i + 1] = (Math.random() - 0.5) * 300;
      positions[i + 2] = (Math.random() - 0.5) * 300;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, transparent: true, opacity: 0.8 });
    const stars = new THREE.Points(geometry, material);
    this.scene.add(stars);
  }

  // Populate Satellites in 3D Space
  updateSatellites(satList) {
    this.satellitesData = satList;

    // Clear existing meshes & orbit lines
    while (this.satelliteGroup.children.length > 0) {
      this.satelliteGroup.remove(this.satelliteGroup.children[0]);
    }
    while (this.orbitLinesGroup.children.length > 0) {
      this.orbitLinesGroup.remove(this.orbitLinesGroup.children[0]);
    }
    this.satMeshList = [];

    const satGeo = new THREE.SphereGeometry(0.12, 12, 12);

    satList.forEach((sat, index) => {
      // Calculate 3D position based on Kepler elements
      const altScale = 8 + (sat.altitudeKm / 1000) * 1.2; // 8 is earth radius
      const incRad = (sat.inclination * Math.PI) / 180;
      const raanRad = (sat.raan * Math.PI) / 180;
      const meanRad = (sat.meanAnomaly * Math.PI) / 180 + (index * 0.05);

      const x = altScale * (Math.cos(raanRad) * Math.cos(meanRad) - Math.sin(raanRad) * Math.sin(meanRad) * Math.cos(incRad));
      const y = altScale * (Math.sin(meanRad) * Math.sin(incRad));
      const z = altScale * (Math.sin(raanRad) * Math.cos(meanRad) + Math.cos(raanRad) * Math.sin(meanRad) * Math.cos(incRad));

      // Color coding by group
      let satColor = 0x00f3ff; // Default cyan
      if (sat.group === 'stations') satColor = 0xffb400; // Gold for ISS
      else if (sat.group === 'beidou') satColor = 0xff3366; // Red for Beidou
      else if (sat.group === 'gps-ops') satColor = 0x3b82f6; // Blue for GPS
      else if (sat.group === 'last-30-days') satColor = 0x00ff88; // Green for new launches

      const mat = new THREE.MeshBasicMaterial({ color: satColor });
      const mesh = new THREE.Mesh(satGeo, mat);
      mesh.position.set(x, y, z);
      mesh.userData = { satData: sat, originalColor: satColor };

      this.satelliteGroup.add(mesh);
      this.satMeshList.push(mesh);

      // Create Orbit Circle Line
      if (this.showOrbits) {
        const lineMat = new THREE.LineBasicMaterial({ color: satColor, transparent: true, opacity: 0.15 });
        const points = [];
        const segments = 64;
        for (let j = 0; j <= segments; j++) {
          const theta = (j / segments) * Math.PI * 2;
          const px = altScale * (Math.cos(raanRad) * Math.cos(theta) - Math.sin(raanRad) * Math.sin(theta) * Math.cos(incRad));
          const py = altScale * (Math.sin(theta) * Math.sin(incRad));
          const pz = altScale * (Math.sin(raanRad) * Math.cos(theta) + Math.cos(raanRad) * Math.sin(theta) * Math.cos(incRad));
          points.push(new THREE.Vector3(px, py, pz));
        }
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const orbitLine = new THREE.Line(lineGeo, lineMat);
        this.orbitLinesGroup.add(orbitLine);
      }
    });
  }

  // Mouse Move Raycasting for Tooltip Hover
  onMouseMove(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.satMeshList);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      this.container.style.cursor = 'pointer';
      if (this.onSatHoverCallback) {
        this.onSatHoverCallback(hit.userData.satData, event.clientX, event.clientY);
      }
    } else {
      this.container.style.cursor = 'default';
      if (this.onSatHoverCallback) {
        this.onSatHoverCallback(null);
      }
    }
  }

  // Mouse Click Selection
  onMouseClick(event) {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.satMeshList);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      if (window.spaceAudio) window.spaceAudio.playRadarPing();
      if (this.onSatClickCallback) {
        this.onSatClickCallback(hit.userData.satData);
      }
    }
  }

  // Camera Presets
  setPresetView(preset) {
    if (window.spaceAudio) window.spaceAudio.playClick();
    if (preset === 'reset') {
      this.camera.position.set(0, 15, 25);
      this.controls.target.set(0, 0, 0);
    } else if (preset === 'iss') {
      const issMesh = this.satMeshList.find(m => m.userData.satData.name.includes('ISS'));
      if (issMesh) {
        this.camera.position.set(issMesh.position.x * 1.4, issMesh.position.y * 1.4, issMesh.position.z * 1.4);
        this.controls.target.copy(issMesh.position);
      }
    } else if (preset === 'china') {
      this.camera.position.set(10, 12, 18);
      this.controls.target.set(0, 0, 0);
    } else if (preset === 'northpole') {
      this.camera.position.set(0, 30, 0.1);
      this.controls.target.set(0, 0, 0);
    }
    this.controls.update();
  }

  onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // Auto Rotation
    if (this.autoRotate && this.earth) {
      this.earth.rotation.y += 0.001;
      this.satelliteGroup.rotation.y += 0.0008;
      this.orbitLinesGroup.rotation.y += 0.0008;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

window.Globe3DEngine = Globe3DEngine;
