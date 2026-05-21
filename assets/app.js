// =========================
// Custom Modal System (replaces alert, confirm, prompt)
// =========================
const $ = (id) => document.getElementById(id);
const setVisible = (el, visible, display = 'block') => {
  el.style.display = visible ? display : 'none';
};

function showCustomModal(type, msg, defaultText = '') {
  return new Promise(resolve => {
    const overlay = $('custom-modal-overlay');
    const msgEl = $('custom-modal-msg');
    const inputEl = $('custom-modal-input');
    const btnOk = $('custom-modal-ok');
    const btnCancel = $('custom-modal-cancel');

    msgEl.innerHTML = msg;
    setVisible(overlay, true, 'flex');

    if (type === 'prompt') {
      setVisible(inputEl, true);
      inputEl.value = defaultText;
      setVisible(btnCancel, true);
      inputEl.focus();
    } else if (type === 'confirm') {
      setVisible(inputEl, false);
      setVisible(btnCancel, true);
    } else {
      setVisible(inputEl, false);
      setVisible(btnCancel, false);
    }

    const cleanup = () => {
      setVisible(overlay, false);
      btnOk.onclick = null;
      btnCancel.onclick = null;
    };

    btnOk.onclick = () => {
      cleanup();
      if (type === 'prompt') resolve(inputEl.value);
      else resolve(true);
    };

    btnCancel.onclick = () => {
      cleanup();
      if (type === 'prompt') resolve(null);
      else resolve(false);
    };
  });
}

window.showCustomAlert = (msg) => showCustomModal('alert', msg);
window.showCustomConfirm = (msg) => showCustomModal('confirm', msg);
window.showCustomPrompt = (msg, def) => showCustomModal('prompt', msg, def);


// =========================
// Utilities
// =========================
function pad2(n){ return String(n).padStart(2,'0'); }
function fmtYMD(d){ return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function getToday(){ return new Date(); }
function daysBetween(a, b){
  const aa = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bb = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((bb - aa) / 86400000);
}
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function norm360(d){ d = d % 360; if(d < 0) d += 360; return d; }
function signedDeltaDeg(targetDeg, currentDeg){
  let d = norm360(targetDeg) - norm360(currentDeg);
  if(d > 180) d -= 360;
  if(d < -180) d += 360;
  return d;
}
function azToCompassKR(az){
  const dirs = ["북","북북동","북동","동북동","동","동남동","남동","남남동","남","남남서","남서","서남서","서","서북서","북서","북북서"];
  const idx = Math.round((norm360(az) / 22.5)) % 16;
  return dirs[idx];
}
function getMoonPhaseEmoji(phase) {
  if (phase < 0.06) return "🌑";
  if (phase < 0.19) return "🌒";
  if (phase < 0.31) return "🌓";
  if (phase < 0.44) return "🌔";
  if (phase < 0.56) return "🌕";
  if (phase < 0.69) return "🌖";
  if (phase < 0.81) return "🌗";
  if (phase < 0.94) return "🌘";
  return "🌑";
}
function escapeHtml(str){
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function haversineKm(lat1, lon1, lat2, lon2){
  const R = 6371;
  const rad = Math.PI/180;
  const dLat = (lat2-lat1)*rad;
  const dLon = (lon2-lon1)*rad;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin(dLon/2)**2;
  return 2*R*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// =========================
// Init date
// =========================
document.getElementById('obs-date').value = fmtYMD(getToday());

// =========================
// Help toggle (persist)
// =========================
(function initHelpToggle(){
  const btn = document.getElementById('btn-help-toggle');
  const body = document.getElementById('help-body');
  const badge = document.getElementById('help-badge');
  const KEY = "mw_help_open";
  const saved = localStorage.getItem(KEY);
  let open = (saved === null) ? true : (saved === "1");
  function apply(){
    body.style.display = open ? "block" : "none";
    badge.textContent = open ? "OPEN" : "CLOSED";
    badge.style.color = open ? "#0df" : "#aaa";
    badge.style.background = open ? "rgba(0,221,255,0.10)" : "rgba(255,255,255,0.06)";
  }
  apply();
  btn.addEventListener('click', () => {
    open = !open;
    localStorage.setItem(KEY, open ? "1" : "0");
    apply();
  });
})();

// =========================
// Map init
// =========================
const map = L.map('map', { zoomControl: false }).setView([38.09, 127.07], 10);
L.control.zoom({ position: 'topleft' }).addTo(map);

let myLocation = null;
const KEY_MYLOC = "mw_my_location";

(function loadMyLoc(){
  try{
    const v = JSON.parse(localStorage.getItem(KEY_MYLOC) || "null");
    if(v && typeof v.lat==="number" && typeof v.lng==="number") myLocation = v;
  }catch(e){}
})();

function saveMyLoc(lat,lng){
  myLocation = {lat,lng};
  localStorage.setItem(KEY_MYLOC, JSON.stringify(myLocation));
}

const LocateControl = L.Control.extend({
  options: { position: 'topleft' },
  onAdd: function(map) {
    const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-locate');
    container.innerHTML = '📍';
    container.title = '내 위치로 이동 (거리 페널티 기준점도 저장)';

    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.on(container, 'click', (e) => {
      L.DomEvent.stop(e);
      if (navigator.geolocation) {
        container.innerHTML = '⌛';
        navigator.geolocation.getCurrentPosition(
          pos => {
            container.innerHTML = '📍';
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            saveMyLoc(lat, lng);
            map.setView([lat, lng], 11);
            analyzeData(lat, lng, "내 위치 (현위치)");
            if(window.innerWidth <= 768) {
              document.getElementById('ui-panel').classList.add('collapsed');
            }
          },
          err => {
            container.innerHTML = '📍';
            showCustomAlert('위치 정보를 가져올 수 없습니다. 브라우저의 위치 권한을 확인해주세요.');
          }
        );
      } else {
        showCustomAlert('이 브라우저에서는 위치 정보가 지원되지 않습니다.');
      }
    });
    return container;
  }
});
map.addControl(new LocateControl());

const standardLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' });
const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19, attribution: '&copy; CARTO' });
const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: '&copy; Esri' });
let currentBaseLayer = darkLayer;
currentBaseLayer.addTo(map);

const lightPollutionLayer = L.tileLayer(
  'https://tiles.arcgis.com/tiles/b3fMqPOmotX6SV4k/arcgis/rest/services/ArtificialSkyBrightness/MapServer/tile/{z}/{y}/{x}',
  { opacity: 0.6, maxNativeZoom: 6, maxZoom: 19, zIndex: 10 }
).addTo(map);

// =========================
// Mobile bottom sheet swipe
// =========================
(function initMobilePanelDrag(){
  const panel  = document.getElementById('ui-panel');
  const handle = document.getElementById('mobile-toggle');

  const PEEK = 54;
  const OPEN_THRESHOLD_RATIO = 0.75;
  const CLOSE_THRESHOLD_RATIO = 0.18;
  const TOP_DRAG_ZONE = 90;
  const TAP_MOVE_PX = 10;

  let startY = 0;
  let startX = 0;
  let startTranslate = 0;
  let currentTranslate = 0;
  let dragging = false;

  let tapStartX = 0, tapStartY = 0, tapActive = false;

  const isMobile = () => window.innerWidth <= 768;

  function getMaxTranslate(){
    const h = panel.getBoundingClientRect().height;
    return Math.max(0, h - PEEK);
  }
  function setTranslate(y){ panel.style.transform = `translateY(${y}px)`; }
  function clearTranslate(){ panel.style.transform = ''; }

  function expand(){
    panel.classList.remove('collapsed');
    panel.style.transition = '';
    panel.style.overflowY = 'auto';
    panel.style.webkitOverflowScrolling = 'touch';
    panel.style.touchAction = 'pan-y';
    clearTranslate();
  }
  function collapse(){
    panel.classList.add('collapsed');
    panel.style.transition = '';
    panel.style.overflowY = 'hidden';
    panel.style.webkitOverflowScrolling = 'auto';
    panel.style.touchAction = 'none';
    clearTranslate();
    panel.scrollTop = 0;
  }
  function isCollapsed(){ return panel.classList.contains('collapsed'); }

  function withinTopZone(clientY){
    const rect = panel.getBoundingClientRect();
    return clientY <= (rect.top + TOP_DRAG_ZONE);
  }
  function canStartDrag(target, clientY){
    if(!isMobile()) return false;
    if(isCollapsed()) return true;
    const isHandle = handle && (target === handle || handle.contains(target));
    const atTop = panel.scrollTop <= 0;
    return (isHandle || withinTopZone(clientY)) && atTop;
  }

  function onTouchStart(e){
    if(!isMobile()) return;
    const t = e.touches[0];
    startY = t.clientY;
    startX = t.clientX;

    if(isCollapsed()){
      tapActive = true;
      tapStartX = startX;
      tapStartY = startY;
    } else {
      tapActive = false;
    }

    if(!canStartDrag(e.target, t.clientY)) return;

    dragging = true;
    panel.style.transition = 'none';

    const maxT = getMaxTranslate();
    startTranslate = isCollapsed() ? maxT : 0;
    currentTranslate = startTranslate;

    setTranslate(currentTranslate);
    if(e.cancelable) e.preventDefault();
  }

  function onTouchMove(e){
    if(!isMobile()) return;
    const t = e.touches[0];
    const dy = t.clientY - startY;
    const dx = t.clientX - startX;

    if(tapActive && (Math.abs(dx) > TAP_MOVE_PX || Math.abs(dy) > TAP_MOVE_PX)){
      tapActive = false;
    }
    if(!dragging) return;

    const maxT = getMaxTranslate();
    if(!isCollapsed() && dy < 0){
      dragging = false;
      panel.style.transition = '';
      clearTranslate();
      return;
    }

    let next = startTranslate + dy;
    next = clamp(next, 0, maxT);

    currentTranslate = next;
    setTranslate(currentTranslate);

    if(e.cancelable) e.preventDefault();
  }

  function onTouchEnd(){
    if(!isMobile()) return;

    if(isCollapsed() && tapActive){
      expand();
      tapActive = false;
      return;
    }

    if(!dragging) return;

    dragging = false;
    panel.style.transition = '';

    const maxT = getMaxTranslate();
    if(isCollapsed()){
      const openThreshold = maxT * OPEN_THRESHOLD_RATIO;
      if(currentTranslate < openThreshold) expand();
      else collapse();
    } else {
      const closeThreshold = maxT * CLOSE_THRESHOLD_RATIO;
      if(currentTranslate > closeThreshold) collapse();
      else expand();
    }
    tapActive = false;
  }

  panel.addEventListener('touchstart', onTouchStart, { passive:false });
  panel.addEventListener('touchmove',  onTouchMove,  { passive:false });
  panel.addEventListener('touchend',   onTouchEnd,   { passive:true  });
  panel.addEventListener('touchcancel',onTouchEnd,   { passive:true  });

  handle.addEventListener('click', () => { if(!isMobile()) return; isCollapsed() ? expand() : collapse(); });
  handle.addEventListener('touchend', () => { if(!isMobile()) return; isCollapsed() ? expand() : collapse(); }, { passive:true });

  window.addEventListener('resize', () => {
    panel.style.transition = '';
    clearTranslate();
    if(isMobile()){
      if(isCollapsed()) { panel.style.overflowY='hidden'; panel.style.touchAction='none'; }
      else { panel.style.overflowY='auto'; panel.style.touchAction='pan-y'; panel.style.webkitOverflowScrolling='touch'; }
    } else {
      panel.style.overflowY = 'auto';
      panel.style.touchAction = 'auto';
    }
  });
})();

// =========================
// Favorites
// =========================
function loadFavorites() {
  const sel = document.getElementById('favorite-spots');
  sel.innerHTML = '<option value="">저장된 장소 선택...</option>';
  let favs = JSON.parse(localStorage.getItem('mw_fav_spots') || '[]');
  favs.forEach((f, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = f.name;
    sel.appendChild(opt);
  });
}
window.saveFavorite = async function(ev, lat, lng, defaultName) {
  if (ev) { ev.preventDefault(); ev.stopPropagation(); }
  let favs = JSON.parse(localStorage.getItem('mw_fav_spots') || '[]');
  let name = await showCustomPrompt("저장할 장소 이름을 입력하세요:", defaultName || '새로운 관측지');
  if (!name) return;
  favs.push({ name: name, lat: lat, lng: lng });
  localStorage.setItem('mw_fav_spots', JSON.stringify(favs));
  loadFavorites();
  showCustomAlert(`'${name}'이(가) 즐겨찾기에 저장되었습니다.`);
};
document.getElementById('favorite-spots').addEventListener('change', function(e) {
  const val = e.target.value;
  if (val === "") return;
  let favs = JSON.parse(localStorage.getItem('mw_fav_spots') || '[]');
  const spot = favs[val];
  if (spot) {
    map.setView([spot.lat, spot.lng], 11);
    analyzeData(spot.lat, spot.lng, spot.name);
    if(window.innerWidth <= 768) document.getElementById('ui-panel').classList.add('collapsed');
  }
});
document.getElementById('btn-del-fav').addEventListener('click', async function() {
  const sel = document.getElementById('favorite-spots');
  const val = sel.value;
  if (val === "") { showCustomAlert("이미지 저장 중 오류가 발생했습니다."); return; }
  let favs = JSON.parse(localStorage.getItem('mw_fav_spots') || '[]');
  const name = favs[val].name;
  if(await showCustomConfirm(`'${name}'을(를) 삭제하시겠습니까?`)) {
    favs.splice(val, 1);
    localStorage.setItem('mw_fav_spots', JSON.stringify(favs));
    loadFavorites();
    map.closePopup();
  }
});
loadFavorites();

// =========================
// Search (Nominatim) - 안정화 패치
// =========================
const elSearchStatus  = document.getElementById('search-status');
const elSearchResults = document.getElementById('search-results');
const btnClearResults = document.getElementById('btn-clear-results');
let searchAbort = null;

// ✅ 디바운스/캐시
let searchDebounceTimer = null;
const SEARCH_DEBOUNCE_MS = 900;
const SEARCH_MIN_INTERVAL_MS = 1200;
let lastSearchTs = 0;

const SEARCH_CACHE_TTL = 30 * 1000; // 30초
const searchCache = new Map(); // key -> {ts, data}

function setSearchStatus(text, color="#0df", show=true){
  elSearchStatus.style.display = show ? 'block' : 'none';
  elSearchStatus.style.color = color;
  elSearchStatus.textContent = text || "";
}
function clearSearchUI(){
  elSearchResults.innerHTML = "";
  elSearchResults.style.display = "none";
  btnClearResults.style.display = "none";
  setSearchStatus("", "#0df", false);
}
btnClearResults.addEventListener('click', clearSearchUI);

function renderSearchResults(items){
  if(!items || items.length === 0){
    clearSearchUI();
    return;
  }
  elSearchResults.innerHTML = items.map((it, idx) => {
    const main = (it.display_name || "").split(",")[0] || "결과";
    const sub = (it.display_name || "").replace(main + ",", "").trim();
    const lat = parseFloat(it.lat).toFixed(4);
    const lng = parseFloat(it.lon).toFixed(4);
    return `
      <div class="search-item" data-idx="${idx}">
        <div class="search-main">📍 ${escapeHtml(main)}</div>
        <div class="search-sub">${escapeHtml(sub || it.display_name || "")}</div>
        <div class="search-meta">
          <span>${escapeHtml(it.type || it.class || "location")}</span>
          <span>${lat}, ${lng}</span>
        </div>
      </div>
    `;
  }).join("");

  elSearchResults.style.display = "block";
  btnClearResults.style.display = "block";

  elSearchResults.onclick = (e) => {
    const item = e.target.closest('.search-item');
    if(!item) return;
    const idx = parseInt(item.dataset.idx, 10);
    const it = items[idx];
    if(!it) return;
    const lat = parseFloat(it.lat);
    const lng = parseFloat(it.lon);
    const displayName = (it.display_name || "").split(',')[0] || "선택한 위치";

    map.setView([lat, lng], 11);
    analyzeData(lat, lng, displayName);

    clearSearchUI();
    if(window.innerWidth <= 768) document.getElementById('ui-panel').classList.add('collapsed');
  };
}

async function performSearchNow() {
  const query = document.getElementById('search-input').value.trim();
  if (!query) return;

  const now = Date.now();
  if (now - lastSearchTs < SEARCH_MIN_INTERVAL_MS) {
    setSearchStatus("검색이 너무 빠릅니다. 잠시만 기다려주세요.", "#fd0", true);
    return;
  }
  lastSearchTs = now;

  const cacheKey = query.toLowerCase();
  const cached = searchCache.get(cacheKey);
  if (cached && (now - cached.ts) < SEARCH_CACHE_TTL) {
    setSearchStatus(`캐시 결과 ${cached.data.length}개 (클릭하여 이동)`, "#0df", true);
    renderSearchResults(cached.data);
    return;
  }

  const btn = document.getElementById('btn-search');
  const originalText = btn.innerText;
  btn.innerText = "⏳...";
  btn.disabled = true;
  setSearchStatus("검색 중...", "#0df", true);

  if (searchAbort) searchAbort.abort();
  searchAbort = new AbortController();

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&accept-language=ko&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      signal: searchAbort.signal,
      headers: { "Accept": "application/json" }
    });
    if (!response.ok) {
      if (response.status === 429) setSearchStatus("요청이 너무 많아요(429). 10~30초 후 다시 검색해주세요.", "#fd0", true);
      else setSearchStatus(`검색 실패(${response.status}). 네트워크/정책 이슈일 수 있어요.`, "#f55", true);
      renderSearchResults([]);
      return;
    }
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      searchCache.set(cacheKey, { ts: now, data });
      setSearchStatus(`검색 결과 ${data.length}개 (클릭하여 이동)`, "#0df", true);
      renderSearchResults(data);
    } else {
      setSearchStatus("검색 결과가 없습니다. 다른 키워드를 써보세요.", "#fd0", true);
      renderSearchResults([]);
    }
  } catch (error) {
    if (error && error.name === "AbortError") return;
    console.error("Geocoding error:", error);
    setSearchStatus("검색 중 오류가 발생했습니다. (네트워크/정책 이슈 가능)", "#f55", true);
    renderSearchResults([]);
  } finally {
    btn.innerText = originalText;
    btn.disabled = false;
  }
}

function performSearch(){
  if(searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(performSearchNow, SEARCH_DEBOUNCE_MS);
}

document.getElementById('btn-search').addEventListener('click', performSearchNow);
document.getElementById('search-input').addEventListener('keypress', (e) => { if (e.key === 'Enter') performSearchNow(); });
document.getElementById('search-input').addEventListener('input', performSearch);

// =========================
// Weather window UI
// =========================
function isWithinWeatherWindow(dateStr){
  const sel = new Date(dateStr);
  const diff = daysBetween(getToday(), sel);
  return diff >= 0 && diff <= 14;
}

// ✅ FINAL PATCH: Weather ON 복귀 시 simulate-msg(경고) 정리 + 버튼/상태 확실히 복구
function updateWeatherModeUI(){
  const dateStr = document.getElementById('obs-date').value;
  const badge = document.getElementById('mode-badge');
  const btn = document.getElementById('btn-simulate');
  const msg = document.getElementById('simulate-msg');
  const within = isWithinWeatherWindow(dateStr);

  if(within){
    badge.textContent = "MODE: Weather ON";
    badge.classList.remove('mode-no-weather');
    badge.classList.add('mode-weather');

    btn.disabled = false;
    btn.textContent = "🚀 선택한 날짜의 최적지 찾기";

    // ✅ 핵심: OFF에서 ON으로 돌아오면 남아있던 경고를 숨김
    msg.style.display = 'none';
    msg.innerText = '';
  } else {
    badge.textContent = "MODE: Weather OFF (14일 이후)";
    badge.classList.remove('mode-weather');
    badge.classList.add('mode-no-weather');

    btn.disabled = true;
    btn.textContent = "🌙 14일 이후: 날씨 없이 분석";

    msg.style.display = 'block';
    msg.style.color = '#fd0';
    msg.innerText = '⚠️ 선택 날짜가 14일 이후라 전국 최적지 시뮬레이션은 비활성화됩니다.';
  }
}

// =========================
// Compass sensor (real-time heading)
// =========================
const switchCompass = document.getElementById('switch-compass');
const headingText = document.getElementById('heading-text');
const turnText = document.getElementById('turn-text');
const compassStatus = document.getElementById('compass-status');

let compassEnabled = false;
let lastHeadingDeg = null;
let lastMWAzDeg = null;
let orientationHandler = null;

function updateCompassPanelUI(){
  switchCompass.classList.toggle('on', compassEnabled);
  switchCompass.setAttribute('aria-checked', compassEnabled ? 'true' : 'false');

  headingText.textContent = (lastHeadingDeg == null) ? "--°" : `${Math.round(lastHeadingDeg)}°`;
  if(lastHeadingDeg == null || lastMWAzDeg == null){
    turnText.textContent = "--";
  } else {
    const d = signedDeltaDeg(lastMWAzDeg, lastHeadingDeg);
    const abs = Math.round(Math.abs(d));
    if(abs < 5) turnText.textContent = "정면 ✅";
    else turnText.textContent = (d > 0) ? `오른쪽 ${abs}°` : `왼쪽 ${abs}°`;
  }

  if(!compassEnabled) {
    compassStatus.textContent = "OFF";
    compassStatus.style.color = "#aaa";
  } else {
    compassStatus.textContent = (lastHeadingDeg == null)
      ? "ON (센서 대기 중...)"
      : "ON (내비게이션처럼 안내 중)";
    compassStatus.style.color = "#0df";
  }
}

function getScreenOrientationAngle(){
  const so = screen.orientation && typeof screen.orientation.angle === 'number' ? screen.orientation.angle : null;
  if(so != null) return so;
  const w = window.orientation;
  if(typeof w === 'number') return w;
  return 0;
}

function headingFromDeviceOrientationEvent(e){
  if(typeof e.webkitCompassHeading === 'number') {
    return norm360(e.webkitCompassHeading);
  }
  if(typeof e.alpha !== 'number') return null;
  const alpha = e.alpha;
  let heading = 360 - alpha;
  const screenAngle = getScreenOrientationAngle();
  heading = heading + screenAngle;
  return norm360(heading);
}

async function enableCompass(){
  compassEnabled = true;
  lastHeadingDeg = null;
  try{
    if(typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function'){
      const res = await DeviceOrientationEvent.requestPermission();
      if(res !== 'granted'){
        compassEnabled = false;
        compassStatus.textContent = "권한 거부됨 (iOS 설정/권한 확인)";
        compassStatus.style.color = "#f55";
        updateCompassPanelUI();
        return;
      }
    }
  }catch(err){
    compassEnabled = false;
    compassStatus.textContent = "센서 권한 요청 실패";
    compassStatus.style.color = "#f55";
    updateCompassPanelUI();
    return;
  }

  orientationHandler = (e) => {
    const h = headingFromDeviceOrientationEvent(e);
    if(h == null) return;
    if(lastHeadingDeg == null){
      lastHeadingDeg = h;
    } else {
      const d = signedDeltaDeg(h, lastHeadingDeg);
      lastHeadingDeg = norm360(lastHeadingDeg + d * 0.25);
    }
    updateCompassPanelUI();
    updatePopupNavIfAny();
  };
  window.addEventListener('deviceorientation', orientationHandler, true);
  updateCompassPanelUI();
}

function disableCompass(){
  compassEnabled = false;
  if(orientationHandler){
    window.removeEventListener('deviceorientation', orientationHandler, true);
    orientationHandler = null;
  }
  lastHeadingDeg = null;
  updateCompassPanelUI();
  updatePopupNavIfAny();
}

async function toggleCompass(){
  if(compassEnabled) disableCompass();
  else await enableCompass();
}

switchCompass.addEventListener('click', toggleCompass);
switchCompass.addEventListener('keydown', (e) => {
  if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCompass(); }
});
updateCompassPanelUI();

// =========================
// Astro logic
// =========================
function getGalacticCorePosition(date, lat, lng) {
  const RA = 266.4168, Dec = -29.0078, rad = Math.PI / 180;
  const jd = (date.getTime() / 86400000) + 2440587.5;
  const d = jd - 2451545.0;
  let LST = (280.46061837 + 360.98564736629 * d + lng) % 360;
  if (LST < 0) LST += 360;
  let HA = LST - RA;
  if (HA < 0) HA += 360;

  const HA_rad = HA * rad, Dec_rad = Dec * rad, Lat_rad = lat * rad;
  const sinAlt = Math.sin(Dec_rad) * Math.sin(Lat_rad) + Math.cos(Dec_rad) * Math.cos(Lat_rad) * Math.cos(HA_rad);
  const sinAltC = clamp(sinAlt, -1, 1);
  const altRad = Math.asin(sinAltC);
  const alt = altRad / rad;
  const cosAlt = Math.cos(altRad);

  let cosAz = (Math.sin(Dec_rad) - Math.sin(Lat_rad) * sinAltC) / (Math.cos(Lat_rad) * (cosAlt || 1e-9));
  cosAz = clamp(cosAz, -1, 1);
  let az = Math.acos(cosAz) / rad;
  if (Math.sin(HA_rad) > 0) az = 360 - az;
  return { altitude: alt, azimuth: az };
}

function evaluateMoonImpact(date, lat, lng, gcAzimuth) {
  const illum = SunCalc.getMoonIllumination(date);
  const moonIllum = Math.round(illum.fraction * 100);
  const moonEmoji = getMoonPhaseEmoji(illum.phase);

  const mPos = SunCalc.getMoonPosition(date, lat, lng);
  const mAlt = mPos.altitude * 180 / Math.PI;
  let mAz = (mPos.azimuth * 180 / Math.PI) + 180;

  let azDiff = Math.abs(mAz - gcAzimuth);
  if (azDiff > 180) azDiff = 360 - azDiff;

  let isSafe = false, statusColor = "", statusText = "", timelineColor = "";
  if (mAlt < 0) {
    isSafe = true; statusColor = "#0df"; statusText = `🟢 완벽 차단 (-${Math.abs(Math.round(mAlt))}°)`; timelineColor = "#fd0";
  } else if (moonIllum < 15) {
    isSafe = true; statusColor = "#0df"; statusText = `🟢 영향 미미 (${moonIllum}%)`; timelineColor = "#fd0";
  } else {
    if (azDiff < 40 && mAlt > 0) { statusColor = "#f55"; statusText = `🔴 코어 방해 (달 겹침!)`; timelineColor = "#f00"; }
    else if (mAlt > 10) { statusColor = "#f55"; statusText = `🔴 달빛 씻김 (고도 ${Math.round(mAlt)}°)`; timelineColor = "#635"; }
    else { statusColor = "#fa0"; statusText = `🟡 저고도 간섭 주의`; timelineColor = "#c60"; }
  }
  return { isSafe, statusColor, statusText, timelineColor, moonIllum, mAlt, azDiff, moonEmoji };
}

function evaluateCloudImpact(cLow, cMid, cHigh, cTotal) {
  let isSafe = false, statusColor = "", statusText = "";
  if (cHigh >= 20) { isSafe = false; statusColor = "#f55"; statusText = `🔴 상층운 치명적`; }
  else if (cTotal >= 35) { isSafe = false; statusColor = "#f55"; statusText = `🔴 구름 많음 (관측 불가)`; }
  else if (cTotal > 15 || cHigh > 10) { isSafe = true; statusColor = "#fa0"; statusText = `🟡 약간 흐림`; }
  else { isSafe = true; statusColor = "#0df"; statusText = `🟢 쾌청`; }
  return { isSafe, statusColor, statusText };
}

function evaluateDirectionalLightPollution(lat, lng, coreAzimuth) {
  const seoulLat = 37.5665, seoulLng = 126.9780;
  const R = 6371, dLat = (seoulLat - lat) * Math.PI / 180, dLon = (seoulLng - lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat * Math.PI / 180) * Math.cos(seoulLat * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const distance = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));

  const y = Math.sin(dLon) * Math.cos(seoulLat * Math.PI / 180);
  const x = Math.cos(lat * Math.PI / 180) * Math.sin(seoulLat * Math.PI / 180) - Math.sin(lat * Math.PI / 180) * Math.cos(seoulLat * Math.PI / 180) * Math.cos(dLon);
  let bearingToSeoul = Math.atan2(y, x) * 180 / Math.PI;
  bearingToSeoul = (bearingToSeoul + 360) % 360;

  let angleDiff = Math.abs(coreAzimuth - bearingToSeoul);
  if (angleDiff > 180) angleDiff = 360 - angleDiff;

  let isSafe = true, statusColor = "", statusText = "";
  if (distance < 15) { isSafe = false; statusColor = "#f55"; statusText = `🔴 도심 내부 (전방위 광해)`; }
  else if (distance < 65 && angleDiff < 35) { isSafe = false; statusColor = "#f55"; statusText = `🔴 코어 방향 거대 광해`; }
  else if (distance < 90 && angleDiff < 45) { isSafe = true; statusColor = "#fa0"; statusText = `🟡 지평선 광해 주의`; }
  else { isSafe = true; statusColor = "#0df"; statusText = `🟢 코어 방향 어두움`; }

  const bortleClass = distance < 15 ? 8 : (distance < 30 ? 6 : (distance < 50 ? 4 : (distance < 80 ? 3 : 2)));
  return { isSafe, statusColor, statusText, bortleClass, angleDiff, distance, bearingToSeoul };
}

function calcVisibilityScore({ coreAltDeg, moonEval, cloudEval, lpEval }){
  const alt = clamp(coreAltDeg, 0, 90);
  let altScore = 0;
  if(alt <= 0) altScore = 0;
  else if(alt < 15) altScore = (alt / 15) * 70;
  else if(alt < 30) altScore = 70 + ((alt - 15) / 15) * 15;
  else if(alt < 45) altScore = 85 + ((alt - 30) / 15) * 10;
  else altScore = 95 + Math.min(5, (alt - 45) / 45 * 5);

  let penalty = 0;
  if(!moonEval.isSafe){
    penalty += (moonEval.timelineColor === "#f00") ? 45 : 25;
  }
  if(cloudEval){
    if(!cloudEval.isSafe) penalty += 40;
    else if(cloudEval.statusColor === "#fa0") penalty += 12;
  } else {
    penalty += 8;
  }
  if(!lpEval.isSafe){
    penalty += (lpEval.statusColor === "#f55") ? 28 : 12;
  }

  let score = altScore - penalty;
  return Math.round(clamp(score, 0, 100));
}

function scoreToLabel(score){
  if(score >= 85) return { txt:"S급 선명 (추천)", col:"#0f0" };
  if(score >= 70) return { txt:"A급 (괜찮음)", col:"#0df" };
  if(score >= 50) return { txt:"B급 (보정 각오)", col:"#fd0" };
  if(score >= 30) return { txt:"C급 (도전)", col:"#fa0" };
  return { txt:"D급 (비추)", col:"#f55" };
}

// =========================
// Elevation + Wind + Distance
// =========================
function elevationBonus(elevM){
  if(elevM == null || !isFinite(elevM)) return 0;
  if(elevM < 50) return -4;
  if(elevM < 300) return (elevM - 50) / 250 * 4;
  if(elevM < 900) return 4 + (elevM - 300) / 600 * 7;
  if(elevM < 1400) return 11 + (elevM - 900) / 500 * 3;
  return 14;
}

function elevationPenaltyForAccess(elevM, isGrid){
  if(!isGrid) return 0;
  if(elevM == null || !isFinite(elevM)) return 0;
  if(elevM <= 1000) return 0;
  if(elevM <= 1500) return (elevM - 1000) / 500 * 3;
  return 3.5;
}

function windPenalty(windMs, elevM){
  if(windMs == null || !isFinite(windMs)) return 0;
  const e = (elevM == null || !isFinite(elevM)) ? 0 : elevM;
  const elevFactor = clamp(1.0 + (e / 2000) * 0.5, 1.0, 1.5);
  const eff = windMs * elevFactor;

  if(eff < 3.5) return 0;
  if(eff < 5.0) return (eff - 3.5) * 2.5;
  if(eff < 7.0) return 4 + (eff - 5.0) * 4.5;
  if(eff < 9.0) return 13 + (eff - 7.0) * 6.0;
  return 25 + (eff - 9.0) * 8.0;
}

function distancePenaltyKm(distKm){
  if(distKm == null || !isFinite(distKm)) return 0;
  if(distKm <= 30) return 0;
  if(distKm <= 120) return (distKm - 30) / 90 * 10;
  if(distKm <= 250) return 10 + (distKm - 120) / 130 * 18;
  return 28 + clamp((distKm - 250) / 250 * 10, 0, 10);
}

// ✅ 육지 억제 강화(낮은 해발 소프트 페널티)
function lowElevationSeaLikePenalty(elevM, isGrid){
  if(elevM == null || !isFinite(elevM)) return 0;
  if(elevM < 2) return isGrid ? 18 : 10;
  if(elevM < 8) return isGrid ? 12 : 6;
  if(elevM < 20) return isGrid ? 6 : 3;
  return 0;
}

function isLikelyLand(elevM){
  if(elevM == null || !isFinite(elevM)) return true;
  return elevM >= 3;
}

// =========================
// Compass popup UI helpers
// =========================
function buildCompassSvgHtml(idPrefix, mwAzDeg){
  const mwArrowId = `${idPrefix}-mwArrow`;
  const navArrowId = `${idPrefix}-navArrow`;
  const navTextId = `${idPrefix}-navText`;

  return `
    <div class="card" style="margin-top:0;">
      <div class="row" style="align-items:flex-start;">
        <div style="flex:0 0 76px;">
          <svg width="76" height="76" viewBox="0 0 64 64" aria-label="나침반" style="display:block;">
            <defs>
              <filter id="${idPrefix}-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.2" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <circle cx="32" cy="32" r="30" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>
            <text x="32" y="12" text-anchor="middle" font-size="9" fill="#bbb" font-weight="800">N</text>
            <text x="54" y="35" text-anchor="middle" font-size="9" fill="#bbb" font-weight="800">E</text>
            <text x="32" y="58" text-anchor="middle" font-size="9" fill="#bbb" font-weight="800">S</text>
            <text x="10" y="35" text-anchor="middle" font-size="9" fill="#bbb" font-weight="800">W</text>
            <g id="${mwArrowId}" transform="rotate(${mwAzDeg} 32 32)" filter="url(#${idPrefix}-glow)">
              <path d="M32 10 L38 30 L32 26 L26 30 Z" fill="#ff00ff"/>
              <circle cx="32" cy="32" r="2.4" fill="#ff00ff"/>
            </g>
            <g id="${navArrowId}" transform="rotate(0 32 32)" filter="url(#${idPrefix}-glow)" opacity="0.0">
              <path d="M32 12 L36 26 L32 23 L28 26 Z" fill="#0df"/>
              <circle cx="32" cy="32" r="2.2" fill="#0df"/>
            </g>
          </svg>
        </div>
        <div style="flex:1; min-width:0;">
          <div style="font-weight:1000; font-size:14px; color:#fff;">
            🧭 방향:
            <span style="color:#ff77ff">${azToCompassKR(mwAzDeg)}</span>
            <span style="color:#aaa; font-weight:700;">(${Math.round(norm360(mwAzDeg))}°)</span>
          </div>
          <div class="muted" style="margin-top:6px;">
            보라색 화살표 쪽이 <b>코어 방향</b>입니다.
          </div>
          <div class="card" style="padding:8px; margin-top:10px;">
            <div class="row-between">
              <div class="tiny">실시간 안내</div>
              <div class="tiny" id="${navTextId}" style="color:#0df; font-weight:900;">OFF</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function applyNavToPopup(idPrefix, mwAzDeg){
  const navArrow = document.getElementById(`${idPrefix}-navArrow`);
  const navText = document.getElementById(`${idPrefix}-navText`);
  if(!navArrow || !navText) return;

  if(!compassEnabled || lastHeadingDeg == null){
    navArrow.setAttribute("opacity", "0.0");
    navArrow.setAttribute("transform", "rotate(0 32 32)");
    navText.textContent = "OFF";
    navText.style.color = "#aaa";
    return;
  }

  const delta = signedDeltaDeg(mwAzDeg, lastHeadingDeg);
  const abs = Math.round(Math.abs(delta));
  navArrow.setAttribute("opacity", "1.0");
  navArrow.setAttribute("transform", `rotate(${delta} 32 32)`);

  if(abs < 5){
    navText.textContent = "정면 ✅";
    navText.style.color = "#0f0";
  } else {
    navText.textContent = (delta > 0) ? `오른쪽 ${abs}°` : `왼쪽 ${abs}°`;
    navText.style.color = "#0df";
  }
}

function updatePopupNavIfAny(){
  if(window.__lastPopupCompassPrefix && lastMWAzDeg != null){
    applyNavToPopup(window.__lastPopupCompassPrefix, lastMWAzDeg);
  }
}

// =========================
// Analyze / popup logic
// =========================
let analyzeSeq = 0;
let marker = null, coreLine = null, currentLat = null, currentLng = null;

function findHourlyIndex(hourlyTimes, dateStr, hour){
  if (!Array.isArray(hourlyTimes)) return -1;
  const target = `${dateStr}T${pad2(hour)}:00`;
  return hourlyTimes.indexOf(target);
}

async function analyzeData(lat, lng, spotName=null){
  const mySeq = ++analyzeSeq;
  currentLat = lat; currentLng = lng;

  if (marker) map.removeLayer(marker);
  if (coreLine) map.removeLayer(coreLine);

  marker = L.marker([lat, lng]).addTo(map);
  marker.bindPopup("\uAD00\uCE21 \uC870\uAC74 \uBD84\uC11D \uC911...").openPopup();

  const dateStr = document.getElementById('obs-date').value;
  const selectedHour = parseInt(document.getElementById('obs-time').value, 10);
  const selectedDate = new Date(dateStr);
  selectedDate.setHours(selectedHour, 0, 0, 0);

  const timelineStart = new Date(dateStr);
  timelineStart.setHours(18,0,0,0);

  const withinWeather = isWithinWeatherWindow(dateStr);
  let weatherHourly = null;
  let isWeatherAvailable = false;
  let weatherWarningHtml = "";
  let elevationM = null;

  if(withinWeather){
    try{
      const weatherUrl =
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
        `&hourly=cloudcover,cloudcover_low,cloudcover_mid,cloudcover_high,temperature_2m,dewpoint_2m,windspeed_10m` +
        `&wind_speed_unit=ms&timezone=auto&start_date=${dateStr}&end_date=${dateStr}`;

      const response = await fetch(weatherUrl);
      if(response.ok){
        const weatherData = await response.json();
        elevationM = (typeof weatherData.elevation === "number") ? weatherData.elevation : null;

        if(weatherData.hourly && weatherData.hourly.time && weatherData.hourly.cloudcover){
          weatherHourly = weatherData.hourly;
          isWeatherAvailable = true;

          const idx = findHourlyIndex(weatherHourly.time, dateStr, selectedHour);
          if(idx >= 0){
            const temp = weatherHourly.temperature_2m[idx];
            const dew  = weatherHourly.dewpoint_2m[idx];
            const wind = weatherHourly.windspeed_10m[idx];

            const wPen = windPenalty(wind, elevationM);
            const wText =
              (wPen < 4) ? '<span class="safe-text">✅ 안정</span>' :
              (wPen < 12) ? '<span class="warning-text">⚠️ 흔들림 주의</span>' :
              '<span class="warning-text">🛑 강풍 리스크</span>';

            const elevTxt = (elevationM==null) ? "?" : Math.round(elevationM);

            weatherWarningHtml = `
              <div class="card" style="margin-top:8px;">
                <div class="tiny">날씨 & 리스크</div>
                <div style="font-size:12px; margin-top:4px;">
                  <b>⛰️ 해발:</b> ${elevTxt}m<br>
                  <b>🌡️ 기온/이슬점:</b> ${temp}°C / ${dew}°C &nbsp;👉 ${(temp - dew) <= 2 ? '<span class="warning-text">💧 결로 주의</span>' : '<span class="safe-text">✅ 안전</span>'}<br>
                  <div style="margin-top:2px;"><b>💨 풍속(10m):</b> ${wind}m/s &nbsp;👉 ${wText}</div>
                </div>
              </div>
            `;
          }
        }
      }
    } catch(e){ console.log("기상 데이터 로드 실패", e); }
  }

  function getCloudEvalForDate(d){
    if(!isWeatherAvailable || !weatherHourly) return null;
    const h = d.getHours();
    const idx = findHourlyIndex(weatherHourly.time, dateStr, h);
    if(idx < 0) return null;
    const cTotal = weatherHourly.cloudcover[idx];
    const cLow   = weatherHourly.cloudcover_low[idx];
    const cMid   = weatherHourly.cloudcover_mid[idx];
    const cHigh  = weatherHourly.cloudcover_high[idx];
    return { eval: evaluateCloudImpact(cLow, cMid, cHigh, cTotal), cTotal, cLow, cMid, cHigh };
  }

  // timeline bar
  let timelineBarHtml = '<div style="display:flex; width:100%; height:16px; border-radius:6px; overflow:hidden; margin:8px 0; border: 1px solid #555;">';
  let timelineLabelHtml = '<div style="display:flex; justify-content:space-between; color:#888; font-size:10px; padding:0 2px;">';

  for (let i=0;i<48;i++){
    const t = new Date(timelineStart.getTime() + i * 900000);
    const gc = getGalacticCorePosition(t, lat, lng);
    const moonEval = evaluateMoonImpact(t, lat, lng, gc.azimuth);
    let bg = '#222';
    if (gc.altitude > 0){
      if (gc.altitude < 15) bg = '#06a';
      else bg = moonEval.isSafe ? '#fd0' : moonEval.timelineColor;
    }
    timelineBarHtml += `<div style="flex:1; background:${bg};"></div>`;
  }
  timelineBarHtml += '</div>';
  for (let i=0;i<=12;i+=3){
    const tHour = (18 + i) % 24;
    timelineLabelHtml += `<span>${pad2(tHour)}h</span>`;
  }
  timelineLabelHtml += '</div>';

  // best visibility scan
  const scanStart = new Date(dateStr); scanStart.setHours(18,0,0,0);
  const scanEnd = new Date(scanStart.getTime() + 12*60*60*1000);

  let bestVTime = null;
  let bestVScore = -1;
  let bestWindowStart = null, bestWindowEnd = null;

  for(let t=scanStart.getTime(); t<=scanEnd.getTime(); t += 20*60000){
    const d = new Date(t);
    const gc = getGalacticCorePosition(d, lat, lng);
    const moonEval = evaluateMoonImpact(d, lat, lng, gc.azimuth);
    const lpEval = evaluateDirectionalLightPollution(lat, lng, gc.azimuth);
    const cloudPack = getCloudEvalForDate(d);
    const cloudEval = cloudPack ? cloudPack.eval : null;

    const score = calcVisibilityScore({ coreAltDeg: gc.altitude, moonEval, cloudEval, lpEval });
    if(gc.altitude > 0 && score > bestVScore){
      bestVScore = score;
      bestVTime = new Date(d);
    }
  }

  if(bestVTime && bestVScore >= 0){
    const thresholdScore = Math.max(0, Math.round(bestVScore * 0.85));
    let inSeg = false;

    for(let t=scanStart.getTime(); t<=scanEnd.getTime(); t += 20*60000){
      const d = new Date(t);
      const gc = getGalacticCorePosition(d, lat, lng);
      if(gc.altitude < 15) { inSeg = false; continue; }

      const moonEval = evaluateMoonImpact(d, lat, lng, gc.azimuth);
      const lpEval = evaluateDirectionalLightPollution(lat, lng, gc.azimuth);
      const cloudPack = getCloudEvalForDate(d);
      const cloudEval = cloudPack ? cloudPack.eval : null;

      const score = calcVisibilityScore({ coreAltDeg: gc.altitude, moonEval, cloudEval, lpEval });
      if(score >= thresholdScore){
        if(!inSeg){
          inSeg = true;
          if(!bestWindowStart) bestWindowStart = new Date(d);
        }
        bestWindowEnd = new Date(d);
      } else {
        inSeg = false;
      }
    }
  }

  const fmtTime = (d)=> d ? `${pad2(d.getHours())}:${pad2(d.getMinutes())}` : null;

  const gcPos = getGalacticCorePosition(selectedDate, lat, lng);
  const moonEvalCurrent = evaluateMoonImpact(selectedDate, lat, lng, gcPos.azimuth);
  const lpEval = evaluateDirectionalLightPollution(lat, lng, gcPos.azimuth);

  let cloudEvalCurrent = null;
  let cTotal=0, cLow=0, cMid=0, cHigh=0;
  let windNow = null;
  if(isWeatherAvailable && weatherHourly){
    const idx = findHourlyIndex(weatherHourly.time, dateStr, selectedHour);
    if(idx >= 0){
      cTotal = weatherHourly.cloudcover[idx];
      cLow   = weatherHourly.cloudcover_low[idx];
      cMid   = weatherHourly.cloudcover_mid[idx];
      cHigh  = weatherHourly.cloudcover_high[idx];
      windNow = (weatherHourly.windspeed_10m ? weatherHourly.windspeed_10m[idx] : null);
      cloudEvalCurrent = evaluateCloudImpact(cLow, cMid, cHigh, cTotal);
    }
  }

  const visibilityScore = calcVisibilityScore({
    coreAltDeg: gcPos.altitude,
    moonEval: moonEvalCurrent,
    cloudEval: cloudEvalCurrent,
    lpEval
  });
  const vLabel = scoreToLabel(visibilityScore);

  const az = norm360(gcPos.azimuth);
  lastMWAzDeg = az;

  if (gcPos.altitude > 0){
    const dist = 0.5;
    const endLat = lat + dist * Math.cos(az * Math.PI / 180);
    const endLng = lng + dist * Math.sin(az * Math.PI / 180) / Math.cos(lat * Math.PI / 180);
    coreLine = L.polyline([[lat,lng],[endLat,endLng]], { color:'#ff00ff', weight:4, dashArray:'5,10', opacity:0.8 }).addTo(map);
  }

  if (mySeq !== analyzeSeq) return;

  const isCoreSafe = (gcPos.altitude >= 10);
  let goTitle="", goBg="", goBorder="";
  if(isWeatherAvailable && cloudEvalCurrent){
    if(moonEvalCurrent.isSafe && cloudEvalCurrent.isSafe && isCoreSafe && lpEval.isSafe){
      goTitle="🟢 무조건 GO! (짐 싸세요)"; goBg="rgba(0,255,100,0.2)"; goBorder="#0f0";
    } else if(!cloudEvalCurrent.isSafe || (!moonEvalCurrent.isSafe && moonEvalCurrent.statusColor==="#f55") || (!lpEval.isSafe && lpEval.statusColor==="#f55")){
      goTitle="🔴 NO-GO (집에서 보정하세요)"; goBg="rgba(255,50,50,0.2)"; goBorder="#f55";
    } else {
      goTitle="🟡 HOLD (부분적 간섭 / 대기)"; goBg="rgba(255,200,0,0.2)"; goBorder="#fa0";
    }
  } else {
    if(moonEvalCurrent.isSafe && isCoreSafe && lpEval.isSafe){
      goTitle="🟡 GO 가능 (날씨 미확인)"; goBg="rgba(255,200,0,0.2)"; goBorder="#fd0";
    } else {
      goTitle="⚪ 데이터 부족/리스크 (날씨 모름)"; goBg="rgba(150,150,150,0.2)"; goBorder="#aaa";
    }
  }

  const rCloud = (!cloudEvalCurrent)
    ? `\uB0A0\uC528 \uC608\uBCF4 \uC5C6\uC74C`
    : `<span><b style="color:${cloudEvalCurrent.statusColor}">${cloudEvalCurrent.statusText}</b> <span class="cloud-detail">(상${cHigh}%)</span></span>`;

  const rMoon = `<span><span style="font-size:16px; vertical-align:middle; margin-right:4px;">${moonEvalCurrent.moonEmoji}</span><b style="color:${moonEvalCurrent.statusColor}">${moonEvalCurrent.statusText}</b></span>`;
  const rCore = isCoreSafe ? `<span style="color:#0df">고도 ${Math.round(gcPos.altitude)}°</span>` : `<span style="color:#f55">고도 ${Math.round(gcPos.altitude)}° (낮음)</span>`;
  const rLP   = `<span><b style="color:${lpEval.statusColor}">${lpEval.statusText}</b></span>`;

  const elevTxt = (elevationM==null) ? "?" : Math.round(elevationM);
  const windTxt = (windNow==null) ? "?" : windNow;
  const wPen = (windNow==null) ? 0 : windPenalty(windNow, elevationM);
  const wLabel =
    (windNow==null) ? `<span style="color:#aaa">데이터 없음</span>` :
    (wPen < 4) ? `<span style="color:#55ff55">✅ 안정</span>` :
    (wPen < 12) ? `<span style="color:#fd0">⚠️ 흔들림 주의</span>` :
    `<span style="color:#ff5555">🛑 강풍 리스크</span>`;

  const titleHtml = spotName ? `<b>?? ${escapeHtml(spotName)}</b><br>` : `<b>?? \uC120\uD0DD\uD55C \uAD00\uCE21 \uD6C4\uBCF4\uC9C0</b> (${lat.toFixed(3)}, ${lng.toFixed(3)})<br>`;
  const safeSpotName = spotName ? spotName.replace(/'/g, "\\'") : '';

  const compassPrefix = `cmp${Date.now()}${Math.floor(Math.random()*1000)}`;
  window.__lastPopupCompassPrefix = compassPrefix;
  const compassHtml = buildCompassSvgHtml(compassPrefix, az);

  const bestTimeText = bestVTime ? `${fmtTime(bestVTime)} (점수 ${bestVScore}/100)` : "계산 불가";
  const bestWindowText = (bestWindowStart && bestWindowEnd)
    ? `${fmtTime(bestWindowStart)} ~ ${fmtTime(bestWindowEnd)}`
    : "조건 미달";

  const visibilityBox = `
    <div class="mw-window-box" style="margin-top:10px; padding:10px;">
      <div class="row-between">
        <div style="font-size:14px; font-weight:1000; color:#fff;">\uCD08\uBCF4\uC790 \uAD00\uCE21 \uC810\uC218</div>
        <div style="font-weight:1000; color:${vLabel.col};">${visibilityScore}/100</div>
      </div>
      <div style="margin-top:4px; color:${vLabel.col}; font-weight:1000;">${vLabel.txt}</div>
      <div class="tiny" style="margin-top:6px; color:#888;">고도 ${elevTxt}m · 바람 ${windTxt}m/s (${escapeHtml(wLabel.replace(/<[^>]*>/g,""))})
      </div>
    </div>
  `;

  const timelineContent = `
    <div class="mw-window-box" style="margin-bottom:0; border:none; background:transparent; padding:0;">
      <div style="font-weight:1000; color:#fff; text-align:center; margin-bottom:6px;">\uC740\uD558\uC218 \uAD00\uCE21 \uAC00\uB2A5 \uC2DC\uAC04</div>
      ${timelineBarHtml}
      ${timelineLabelHtml}
      <div class="timeline-legend">
        <div class="legend-item"><div class="legend-box" style="background:#06a;"></div>은하수 낮음</div>
        <div class="legend-item"><div class="legend-box" style="background:#635;"></div>달빛 간섭</div>
        <div class="legend-item"><div class="legend-box" style="background:#c60;"></div>낮은 고도</div>
        <div class="legend-item"><div class="legend-box" style="background:#f00;"></div>달 겹침</div>
        <div class="legend-item"><div class="legend-box" style="background:#fd0;"></div><b style="color:#fd0;">추천</b></div>
      </div>
      <hr style="border-top:1px dashed #555; margin:10px 0;">
      <div style="font-size:12px; color:#ddd; line-height:1.45; text-align:center;">
        <b>\uAC00\uC7A5 \uC88B\uC740 \uC2DC\uAC04:</b> <span style="color:#0df; font-weight:1000;">${bestTimeText}</span><br>
        <div style="margin-top:4px;"><b>\uCD94\uCC9C \uC2DC\uAC04\uB300:</b> <span style="color:#fd0; font-weight:1000;">${bestWindowText}</span></div>
      </div>
    </div>
  `;

  let popupText = `
    <div style="font-size: 13px; line-height: 1.6; padding-bottom:5px;">
      ${titleHtml}
      <span style="color:#aaa; font-size:11px;">\uAE30\uC900 \uC2DC\uAC04: ${dateStr} ${pad2(selectedHour)}:00</span><br>

      ${visibilityBox}

      <div class="gonogo-box" style="background:${goBg}; border:1px solid ${goBorder}; margin-top:8px;">
        <div class="gonogo-title" style="color:${goBorder}">${goTitle}</div>
        <div class="gonogo-item"><span><b>\uB2EC</b></span> ${rMoon}</div>
        <div class="gonogo-item"><span><b>\uAD6C\uB984</b></span> ${rCloud}</div>
        <div class="gonogo-item"><span><b>\uC740\uD558\uC218 \uACE0\uB3C4</b></span> ${rCore}</div>
        <div class="gonogo-item"><span><b>\uBE5B\uACF5\uD574</b></span> ${rLP}</div>
        <div class="gonogo-item"><span><b>\uBC14\uB78C</b></span> ${wLabel}</div>
      </div>

      ${(isWeatherAvailable && weatherWarningHtml) ? weatherWarningHtml : ''}

      <details class="popup-details">
        <summary class="popup-summary">시간대 자세히 보기</summary>
        <div class="popup-details-content">
          ${timelineContent}
        </div>
      </details>

      <details class="popup-details">
        <summary class="popup-summary">은하수 방향 보기</summary>
        <div class="popup-details-content">
          ${compassHtml}
        </div>
      </details>

      <button class="btn-capture" onclick="capturePopup(event, this)">\uACB0\uACFC \uC774\uBBF8\uC9C0\uB85C \uC800\uC7A5</button>
      <button class="btn-favorite" onclick="saveFavorite(event, ${lat}, ${lng}, '${safeSpotName}')">\uC774 \uC7A5\uC18C \uC800\uC7A5</button>
    </div>
  `;

  marker.bindPopup(popupText).openPopup();

  const popupNode = marker.getPopup().getElement();
  if(popupNode) {
    const detailsElements = popupNode.querySelectorAll('details');
    detailsElements.forEach(d => {
      d.addEventListener('toggle', () => { marker.getPopup().update(); });
    });
  }

  applyNavToPopup(compassPrefix, az);
  updateCompassPanelUI();
}

window.capturePopup = function(ev, btnElement) {
  if (ev) { ev.preventDefault(); ev.stopPropagation(); }

  const popupEl = document.querySelector('.leaflet-popup');
  if (!popupEl) return;

  popupEl.addEventListener('click', (e) => { e.stopPropagation(); }, { once: true });

  const originalText = btnElement.innerText;
  btnElement.innerText = "이미지 저장 중...";
  btnElement.style.pointerEvents = "none";

  html2canvas(popupEl, {
    backgroundColor: "#1e1e1e",
    scale: 2,
    useCORS: true
  }).then(canvas => {
    const dateStr = document.getElementById('obs-date').value;
    const link = document.createElement('a');
    link.download = `MilkyWay_result_${dateStr}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();

    btnElement.innerText = originalText;
    btnElement.style.pointerEvents = "auto";
  }).catch(err => {
    showCustomAlert("이미지 저장 중 오류가 발생했습니다.");
    btnElement.innerText = originalText;
    btnElement.style.pointerEvents = "auto";
    console.error(err);
  });
};

// =========================
// Best date
// =========================
function calculateBestDate(){
  let bestDate=null, minFraction=1.0, bestEmoji="🌑";
  for(let i=0;i<=30;i++){
    const testD = new Date();
    testD.setDate(testD.getDate() + i);
    testD.setHours(12,0,0,0);
    const moon = SunCalc.getMoonIllumination(testD);
    if(moon.fraction < minFraction){
      minFraction = moon.fraction;
      bestDate = testD;
      bestEmoji = getMoonPhaseEmoji(moon.phase);
    }
  }
  if(bestDate){
    const bY = bestDate.getFullYear(), bM = pad2(bestDate.getMonth()+1), bD = pad2(bestDate.getDate());
    const bestStr = `${bY}-${bM}-${bD}`;
    document.getElementById('best-date-box').innerHTML = `
      <div style="font-size:16px; font-weight:1000; color:#0df;">${bY}년 ${bM}월 ${bD}일</div>
      <div style="font-size:13px; color:#aaa; margin-top:4px;">${bestEmoji} 예상 달빛: ${Math.round(minFraction*100)}%</div>
      <div class="tiny" style="margin-top:6px; color:#777;">클릭하여 날짜 적용</div>
    `;
    document.getElementById('best-date-box').style.cursor = "pointer";
    document.getElementById('best-date-box').onclick = function(){
      document.getElementById('obs-date').value = bestStr;
      updateWeatherModeUI();
      if(currentLat!=null) analyzeData(currentLat, currentLng);
    };
  }
}
calculateBestDate();

// =========================
// Weather fetch pack (with tiny cache)
// =========================
const WEATHER_CACHE_TTL = 10 * 60 * 1000; // 10분
const weatherCache = new Map(); // key: `${lat},${lng},${dateStr}` -> {ts, pack}

async function fetchWeatherPack(lat, lng, dateStr){
  const key = `${lat.toFixed(4)},${lng.toFixed(4)},${dateStr}`;
  const now = Date.now();
  const cached = weatherCache.get(key);
  if(cached && (now - cached.ts) < WEATHER_CACHE_TTL) return cached.pack;

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&hourly=cloudcover,cloudcover_low,cloudcover_mid,cloudcover_high,windspeed_10m` +
    `&wind_speed_unit=ms&timezone=auto&start_date=${dateStr}&end_date=${dateStr}`;
  const res = await fetch(url);
  if(!res.ok) return null;
  const data = await res.json();
  if(!data.hourly || !data.hourly.time) return null;
  const elev = (typeof data.elevation === "number") ? data.elevation : null;
  const pack = { hourly: data.hourly, elevation: elev };
  weatherCache.set(key, {ts: now, pack});
  return pack;
}

// =========================
// Spot scoring
// =========================
function computeSpotScoreAtHour(spot, dateStr, hour, weatherPack, baseLoc){
  const { lat, lng } = spot;
  const isGrid = !!spot.isGrid;

  const hourly = weatherPack ? weatherPack.hourly : null;
  const elevM = weatherPack ? weatherPack.elevation : null;

  const idx = hourly ? findHourlyIndex(hourly.time, dateStr, hour) : -1;

  let cTotal=0, cLow=0, cMid=0, cHigh=0;
  let windMs = null;
  let cloudEval = null;

  if(idx >= 0){
    cTotal = hourly.cloudcover[idx];
    cLow   = hourly.cloudcover_low[idx];
    cMid   = hourly.cloudcover_mid[idx];
    cHigh  = hourly.cloudcover_high[idx];
    windMs = (hourly.windspeed_10m ? hourly.windspeed_10m[idx] : null);
    cloudEval = evaluateCloudImpact(cLow, cMid, cHigh, cTotal);
  }

  const d = new Date(dateStr); d.setHours(hour,0,0,0);
  const gcPos = getGalacticCorePosition(d, lat, lng);
  const moonEval = evaluateMoonImpact(d, lat, lng, gcPos.azimuth);

  const lpEval = evaluateDirectionalLightPollution(lat, lng, gcPos.azimuth);

  const vis = calcVisibilityScore({
    coreAltDeg: gcPos.altitude,
    moonEval,
    cloudEval,
    lpEval
  });

  let penalty = 0;
  if(idx >= 0){
    penalty += cHigh * 0.35;
    penalty += cTotal * 0.05;
  } else {
    penalty += 8;
  }
  if(!moonEval.isSafe) penalty += (moonEval.timelineColor === "#f00") ? 35 : 18;
  if(!lpEval.isSafe) penalty += (lpEval.statusColor === "#f55") ? 22 : 10;
  if(gcPos.altitude <= 0) penalty += 35;

  const elevBonus = elevationBonus(elevM);
  const elevPenalty = elevationPenaltyForAccess(elevM, isGrid);
  const wPen = windPenalty(windMs, elevM);
  const seaPen = lowElevationSeaLikePenalty(elevM, isGrid);

  let distKm = null;
  let dPen = 0;
  if(baseLoc && typeof baseLoc.lat==="number" && typeof baseLoc.lng==="number"){
    distKm = haversineKm(baseLoc.lat, baseLoc.lng, lat, lng);
    dPen = distancePenaltyKm(distKm);
  }

  const score = Math.round(clamp(vis - penalty + elevBonus - elevPenalty - wPen - dPen - seaPen, 0, 100));

  return {
    score, hour, elevation: elevM, windMs, distKm,
    detail: { vis, penalty, elevBonus, elevPenalty, wPen, dPen, seaPen, cTotal, cHigh, alt: gcPos.altitude }
  };
}

// ✅ 1차 컷(날씨 없이)
function computeRoughScoreAtHour(spot, dateStr, hour, baseLoc){
  const { lat, lng } = spot;
  const isGrid = !!spot.isGrid;

  const d = new Date(dateStr); d.setHours(hour,0,0,0);
  const gcPos = getGalacticCorePosition(d, lat, lng);
  const moonEval = evaluateMoonImpact(d, lat, lng, gcPos.azimuth);
  const lpEval = evaluateDirectionalLightPollution(lat, lng, gcPos.azimuth);

  const vis = calcVisibilityScore({
    coreAltDeg: gcPos.altitude,
    moonEval,
    cloudEval: null,
    lpEval
  });

  let penalty = 0;
  if(!moonEval.isSafe) penalty += (moonEval.timelineColor === "#f00") ? 30 : 14;
  if(!lpEval.isSafe) penalty += (lpEval.statusColor === "#f55") ? 18 : 8;
  if(gcPos.altitude <= 0) penalty += 35;

  let distKm = null;
  let dPen = 0;
  if(baseLoc && typeof baseLoc.lat==="number" && typeof baseLoc.lng==="number"){
    distKm = haversineKm(baseLoc.lat, baseLoc.lng, lat, lng);
    dPen = distancePenaltyKm(distKm);
  }

  const gridSoft = isGrid ? 2.5 : 0;

  const score = Math.round(clamp(vis - penalty - dPen - gridSoft, 0, 100));
  return { score, hour, distKm, alt: gcPos.altitude };
}

const fixedSpots = [
  { region: "강원", name: "강릉 안반데기", address: "강원 강릉시 왕산면 안반데기길", lat: 37.6150, lng: 128.8230 },
  { region: "강원", name: "평창 육백마지기", address: "강원 평창군 미탄면 회동리", lat: 37.4217, lng: 128.5408 },
  { region: "강원", name: "영월 별마로천문대", address: "강원 영월군 영월읍 천문대길 397", lat: 37.1856, lng: 128.4615 },
  { region: "강원", name: "정선 문치재", address: "강원 정선군 임계면 문치재길", lat: 37.4560, lng: 128.8020 },
  { region: "강원", name: "태백 함백산", address: "강원 태백시 창죽동", lat: 37.1611, lng: 128.9183 },
  { region: "강원", name: "태백 매봉산 바람의언덕", address: "강원 태백시 매봉산 일대", lat: 37.2180, lng: 128.9810 },
  { region: "강원", name: "화천 조경철천문대", address: "강원 화천군 사내면", lat: 38.1250, lng: 127.4610 },
  { region: "경북", name: "영양 국제밤하늘보호공원", address: "경북 영양군 수비면 수하리", lat: 36.7800, lng: 129.2050 },
  { region: "경북", name: "청송 주왕산 국립공원", address: "경북 청송군 주왕산면", lat: 36.3940, lng: 129.1660 },
  { region: "충청", name: "제천 덕주산성", address: "충북 제천시 수산면 덕주사길", lat: 36.8580, lng: 128.1050 },
  { region: "충청", name: "부여 성흥산성", address: "충남 부여군 성흥로", lat: 36.2570, lng: 126.9030 },
  { region: "충청", name: "태안 운여해변", address: "충남 태안군 남면 원청리", lat: 36.5510, lng: 126.3320 },
  { region: "경기", name: "가평 화악터널 쌈지공원", address: "경기 가평군 북면 적목리", lat: 37.9960, lng: 127.5260 },
  { region: "경기", name: "양평 벗고개터널", address: "경기 양평군 양서면 목왕리", lat: 37.5340, lng: 127.3870 },
  { region: "경기", name: "연천 당포성", address: "경기 연천군 미산면 동이리", lat: 38.0130, lng: 126.9490 },
  { region: "경기", name: "연천 재인폭포", address: "경기 연천군 전곡읍 전곡리", lat: 38.0740, lng: 127.1370 },
  { region: "경기", name: "파주 감악산 출렁다리", address: "경기 파주시 적성면 감악산로", lat: 37.9420, lng: 126.9600 },
  { region: "경기", name: "파주 임진강변 야영지", address: "경기 파주시 문산읍 임진강변 일대", lat: 37.8880, lng: 126.7640 },
  { region: "전북", name: "무주 적상산 전망대", address: "전북 무주군 적상면", lat: 35.9550, lng: 127.6910 },
  { region: "전남", name: "고흥 해안 절벽", address: "전남 고흥군 도화면 일대", lat: 34.5150, lng: 127.3360 },
  { region: "경남", name: "합천 황매산", address: "경남 합천군 황매산 일대", lat: 35.5820, lng: 127.9750 }
];

function openBeginnerSpot(spot){
  map.setView([spot.lat, spot.lng], Math.max(map.getZoom(), 10));
  analyzeData(spot.lat, spot.lng, spot.name);
  if(window.innerWidth <= 768) document.getElementById('ui-panel').classList.add('collapsed');
}

function renderBeginnerSpotList(){
  const select = document.getElementById('beginner-spot-select');
  if(!select) return;

  const regions = [...new Set(fixedSpots.map(spot => spot.region || '추천'))];
  select.innerHTML = '<option value="">추천 관측지 선택...</option>' + regions.map(region => {
    const options = fixedSpots
      .map((spot, index) => ({ spot, index }))
      .filter(item => (item.spot.region || '추천') === region)
      .map(item => '<option value="' + item.index + '">' + escapeHtml(item.spot.name) + '</option>')
      .join('');
    return '<optgroup label="' + escapeHtml(region) + '">' + options + '</optgroup>';
  }).join('');

  select.addEventListener('change', () => {
    const spot = fixedSpots[Number(select.value)];
    if(spot) openBeginnerSpot(spot);
  });
}

function renderBeginnerSpotMarkers(){
  const icon = L.divIcon({
    className: '',
    html: '<div class="beginner-spot-marker">&#9733;</div>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });

  fixedSpots.forEach((spot) => {
    const spotMarker = L.marker([spot.lat, spot.lng], {
      icon,
      title: spot.name,
      zIndexOffset: 400
    }).addTo(map);

    spotMarker.bindTooltip(spot.name, {
      direction: 'top',
      offset: [0, -12],
      opacity: 0.9
    });

    spotMarker.on('click', () => openBeginnerSpot(spot));
  });
}

renderBeginnerSpotMarkers();
renderBeginnerSpotList();

function generateKoreaGrid(stepDeg=0.55){
  const minLat=34.6, maxLat=38.6;
  const minLng=126.0, maxLng=129.8;
  const pts = [];
  let idx=0;
  for(let lat=minLat; lat<=maxLat; lat+=stepDeg){
    for(let lng=minLng; lng<=maxLng; lng+=stepDeg){
      pts.push({
        name: `GRID-${++idx}`,
        lat: +(lat.toFixed(4)),
        lng: +(lng.toFixed(4)),
        isGrid:true
      });
    }
  }
  return pts;
}

function renderRankResults(results, baseLoc){
  const box = document.getElementById('rank-box');
  if(!results || results.length===0){
    box.style.display='none';
    box.innerHTML='';
    return;
  }

  const locTxt = (baseLoc && isFinite(baseLoc.lat) && isFinite(baseLoc.lng))
    ? `내 위치 기준 거리 페널티 적용중 (${baseLoc.lat.toFixed(3)}, ${baseLoc.lng.toFixed(3)})`
    : `내 위치를 모르면 거리 페널티는 0 (📍 버튼으로 내 위치 저장 추천)`;

  box.style.display='block';
  box.innerHTML = `
    <div style="font-weight:1000; color:#fff; margin-bottom:6px;">🏆 TOP 후보 (현실성 포함)</div>
    <div class="tiny" style="color:#888; margin-bottom:8px;">${escapeHtml(locTxt)}</div>
    ${results.slice(0,8).map((it, i) => {
      const elev = (it.elevation==null) ? "?" : Math.round(it.elevation);
      const wind = (it.windMs==null) ? "?" : it.windMs.toFixed(1);
      const dist = (it.distKm==null) ? "?" : Math.round(it.distKm);
      const badge =
        (i===0) ? `<span class="chip" style="border-color:rgba(0,255,100,0.35); color:#9f9;">BEST</span>` :
        `<span class="chip" style="opacity:0.8;">#${i+1}</span>`;
      return `
        <div class="card" style="margin-top:8px; cursor:pointer;" data-lat="${it.lat}" data-lng="${it.lng}" data-name="${escapeHtml(it.name)}">
          <div class="row-between">
            <div style="font-weight:1000;">${badge} ${escapeHtml(it.name)}</div>
            <div style="font-weight:1000; color:#0df;">${it.bestScore}/100</div>
          </div>
          <div style="margin-top:6px; font-size:11px; color:#aaa; line-height:1.4;">
            ⏰ 추천 <b style="color:#fd0;">${pad2(it.bestHour)}:00</b>
            · ⛰️ ${elev}m
            · 💨 ${wind}m/s
            · 🚗 ${dist}km
          </div>
        </div>
      `;
    }).join('')}
    <div class="tiny" style="margin-top:10px; color:#777;">
      ※ 바다 한가운데 튀는 현상은 <b>elevation(해발)</b>로 “육지 추정 필터 + 저해발 페널티”를 걸어 강하게 억제합니다.
    </div>
  `;

  box.onclick = (e) => {
    const card = e.target.closest('.card[data-lat]');
    if(!card) return;
    const lat = parseFloat(card.dataset.lat);
    const lng = parseFloat(card.dataset.lng);
    const name = card.dataset.name || "선택한 후보";
    map.setView([lat,lng], 11);
    analyzeData(lat,lng,name);
    if(window.innerWidth <= 768) document.getElementById('ui-panel').classList.add('collapsed');
  };
}

document.getElementById('btn-simulate').addEventListener('click', async function(){
  const btn = this;
  const msg = document.getElementById('simulate-msg');
  const targetDate = document.getElementById('obs-date').value;
  const progContainer = document.getElementById('progress-container');
  const progBar = document.getElementById('progress-bar');
  const rankBox = document.getElementById('rank-box');

  rankBox.style.display = 'none';
  rankBox.innerHTML = '';

  if(!isWithinWeatherWindow(targetDate)){
    msg.style.display='block'; msg.style.color='#fd0';
    msg.innerText='⚠️ 14일 이후는 날씨 기반 시뮬레이션 불가(달/광해/코어만 확인하세요).';
    return;
  }

  if(!myLocation && navigator.geolocation){
    try{
      await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          pos => { saveMyLoc(pos.coords.latitude, pos.coords.longitude); resolve(); },
          _ => resolve(),
          { enableHighAccuracy:false, timeout:5000, maximumAge:600000 }
        );
      });
    }catch(e){}
  }

  const baseLoc = myLocation || (currentLat!=null ? {lat:currentLat, lng:currentLng} : null);

  btn.disabled = true;
  msg.style.display = 'block';
  msg.style.color = '#0df';
  msg.innerText = "1차(날씨 없이) 후보 컷 → 2차(날씨 포함) 정밀 분석 중입니다.";
  progContainer.style.display = 'block';
  progBar.style.width = '0%';

  const grid = generateKoreaGrid(0.55);
  const candidates = [...fixedSpots, ...grid];
  const searchHours = [0,1,2,3,4,20,21,22,23];

  const rough = [];
  for(const spot of candidates){
    let best = -1;
    let bestHour = 22;
    for(const h of searchHours){
      const r = computeRoughScoreAtHour(spot, targetDate, h, baseLoc);
      if(r.alt <= 0) continue;
      if(r.score > best){ best = r.score; bestHour = h; }
    }
    if(best > 0){
      rough.push({ spot, bestRough: best, roughHour: bestHour });
    }
  }
  rough.sort((a,b)=> b.bestRough - a.bestRough);

  const TOP_K = 35;
  const refineTargets = rough.slice(0, TOP_K).map(x => x.spot);

  for(const fs of fixedSpots){
    if(!refineTargets.some(s => Math.abs(s.lat-fs.lat)<1e-6 && Math.abs(s.lng-fs.lng)<1e-6)){
      refineTargets.push(fs);
    }
  }

  const results = [];
  const N = refineTargets.length;
  const softDelay = (ms)=>new Promise(r=>setTimeout(r,ms));

  try{
    for(let i=0; i<N; i++){
      const spot = refineTargets[i];
      const percentage = Math.round(((i + 1) / N) * 100);
      btn.innerHTML = `📡 정밀 분석 중... (${percentage}%)`;
      progBar.style.width = `${percentage}%`;

      if(i % 6 === 0) await softDelay(50);

      const weatherPack = await fetchWeatherPack(spot.lat, spot.lng, targetDate);
      if(!weatherPack) continue;

      if(!isLikelyLand(weatherPack.elevation)){
        if(spot.isGrid) continue;
      }

      let bestScore = -1;
      let bestHour = 22;
      let bestMeta = null;

      for(const h of searchHours){
        const s = computeSpotScoreAtHour(spot, targetDate, h, weatherPack, baseLoc);
        if(s.detail.alt <= 0) continue;

        if(s.score > bestScore){
          bestScore = s.score;
          bestHour = h;
          bestMeta = s;
        }
      }

      if(bestScore > 0 && bestMeta){
        const name = spot.isGrid
          ? `GRID 후보 (⛰️${(bestMeta.elevation==null?'?':Math.round(bestMeta.elevation))}m / 🚗${(bestMeta.distKm==null?'?':Math.round(bestMeta.distKm))}km)`
          : spot.name;

        results.push({
          name, lat: spot.lat, lng: spot.lng, bestHour, bestScore,
          elevation: bestMeta.elevation, windMs: bestMeta.windMs,
          distKm: bestMeta.distKm, isGrid: !!spot.isGrid
        });
      }
    }

    results.sort((a,b)=> b.bestScore - a.bestScore);

    if(results.length > 0){
      renderRankResults(results, baseLoc);

      const best = results[0];
      document.getElementById('obs-time').value = best.bestHour;
      document.getElementById('time-text').innerText = `${pad2(best.bestHour)}:00`;

      msg.style.color = "#0df";
      msg.innerText =
        `✅ BEST: [${best.name}] ${best.bestHour}시 (점수 ${best.bestScore}/100)` +
        (best.distKm!=null ? ` · 거리 ${Math.round(best.distKm)}km` : '');

      map.setView([best.lat, best.lng], 11);
      analyzeData(best.lat, best.lng, best.name);

      if(window.innerWidth <= 768) document.getElementById('ui-panel').classList.add('collapsed');
    } else {
      msg.style.color = "#f55";
      msg.innerText = "❌ 기상 데이터가 없거나 조건이 맞는 후보가 없습니다.";
    }
  } catch(err){
    msg.style.color = "#f55";
    msg.innerText = "분석 중 오류가 발생했습니다.";
    console.log(err);
  } finally {
    btn.disabled = false;
    btn.innerHTML = "🚀 선택한 날짜의 최적지 찾기";
    setTimeout(() => { progContainer.style.display = 'none'; }, 900);
  }
});

// =========================
// UI controls
// =========================
document.getElementById('map-theme').addEventListener('change', function(e){
  map.removeLayer(currentBaseLayer);
  currentBaseLayer = e.target.value === 'dark' ? darkLayer : (e.target.value === 'satellite' ? satelliteLayer : standardLayer);
  currentBaseLayer.addTo(map);
});

document.getElementById('light-pollution-toggle').addEventListener('change', function(e){
  e.target.checked ? lightPollutionLayer.addTo(map) : map.removeLayer(lightPollutionLayer);
});

document.getElementById('lp-opacity').addEventListener('input', function(e){
  lightPollutionLayer.setOpacity(e.target.value);
  document.getElementById('opacity-val').innerText = Math.round(e.target.value * 100);
});

document.getElementById('btn-today').addEventListener('click', function(){
  document.getElementById('obs-date').value = fmtYMD(getToday());
  updateWeatherModeUI();
  if(currentLat!=null) analyzeData(currentLat, currentLng);
});

document.getElementById('obs-time').addEventListener('input', function(e){
  document.getElementById('time-text').innerText = `${pad2(e.target.value)}:00`;
});

document.getElementById('obs-time').addEventListener('change', function(){
  if(currentLat!=null) analyzeData(currentLat, currentLng);
});

document.getElementById('obs-date').addEventListener('change', function(){
  updateWeatherModeUI();
  if(currentLat!=null) analyzeData(currentLat, currentLng);
});

map.on('click', function(e){ analyzeData(e.latlng.lat, e.latlng.lng); });

updateWeatherModeUI();
