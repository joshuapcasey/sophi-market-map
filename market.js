/* Sophi Mobility — market view (v3 penetration engine) */
(function() {
  'use strict';
  const DATA = window.SOPHI_DATA;
  if (!DATA) { console.error('SOPHI_DATA missing'); return; }

  const MARKET_ORDER = ['charlotte', 'phoenix', 'denver', 'indianapolis', 'cleveland', 'louisville'];

  const POOL_LABEL = {
    anchor:        'Anchor',
    cold_sam:      'Cold SAM',
    ma_sam:        'M&A SAM',
    partnership:   'Partnership / PMC',
    enterprise:    'Enterprise operator',
    extended_stay: 'Extended-stay brand',
    micro:         'Micro (<$150K TAM)',
  };
  const IN_SAM_POOLS = new Set(['anchor', 'cold_sam', 'ma_sam']);

  const V7_LABEL = {
    hometown_displaced:  { label: 'Indy v7 — Hometown Displaced', cls: 'positive', detail: 'Re-classified into Cold SAM via hometown advantage (Denison/Severin legacy + co-located dependency).' },
    hometown_was_boost:  { label: 'Indy v7 — Hometown +0.5 WAS', cls: 'positive', detail: 'Denison-era goodwill applies a +0.5 WAS lift on this account.' },
    ma_absorption:       { label: 'Indy v7 — M&A Absorption',   cls: 'neutral',  detail: 'Carry-in revenue from acquired hometown operator (Denison roll-in). $0.95M/yr Y2-Y5 portfolio contribution.' },
  };

  // ---- Resolve active market from ?m= query param -------------------------
  const params = new URLSearchParams(location.search);
  let mKey = (params.get('m') || 'charlotte').toLowerCase();
  if (!DATA.markets[mKey]) mKey = 'charlotte';
  const market = DATA.markets[mKey];
  const accounts = market.accounts;
  const summary = market.summary;

  // ---- Header / summary ---------------------------------------------------
  document.title = `${market.name} — Sophi Mobility Market Map`;
  document.getElementById('page-title').textContent = `${market.name} — Sophi Mobility`;
  document.getElementById('market-name').textContent = market.name;
  document.getElementById('market-subtitle').textContent =
    `Sophi Mobility · ${summary.n_accounts} accounts · ${summary.n_in_sam} in SAM`;

  document.getElementById('h-tam').textContent = '$' + fmtM(summary.tam);
  document.getElementById('h-sam').textContent = '$' + fmtM(summary.sam);
  document.getElementById('h-sam-ratio').textContent =
    `(${(summary.sam_tam_ratio * 100).toFixed(0)}% of TAM)`;
  document.getElementById('h-y5').textContent = '$' + fmtM(summary.y5_som);
  document.getElementById('h-y5-ratio').textContent =
    `(${(summary.y5_tam_ratio * 100).toFixed(0)}% of TAM)`;

  document.getElementById('m-accounts').textContent = summary.n_accounts;
  document.getElementById('m-insam').textContent = summary.n_in_sam;
  document.getElementById('m-y1som').textContent = '$' + fmtM(summary.y1_som);

  // v3: market cap badge
  const cap = market.cap;
  const nAcquired = market.n_acquired || 0;
  const stateBadge = document.getElementById('state-badge');
  const capLabel = cap ? ` · ${(cap*100).toFixed(0)}% Y5 cap` : '';
  if (summary.state === 'WARM') {
    stateBadge.textContent = `Warm · 4 Charlotte anchors${capLabel}`;
    stateBadge.className = 'state-badge warm';
  } else if (mKey === 'indianapolis') {
    stateBadge.textContent = `Cold · v7 hometown advantage${capLabel}`;
    stateBadge.className = 'state-badge cold v7';
  } else {
    stateBadge.textContent = `Cold start${capLabel}`;
    stateBadge.className = 'state-badge cold';
  }

  // Market switcher
  const sw = document.getElementById('market-switcher');
  sw.innerHTML = MARKET_ORDER.map(k => {
    const nm = DATA.markets[k].name;
    return `<option value="${k}" ${k === mKey ? 'selected' : ''}>${nm}</option>`;
  }).join('');
  sw.addEventListener('change', e => {
    location.href = `./market.html?m=${e.target.value}`;
  });

  // ---- Derive search text for every account -----------------------------
  accounts.forEach(a => {
    a._search = [a.name, a.address, a.valet_operator, a.garage_operator,
                 a.management, a.gm, a.type, a.pool_raw, a.tam_class,
                 a.gate_status, a.group_key]
                 .filter(Boolean).join(' ').toLowerCase();
  });

  // ---- Populate account type filters dynamically -------------------------
  const typeCounts = {};
  accounts.forEach(a => {
    const t = a.type || 'Unknown';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });
  const typeFilters = document.getElementById('type-filters');
  const sortedTypes = Object.keys(typeCounts).sort((a, b) => typeCounts[b] - typeCounts[a]);
  typeFilters.innerHTML = sortedTypes.map(t => `
    <label class="filter-item">
      <input type="checkbox" checked data-type="${escAttr(t)}">
      <span class="filter-label">${escHtml(t)}</span>
      <span class="filter-count">${typeCounts[t]}</span>
    </label>
  `).join('');

  // ---- Update pool filter counts ----------------------------------------
  Object.keys(POOL_LABEL).forEach(pool => {
    const c = accounts.filter(a => a.pool === pool).length;
    const el = document.getElementById('count-pool-' + pool);
    if (el) el.textContent = c;
    // Hide filter row if count is zero in this market (keeps sidebar tight)
    const cb = document.querySelector(`input[data-pool="${pool}"]`);
    if (cb && c === 0) cb.closest('.filter-item').style.display = 'none';
  });

  // ---- Build map ---------------------------------------------------------
  const center = market.center || [-98, 39];
  const zoom = mKey === 'phoenix' ? 9.7 : (mKey === 'denver' ? 10.3 : 11);

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
    center: center,
    zoom: zoom,
    attributionControl: { compact: true }
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

  // Build markers
  const markers = [];
  let activePopup = null;

  accounts.forEach((a, idx) => {
    if (!a.lng || !a.lat) return;
    const el = document.createElement('div');
    const poolCls = 'pool-' + (a.pool || 'micro');
    const samCls = a.in_sam ? 'in-sam' : 'out-sam';
    const fbCls = a.geocoded === false ? ' fallback' : '';
    const v7Cls = a.v7_layer ? ' has-v7' : '';
    el.className = `map-marker ${poolCls} ${samCls}${fbCls}${v7Cls}`;
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
      const tamLine = (a.tam && a.tam > 0) ? `$${fmtM(a.tam)} TAM` : '';
      const v7Line = a.v7_layer ? ` · ${V7_LABEL[a.v7_layer]?.label.replace('Indy v7 — ', 'v7: ') || 'v7'}` : '';
      activePopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 14 })
        .setLngLat([a.lng, a.lat])
        .setHTML(`
          <div class="popup-title">${escHtml(a.name)}</div>
          <div class="popup-meta">${escHtml(POOL_LABEL[a.pool] || a.pool || '—')} · ${tamLine}${v7Line}</div>
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
    const poolsIn  = getActiveFilterSet('#pool-filters-in',  'pool');
    const poolsOut = getActiveFilterSet('#pool-filters-out', 'pool');
    const types = getActiveFilterSet('#type-filters', 'type');
    let visible = 0;
    markers.forEach(({ el, account }) => {
      const poolMatch = account.in_sam ? poolsIn.has(account.pool) : poolsOut.has(account.pool);
      const typeMatch = types.has(account.type || 'Unknown');
      const searchMatch = !currentSearch || account._search.includes(currentSearch);
      const show = poolMatch && typeMatch && searchMatch;
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

  function closeModal() { overlay.classList.add('hidden'); }

  function openModal(a) {
    const poolKey = a.pool || 'micro';
    const poolLabel = POOL_LABEL[poolKey] || poolKey;
    const tamStr = (a.tam && a.tam > 0) ? '$' + fmtM(a.tam) + ' TAM' : null;
    const samBadge = a.in_sam
      ? `<span class="modal-sam-chip in-sam">In SAM</span>`
      : `<span class="modal-sam-chip out-sam">Out of SAM · ${escHtml(poolLabel)}</span>`;

    // V7 callout
    const v7 = a.v7_layer && V7_LABEL[a.v7_layer];
    const v7Block = v7
      ? `<div class="v7-callout ${v7.cls}">
           <div class="v7-callout-label">${escHtml(v7.label)}</div>
           <div class="v7-callout-detail">${escHtml(v7.detail)}</div>
         </div>`
      : '';

    // SAM/SOM trajectory bars
    const trajectoryHtml = renderTrajectory(a);

    // Tier display (still useful as a secondary signal)
    const tierShort = a.tier || '—';
    const tierFull = a.tier_full || 'Unscored';
    const tierCls = (a.tier || 'd').toString().toLowerCase();

    modalContent.innerHTML = `
      <div class="modal-hero">
        <div class="modal-hero-row">
          <span class="modal-pool-chip pool-${poolKey}">
            <span class="pool-dot pool-${poolKey}-dot"></span>
            ${escHtml(poolLabel)}
          </span>
          ${samBadge}
          ${tamStr ? `<span class="modal-tam-chip">${tamStr}</span>` : ''}
          ${a.tier ? `<span class="modal-tier ${tierCls}">Tier ${tierShort}</span>` : ''}
        </div>
        <h2 class="modal-title">${escHtml(a.name)}</h2>
        <div class="modal-subtitle">
          <span>${escHtml(a.type || 'Account')}</span>
          ${a.address ? `<span>·</span><span>${escHtml(a.address)}</span>` : ''}
          ${a.area === 'YES' ? `<span>·</span><span>Downtown</span>` : ''}
        </div>
        ${v7Block}
      </div>

      <div class="modal-body">

        ${a.in_sam ? `
        <div class="modal-group">
          <div class="modal-group-title">v3 lifecycle — acquisition &amp; trajectory</div>
          ${renderV3LifecycleBlock(a)}
          ${trajectoryHtml}
          <div class="modal-fields modal-fields-tight">
            <div class="modal-field"><span class="modal-field-lbl">Annual TAM (post-acq)</span><span class="modal-field-val">${fmtVal(a.tam, v => '$' + fmtM(v))}</span></div>
            <div class="modal-field"><span class="modal-field-lbl">SAM contribution</span><span class="modal-field-val">${fmtVal(a.sam_contrib, v => '$' + fmtM(v))}</span></div>
            <div class="modal-field"><span class="modal-field-lbl">Ownership group</span><span class="modal-field-val">${fmtVal(a.group_key, v => v.replace(/_/g,' '))}</span></div>
            <div class="modal-field"><span class="modal-field-lbl">Group wins at acq.</span><span class="modal-field-val">${a.acquisition_year ? (a.group_wins_at_acquisition ?? 0) : '—'}</span></div>
          </div>
        </div>
        ` : `
        <div class="modal-group">
          <div class="modal-group-title">Why excluded from SAM</div>
          <div class="modal-exclusion">${escHtml(samExclusionReason(a))}</div>
        </div>
        `}

        <div class="modal-group">
          <div class="modal-group-title">Parking economics &amp; TAM</div>
          <div class="modal-fields">
            <div class="modal-field"><span class="modal-field-lbl">TAM</span><span class="modal-field-val">${fmtVal(a.tam, v => '$' + fmtM(v))}</span></div>
            <div class="modal-field"><span class="modal-field-lbl">TAM class</span><span class="modal-field-val">${fmtVal(a.tam_class)}</span></div>
            <div class="modal-field"><span class="modal-field-lbl">Valet rate</span><span class="modal-field-val">${fmtVal(a.valet_rate, v => '$' + v)}</span></div>
            <div class="modal-field"><span class="modal-field-lbl">Self-park rate</span><span class="modal-field-val">${fmtVal(a.self_park_rate, v => '$' + v)}</span></div>
            <div class="modal-field"><span class="modal-field-lbl">Rooms</span><span class="modal-field-val">${fmtVal(a.rooms)}</span></div>
            <div class="modal-field"><span class="modal-field-lbl">Seats</span><span class="modal-field-val">${fmtVal(a.seats)}</span></div>
            <div class="modal-field"><span class="modal-field-lbl">Occupancy</span><span class="modal-field-val">${fmtVal(a.occupancy, v => (v <= 1 ? Math.round(v*100) : v) + '%')}</span></div>
            <div class="modal-field"><span class="modal-field-lbl">Valet conv.</span><span class="modal-field-val">${fmtVal(a.valet_conv, v => (v <= 1 ? (v*100).toFixed(1) : v) + '%')}</span></div>
            ${a.tam_status ? `<div class="modal-field wide"><span class="modal-field-lbl">TAM status</span><span class="modal-field-val">${escHtml(a.tam_status)}</span></div>` : ''}
            ${a.tam_notes ? `<div class="modal-field wide"><span class="modal-field-lbl">TAM notes</span><span class="modal-field-val">${escHtml(a.tam_notes)}</span></div>` : ''}
          </div>
        </div>

        <div class="modal-group">
          <div class="modal-group-title">WAS scoring</div>
          <div class="modal-fields">
            <div class="modal-field"><span class="modal-field-lbl">WAS score</span><span class="modal-field-val">${fmtVal(a.was, v => Number(v).toFixed(2))}</span></div>
            <div class="modal-field"><span class="modal-field-lbl">Tier</span><span class="modal-field-val">${escHtml(tierFull)}</span></div>
            ${a.was_base != null ? `<div class="modal-field"><span class="modal-field-lbl">WAS base</span><span class="modal-field-val">${Number(a.was_base).toFixed(2)}</span></div>` : ''}
            ${a.was_boost != null ? `<div class="modal-field"><span class="modal-field-lbl">WAS boost</span><span class="modal-field-val">+${Number(a.was_boost).toFixed(2)}</span></div>` : ''}
          </div>
        </div>

        <div class="modal-group">
          <div class="modal-group-title">Operator &amp; management</div>
          <div class="modal-fields">
            <div class="modal-field"><span class="modal-field-lbl">Valet operator</span><span class="modal-field-val">${fmtVal(a.valet_operator)}</span></div>
            <div class="modal-field"><span class="modal-field-lbl">Garage operator</span><span class="modal-field-val">${fmtVal(a.garage_operator)}</span></div>
            <div class="modal-field"><span class="modal-field-lbl">Management</span><span class="modal-field-val">${fmtVal(a.management)}</span></div>
            <div class="modal-field"><span class="modal-field-lbl">GM</span><span class="modal-field-val">${fmtVal(a.gm)}</span></div>
          </div>
        </div>

        <div class="modal-group">
          <div class="modal-group-title">Contact</div>
          <div class="modal-fields">
            <div class="modal-field"><span class="modal-field-lbl">Phone</span><span class="modal-field-val">${a.phone ? `<a href="tel:${escAttr(a.phone)}">${escHtml(a.phone)}</a>` : '<span class="empty">—</span>'}</span></div>
            <div class="modal-field"><span class="modal-field-lbl">Email</span><span class="modal-field-val">${a.email ? `<a href="mailto:${escAttr(a.email)}">${escHtml(a.email)}</a>` : '<span class="empty">—</span>'}</span></div>
            <div class="modal-field wide"><span class="modal-field-lbl">Website</span><span class="modal-field-val">${a.url ? `<a href="${escAttr(a.url)}" target="_blank" rel="noopener">${escHtml(shortUrl(a.url))}</a>` : '<span class="empty">—</span>'}</span></div>
          </div>
        </div>

      </div>
    `;

    overlay.classList.remove('hidden');
  }

  function samExclusionReason(a) {
    const map = {
      partnership:   'Partnership / PMC bundled — surface via Preferred or PMC channel rather than direct displacement.',
      enterprise:    'Enterprise operator (LAZ / SP+ / Towne / Ace / Impark) — multi-property contract, harder to displace single-asset.',
      extended_stay: 'Extended-stay brand (Home2 / Homewood / Hyatt House / SpringHill / Element) — limited valet upside per asset.',
      micro:         'Micro account (TAM < $150K) — not worth direct sales motion.',
    };
    return map[a.pool] || 'Out of structural SAM.';
  }

  function renderTrajectory(a) {
    const years = [a.y1, a.y2, a.y3, a.y4, a.y5].map(v => Number(v) || 0);
    const max = Math.max(...years, a.tam || 0, 1);
    const acqYr = a.acquisition_year;
    return `
      <div class="trajectory">
        ${years.map((v, i) => {
          const yr = i + 1;
          const isAcquired = acqYr && yr >= acqYr;
          const cls = isAcquired ? 'acquired' : 'pre-acq';
          const minH = v > 0 ? 0 : 2; // sliver for pre-acq years so pattern is visible
          const barH = v > 0 ? (v / max) * 100 : minH;
          return `
          <div class="trajectory-col ${cls}">
            <div class="trajectory-bar-wrap">
              <div class="trajectory-bar" style="height: ${barH}%"></div>
            </div>
            <div class="trajectory-val">${v > 0 ? '$'+fmtM(v) : '—'}</div>
            <div class="trajectory-lbl">Y${yr}${acqYr === yr ? ' ★' : ''}</div>
          </div>`;
        }).join('')}
      </div>
    `;
  }

  function renderV3LifecycleBlock(a) {
    const ay = a.acquisition_year;
    const gs = a.gate_status || '';
    const gsLow = gs.toLowerCase();
    let pillCls = '';
    let pillTxt = '';
    let yearTxt = '';
    if (ay) {
      yearTxt = `Acquired Y${ay}`;
      if (gsLow.startsWith('anchor:')) {
        pillCls = 'anchor';
        pillTxt = 'SOPHI Anchor';
      } else if (gsLow.startsWith('v7_hometown')) {
        pillCls = 'anchor';
        pillTxt = 'v7 Hometown';
      } else if (gsLow.startsWith('v7_ma_absorption')) {
        pillCls = 'anchor';
        pillTxt = 'v7 M&A Absorption';
      } else {
        pillTxt = 'Won via gate + cap';
      }
    } else {
      yearTxt = 'Not acquired by Y5';
      if (gsLow.startsWith('gated:')) {
        pillCls = 'gated';
        pillTxt = 'Operator-gated';
      } else if (gsLow.includes('cap-deferred')) {
        pillCls = 'deferred';
        pillTxt = 'Cap-deferred';
      } else if (gsLow.startsWith('in-pool')) {
        pillCls = 'deferred';
        pillTxt = 'Below cap line';
      } else {
        pillCls = 'deferred';
        pillTxt = 'Outside 5-yr window';
      }
    }
    const detailLines = [];
    if (gs) detailLines.push(escHtml(gs));
    if (a.operator_gate) detailLines.push(`Operator gate: <strong>${escHtml(a.operator_gate)}</strong>`);
    if (ay && a.group_wins_at_acquisition != null && a.group_wins_at_acquisition > 0) {
      const m = a.group_wins_at_acquisition >= 3 ? '3×' : (a.group_wins_at_acquisition === 2 ? '2×' : '1.5×');
      detailLines.push(`Sister-property wins at acquisition: <strong>${a.group_wins_at_acquisition}</strong> (relationship multiplier ${m})`);
    }
    return `
      <div class="v3-acq-block">
        <div class="v3-acq-head">
          <span class="v3-acq-year ${ay ? '' : 'never'}">${yearTxt}</span>
          ${pillTxt ? `<span class="v3-acq-pill ${pillCls}">${pillTxt}</span>` : ''}
        </div>
        ${detailLines.length ? `<div class="v3-acq-detail">${detailLines.join(' · ')}</div>` : ''}
      </div>
    `;
  }

  // ---- Sidebar toggle (mobile) -------------------------------------------
  document.getElementById('sidebar-toggle').addEventListener('click', () => {
    document.body.classList.toggle('sidebar-open');
  });

  // ---- Helpers ------------------------------------------------------------
  function fmtM(n) {
    if (n == null) return '—';
    n = Number(n);
    if (!isFinite(n)) return '—';
    if (n >= 1e9) return (n/1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n/1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n/1e3).toFixed(0) + 'K';
    if (n === 0) return '0';
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
