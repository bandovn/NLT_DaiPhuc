/* =============================================================================
 * WebGIS Phương án sử dụng đất thu hồi từ Công ty Lâm nghiệp Thái Nguyên
 * UBND xã Đại Phúc — Cơ quan tổ chức lập: Phòng Xây dựng, Nông nghiệp và Môi trường
 * Dữ liệu: data/diachinh.geojson (đã chuyển VN-2000 KTT 106°30' → WGS-84)
 * Thông tin rà soát của cán bộ lưu localStorage
 * ============================================================================= */

const STORAGE_KEY = 'daiphuc_pasdd_v1';
const PROJECT_NAME = 'Phương án sử dụng đất thu hồi từ Công ty Lâm nghiệp Thái Nguyên';
const ORG_NAME = 'UBND xã Đại Phúc — Phòng Xây dựng, Nông nghiệp và Môi trường';

/* Hiệu chỉnh tọa độ (độ) nếu đối chiếu điểm khống chế thấy lệch nền ảnh. Mặc định 0. */
const OFFSET = { dLat: 0, dLon: 0 };

/* VN-2000 Thái Nguyên — KTT 106°30', múi 3°, 7 tham số */
const VN2000_TN = '+proj=tmerc +lat_0=0 +lon_0=106.5 +k=0.9999 +x_0=500000 +y_0=0 +ellps=WGS84 ' +
  '+towgs84=-191.90441429,-39.30318279,-111.45032835,-0.00928836,0.01975479,-0.00427372,0.252906278 +units=m +no_defs';

const NHOM = {
  ph: { label: 'Đất rừng phòng hộ',          fill: '#7CC47F', stroke: '#1B5E20', badge: 'badge-ph' },
  sx: { label: 'Đất rừng sản xuất',          fill: '#D4E157', stroke: '#558B2F', badge: 'badge-sx' },
  nn: { label: 'Đất nông nghiệp khác',       fill: '#FFD54F', stroke: '#E65100', badge: 'badge-nn' },
  o:  { label: 'Đất ở và đất vườn liền kề',  fill: '#F48FB1', stroke: '#AD1457', badge: 'badge-o' },
  k:  { label: 'Đất phi NN, chưa sử dụng',   fill: '#B39DDB', stroke: '#4527A0', badge: 'badge-k' },
};
const LD_NAMES = {
  'RPH': 'Đất rừng phòng hộ', 'RPT': 'Đất có rừng trồng phòng hộ',
  'RSX': 'Đất rừng sản xuất', 'RST': 'Đất có rừng trồng sản xuất',
  'CLN': 'Đất trồng cây lâu năm', 'LNC': 'Đất trồng cây lâu năm khác',
  'LUK': 'Đất trồng lúa nước còn lại', 'BHK': 'Đất bằng trồng cây hàng năm khác',
  'NTS': 'Đất nuôi trồng thủy sản', 'TSN': 'Đất nuôi trồng thủy sản nước ngọt',
  'ONT': 'Đất ở tại nông thôn', 'ONT+CLN': 'Đất ở + cây lâu năm', 'ONT+LNK': 'Đất ở + cây lâu năm khác',
  'TSC': 'Đất xây dựng trụ sở cơ quan', 'BCS': 'Đất bằng chưa sử dụng',
};
const DTSD = {
  bql: { label: 'Ban Quản lý rừng phòng hộ',      fill: '#80CBC4', stroke: '#00695C' },
  cty: { label: 'Công ty Lâm nghiệp Thái Nguyên', fill: '#90CAF9', stroke: '#1565C0' },
  hgd: { label: 'Hộ gia đình, cá nhân',           fill: '#FFCC80', stroke: '#E65100' },
  cxd: { label: 'Chưa xác định',                  fill: '#E0E0E0', stroke: '#616161' },
};
const PHUONG_AN = {
  'Giao BQL rừng phòng hộ quản lý':               { fill: '#66BB6A', stroke: '#1B5E20' },
  'Giao đất, cho thuê đất cho người đang sử dụng':{ fill: '#FFB74D', stroke: '#E65100' },
  'Giao UBND xã quản lý':                         { fill: '#64B5F6', stroke: '#0D47A1' },
  'Bố trí mục đích công cộng':                    { fill: '#BA68C8', stroke: '#6A1B9A' },
  'Cần rà soát thêm':                             { fill: '#E57373', stroke: '#B71C1C' },
};
const PA_NONE = { fill: '#E0E0E0', stroke: '#757575' };
const XA_ORDER = ['Đại Phúc', 'Tân Cương', 'Bá Xuyên'];
const XA_LABEL = { 'Đại Phúc': 'Xã Đại Phúc', 'Tân Cương': 'Xã Tân Cương', 'Bá Xuyên': 'Phường Bá Xuyên' };
const VIEWS = ['view-map', 'view-table', 'view-dashboard', 'view-report', 'view-help'];

/* ============================================================================
 * STATE
 * ============================================================================ */
const state = {
  features: [],
  byId: {},
  edits: {},
  map: null,
  layer: null,
  layerById: {},
  selectedId: null,
  colorMode: 'nhom',
  filters: { nhom: new Set(Object.keys(NHOM)), xa: new Set(XA_ORDER), dtsd: new Set(Object.keys(DTSD)), onlyWarn: false, search: '' },
  table: { sortKey: 'tbd', sortDir: 'asc', page: 1, pageSize: 50, searchText: '', filterXa: '', filterNhom: '', filterWarn: '' },
};

const fmt = (n, d = 1) => (+n || 0).toLocaleString('vi-VN', { maximumFractionDigits: d });
const ha = m2 => ((+m2 || 0) / 10000).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function props(f) {
  const p = f.properties, ed = state.edits[p.id];
  return ed ? { ...p, ...ed, _edited: true } : p;
}
function tenHienThi(p) { return p.ten || '(chưa xác định)'; }
function xaLabel(x) { return XA_LABEL[x] || x; }

/* ============================================================================
 * INIT
 * ============================================================================ */
async function init() {
  loadEdits();
  await loadData();
  if (!state.features.length) return;
  buildFilters();
  initMap();
  initNav();
  initTableControls();
  initMobileBehavior();
  fillHelp();
  updateCounts();
}

function loadEdits() {
  try { state.edits = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch (e) { state.edits = {}; }
}
function saveEdits() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.edits)); }

async function loadData() {
  const loadingEl = document.getElementById('map-loading');
  let res;
  for (const u of ['data/diachinh.geojson', 'diachinh.geojson']) {
    try { res = await fetch(u); if (res.ok) break; } catch (e) { /* thử đường dẫn tiếp */ }
  }
  if (!res || !res.ok) {
    loadingEl.innerHTML = '<div style="color:var(--danger);text-align:center">⚠️ Không tải được data/diachinh.geojson<br><small style="color:var(--text-secondary);font-weight:normal">Kiểm tra file đã upload đầy đủ lên repo chưa</small></div>';
    return;
  }
  const gj = await res.json();
  if (OFFSET.dLat || OFFSET.dLon) {
    const shift = c => typeof c[0] === 'number' ? [c[0] + OFFSET.dLon, c[1] + OFFSET.dLat] : c.map(shift);
    gj.features.forEach(f => f.geometry.coordinates = shift(f.geometry.coordinates));
  }
  state.features = gj.features;
  state.features.forEach(f => state.byId[f.properties.id] = f);
  document.getElementById('total-count').textContent = fmt(state.features.length, 0);
}

/* ============================================================================
 * FILTER UI
 * ============================================================================ */
function filterRow(key, value, label, fill, stroke) {
  return `<label class="filter-row">
    <input type="checkbox" data-filter="${key}" value="${value}" checked>
    <span class="swatch" style="background:${fill};border:0.5px solid ${stroke}"></span>
    <span>${label}</span>
    <span class="count" data-count="${key}-${value}">—</span>
  </label>`;
}

function buildFilters() {
  document.getElementById('filter-nhom').innerHTML =
    Object.entries(NHOM).map(([k, v]) => filterRow('nhom', k, v.label, v.fill, v.stroke)).join('');
  document.getElementById('filter-xa').innerHTML =
    XA_ORDER.map(x => filterRow('xa', x, xaLabel(x), '#fff', '#999')).join('');
  document.getElementById('filter-dtsd').innerHTML =
    Object.entries(DTSD).map(([k, v]) => filterRow('dtsd', k, v.label, v.fill, v.stroke)).join('');

  document.querySelectorAll('[data-filter]').forEach(cb => cb.addEventListener('change', e => {
    const { filter } = e.target.dataset;
    e.target.checked ? state.filters[filter].add(e.target.value) : state.filters[filter].delete(e.target.value);
    applyFilter();
  }));
  document.getElementById('only-warn').addEventListener('change', e => { state.filters.onlyWarn = e.target.checked; applyFilter(); });

  const si = document.getElementById('search-input');
  si.addEventListener('input', e => { state.filters.search = e.target.value.trim(); applyFilter(); });
  si.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const hit = state.features.find(passesFilter);
    if (hit) selectThua(hit.properties.id);
  });

  document.querySelectorAll('.color-mode button').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.color-mode button').forEach(x => x.classList.toggle('active', x === b));
    state.colorMode = b.dataset.mode;
    restyleAll();
    renderLegend();
  }));

  // Select của bảng tra cứu
  document.getElementById('table-xa').innerHTML += XA_ORDER.map(x => `<option value="${x}">${xaLabel(x)}</option>`).join('');
  document.getElementById('table-nhom').innerHTML += Object.entries(NHOM).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
}

function matchSearch(p, s) {
  if (!s) return true;
  const m = s.match(/^(\d+)\s*[\/\-\s]\s*(\d+)$/);
  if (m) return p.tbd === +m[1] && p.thua === +m[2];
  const hay = `${p.ten || ''} ${p.loai} ${p.tbd}/${p.thua} ${p.xa}`.toLowerCase();
  return hay.includes(s.toLowerCase());
}

function passesFilter(f) {
  const p = props(f), fl = state.filters;
  if (!fl.nhom.has(p.nhom)) return false;
  if (!fl.xa.has(p.xa)) return false;
  if (!fl.dtsd.has(p.dt_sd)) return false;
  if (fl.onlyWarn && !p.kt) return false;
  return matchSearch(p, fl.search);
}

function updateCounts() {
  const c = {};
  let warn = 0;
  state.features.forEach(f => {
    const p = f.properties;
    ['nhom', 'xa', 'dtsd'].forEach(k => {
      const v = k === 'dtsd' ? p.dt_sd : p[k];
      c[`${k}-${v}`] = (c[`${k}-${v}`] || 0) + 1;
    });
    if (p.kt) warn++;
  });
  document.querySelectorAll('[data-count]').forEach(el => el.textContent = fmt(c[el.dataset.count] || 0, 0));
  document.getElementById('count-warn').textContent = warn;
}

/* ============================================================================
 * MAP
 * ============================================================================ */
function initMap() {
  if (typeof L === 'undefined') {
    document.getElementById('map-loading').innerHTML = '⚠️ Không tải được Leaflet. Kiểm tra Internet.';
    return;
  }
  state.map = L.map('map', { zoomControl: true, preferCanvas: true, fadeAnimation: false }).setView([21.52, 105.74], 13);

  const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 20, maxNativeZoom: 19, attribution: '© Esri' });
  const google = L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', { subdomains: '0123', maxZoom: 20, attribution: '© Google' });
  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' });
  google.addTo(state.map);
  L.control.layers({ 'Ảnh vệ tinh + nhãn (Google)': google, 'Ảnh vệ tinh (Esri)': satellite, 'OpenStreetMap': osm }, {}, { position: 'topleft' }).addTo(state.map);
  L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(state.map);

  state.layer = L.geoJSON(state.features, {
    style: f => styleFor(f),
    onEachFeature: (f, layer) => {
      state.layerById[f.properties.id] = layer;
      layer.on('click', () => selectThua(f.properties.id));
      layer.bindTooltip(`${f.properties.loai} - ${f.properties.tbd}/${f.properties.thua}`, { permanent: true, direction: 'center', className: 'thua-label', interactive: false });
    },
  }).addTo(state.map);

  state.map.fitBounds(state.layer.getBounds(), { padding: [20, 20] });
  const updLabels = () => state.map.getContainer().classList.toggle('show-labels', state.map.getZoom() >= 16);
  state.map.on('zoomend', updLabels); updLabels();

  // Tọa độ con trỏ: WGS-84 + VN-2000
  const box = document.getElementById('coord-box');
  const hasProj = typeof proj4 !== 'undefined';
  state.map.on('mousemove', e => {
    const { lat, lng } = e.latlng;
    let s = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    if (hasProj) {
      const [x, y] = proj4('EPSG:4326', VN2000_TN, [lng - OFFSET.dLon, lat - OFFSET.dLat]);
      s += ` • VN-2000: X=${y.toFixed(2)} Y=${x.toFixed(2)}`;
    }
    box.textContent = s;
  });

  document.getElementById('map-loading').classList.add('hidden');
  renderLegend();
  applyFilter();
}

function styleFor(f) {
  const p = props(f);
  let c;
  if (state.colorMode === 'pa') c = PHUONG_AN[p.phuong_an] || PA_NONE;
  else if (state.colorMode === 'dtsd') c = DTSD[p.dt_sd] || DTSD.cxd;
  else c = NHOM[p.nhom] || NHOM.k;
  const sel = p.id === state.selectedId;
  return {
    fillColor: c.fill,
    color: sel ? '#FFEB3B' : (p.kt ? '#FF6D00' : c.stroke),
    weight: sel ? 3 : (p.kt ? 1.8 : 0.8),
    dashArray: p.kt && !sel ? '5,4' : null,
    fillOpacity: 0.55,
    opacity: 1,
  };
}

function restyleAll() {
  if (!state.layer) return;
  state.layer.eachLayer(l => l.setStyle(styleFor(l.feature)));
}

function applyFilter() {
  let n = 0, a = 0;
  state.features.forEach(f => {
    const l = state.layerById[f.properties.id];
    if (passesFilter(f)) {
      n++; a += f.properties.dt;
      if (l && !state.layer.hasLayer(l)) { state.layer.addLayer(l); l.setStyle(styleFor(f)); }
    } else if (l && state.layer.hasLayer(l)) state.layer.removeLayer(l);
  });
  document.getElementById('visible-count').textContent = fmt(n, 0);
  document.getElementById('visible-ha').textContent = ha(a);
}

function renderLegend() {
  const el = document.getElementById('map-legend');
  let title, items;
  if (state.colorMode === 'pa') { title = 'Phương án đề xuất'; items = [...Object.entries(PHUONG_AN).map(([k, v]) => [k, v]), ['Chưa đề xuất', PA_NONE]]; }
  else if (state.colorMode === 'dtsd') { title = 'Đối tượng quản lý, sử dụng'; items = Object.values(DTSD).map(v => [v.label, v]); }
  else { title = 'Nhóm loại đất hiện trạng'; items = Object.values(NHOM).map(v => [v.label, v]); }
  el.innerHTML = `<div style="font-weight:500;margin-bottom:4px">${title}</div>` +
    items.map(([lb, c]) => `<div class="legend-row"><span class="swatch" style="background:${c.fill};border:0.5px solid ${c.stroke}"></span>${lb}</div>`).join('') +
    `<div class="legend-row"><span class="swatch" style="background:transparent;border:1.5px dashed #FF6D00"></span>Cần kiểm tra DT</div>`;
}

function selectThua(id) {
  const f = state.byId[id];
  if (!f) return;
  const prev = state.selectedId;
  state.selectedId = id;
  if (prev && state.layerById[prev]) state.layerById[prev].setStyle(styleFor(state.byId[prev]));
  const layer = state.layerById[id];
  if (layer) {
    layer.setStyle(styleFor(f));
    if (state.layer.hasLayer(layer)) layer.bringToFront();
    state.map.fitBounds(layer.getBounds(), { padding: [60, 60], maxZoom: 18 });
  }
  renderThuaDetail(f);
  if (isMobile()) openMobileRightbar();
}

function renderThuaDetail(f) {
  const p = props(f);
  const ed = state.edits[p.id] || {};
  const nh = NHOM[p.nhom] || NHOM.k;
  const row = (label, value, full) => `<div${full ? ' class="full"' : ''}><div class="label">${label}</div><div class="value">${value}</div></div>`;

  let html = `
    <div class="thua-header">
      <div class="thua-id">Tờ ${p.tbd} — Thửa ${p.thua}</div>
      <div class="thua-loc">${xaLabel(p.xa)}, tỉnh Thái Nguyên</div>
      <span class="badge ${nh.badge}">${nh.label}</span>
      ${p.kt ? '<span class="badge badge-warn">Cần kiểm tra DT</span>' : '<span class="badge badge-ok">Số liệu khớp</span>'}
    </div>
    <div class="detail-section">
      <h4>Thông tin thửa đất</h4>
      <div class="detail-grid">
        ${row('Đối tượng đang quản lý, sử dụng', p.ten ? esc(p.ten) : '<span style="color:var(--text-tertiary)">(chưa xác định)</span>', true)}
        ${row('Loại đất', `${esc(p.loai)}${LD_NAMES[p.loai] ? ' — ' + LD_NAMES[p.loai] : ''}`, true)}
        ${row('DT bản đồ', fmt(p.dt) + ' m²')}
        ${row('DT hồ sơ', p.dt_hs ? fmt(p.dt_hs) + ' m²' : '—')}
        ${row('DT Cty bàn giao', p.dt_ct ? fmt(p.dt_ct) + ' m²' : '—')}
        ${row('Văn bản', esc(p.vb) || '—')}
      </div>
      ${p.kt ? `<div class="warn-box">⚠️ ${esc(p.canh_bao)}</div>` : ''}
    </div>`;

  if (Object.keys(ed).length) {
    html += `<div class="detail-section"><h4>Kết quả rà soát</h4><div class="detail-grid">`;
    if (ed.hien_trang) html += row('Hiện trạng', esc(ed.hien_trang), true);
    if (ed.phuong_an) html += row('Phương án đề xuất', `<span class="badge badge-pa">${esc(ed.phuong_an)}</span>`, true);
    if (ed.ct_loai) html += row('Công trình', esc(ed.ct_loai) + (ed.ct_dt ? ` (${esc(ed.ct_dt)} m²)` : ''));
    if (ed.nam_sd) html += row('Năm bắt đầu SD', esc(ed.nam_sd));
    if (ed.sdt) html += row('SĐT', esc(ed.sdt));
    if (ed.ghi_chu) html += row('Ghi chú', esc(ed.ghi_chu), true);
    if (ed.nguoi_ra_soat) html += row('Người rà soát', esc(ed.nguoi_ra_soat) + (ed.ngay_ra_soat ? ` (${esc(ed.ngay_ra_soat)})` : ''), true);
    ['anh_ht', 'anh_gt'].forEach(k => {
      if (!ed[k] || !ed[k].length) return;
      html += `<div class="full"><div class="label">${k === 'anh_ht' ? '📷 Ảnh hiện trạng' : '📄 Giấy tờ'} (${ed[k].length})</div><div class="img-preview-grid">` +
        ed[k].map((x, i) => `<div class="img-item" onclick="viewImage('${p.id}','${k}',${i})">${x.type === 'application/pdf' ? `<div class="pdf-icon" title="${esc(x.name)}">📄</div>` : `<img src="${x.data}" alt="${esc(x.name)}">`}</div>`).join('') +
        `</div></div>`;
    });
    html += `</div></div>`;
  }

  html += `<div class="detail-actions">
      <button class="btn btn-primary" onclick="openEditPanel('${p.id}')">✏️ Cập nhật</button>
      <button class="btn" onclick="window.print()">🖨️ In phiếu</button>
    </div>`;
  document.getElementById('thua-detail').innerHTML = html;
}

/* ============================================================================
 * NAV
 * ============================================================================ */
function showView(view) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  VIEWS.forEach(id => document.getElementById(id).classList.toggle('hidden', id !== 'view-' + view));
  if (view === 'dashboard') renderDashboard();
  if (view === 'table') renderTable();
  if (view === 'report') renderReport();
  if (view === 'map' && state.map) setTimeout(() => state.map.invalidateSize(), 50);
}

function initNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => {
    if (btn.dataset.view === 'contact') {
      showView('map');
      showContactInRightbar();
      if (isMobile()) openMobileRightbar();
      return;
    }
    showView(btn.dataset.view);
  }));
}

function goToThua(id) {
  showView('map');
  setTimeout(() => { state.map && state.map.invalidateSize(); selectThua(id); }, 120);
}
function goToContact() { document.querySelector('.nav-btn[data-view="contact"]').click(); }

function showContactInRightbar() {
  document.getElementById('thua-detail').innerHTML = `
    <div class="contact-card">
      <div class="contact-header">
        <div class="contact-header-text">
          <div class="contact-tag">Đơn vị xây dựng</div>
          <h3 class="contact-name">CÔNG TY CỔ PHẦN CÔNG NGHỆ TÀI NGUYÊN - MÔI TRƯỜNG HÀ NỘI</h3>
        </div>
      </div>
      <div class="contact-services">
        <span class="contact-chip">📍 Lập phương án SDĐ</span>
        <span class="contact-chip">🗺️ WebGIS</span>
      </div>
      <div class="contact-info">
        <div class="contact-info-row"><span class="contact-icon">🏛️</span><div><div class="contact-label">Cơ quan tổ chức lập phương án</div><div class="contact-value">Phòng Xây dựng, Nông nghiệp và Môi trường — UBND xã Đại Phúc, tỉnh Thái Nguyên</div></div></div>
        <div class="contact-info-row"><span class="contact-icon">📞</span><div><div class="contact-label">Điện thoại đơn vị xây dựng</div><div class="contact-value"><a href="tel:0352937823"><strong>035.293 7823</strong></a></div></div></div>
      </div>
      <div class="contact-actions">
        <a href="tel:0352937823" class="btn btn-primary contact-btn-call">📞 Gọi 035.293 7823</a>
      </div>
      <p class="contact-note">Mọi ý kiến góp ý về số liệu, ranh giới thửa đất trong phương án xin liên hệ cơ quan tổ chức lập hoặc đơn vị xây dựng theo thông tin trên.</p>
    </div>`;
}

/* ============================================================================
 * TABLE VIEW
 * ============================================================================ */
function initTableControls() {
  const t = state.table;
  document.getElementById('table-search').addEventListener('input', e => { t.searchText = e.target.value.trim(); t.page = 1; renderTable(); });
  [['table-xa', 'filterXa'], ['table-nhom', 'filterNhom'], ['table-warn', 'filterWarn']].forEach(([id, k]) =>
    document.getElementById(id).addEventListener('change', e => { t[k] = e.target.value; t.page = 1; renderTable(); }));
  document.querySelectorAll('[data-sort]').forEach(th => th.addEventListener('click', () => {
    const k = th.dataset.sort;
    if (t.sortKey === k) t.sortDir = t.sortDir === 'asc' ? 'desc' : 'asc';
    else { t.sortKey = k; t.sortDir = 'asc'; }
    renderTable();
  }));
}

function getTableData() {
  const t = state.table;
  return state.features.map(props).filter(p => {
    if (t.filterXa && p.xa !== t.filterXa) return false;
    if (t.filterNhom && p.nhom !== t.filterNhom) return false;
    if (t.filterWarn !== '' && String(p.kt) !== t.filterWarn) return false;
    return matchSearch(p, t.searchText);
  }).sort((a, b) => {
    const k = t.sortKey, dir = t.sortDir === 'asc' ? 1 : -1;
    const va = k === 'pa' ? (a.phuong_an || '') : (a[k] ?? ''), vb = k === 'pa' ? (b.phuong_an || '') : (b[k] ?? '');
    const r = (typeof va === 'number' && typeof vb === 'number') ? va - vb : String(va).localeCompare(String(vb), 'vi');
    return dir * (r || (a.tbd - b.tbd) || (a.thua - b.thua));
  });
}

function renderTable() {
  const data = getTableData(), t = state.table;
  const slice = data.slice((t.page - 1) * t.pageSize, t.page * t.pageSize);
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = slice.map(p => `
    <tr data-id="${p.id}">
      <td style="white-space:nowrap">${p.xa}</td><td>${p.tbd}</td><td>${p.thua}</td>
      <td>${esc(tenHienThi(p))}</td><td>${esc(p.loai)}</td>
      <td class="num">${fmt(p.dt)}</td><td class="num">${p.dt_hs ? fmt(p.dt_hs) : ''}</td><td class="num">${p.dt_ct ? fmt(p.dt_ct) : ''}</td>
      <td>${p.phuong_an ? `<span class="badge badge-pa">${esc(p.phuong_an)}</span>` : ''}</td>
      <td>${p.kt ? `<span class="badge badge-warn" title="${esc(p.canh_bao)}">Kiểm tra</span>` : ''}</td>
    </tr>`).join('');
  tbody.querySelectorAll('tr[data-id]').forEach(tr => tr.addEventListener('click', () => goToThua(tr.dataset.id)));
  renderPagination(data.length);
}

function renderPagination(total) {
  const t = state.table, pages = Math.ceil(total / t.pageSize) || 1;
  if (t.page > pages) t.page = pages;
  const b = [`<button ${t.page <= 1 ? 'disabled' : ''} onclick="goPage(${t.page - 1})">‹</button>`];
  let start = Math.max(1, t.page - 3), end = Math.min(pages, start + 6);
  start = Math.max(1, end - 6);
  if (start > 1) b.push(`<button onclick="goPage(1)">1</button>${start > 2 ? '<span class="info">…</span>' : ''}`);
  for (let i = start; i <= end; i++) b.push(`<button class="${i === t.page ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`);
  if (end < pages) b.push(`${end < pages - 1 ? '<span class="info">…</span>' : ''}<button onclick="goPage(${pages})">${pages}</button>`);
  b.push(`<button ${t.page >= pages ? 'disabled' : ''} onclick="goPage(${t.page + 1})">›</button>`);
  b.push(`<span class="info">Tổng: ${fmt(total, 0)} thửa</span>`);
  document.getElementById('pagination').innerHTML = b.join('');
}
function goPage(p) { state.table.page = p; renderTable(); document.getElementById('thua-table-wrap').scrollTop = 0; }

function csvEsc(s) {
  s = s == null ? '' : String(s);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const today = () => new Date().toISOString().slice(0, 10);

function exportFilteredCsv() {
  const data = getTableData();
  if (!data.length) return toast('Không có dữ liệu để xuất', 'err');
  const head = ['Đơn vị HC', 'Tờ', 'Thửa', 'Đối tượng QL, SD', 'Loại đất', 'DT bản đồ (m²)', 'DT hồ sơ (m²)', 'DT Cty bàn giao (m²)', 'Phương án đề xuất', 'Cảnh báo'];
  const rows = data.map(p => [xaLabel(p.xa), p.tbd, p.thua, p.ten, p.loai, p.dt, p.dt_hs, p.dt_ct, p.phuong_an || '', p.canh_bao || ''].map(csvEsc));
  download(new Blob(['﻿' + head.join(',') + '\n' + rows.map(r => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' }), `tracuu_daiphuc_${today()}.csv`);
  toast('Đã xuất CSV', 'ok');
}

/* ============================================================================
 * DASHBOARD
 * ============================================================================ */
function renderDashboard() {
  const fs = state.features.map(props);
  const sum = (arr, k) => arr.reduce((s, p) => s + (+p[k] || 0), 0);
  const group = (keyFn) => {
    const g = {};
    fs.forEach(p => { const k = keyFn(p); (g[k] = g[k] || []).push(p); });
    return g;
  };
  const total = sum(fs, 'dt');
  const byNhom = group(p => p.nhom);

  document.getElementById('stat-total').textContent = fmt(fs.length, 0);
  const byXa = group(p => p.xa);
  document.getElementById('stat-total-sub').textContent = XA_ORDER.filter(x => byXa[x]).map(x => `${xaLabel(x)}: ${byXa[x].length}`).join(' • ');
  document.getElementById('stat-area').textContent = ha(total) + ' ha';
  document.getElementById('stat-area-hs').textContent = ha(sum(fs, 'dt_hs')) + ' ha';
  document.getElementById('stat-area-ct').textContent = ha(sum(fs, 'dt_ct')) + ' ha';
  ['ph', 'sx'].forEach(k => {
    document.getElementById('stat-' + k).textContent = ha(sum(byNhom[k] || [], 'dt')) + ' ha';
    document.getElementById(`stat-${k}-n`).textContent = fmt((byNhom[k] || []).length, 0) + ' thửa';
  });
  const warn = fs.filter(p => p.kt);
  document.getElementById('stat-warn').textContent = warn.length + ' thửa';
  const done = Object.keys(state.edits).filter(id => state.byId[id]).length;
  document.getElementById('stat-progress').textContent = (done / fs.length * 100).toFixed(1) + '%';
  document.getElementById('stat-progress-sub').textContent = `${done} / ${fs.length} thửa đã cập nhật`;

  document.querySelector('#table-by-xa tbody').innerHTML = XA_ORDER.filter(x => byXa[x]).map(x => {
    const a = byXa[x];
    return `<tr><td>${xaLabel(x)}</td><td class="num">${a.length}</td><td class="num">${ha(sum(a, 'dt'))}</td><td class="num">${ha(sum(a, 'dt_hs'))}</td><td class="num">${ha(sum(a, 'dt_ct'))}</td></tr>`;
  }).join('') + `<tr style="font-weight:600"><td>Tổng</td><td class="num">${fs.length}</td><td class="num">${ha(total)}</td><td class="num">${ha(sum(fs, 'dt_hs'))}</td><td class="num">${ha(sum(fs, 'dt_ct'))}</td></tr>`;

  const byLoai = group(p => p.loai);
  const nhomOrder = Object.keys(NHOM);
  document.querySelector('#table-by-loai tbody').innerHTML = Object.entries(byLoai)
    .sort((a, b) => (nhomOrder.indexOf(a[1][0].nhom) - nhomOrder.indexOf(b[1][0].nhom)) || (sum(b[1], 'dt') - sum(a[1], 'dt')))
    .map(([k, a]) => { const s = sum(a, 'dt'); return `<tr><td><span class="swatch" style="display:inline-block;width:10px;height:10px;margin-right:6px;background:${NHOM[a[0].nhom].fill};border:0.5px solid ${NHOM[a[0].nhom].stroke}"></span><strong>${esc(k)}</strong></td><td>${LD_NAMES[k] || ''}</td><td class="num">${a.length}</td><td class="num">${ha(s)}</td><td class="num">${(s / total * 100).toFixed(1)}%</td></tr>`; })
    .join('');

  const byDt = group(p => p.dt_sd);
  document.querySelector('#table-by-dtsd tbody').innerHTML = Object.keys(DTSD).filter(k => byDt[k])
    .map(k => `<tr><td>${DTSD[k].label}</td><td class="num">${byDt[k].length}</td><td class="num">${ha(sum(byDt[k], 'dt'))}</td></tr>`).join('');

  const byTo = group(p => `${p.xa}|${p.tbd}`);
  document.querySelector('#table-by-to tbody').innerHTML = Object.entries(byTo)
    .sort((a, b) => (XA_ORDER.indexOf(a[1][0].xa) - XA_ORDER.indexOf(b[1][0].xa)) || (a[1][0].tbd - b[1][0].tbd))
    .map(([, a]) => `<tr><td>${xaLabel(a[0].xa)}</td><td>${a[0].tbd}</td><td class="num">${a.length}</td><td class="num">${ha(sum(a, 'dt'))}</td></tr>`).join('');

  const wb = document.querySelector('#table-warn tbody');
  wb.innerHTML = warn.map(p => `<tr class="click" data-id="${p.id}"><td>${p.tbd}/${p.thua}${p.xa !== 'Đại Phúc' ? ` <small>(${p.xa})</small>` : ''}</td><td>${esc(p.loai)}</td><td class="num">${fmt(p.dt)}</td><td class="num">${fmt(p.dt_hs)}</td><td class="num">${fmt(p.dt_ct)}</td><td style="white-space:normal;font-size:12px">${esc(p.canh_bao)}</td></tr>`).join('');
  wb.querySelectorAll('tr[data-id]').forEach(tr => tr.addEventListener('click', () => goToThua(tr.dataset.id)));
}

/* ============================================================================
 * EDIT PANEL
 * ============================================================================ */
const MAX_IMG_DIM = 1280, MAX_IMG_BYTES = 800000;
let pendingFiles = { anh_ht: [], anh_gt: [] };
let editingId = null;

function openEditPanel(id) {
  editingId = id;
  if (isMobile()) closeMobilePanels();
  const f = state.byId[id], ed = state.edits[id] || {};
  document.getElementById('edit-thua-id').textContent = `(Tờ ${f.properties.tbd} — Thửa ${f.properties.thua}, ${f.properties.xa})`;
  const pa = document.getElementById('edit-phuong-an');
  pa.innerHTML = '<option value="">— Chưa đề xuất —</option>' + Object.keys(PHUONG_AN).map(k => `<option>${k}</option>`).join('');
  const set = (elId, v) => document.getElementById(elId).value = v || '';
  set('edit-hien-trang', ed.hien_trang); set('edit-phuong-an', ed.phuong_an);
  set('edit-ct-loai', ed.ct_loai); set('edit-ct-dt', ed.ct_dt);
  set('edit-sdt', ed.sdt); set('edit-nam-sd', ed.nam_sd); set('edit-ghi-chu', ed.ghi_chu);
  set('edit-nguoi-ra-soat', ed.nguoi_ra_soat || localStorage.getItem('daiphuc_nguoi_rs'));
  set('edit-ngay-ra-soat', ed.ngay_ra_soat || today());
  pendingFiles = { anh_ht: (ed.anh_ht || []).slice(), anh_gt: (ed.anh_gt || []).slice() };
  renderImagePreview('anh_ht'); renderImagePreview('anh_gt');
  document.getElementById('edit-panel').classList.add('open');
}
function closeEditPanel() {
  document.getElementById('edit-panel').classList.remove('open');
  pendingFiles = { anh_ht: [], anh_gt: [] };
}

function saveEdit() {
  if (!editingId) return;
  const get = id => document.getElementById(id).value.trim();
  const ed = {
    hien_trang: get('edit-hien-trang'), phuong_an: get('edit-phuong-an'),
    ct_loai: get('edit-ct-loai'), ct_dt: get('edit-ct-dt'),
    sdt: get('edit-sdt'), nam_sd: get('edit-nam-sd'), ghi_chu: get('edit-ghi-chu'),
    nguoi_ra_soat: get('edit-nguoi-ra-soat'), ngay_ra_soat: get('edit-ngay-ra-soat'),
    anh_ht: pendingFiles.anh_ht.slice(), anh_gt: pendingFiles.anh_gt.slice(),
  };
  Object.keys(ed).forEach(k => { if (ed[k] === '' || (Array.isArray(ed[k]) && !ed[k].length)) delete ed[k]; });
  const meaningful = Object.keys(ed).some(k => !['nguoi_ra_soat', 'ngay_ra_soat'].includes(k));
  const backup = state.edits[editingId];
  if (meaningful) state.edits[editingId] = ed; else delete state.edits[editingId];
  try {
    saveEdits();
    if (ed.nguoi_ra_soat) localStorage.setItem('daiphuc_nguoi_rs', ed.nguoi_ra_soat);
  } catch (e) {
    if (backup) state.edits[editingId] = backup; else delete state.edits[editingId];
    return toast('Bộ nhớ trình duyệt đầy — bỏ bớt ảnh hoặc xuất JSON rồi xóa bớt.', 'err');
  }
  const id = editingId;
  closeEditPanel();
  toast('Đã lưu vào trình duyệt', 'ok');
  if (state.layerById[id]) state.layerById[id].setStyle(styleFor(state.byId[id]));
  renderThuaDetail(state.byId[id]);
}

async function onPickImages(input, key) {
  for (const file of Array.from(input.files || [])) {
    try {
      let data;
      if (file.type === 'application/pdf') {
        if (file.size > 3 * 1024 * 1024) { toast(`${file.name} > 3MB — bỏ qua`, 'err'); continue; }
        data = await fileToBase64(file);
      } else data = await resizeImage(file, MAX_IMG_DIM);
      pendingFiles[key].push({ name: file.name, type: file.type, size: data.length, data });
    } catch (e) { toast('Lỗi xử lý file: ' + e.message, 'err'); }
  }
  input.value = '';
  renderImagePreview(key);
}
function fileToBase64(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
}
function resizeImage(file, maxDim) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      let { width: w, height: h } = img;
      if (w > maxDim || h > maxDim) { const r = Math.min(maxDim / w, maxDim / h); w = Math.round(w * r); h = Math.round(h * r); }
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      let q = 0.85, out = cv.toDataURL('image/jpeg', q);
      while (out.length > MAX_IMG_BYTES && q > 0.4) { q -= 0.1; out = cv.toDataURL('image/jpeg', q); }
      res(out);
    };
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}
function renderImagePreview(key) {
  const el = document.getElementById('preview-' + key);
  if (!el) return;
  el.innerHTML = pendingFiles[key].map((f, i) => `<div class="img-item">${f.type === 'application/pdf' ? `<div class="pdf-icon" title="${esc(f.name)}">📄</div>` : `<img src="${f.data}" alt="${esc(f.name)}">`}<button class="del-btn" onclick="removeImage('${key}',${i})" title="Xóa">×</button></div>`).join('');
}
function removeImage(key, i) { pendingFiles[key].splice(i, 1); renderImagePreview(key); }
function viewImage(id, key, i) {
  const f = state.edits[id]?.[key]?.[i];
  if (!f) return;
  if (f.type === 'application/pdf') { const w = window.open(); if (w) w.location = f.data; return; }
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:20px';
  ov.innerHTML = `<img src="${f.data}" style="max-width:95%;max-height:95%;object-fit:contain;border-radius:6px">`;
  ov.onclick = () => ov.remove();
  document.body.appendChild(ov);
}

/* ============================================================================
 * BIỂU RÀ SOÁT + EXCEL
 * ============================================================================ */
function getReportData() {
  return Object.entries(state.edits).map(([id, ed]) => {
    const f = state.byId[id];
    return f ? { ...f.properties, ...ed } : null;
  }).filter(Boolean).sort((a, b) => (XA_ORDER.indexOf(a.xa) - XA_ORDER.indexOf(b.xa)) || (a.tbd - b.tbd) || (a.thua - b.thua));
}

function renderReport() {
  const data = getReportData();
  const sumEl = document.getElementById('report-summary'), tbody = document.getElementById('report-table-body');
  if (!data.length) {
    sumEl.innerHTML = '<div style="text-align:center;color:var(--text-secondary);padding:20px">Chưa có thửa nào được rà soát. Click vào thửa trên bản đồ → <em>Cập nhật</em> để ghi kết quả rà soát. Có thể <em>Nhập JSON</em> do cán bộ khác xuất để gộp dữ liệu.</div>';
    tbody.innerHTML = '';
    return;
  }
  const count = k => data.reduce((o, d) => (d[k] ? (o[d[k]] = (o[d[k]] || 0) + 1, o) : o), {});
  const list = o => Object.entries(o).map(([k, v]) => `${esc(k)} (${v})`).join(' • ');
  const dt = data.reduce((s, d) => s + (+d.dt || 0), 0);
  const nguoi = count('nguoi_ra_soat');
  sumEl.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:10px">
      <div><strong>Số thửa đã rà soát:</strong> ${data.length} / ${state.features.length} (${(data.length / state.features.length * 100).toFixed(1)}%)</div>
      <div><strong>Diện tích:</strong> ${ha(dt)} ha</div>
      <div><strong>Số cán bộ:</strong> ${Object.keys(nguoi).length}</div>
    </div>
    ${Object.keys(count('phuong_an')).length ? `<div style="font-size:12px;color:var(--text-secondary)"><strong>Phương án:</strong> ${list(count('phuong_an'))}</div>` : ''}
    ${Object.keys(count('hien_trang')).length ? `<div style="font-size:12px;color:var(--text-secondary);margin-top:4px"><strong>Hiện trạng:</strong> ${list(count('hien_trang'))}</div>` : ''}`;
  tbody.innerHTML = data.map(d => `<tr>
      <td>${d.xa}</td><td>${d.tbd}</td><td>${d.thua}</td><td>${esc(tenHienThi(d))}</td><td>${esc(d.loai)}</td>
      <td class="num">${fmt(d.dt)}</td><td>${esc(d.hien_trang || '')}</td><td>${esc(d.phuong_an || '')}</td>
      <td>${d.ct_loai ? esc(d.ct_loai) + (d.ct_dt ? ` (${esc(d.ct_dt)}m²)` : '') : ''}</td>
      <td>${esc(d.sdt || '')}</td><td style="max-width:200px;white-space:normal">${esc(d.ghi_chu || '')}</td>
      <td>${esc(d.nguoi_ra_soat || '')}</td><td>${esc(d.ngay_ra_soat || '')}</td>
      <td><button class="btn" style="padding:3px 8px;font-size:11px" onclick="goToThua('${d.id}')">📍 Xem</button> <button class="btn" style="padding:3px 8px;font-size:11px;color:var(--danger)" onclick="deleteEdit('${d.id}')">🗑</button></td>
    </tr>`).join('');
}

function deleteEdit(id) {
  if (!confirm(`Xóa thông tin rà soát của thửa ${id}?`)) return;
  delete state.edits[id];
  saveEdits();
  if (state.layerById[id]) state.layerById[id].setStyle(styleFor(state.byId[id]));
  renderReport();
  toast('Đã xóa', 'ok');
}

function exportReportJson() {
  if (!Object.keys(state.edits).length) return toast('Chưa có dữ liệu', 'err');
  const out = { du_an: PROJECT_NAME, don_vi: ORG_NAME, ngay_xuat: new Date().toISOString(), so_thua: Object.keys(state.edits).length, edits: state.edits };
  download(new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' }), `rasoat_daiphuc_${today()}.json`);
  toast('Đã xuất JSON', 'ok');
}

function importReportJson(input) {
  const file = input.files && input.files[0];
  input.value = '';
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const j = JSON.parse(r.result);
      const edits = j.edits || {};
      let added = 0, replaced = 0, skipped = 0;
      Object.entries(edits).forEach(([id, ed]) => {
        if (!state.byId[id]) { skipped++; return; }
        const cur = state.edits[id];
        if (cur && (cur.ngay_ra_soat || '') > (ed.ngay_ra_soat || '')) { skipped++; return; }
        cur ? replaced++ : added++;
        state.edits[id] = ed;
      });
      saveEdits();
      restyleAll();
      renderReport();
      toast(`Đã gộp: ${added} mới, ${replaced} cập nhật, ${skipped} bỏ qua`, 'ok');
    } catch (e) { toast('File JSON không hợp lệ', 'err'); }
  };
  r.readAsText(file);
}

function makeSheet(title, sub, headers, rows, widths) {
  const ws = XLSX.utils.aoa_to_sheet([[title], [sub], [`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`], [], headers, ...rows]);
  ws['!merges'] = [0, 1, 2].map(r => ({ s: { r, c: 0 }, e: { r, c: headers.length - 1 } }));
  ws['!cols'] = widths.map(w => ({ wch: w }));
  return ws;
}

function exportReportExcel() {
  const data = getReportData();
  if (!data.length) return toast('Chưa có dữ liệu', 'err');
  if (typeof XLSX === 'undefined') return toast('Thư viện Excel chưa tải', 'err');
  const headers = ['STT', 'Đơn vị HC', 'Tờ BĐ', 'Thửa', 'Đối tượng QL, SD', 'Loại đất', 'DT bản đồ (m²)', 'DT hồ sơ (m²)', 'DT Cty bàn giao (m²)',
    'Hiện trạng QL, SD', 'Phương án đề xuất', 'Loại công trình', 'DT công trình (m²)', 'Năm bắt đầu SD', 'SĐT', 'Ghi chú', 'Số ảnh', 'Số giấy tờ', 'Người rà soát', 'Ngày rà soát'];
  const rows = data.map((d, i) => [i + 1, xaLabel(d.xa), d.tbd, d.thua, d.ten || '', d.loai, d.dt, d.dt_hs, d.dt_ct,
    d.hien_trang || '', d.phuong_an || '', d.ct_loai || '', d.ct_dt || '', d.nam_sd || '', d.sdt || '', d.ghi_chu || '',
    (d.anh_ht || []).length, (d.anh_gt || []).length, d.nguoi_ra_soat || '', d.ngay_ra_soat || '']);
  const ws = makeSheet('BIỂU TỔNG HỢP KẾT QUẢ RÀ SOÁT THỬA ĐẤT', `${PROJECT_NAME} — ${ORG_NAME}`, headers, rows,
    [5, 14, 6, 6, 26, 9, 12, 12, 12, 26, 30, 16, 10, 10, 13, 30, 7, 8, 18, 11]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Biểu rà soát');
  XLSX.writeFile(wb, `BieuRaSoat_DaiPhuc_${today().replace(/-/g, '')}.xlsx`);
  toast('Đã xuất Excel', 'ok');
}

function exportAllExcel() {
  if (typeof XLSX === 'undefined') return toast('Thư viện Excel chưa tải', 'err');
  const fs = state.features.map(props).sort((a, b) => (XA_ORDER.indexOf(a.xa) - XA_ORDER.indexOf(b.xa)) || (a.tbd - b.tbd) || (a.thua - b.thua));
  const headers = ['STT', 'Đơn vị HC', 'Tờ BĐ', 'Thửa', 'Đối tượng QL, SD', 'Loại đất', 'DT bản đồ (m²)', 'DT hồ sơ (m²)', 'DT Cty bàn giao (m²)', 'Phương án đề xuất', 'Ghi chú'];
  const rows = fs.map((p, i) => [i + 1, xaLabel(p.xa), p.tbd, p.thua, p.ten || '', p.loai, p.dt, p.dt_hs, p.dt_ct, p.phuong_an || '', p.canh_bao || '']);
  const t = k => fs.reduce((s, p) => s + (+p[k] || 0), 0);
  rows.push(['', 'TỔNG CỘNG', '', '', `${fs.length} thửa`, '', +t('dt').toFixed(1), +t('dt_hs').toFixed(1), +t('dt_ct').toFixed(1), '', '']);
  const ws = makeSheet('BIỂU DANH SÁCH THỬA ĐẤT THU HỒI TỪ CÔNG TY LÂM NGHIỆP THÁI NGUYÊN', ORG_NAME, headers, rows, [5, 14, 6, 6, 28, 9, 12, 12, 12, 30, 50]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Danh sách thửa');
  XLSX.writeFile(wb, `DanhSachThua_DaiPhuc_${today().replace(/-/g, '')}.xlsx`);
  toast('Đã xuất Excel', 'ok');
}

/* ============================================================================
 * HELP
 * ============================================================================ */
function fillHelp() {
  document.getElementById('help-n').textContent = fmt(state.features.length, 0);
  document.getElementById('help-ha').textContent = ha(state.features.reduce((s, f) => s + f.properties.dt, 0));
  const codes = {};
  state.features.forEach(f => (codes[f.properties.nhom] = codes[f.properties.nhom] || new Set()).add(f.properties.loai));
  document.getElementById('help-nhom').innerHTML = Object.entries(NHOM).map(([k, v]) =>
    `<li><span class="swatch" style="display:inline-block;width:11px;height:11px;margin-right:6px;vertical-align:-1px;background:${v.fill};border:0.5px solid ${v.stroke}"></span><strong>${v.label}:</strong> ${[...(codes[k] || [])].join(', ')}</li>`).join('');
}

/* ============================================================================
 * TOAST + MOBILE
 * ============================================================================ */
let toastTimer;
function toast(msg, type = '') {
  let el = document.querySelector('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg;
  el.className = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

function isMobile() { return window.matchMedia('(max-width: 768px)').matches; }
function openMobileSidebar() { document.getElementById('sidebar').classList.add('mobile-open'); document.getElementById('mobile-backdrop').classList.add('show'); }
function openMobileRightbar() { document.getElementById('rightbar').classList.add('mobile-open'); document.getElementById('mobile-backdrop').classList.add('show'); }
function closeRightbarMobile() { document.getElementById('rightbar').classList.remove('mobile-open'); document.getElementById('mobile-backdrop').classList.remove('show'); }
function closeMobilePanels() {
  document.getElementById('sidebar').classList.remove('mobile-open');
  closeRightbarMobile();
}
function initMobileBehavior() {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => {
    if (!isMobile()) return;
    if (btn.dataset.view === 'contact') document.getElementById('sidebar').classList.remove('mobile-open');
    else closeMobilePanels();
  }));
}

init();
