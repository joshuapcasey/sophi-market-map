/* Sophi Mobility — market view logic */
(function() {
  'use strict';
  const DATA = window.SOPHI_DATA;
  if (!DATA) { console.error('SOPHI_DATA missing'); return; }

  const MARKET_ORDER = ['denver', 'charlotte', 'indianapolis', 'phoenix', 'cleveland', 'louisville'];

  // ---- Resolve active market from ?m= query param -------------------------
  const params = new URLSearchParams(location.search);
  let mKey = (params.get('m') || 'denver').toLowerCase();
  if (!DATA.markets[mKey]) mKey = 'denver';
  const market = DATA.markets[mKey];
  const accounts = market.accounts;

  // ---- Header / summary ---------------------------------------------------
  document.title = `${market.name} — Sophi Mobility Market Map`;
  document.getElementById('page-title').textContent = `${market.name} — Sophi Mobility`;
  document.getElementById('market-name').textContent = market.name;
  document.getElementById('market-subtitle').textContent = `Sophi Mobility · ${accounts.length} accounts`;

  document.getElementById('m-accounts').textContent = accounts.length;
  document.getElementById('m-tam').textContent = '$' + fmtM(market.summary.tam);
  document.getElementById('m-y5som').textContent = '$' + fmtM(market.summary.y5_som);
  const stateBadge = document.getElementById('state-badge');
  stateBadge.textContent = market.summary.state === 'WARM' ? 'Warm · 4 SOPHI anchors' : 'Cold start market';
  stateBadge.className = 'state-badge ' + market.summary.state.toLowerCase();

  // Market switcher
  const sw = document.getElementById('market-switcher');
  sw.innerHTML = MARKET_ORDER.map(k => {
    const nm = DATA.markets[k].name;
    return `<option value="${k}" ${k === mKey ? 'selected' : ''}>${nm}</option>`;
  }).join('');
  sw.addEventListener('change', e => {
    location.href = `./market.html?m=${e.target.value}`;
  });

  // ---- Derive posture & search text for every account --------------------
  const STRONG_OPS = ['towne park','laz','sp+','sp plus','propark','abm'];
  const WEAK_OPS   = ['park inc','pmc','preferred','premium','pro park','propark valet','epic'];
  const IN_HOUSE_KEYWORDS = ['in-house','in house','self-op','self op','self park','self-park'];
  const HOSPITAL_IN_HOUSE = ['hca','healthone','norton','uofl health','adventhealth','baptist','iu health','ascension','franciscan','indiana university health','u of l health','university of louisville','hca healthone'];

  function classifyPosture(a) {
    const op = (a.valet_operator || '').toString().toLowerCase().trim();
    const vr = a.valet_rate;
    const type = (a.type || '').toLowerCase();
    const name = (a.name || '').toLowerCase();

    // SOPHI current
    if (op.includes('sophi')) return 'sophi';

    // No valet signal at all → greenfield
    const hasValetSignal = !!(vr && String(vr).trim() && String(vr).toUpperCase() !== 'TBD') || !!(op && op !== 'tbd' && op !== 'unknown');
    if (!hasValetSignal) return 'greenfield';

    // In-house: explicit keyword
    if (IN_HOUSE_KEYWORDS.some(k => op.includes(k))) return 'inhouse';
    // Hospitals with operator naming their own health system
    if (type === 'hospital') {
      if (HOSPITAL_IN_HOUSE.some(k => op.includes(k) || name.includes(k))) return 'inhouse';
    }

    // Strong incumbent
    if (STRONG_OPS.some(k => op.includes(k))) return 'strong';
    // Weak incumbent
    if (WEAK_OPS.some(k => op.includes(k))) return 'weak';

    // Has valet signal but no named operator → unknown
    if (!op || op === 'tbd' || op === 'unknown') return 'unknown';

    // Named operator not in any list → treat as weak (unknown brand, still displaceable)
    return 'weak';
  }

  accounts.forEach(a => {
    a._posture = classifyPosture(a);
    a._search = [a.name, a.address, a.valet_operator, a.garage_operator,
                 a.management, a.gm, a.type].filter(Boolean).join(' ').toLowerCase();
  });

  // ---- Populate account type filters dynamically -------------------------
  const typeCounts = {};
  accounts.forEach(a => {
    const t = a.type || 'Unknown';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });
  const typeFilters = document.getElementById('type-filters');
  const sortedTypes = Object.keys(typeCounts).sort((a, b) => typeCounts[b] - typeCounts[a]);
  typeFilters.innerHTML = sortedTypes.map(t => {
    const safeId = 'type-' + t.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    return `
      <label class="filter-item">
        <input type="checkbox" checked data-type="${escHtml(t)}">
        <span class="filter-label">${escHtml(t)}</span>
        <span class="filter-count" id="${safeId}">${typeCounts[t]}</span>
      </label>
    `;
  }).join('');

  // ---- Update filter counts (tier + posture) -----------------------------
  ['A','B','C','D'].forEach(t => {
    const c = accounts.filter(a => a.tier === t).length;
    const el = document.getElementById('count-tier-' + t);
    if (el) el.textContent = c;
  });
  ['sophi','strong','weak','inhouse','unknown','greenfield'].forEach(p => {
    const c = accounts.filter(a => a._posture === p).length;
    const el = document.getElementById('count-posture-' + p);
    if (el) el.textContent = c;
  });

  // ---- Build map ---------------------------------------------------------
  const MARKET_CENTERS = {
    denver: [-104.9903, 39.7392],
    charlotte: [-80.8431, 35.2271],
    indianapolis: [-86.1581, 39.7684],
    phoenix: [-112.0740, 33.4484],
    cleveland: [-81.6944, 41.4993],
    louisville: [-85.7585, 38.2527]
  };

  const map = new maplibregl.Map({
    container: 'map',
    style: {
      version: 8,
      glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
      sources: {
        'osm-raster': {
          type: 'raster',
          tiles: [
            'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png',
            'https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          attribution: '&copy; OpenStreetMap contributors &copy; CartoDB'
        }
      },
      layers: [{ id: 'osm', type: 'raster', source: 'osm-raster' }]
    },
    center: MARKET_CENTERS[mKey],
    zoom: mKey === 'phoenix' ? 9.7 : 11,
    attributionControl: { compact: true }
  });

  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

  // Build markers
  const markers = [];
  let activePopup = null;

  accounts.forEach((a, idx) => {
    if (!a.lng || !a.lat) return;
    const el = document.createElement('div');
    const tierCls = 'tier-' + (a.tier || 'd').toLowerCase();
    const confCls = a.geo_confidence === 'fallback' ? ' fallback' : '';
    el.className = `map-marker ${tierCls}${confCls}`;
    el.dataset.idx = idx;

    const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat([a.lng, a.lat])
      .addTo(map);

    el.addEventListener('click', e => {
      e.stopPropagation();
      openModal(a);
    });

    el.addEventListener('mouseenter', () => {
      if (activePopup) activePopup.remove();
      activePopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 14 })
        .setLngLat([a.lng, a.lat])
        .setHTML(`
          <div class="popup-title">${escHtml(a.name)}</div>
          <div class="popup-meta">Tier ${a.tier || '—'} · ${escHtml(a.type || '')}</div>
        `)
        .addTo(map);
    });
    el.addEventListener('mouseleave', () => {
      if (activePopup) { activePopup.remove(); activePopup = null; }
    });

    markers.push({ marker, el, account: a, idx });
  });

  // ---- Filter state & apply ----------------------------------------------
  let currentSearch = '';
  function getActiveFilterSet(selector, attr) {
    const set = new Set();
    document.querySelectorAll(`${selector} input[type="checkbox"]`).forEach(cb => {
      if (cb.checked) set.add(cb.dataset[attr]);
    });
    return set;
  }
  function applyFilters() {
    const tiers = getActiveFilterSet('#tier-filters', 'tier');
    const types = getActiveFilterSet('#type-filters', 'type');
    const posts = getActiveFilterSet('#posture-filters', 'posture');
    let visible = 0;
    markers.forEach(({ el, account }) => {
      const show = tiers.has(account.tier) &&
                   types.has(account.type || 'Unknown') &&
                   posts.has(account._posture) &&
                   (!currentSearch || account._search.includes(currentSearch));
      el.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    document.querySelector('#stat-visible .stat-num').textContent = visible;
  }

  document.querySelectorAll('#sidebar input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', applyFilters);
  });
  document.getElementById('search-input').addEventListener('input', e => {
    currentSearch = e.target.value.trim().toLowerCase();
    applyFilters();
  });

  applyFilters();

  // ---- Modal -------------------------------------------------------------
  const overlay = document.getElementById('modal-overlay');
  const modalContent = document.getElementById('modal-content');
  document.getElementById('modal-close').addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  function closeModal() {
    overlay.classList.add('hidden');
  }

  const POSTURE_LABEL = {
    sophi: 'SOPHI current operator',
    strong: 'Strong incumbent',
    weak: 'Weak incumbent',
    inhouse: 'In-house / self-op',
    unknown: 'Operator unknown',
    greenfield: 'Greenfield — no valet'
  };

  function openModal(a) {
    const tierShort = a.tier || '—';
    const tierFull = a.tier_full || 'Unscored';
    const tierCls = (a.tier || 'd').toLowerCase();

    // Hero: tier badge + TAM + operator status
    const tamStr = (a.tam && a.tam > 0) ? '$' + fmtM(a.tam) + ' TAM' : null;

    const posture = a._posture;
    const postureLabel = POSTURE_LABEL[posture];
    const opDisplay = (a.valet_operator && a.valet_operator !== 'TBD') ? a.valet_operator : null;

    // Signal chips
    const signals = buildSignals(a);

    modalContent.innerHTML = `
      <div class="modal-hero">
        <div class="modal-hero-row">
          <span class="modal-tier ${tierCls}">Tier ${tierShort} · ${escHtml(tierFull.replace(/^[A-D]\s*[—-]\s*/,''))}</span>
          ${tamStr ? `<span class="modal-tam-chip">${tamStr}</span>` : ''}
          <span class="modal-posture-chip">
            <span class="posture-dot ${posture}"></span>
            ${postureLabel}${opDisplay ? ` · ${escHtml(opDisplay)}` : ''}
          </span>
        </div>
        <h2 class="modal-title">${escHtml(a.name)}</h2>
        <div class="modal-subtitle">
          <span>${escHtml(a.type || 'Account')}</span>
          ${a.address ? `<span>·</span><span>${escHtml(a.address)}</span>` : ''}
          ${a.downtown === 'YES' ? `<span>·</span><span>Downtown</span>` : ''}
        </div>
        ${signals ? `<div class="signal-strip">${signals}</div>` : ''}
      </div>

      <div class="modal-body">

        <div class="modal-group">
          <div class="modal-group-title">Priority score</div>
          <div class="modal-fields">
            <div class="modal-field"><span class="modal-field-lbl">WAS score</span><span class="modal-field-val">${fmtVal(a.was_score, v => Number(v).toFixed(2))}</span></div>
            <div class="modal-field"><span class="modal-field-lbl">Tier</span><span class="modal-field-val">${escHtml(tierFull)}</span></div>
            <div class="modal-field"><span class="modal-field-lbl">Fit</span><span class="modal-field-val">${fmtVal(a.fit, v => v + ' / 5')}</span></div>
            <div class="modal-field"><span class="modal-field-lbl">Size</span><span class="modal-field-val">${fmtVal(a.size_score, v => v + ' / 5')}</span></div>
            <div class="modal-field"><span class="modal-field-lbl">Ownership base</span><span class="modal-field-val">${fmtVal(a.owner_base, v => v + ' / 5')}</span></div>
            <div class="modal-field"><span class="modal-field-lbl">Addressability</span><span class="modal-field-val">${fmtVal(a.addressability, v => v + ' / 5')}</span></div>
          </div>
        </div>

        <div class="modal-group">
          <div class="modal-group-title">Parking economics</div>
          <div class="modal-fields">
            <div class="modal-field"><span class="modal-field-lbl">TAM</span><span class="modal-field-val">${fmtVal(a.tam, v => '$' + fmtM(v))}</span></div>
            <div class="modal-field"><span class="modal-field-lbl">Y5 revenue</span><span class="modal-field-val">${fmtVal(a.y5_rev, v => '$' + fmtM(v))}</span></div>
            <div class="modal-field"><span class="modal-field-lbl">Valet rate</span><span class="modal-field-val">${fmtVal(a.valet_rate, v => '$' + v)}</span></div>
            <div class="modal-field"><span class="modal-field-lbl">Self-park rate</span><span class="modal-field-val">${fmtVal(a.self_park_rate, v => '$' + v)}</span></div>
            <div class="modal-field"><span class="modal-field-lbl">Rooms / spaces</span><span class="modal-field-val">${fmtVal(a.rooms)}</span></div>
            <div class="modal-field"><span class="modal-field-lbl">Year-1 revenue</span><span class="modal-field-val">${fmtVal(a.y1_rev, v => '$' + fmtM(v))}</span></div>
          </div>
        </div>

        <div class="modal-group">
          <div class="modal-group-title">Valet operator &amp; competitive posture</div>
          <div class="modal-fields">
            <div class="modal-field"><span class="modal-field-lbl">Valet operator</span><span class="modal-field-val">${fmtVal(opDisplay)}</span></div>
            <div class="modal-field"><span class="modal-field-lbl">Posture</span><span class="modal-field-val">${postureLabel}</span></div>
            <div class="modal-field"><span class="modal-field-lbl">Garage operator</span><span class="modal-field-val">${fmtVal(a.garage_operator)}</span></div>
            <div class="modal-field"><span class="modal-field-lbl">Management</span><span class="modal-field-val">${fmtVal(a.management)}</span></div>
            ${a.relationship != null ? `<div class="modal-field wide"><span class="modal-field-lbl">Relationship lift</span><span class="modal-field-val">+${Number(a.relationship).toFixed(2)}</span></div>` : ''}
          </div>
        </div>

        <div class="modal-group">
          <div class="modal-group-title">Contact &amp; sales signals</div>
          <div class="modal-fields">
            <div class="modal-field"><span class="modal-field-lbl">GM</span><span class="modal-field-val">${fmtVal(a.gm)}</span></div>
            <div class="modal-field"><span class="modal-field-lbl">Phone</span><span class="modal-field-val">${a.phone ? `<a href="tel:${escAttr(a.phone)}">${escHtml(a.phone)}</a>` : '<span class="empty">—</span>'}</span></div>
            <div class="modal-field wide"><span class="modal-field-lbl">Email</span><span class="modal-field-val">${a.email ? `<a href="mailto:${escAttr(a.email)}">${escHtml(a.email)}</a>` : '<span class="empty">—</span>'}</span></div>
            <div class="modal-field wide"><span class="modal-field-lbl">Website</span><span class="modal-field-val">${a.url ? `<a href="${escAttr(a.url)}" target="_blank" rel="noopener">${escHtml(shortUrl(a.url))}</a>` : '<span class="empty">—</span>'}</span></div>
            ${a.location_notes ? `<div class="modal-field wide"><span class="modal-field-lbl">Location notes</span><span class="modal-field-val">${escHtml(a.location_notes)}</span></div>` : ''}
            ${a.sourcing_notes ? `<div class="modal-field wide"><span class="modal-field-lbl">Sourcing notes</span><span class="modal-field-val">${escHtml(a.sourcing_notes)}</span></div>` : ''}
          </div>
        </div>

      </div>
    `;

    overlay.classList.remove('hidden');
  }

  function buildSignals(a) {
    const chips = [];
    if (a.downtown === 'YES')   chips.push('<span class="signal-chip neutral">Downtown</span>');
    if (a.relationship)         chips.push(`<span class="signal-chip positive">+${Number(a.relationship).toFixed(1)} relationship</span>`);
    if (a.fit >= 4)             chips.push('<span class="signal-chip positive">Strong fit</span>');
    if (a.size_score >= 4)      chips.push('<span class="signal-chip positive">Large size</span>');
    if (a._posture === 'strong')chips.push('<span class="signal-chip negative">Hard displacement</span>');
    if (a._posture === 'greenfield') chips.push('<span class="signal-chip positive">Greenfield</span>');
    if (a.geo_confidence === 'approximate') chips.push('<span class="signal-chip warning">Approximate location</span>');
    if (a.geo_confidence === 'fallback')    chips.push('<span class="signal-chip warning">Location unverified</span>');
    return chips.join('');
  }

  // ---- Sidebar toggle (mobile) -------------------------------------------
  document.getElementById('sidebar-toggle').addEventListener('click', () => {
    document.body.classList.toggle('sidebar-open');
  });

  // ---- Helpers ------------------------------------------------------------
  function fmtM(n) {
    if (n == null) return '—';
    n = Number(n);
    if (n >= 1e9) return (n/1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n/1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n/1e3).toFixed(0) + 'K';
    return String(Math.round(n));
  }
  function fmtVal(v, formatter) {
    if (v == null || v === '' || v === 'TBD') return '<span class="empty">—</span>';
    return formatter ? formatter(v) : escHtml(String(v));
  }
  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  function escAttr(s) { return escHtml(s); }
  function shortUrl(u) {
    try { return new URL(u).hostname.replace(/^www\./,''); } catch(e) { return u; }
  }
})();
