/**
 * AstroClaw 3D — Main Command Center Controller (Desktop & Mobile Adaptive)
 * Connects Globe3D Engine, Space API, Audio Engine, and UI Widgets.
 */
document.addEventListener('DOMContentLoaded', () => {

  // 1. Initialize 3D Engine
  const globe = new Globe3DEngine('globe-container');

  // State Management
  let currentGroup = 'starlink';
  let satellitesList = [];
  let selectedSat = null;
  let countdownInterval = null;

  // 2. Initial Data Loading
  loadConstellation(currentGroup);
  loadLaunchSchedule();
  loadSpaceWeatherChart();
  loadNasaApod();
  startUtcClock();
  initMobileDrawers();

  // -------------------------------------------------------------
  // Load & Filter Satellites
  // -------------------------------------------------------------
  async function loadConstellation(groupName) {
    const netStatusEl = document.getElementById('net-status-text');
    const satCountEl = document.getElementById('satellite-count');
    netStatusEl.textContent = 'FETCHING...';

    satellitesList = await window.spaceApi.fetchSatellites(groupName);

    netStatusEl.textContent = 'ONLINE';
    satCountEl.textContent = satellitesList.length;

    // Update 3D Scene
    globe.updateSatellites(satellitesList);

    // Update Quick Stats Panel
    if (satellitesList.length > 0) {
      const avgAlt = Math.round(satellitesList.reduce((acc, s) => acc + s.altitudeKm, 0) / satellitesList.length);
      const avgSpeed = (satellitesList.reduce((acc, s) => acc + parseFloat(s.speedKms), 0) / satellitesList.length).toFixed(2);
      document.getElementById('stat-avg-altitude').textContent = `${avgAlt} km`;
      document.getElementById('stat-avg-speed').textContent = `${avgSpeed} km/s`;
    }
  }

  // Filter Buttons Click Handling
  const filterButtons = document.querySelectorAll('#constellation-selector .btn-filter');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (window.spaceAudio) window.spaceAudio.playClick();
      currentGroup = btn.getAttribute('data-group');
      loadConstellation(currentGroup);

      // Auto close mobile left drawer after selection on small screens
      if (window.innerWidth < 1024) {
        closeLeftDrawer();
      }
    });

    btn.addEventListener('mouseenter', () => {
      if (window.spaceAudio) window.spaceAudio.playHover();
    });
  });

  // Search Filter Handling
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    if (!query) {
      globe.updateSatellites(satellitesList);
      return;
    }
    const filtered = satellitesList.filter(s => 
      s.name.toLowerCase().includes(query) || s.noradId.toString().includes(query)
    );
    globe.updateSatellites(filtered);
    document.getElementById('satellite-count').textContent = filtered.length;
  });

  // Render Checkbox Controls
  document.getElementById('chk-show-orbits').addEventListener('change', (e) => {
    globe.showOrbits = e.target.checked;
    globe.updateSatellites(satellitesList);
  });
  document.getElementById('chk-show-atmosphere').addEventListener('change', (e) => {
    if (globe.atmosphere) globe.atmosphere.visible = e.target.checked;
  });
  document.getElementById('chk-auto-rotate').addEventListener('change', (e) => {
    globe.autoRotate = e.target.checked;
  });

  // View Presets Toolbar
  document.querySelectorAll('.view-preset-toolbar .btn-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.getAttribute('data-preset');
      globe.setPresetView(preset);
    });
  });

  // -------------------------------------------------------------
  // Tooltip & Satellite Modal Callbacks
  // -------------------------------------------------------------
  const hoverTooltip = document.getElementById('sat-hover-tooltip');

  globe.onSatHoverCallback = (satData, mouseX, mouseY) => {
    if (!satData || window.innerWidth < 768) { // Hide hover tooltip on touch screens
      hoverTooltip.classList.add('hidden');
      return;
    }
    document.getElementById('tooltip-name').textContent = satData.name;
    document.getElementById('tooltip-norad').textContent = satData.noradId;
    document.getElementById('tooltip-alt').textContent = `${satData.altitudeKm} km`;

    hoverTooltip.style.left = `${mouseX + 15}px`;
    hoverTooltip.style.top = `${mouseY + 15}px`;
    hoverTooltip.classList.remove('hidden');
  };

  const modal = document.getElementById('modal-sat-detail');

  globe.onSatClickCallback = (satData) => {
    selectedSat = satData;
    document.getElementById('modal-sat-name').textContent = satData.name;
    document.getElementById('modal-sat-norad').textContent = satData.noradId;
    document.getElementById('modal-sat-intl').textContent = satData.intlDesig;
    document.getElementById('modal-sat-alt').textContent = `${satData.altitudeKm} km`;
    document.getElementById('modal-sat-speed').textContent = `${satData.speedKms} km/s`;
    document.getElementById('modal-sat-inc').textContent = `${satData.inclination.toFixed(2)}°`;
    document.getElementById('modal-sat-period').textContent = `${satData.periodMinutes} 分钟`;
    document.getElementById('modal-sat-tle').textContent = `${satData.tleLine1}\n${satData.tleLine2}`;

    modal.classList.remove('hidden');

    // Close mobile drawers if open
    closeLeftDrawer();
    closeRightDrawer();
  };

  document.getElementById('btn-close-modal').addEventListener('click', () => {
    if (window.spaceAudio) window.spaceAudio.playClick();
    modal.classList.add('hidden');
  });

  document.getElementById('btn-focus-sat').addEventListener('click', () => {
    if (selectedSat) {
      modal.classList.add('hidden');
      const satMesh = globe.satMeshList.find(m => m.userData.satData.noradId === selectedSat.noradId);
      if (satMesh) {
        globe.camera.position.set(satMesh.position.x * 1.5, satMesh.position.y * 1.5, satMesh.position.z * 1.5);
        globe.controls.target.copy(satMesh.position);
        globe.controls.update();
      }
    }
  });

  // -------------------------------------------------------------
  // Mobile Drawers & Bottom Nav Bar Controls
  // -------------------------------------------------------------
  const leftSidebar = document.getElementById('sidebar-left');
  const rightSidebar = document.getElementById('sidebar-right');

  function openLeftDrawer() {
    leftSidebar.classList.add('open');
    rightSidebar.classList.remove('open');
    if (window.spaceAudio) window.spaceAudio.playClick();
  }

  function closeLeftDrawer() {
    leftSidebar.classList.remove('open');
  }

  function openRightDrawer() {
    rightSidebar.classList.add('open');
    leftSidebar.classList.remove('open');
    if (window.spaceAudio) window.spaceAudio.playClick();
  }

  function closeRightDrawer() {
    rightSidebar.classList.remove('open');
  }

  function initMobileDrawers() {
    const btnToggleLeft = document.getElementById('btn-toggle-left-drawer');
    const btnToggleRight = document.getElementById('btn-toggle-right-drawer');
    const btnCloseLeft = document.getElementById('btn-close-left-drawer');
    const btnCloseRight = document.getElementById('btn-close-right-drawer');

    if (btnToggleLeft) btnToggleLeft.addEventListener('click', openLeftDrawer);
    if (btnToggleRight) btnToggleRight.addEventListener('click', openRightDrawer);
    if (btnCloseLeft) btnCloseLeft.addEventListener('click', closeLeftDrawer);
    if (btnCloseRight) btnCloseRight.addEventListener('click', closeRightDrawer);

    // Mobile Bottom Nav Buttons
    const btnMobGlobe = document.getElementById('btn-mob-globe');
    const btnMobSats = document.getElementById('btn-mob-sats');
    const btnMobLaunches = document.getElementById('btn-mob-launches');
    const btnMobWeather = document.getElementById('btn-mob-weather');

    if (btnMobGlobe) {
      btnMobGlobe.addEventListener('click', () => {
        closeLeftDrawer();
        closeRightDrawer();
        globe.setPresetView('reset');
      });
    }

    if (btnMobSats) {
      btnMobSats.addEventListener('click', openLeftDrawer);
    }

    if (btnMobLaunches) {
      btnMobLaunches.addEventListener('click', () => {
        openRightDrawer();
        const launchPanel = document.querySelector('.panel-card');
        if (launchPanel) launchPanel.scrollIntoView({ behavior: 'smooth' });
      });
    }

    if (btnMobWeather) {
      btnMobWeather.addEventListener('click', () => {
        openRightDrawer();
        const weatherPanel = document.querySelectorAll('.panel-card')[1];
        if (weatherPanel) weatherPanel.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }

  // -------------------------------------------------------------
  // Rocket Launch Command & Countdown Timer
  // -------------------------------------------------------------
  async function loadLaunchSchedule() {
    const launches = await window.spaceApi.fetchUpcomingLaunches();
    if (launches.length === 0) return;

    const next = launches[0];
    document.getElementById('launch-title').textContent = next.name;
    document.getElementById('launch-pad').textContent = next.pad;
    document.getElementById('launch-rocket').textContent = next.rocket;
    
    if (document.getElementById('launch-country')) {
      document.getElementById('launch-country').textContent = next.country || '🇺🇸 美国';
    }
    if (document.getElementById('launch-company')) {
      document.getElementById('launch-company').textContent = next.company || 'SpaceX';
    }

    // Start Countdown
    startLaunchCountdown(next.windowStart);

    // Populate List
    const listContainer = document.getElementById('upcoming-launch-list');
    listContainer.innerHTML = '';

    launches.slice(1).forEach(item => {
      const dateStr = new Date(item.windowStart).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      const row = document.createElement('div');
      row.className = 'launch-row p-2 rounded bg-dark-glass border border-glass flex justify-between items-center text-xs space-x-2';
      row.innerHTML = `
        <div class="truncate flex-1">
          <div class="font-bold text-light truncate text-2xs sm:text-xs">${item.name}</div>
          <div class="flex items-center gap-1.5 mt-0.5 font-mono text-3xs">
            <span class="text-cyan font-bold">${item.country || '🇺🇸 美国'}</span>
            <span class="text-dim">•</span>
            <span class="text-purple-300 font-semibold truncate">${item.company || 'SpaceX'}</span>
          </div>
        </div>
        <div class="text-right shrink-0">
          <div class="text-3xs sm:text-2xs text-gold font-mono font-bold">${dateStr}</div>
          <div class="text-3xs text-green font-mono">${item.status}</div>
        </div>
      `;
      listContainer.appendChild(row);
    });
  }

  function startLaunchCountdown(targetIsoDate) {
    if (countdownInterval) clearInterval(countdownInterval);

    const targetTime = new Date(targetIsoDate).getTime();
    const countdownEl = document.getElementById('launch-countdown');

    function updateTimer() {
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        countdownEl.textContent = '00d 00h 00m 00s (LIFTOFF!)';
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      const dStr = days.toString().padStart(2, '0');
      const hStr = hours.toString().padStart(2, '0');
      const mStr = mins.toString().padStart(2, '0');
      const sStr = secs.toString().padStart(2, '0');

      countdownEl.textContent = `${dStr}d ${hStr}h ${mStr}m ${sStr}s`;

      if (days === 0 && hours === 0 && mins === 0 && secs <= 10 && secs > 0) {
        if (window.spaceAudio) window.spaceAudio.playAlertAlarm();
      }
    }

    updateTimer();
    countdownInterval = setInterval(updateTimer, 1000);
  }

  // -------------------------------------------------------------
  // Space Weather Chart & NASA APOD
  // -------------------------------------------------------------
  async function loadSpaceWeatherChart() {
    const weather = await window.spaceApi.fetchSpaceWeather();
    document.getElementById('val-solar-flare').textContent = weather.solarFlare;
    document.getElementById('val-kp-index').textContent = weather.kpIndex;

    const ctx = document.getElementById('space-weather-chart').getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
        datasets: [{
          label: 'Kp 指数',
          data: weather.kpValues,
          borderColor: '#00f3ff',
          backgroundColor: 'rgba(0, 243, 255, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#64748b', font: { size: 9 } }, grid: { display: false } },
          y: { ticks: { color: '#64748b', font: { size: 9 } }, grid: { color: 'rgba(0, 243, 255, 0.08)' } }
        }
      }
    });
  }

  async function loadNasaApod() {
    const apod = await window.spaceApi.fetchNasaApod();
    document.getElementById('apod-title').textContent = apod.title;
    document.getElementById('apod-date').textContent = apod.date;
    if (apod.url) {
      document.getElementById('apod-img').src = apod.url;
    }
  }

  // -------------------------------------------------------------
  // Audio Controls & UTC Clock
  // -------------------------------------------------------------
  const btnToggleAudio = document.getElementById('btn-toggle-audio');
  const btnToggleAmbient = document.getElementById('btn-toggle-ambient');

  if (btnToggleAudio) {
    btnToggleAudio.addEventListener('click', () => {
      if (window.spaceAudio) {
        const isMuted = window.spaceAudio.toggleMute();
        const label = document.getElementById('audio-status-label');
        if (label) label.textContent = isMuted ? '音效: 关' : '音效: 开';
        btnToggleAudio.classList.toggle('opacity-50', isMuted);
      }
    });
  }

  let isAmbientOn = false;
  if (btnToggleAmbient) {
    btnToggleAmbient.addEventListener('click', () => {
      isAmbientOn = !isAmbientOn;
      if (window.spaceAudio) {
        window.spaceAudio.toggleAmbient(isAmbientOn);
        const label = document.getElementById('ambient-status-label');
        if (label) label.textContent = isAmbientOn ? '背景音: 开' : '背景音: 关';
        btnToggleAmbient.classList.toggle('text-purple', isAmbientOn);
      }
    });
  }

  function startUtcClock() {
    const clockEl = document.getElementById('utc-clock');
    if (!clockEl) return;
    setInterval(() => {
      const now = new Date();
      const h = now.getUTCHours().toString().padStart(2, '0');
      const m = now.getUTCMinutes().toString().padStart(2, '0');
      const s = now.getUTCSeconds().toString().padStart(2, '0');
      clockEl.textContent = `${h}:${m}:${s} UTC`;
    }, 1000);
  }

});
