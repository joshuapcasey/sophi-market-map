/* Sophi Mobility v3 — landing page logic */
(function() {
  const DATA = window.SOPHI_DATA;
  if (!DATA) { console.error('SOPHI_DATA missing'); return; }

  const MARKET_ORDER = ['charlotte', 'phoenix', 'denver', 'indianapolis', 'cleveland', 'louisville'];

  // ---- Hero totals (v3: read from portfolio block) -------------------------
  const P = DATA.portfolio || {};
  const sby = P.som_by_year || {};
  const totalAccts = P.n_accounts || 0;
  const totalInSAM = P.n_in_sam || 0;
  const totalAcquired = P.n_acquired || 0;
  const totalTAM = P.tam || 0;
  const totalSAM = P.sam || 0;
  const totalY1 = sby.y1 || 0;
  const totalY5 = sby.y5 || 0;
  const total5yr = P.som_5yr_cumulative || 0;

  const heroStats = [
    { val: '$' + fmtM(totalTAM),  lbl: 'Portfolio TAM',  sub: '6 markets · ' + fmtNum(totalAccts) + ' accounts' },
    { val: '$' + fmtM(totalSAM),  lbl: 'Addressable SAM', sub: pct(totalSAM, totalTAM) + ' of TAM · ' + totalInSAM + ' in SAM' },
    { val: '$' + fmtM(totalY5),   lbl: 'Y5 Run-Rate SOM', sub: pct(totalY5, totalTAM) + ' of TAM' },
    { val: '$' + fmtM(total5yr),  lbl: '5-Year Cumulative', sub: totalAcquired + ' accounts won by Y5' },
  ];
  document.getElementById('hero-stats').innerHTML = heroStats.map(s =>
    `<div class="hero-stat">
       <div class="hero-stat-num">${s.val}</div>
       <div class="hero-stat-lbl">${s.lbl}</div>
       <div class="hero-stat-sub">${s.sub}</div>
     </div>`
  ).join('');

  // ---- Market grid ---------------------------------------------------------
  const grid = document.getElementById('market-grid');
  grid.innerHTML = MARKET_ORDER.map(key => {
    const m = DATA.markets[key];
    const s = m.summary;
    const pc = m.pool_counts || {};
    const cap = m.cap || 0.30;
    const nAcquired = m.n_acquired || 0;
    const isWarm = s.state === 'WARM';
    const isV7 = key === 'indianapolis';
    const stateClass = isWarm ? 'warm' : 'cold';
    const stateLabel = isWarm ? 'Warm · 4 anchors' : (isV7 ? 'Cold · v7 hometown' : 'Cold start');
    const capLabel = (cap * 100).toFixed(0) + '% cap';
    const sby = s.som_by_year || {};
    const y1som = sby.y1 || 0;
    const y5som = sby.y5 || 0;

    // Pool composition bar (Anchor / Cold / M&A in-SAM | Partnership / Enterprise / Extended / Micro out)
    const inSamCount = (pc.anchor || 0) + (pc.cold_sam || 0) + (pc.ma_sam || 0);
    const outSamCount = (pc.partnership || 0) + (pc.enterprise || 0) + (pc.extended_stay || 0) + (pc.micro || 0);
    const tot = inSamCount + outSamCount || 1;
    const poolBars = [
      { p: 'anchor',        c: pc.anchor || 0 },
      { p: 'cold_sam',      c: pc.cold_sam || 0 },
      { p: 'ma_sam',        c: pc.ma_sam || 0 },
      { p: 'partnership',   c: pc.partnership || 0 },
      { p: 'enterprise',    c: pc.enterprise || 0 },
      { p: 'extended_stay', c: pc.extended_stay || 0 },
      { p: 'micro',         c: pc.micro || 0 },
    ].map(b => b.c > 0 ? `<div class="pool-bar pool-${b.p}" style="flex: ${(b.c/tot)*100}" title="${prettyPool(b.p)}: ${b.c}"></div>` : '').join('');

    // Pool chips (only those with counts)
    const poolChips = [
      ['anchor',        'Anchors'],
      ['cold_sam',      'Cold SAM'],
      ['ma_sam',        'M&A'],
      ['partnership',   'Partnership'],
      ['enterprise',    'Enterprise'],
      ['extended_stay', 'Extended'],
      ['micro',         'Micro'],
    ].map(([key, label]) => {
      const c = pc[key];
      if (!c) return '';
      const inSam = ['anchor','cold_sam','ma_sam'].includes(key);
      return `<span class="pool-chip ${inSam ? 'in-sam' : 'out-sam'}"><span class="pool-dot pool-${key}-dot"></span>${label} · ${c}</span>`;
    }).join('');

    return `
      <a class="market-card" href="./market.html?m=${key}">
        <div class="market-card-head">
          <div>
            <div class="market-card-title">${m.name}</div>
            <div class="market-card-sub">${s.n_accounts} accounts · ${s.n_in_sam} in SAM</div>
          </div>
          <span class="market-state-badge ${stateClass}">${stateLabel}</span>
        </div>

        <div class="pool-distribution" title="${inSamCount} in-SAM · ${outSamCount} out-of-SAM">
          ${poolBars}
        </div>

        <div class="market-card-stats">
          <div>
            <div class="market-card-stat-val">$${fmtM(s.tam)}</div>
            <div class="market-card-stat-lbl">TAM</div>
          </div>
          <div>
            <div class="market-card-stat-val">$${fmtM(y5som)}</div>
            <div class="market-card-stat-lbl">Y5 SOM · ${capLabel}</div>
          </div>
          <div>
            <div class="market-card-stat-val">${nAcquired}</div>
            <div class="market-card-stat-lbl">won by Y5</div>
          </div>
        </div>

        <div class="market-card-tiers">${poolChips}</div>

        <div class="market-card-cta">
          <span>Explore map</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </a>
    `;
  }).join('');

  // ---- Helpers -------------------------------------------------------------
  function fmtNum(n) { return new Intl.NumberFormat('en-US').format(n); }
  function fmtM(n) {
    if (n >= 1e9) return (n/1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n/1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n/1e3).toFixed(0) + 'K';
    return String(n);
  }
  function pct(n, d) {
    if (!d) return '0%';
    return (n/d*100).toFixed(0) + '%';
  }
  function prettyPool(p) {
    return ({
      anchor: 'Anchors', cold_sam: 'Cold SAM', ma_sam: 'M&A',
      partnership: 'Partnership', enterprise: 'Enterprise',
      extended_stay: 'Extended-stay', micro: 'Micro',
    })[p] || p;
  }
})();
