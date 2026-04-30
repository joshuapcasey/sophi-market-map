/* Sophi Mobility v2 — landing page logic */
(function() {
  const DATA = window.SOPHI_DATA;
  if (!DATA) { console.error('SOPHI_DATA missing'); return; }

  const MARKET_ORDER = ['charlotte', 'phoenix', 'denver', 'indianapolis', 'cleveland', 'louisville'];

  // ---- Hero totals ---------------------------------------------------------
  let totalAccts = 0, totalTAM = 0, totalSAM = 0, totalY5 = 0, totalInSAM = 0;
  MARKET_ORDER.forEach(k => {
    const m = DATA.markets[k];
    totalAccts += m.summary.n_accounts;
    totalTAM   += m.summary.tam;
    totalSAM   += m.summary.sam;
    totalY5    += m.summary.y5_som;
    totalInSAM += m.summary.n_in_sam;
  });

  const heroStats = [
    { val: '$' + fmtM(totalTAM),         lbl: 'Portfolio TAM',  sub: '6 markets' },
    { val: '$' + fmtM(totalSAM),         lbl: 'Addressable SAM', sub: pct(totalSAM, totalTAM) + ' of TAM' },
    { val: '$' + fmtM(totalY5),          lbl: 'Y5 SOM',         sub: pct(totalY5, totalTAM) + ' of TAM' },
    { val: fmtNum(totalAccts),           lbl: 'Accounts',       sub: totalInSAM + ' in SAM' },
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
    const isWarm = s.state === 'WARM';
    const isV7 = key === 'indianapolis';
    const stateClass = isWarm ? 'warm' : 'cold';
    const stateLabel = isWarm ? 'Warm · 4 anchors' : (isV7 ? 'Cold · v7 hometown' : 'Cold start');

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
            <div class="market-card-stat-val">$${fmtM(s.y5_som)}</div>
            <div class="market-card-stat-lbl">Y5 SOM</div>
          </div>
          <div>
            <div class="market-card-stat-val">${(s.y5_tam_ratio * 100).toFixed(0)}%</div>
            <div class="market-card-stat-lbl">Y5 / TAM</div>
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
