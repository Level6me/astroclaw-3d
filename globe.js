/**
 * Three.js WebGL 3D Globe & Satellite Orbital Render Engine
 * Photorealistic NASA Blue Marble Earth with Balanced Space Lighting (PBR Standard Material) to prevent overexposure.
 */
class Globe3DEngine {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    
    this.earth = null;
    this.cloudsMesh = null;
    this.atmosphere = null;
    this.satelliteGroup = new THREE.Group();
    this.orbitLinesGroup = new THREE.Group();
    this.spaceportsGroup = new THREE.Group();
    
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
    this.scene.add(this.spaceportsGroup);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 14, 24);

    // 3. Renderer with SRGB Output Color Space
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 11;
    this.controls.maxDistance = 60;

    // 5. Balanced Dynamic Lighting (Prevents Overexposure Washout)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 0.95);
    sunLight.position.set(30, 20, 25);
    this.scene.add(sunLight);

    const blueRimLight = new THREE.DirectionalLight(0x00f3ff, 0.35);
    blueRimLight.position.set(-30, -10, -25);
    this.scene.add(blueRimLight);

    // 6. Build Photorealistic NASA Earth, Cloud Shell, Glow & Spaceports
    this.createStarfield();
    this.createEarth();
    this.createAtmosphere();
    this.createSpaceportMarkers();

    // 7. Event Listeners
    window.addEventListener('resize', () => this.onWindowResize());
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.renderer.domElement.addEventListener('click', (e) => this.onMouseClick(e));

    // 8. Render Loop
    this.animate();
  }

  // Create NASA Photorealistic Earth + Soft Cloud Layer
  createEarth() {
    const radius = 8;
    const geometry = new THREE.SphereGeometry(radius, 64, 64);

    // 1. Procedural Realistic Base Canvas Map (Natural Land & Ocean Tones)
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    const w = 2048;
    const h = 1024;

    // Ocean Base Layer
    const oceanGrad = ctx.createLinearGradient(0, 0, 0, h);
    oceanGrad.addColorStop(0, '#091e3a');
    oceanGrad.addColorStop(0.5, '#113254');
    oceanGrad.addColorStop(1, '#091e3a');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, w, h);

    function ll2xy(lon, lat) {
      return {
        x: ((lon + 180) / 360) * w,
        y: ((90 - lat) / 180) * h
      };
    }

    // High-Tech Grid Lines
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.18)';
    ctx.lineWidth = 1;
    ctx.font = '16px JetBrains Mono, monospace';
    ctx.fillStyle = 'rgba(0, 243, 255, 0.6)';

    const lats = [66.5, 30, 0, -30, -66.5];
    const latLabels = ['66.5°N (北极圈)', '30°N', '0° (赤道 Equator)', '30°S', '66.5°S (南极圈)'];
    lats.forEach((lat, idx) => {
      const p = ll2xy(-180, lat);
      ctx.beginPath();
      ctx.moveTo(0, p.y);
      ctx.lineTo(w, p.y);
      ctx.stroke();
      ctx.fillText(latLabels[idx], 25, p.y - 6);
    });

    const lons = [-120, -60, 0, 60, 120, 180];
    const lonLabels = ['120°W', '60°W', '0° (本初子午线)', '60°E', '120°E (东八区)', '180°'];
    lons.forEach((lon, idx) => {
      const p = ll2xy(lon, 90);
      ctx.beginPath();
      ctx.moveTo(p.x, 0);
      ctx.lineTo(p.x, h);
      ctx.stroke();
      ctx.fillText(lonLabels[idx], p.x + 6, h - 25);
    });

    // Draw Photorealistic Landmasses with Natural Tones
    function drawLandPolygon(pts, fillStyle = '#2d6a4f', strokeStyle = '#40916c') {
      ctx.fillStyle = fillStyle;
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      pts.forEach((pt, i) => {
        const p = ll2xy(pt[0], pt[1]);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Eurasia (亚欧大陆)
    drawLandPolygon([
      [10, 36], [30, 31], [45, 12], [55, 25], [70, 20], [80, 10], [100, 5], [105, 10], 
      [120, 23], [122, 30], [125, 40], [130, 43], [140, 55], [170, 65], [180, 68],
      [180, 75], [100, 78], [60, 70], [30, 70], [10, 60], [-10, 52], [-9, 38]
    ], '#2b580c', '#548c58');

    // China & East Asia (中国与东亚区域)
    drawLandPolygon([
      [75, 38], [80, 45], [90, 48], [120, 53], [131, 43], [122, 30], [120, 23], 
      [110, 20], [108, 22], [100, 21], [92, 28], [80, 28], [75, 35]
    ], '#387c2b', '#00f3ff');

    // Sahara Desert (撒哈拉沙漠)
    drawLandPolygon([
      [-17, 15], [10, 37], [35, 35], [55, 25], [45, 12], [30, 15], [10, 10]
    ], '#c49a6c', '#d4a373');

    // Central & South Africa (非洲雨林与南部)
    drawLandPolygon([
      [-17, 15], [10, 10], [30, 15], [40, -10], [33, -34], [18, -34], [12, -5], [8, 5]
    ], '#1b4332', '#2d6a4f');

    // North America (北美洲)
    drawLandPolygon([
      [-168, 65], [-140, 60], [-125, 49], [-120, 34], [-105, 20], [-80, 25], 
      [-75, 35], [-65, 44], [-60, 47], [-64, 60], [-80, 65], [-110, 69]
    ], '#2d5a27', '#40916c');

    // South America (南美洲)
    drawLandPolygon([
      [-80, 8], [-75, 11], [-60, 3], [-35, -5], [-38, -20], [-55, -35], 
      [-68, -55], [-75, -45], [-80, -4]
    ], '#1b4332', '#40916c');

    // Australia (澳大利亚)
    drawLandPolygon([
      [114, -22], [130, -12], [142, -11], [153, -28], [148, -38], [115, -35]
    ], '#b87333', '#d4a373');

    // Polar Ice Caps (南北极纯白冰盖)
    drawLandPolygon([[-180, 75], [180, 75], [180, 90], [-180, 90]], '#e0f1f7', '#ffffff');
    drawLandPolygon([[-180, -70], [180, -70], [180, -90], [-180, -90]], '#e0f1f7', '#ffffff');

    // City Lights
    ctx.fillStyle = '#ffcc00';
    const cityLights = [
      [116.4, 39.9], [121.5, 31.2], [113.2, 23.1], [114.1, 22.3],
      [-74.0, 40.7], [-118.2, 34.0], [-80.6, 28.5],
      [2.35, 48.8], [0.12, 51.5], [139.7, 35.6], [77.2, 28.6]
    ];
    cityLights.forEach(pt => {
      const p = ll2xy(pt[0], pt[1]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });

    const canvasTexture = new THREE.CanvasTexture(canvas);

    // Standard PBR Material for Smooth Non-blown-out Earth Surface
    const earthMaterial = new THREE.MeshStandardMaterial({
      map: canvasTexture,
      roughness: 0.65,
      metalness: 0.05
    });

    this.earth = new THREE.Mesh(geometry, earthMaterial);
    this.scene.add(this.earth);

    // Load NASA Photorealistic Textures
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg',
      (nasaTexture) => {
        earthMaterial.map = nasaTexture;
        earthMaterial.needsUpdate = true;
      }
    );

    textureLoader.load(
      'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_specular_2048.jpg',
      (specularTexture) => {
        earthMaterial.roughnessMap = specularTexture;
        earthMaterial.needsUpdate = true;
      }
    );

    // 3. Separate Cloud Layer Mesh (Normal Blending, No Exposure Washout)
    const cloudsGeo = new THREE.SphereGeometry(radius * 1.01, 64, 64);
    const cloudsMat = new THREE.MeshStandardMaterial({
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    this.cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat);
    this.scene.add(this.cloudsMesh);

    textureLoader.load(
      'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_clouds_2048.png',
      (cloudsTexture) => {
        cloudsMat.map = cloudsTexture;
        cloudsMat.needsUpdate = true;
      }
    );
  }

  // Create Glow Atmosphere Outer Shell
  createAtmosphere() {
    const radius = 8.32;
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

  // Create Major Spaceport Markers on Earth
  createSpaceportMarkers() {
    const ports = [
      { name: '中国文昌航天发射场', lon: 110.7, lat: 19.6, color: 0xff3366 },
      { name: '中国酒泉卫星发射中心', lon: 98.5, lat: 40.9, color: 0xff3366 },
      { name: '肯尼迪航天中心 (KSC)', lon: -80.6, lat: 28.5, color: 0x00f3ff },
      { name: '库鲁航天中心 (Kourou)', lon: -52.7, lat: 5.2, color: 0xab47bc },
      { name: '拜科努尔航天发射场', lon: 63.3, lat: 45.9, color: 0xffb400 }
    ];

    const pinGeo = new THREE.SphereGeometry(0.12, 8, 8);

    ports.forEach(port => {
      const rad = 8.05;
      const phi = (90 - port.lat) * (Math.PI / 180);
      const theta = (port.lon + 180) * (Math.PI / 180);

      const x = -(rad * Math.sin(phi) * Math.cos(theta));
      const z = (rad * Math.sin(phi) * Math.sin(theta));
      const y = (rad * Math.cos(phi));

      const pinMat = new THREE.MeshBasicMaterial({ color: port.color });
      const pin = new THREE.Mesh(pinGeo, pinMat);
      pin.position.set(x, y, z);
      this.spaceportsGroup.add(pin);
    });
  }

  // Create Background Starfield
  createStarfield() {
    const count = 2500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 350;
      positions[i + 1] = (Math.random() - 0.5) * 350;
      positions[i + 2] = (Math.random() - 0.5) * 350;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.9, transparent: true, opacity: 0.85 });
    const stars = new THREE.Points(geometry, material);
    this.scene.add(stars);
  }

  // Populate Satellites in 3D Space & Calculate Real-time Lat/Lon
  updateSatellites(satList) {
    this.satellitesData = satList;

    while (this.satelliteGroup.children.length > 0) {
      this.satelliteGroup.remove(this.satelliteGroup.children[0]);
    }
    while (this.orbitLinesGroup.children.length > 0) {
      this.orbitLinesGroup.remove(this.orbitLinesGroup.children[0]);
    }
    this.satMeshList = [];

    const satGeo = new THREE.SphereGeometry(0.13, 12, 12);

    satList.forEach((sat, index) => {
      const altScale = 8 + (sat.altitudeKm / 1000) * 1.2;
      const incRad = (sat.inclination * Math.PI) / 180;
      const raanRad = (sat.raan * Math.PI) / 180;
      const meanRad = (sat.meanAnomaly * Math.PI) / 180 + (index * 0.05);

      const x = altScale * (Math.cos(raanRad) * Math.cos(meanRad) - Math.sin(raanRad) * Math.sin(meanRad) * Math.cos(incRad));
      const y = altScale * (Math.sin(meanRad) * Math.sin(incRad));
      const z = altScale * (Math.sin(raanRad) * Math.cos(meanRad) + Math.cos(raanRad) * Math.sin(meanRad) * Math.cos(incRad));

      // Calculate Latitude & Longitude
      const r = Math.sqrt(x * x + y * y + z * z);
      const latVal = (Math.asin(y / r) * 180) / Math.PI;
      let lonVal = (Math.atan2(z, x) * 180) / Math.PI;
      if (lonVal > 180) lonVal -= 360;

      const latStr = latVal >= 0 ? `${latVal.toFixed(1)}°N` : `${Math.abs(latVal).toFixed(1)}°S`;
      const lonStr = lonVal >= 0 ? `${lonVal.toFixed(1)}°E` : `${Math.abs(lonVal).toFixed(1)}°W`;

      let locationRegion = '大海开阔洋面上空';
      if (latVal > 15 && latVal < 55 && lonVal > 73 && lonVal < 135) locationRegion = '🇨🇳 中国及周边东亚区域';
      else if (latVal > 24 && latVal < 50 && lonVal > -125 && lonVal < -66) locationRegion = '🇺🇸 北美洲大陆上空';
      else if (latVal > 35 && latVal < 71 && lonVal > -10 && lonVal < 40) locationRegion = '🇪🇺 欧洲大陆上空';
      else if (latVal > -40 && latVal < 10 && lonVal > 110 && lonVal < 155) locationRegion = '🇦🇺 澳洲与南太平洋上空';
      else if (latVal > -35 && latVal < 37 && lonVal > -20 && lonVal < 52) locationRegion = '🌍 非洲大陆上空';
      else if (latVal > 50) locationRegion = '❄️ 北极与高纬度圈';
      else if (latVal < -50) locationRegion = '❄️ 南极洲圈';

      sat.latStr = latStr;
      sat.lonStr = lonStr;
      sat.locationRegion = locationRegion;

      // Color coding by group
      let satColor = 0x00f3ff;
      if (sat.group === 'stations') satColor = 0xffb400;
      else if (sat.group === 'beidou') satColor = 0xff3366;
      else if (sat.group === 'gps-ops') satColor = 0x3b82f6;
      else if (sat.group === 'last-30-days') satColor = 0x00ff88;

      const mat = new THREE.MeshBasicMaterial({ color: satColor });
      const mesh = new THREE.Mesh(satGeo, mat);
      mesh.position.set(x, y, z);
      mesh.userData = { satData: sat, originalColor: satColor };

      this.satelliteGroup.add(mesh);
      this.satMeshList.push(mesh);

      // Create Orbit Circle Line
      if (this.showOrbits) {
        const lineMat = new THREE.LineBasicMaterial({ color: satColor, transparent: true, opacity: 0.18 });
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
    const intersectsList = this.raycaster.intersectObjects(this.satMeshList);

    if (intersectsList.length > 0) {
      const hit = intersectsList[0].object;
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
      this.camera.position.set(0, 14, 24);
      this.controls.target.set(0, 0, 0);
    } else if (preset === 'iss') {
      const issMesh = this.satMeshList.find(m => m.userData.satData.name.includes('ISS') || m.userData.satData.name.includes('CSS'));
      if (issMesh) {
        this.camera.position.set(issMesh.position.x * 1.4, issMesh.position.y * 1.4, issMesh.position.z * 1.4);
        this.controls.target.copy(issMesh.position);
      }
    } else if (preset === 'china') {
      this.camera.position.set(8, 11, 16);
      this.controls.target.set(0, 0, 0);
    } else if (preset === 'northpole') {
      this.camera.position.set(0, 28, 0.1);
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

    if (this.autoRotate && this.earth) {
      this.earth.rotation.y += 0.001;
      if (this.cloudsMesh) this.cloudsMesh.rotation.y += 0.0012;
      this.satelliteGroup.rotation.y += 0.0008;
      this.orbitLinesGroup.rotation.y += 0.0008;
      this.spaceportsGroup.rotation.y += 0.001;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

window.Globe3DEngine = Globe3DEngine;
