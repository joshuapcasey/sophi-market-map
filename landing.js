/* Sophi Mobility — landing page logic */
(function() {
  const DATA = window.SOPHI_DATA;
  if (!DATA) { console.error('SOPHI_DATA missing'); return; }

  const MARKET_ORDER = ['denver', 'charlotte', 'indianapolis', 'phoenix', 'cleveland', 'louisville'];

  // ---- Hero totals ---------------------------------------------------------
  let totalAccts = 0, totalTAM = 0, totalY5 = 0, totalA = 0, totalB = 0;
  MARKET_ORDER.forEach(k => {
    const m = DATA.markets[k];
    totalAccts += m.summary.n_accounts;
    totalTAM   += m.summary.tam;
    totalY5    += m.summary.y5_som;
    totalA     += (m.tier_counts && m.tier_counts.A) || 0;
    totalB     += (m.tier_counts && m.tier_counts.B) || 0;
  });

  const heroStats = [
    { val: '6',                          lbl: 'Markets' },
    { val: fmtNum(totalAccts),           lbl: 'Accounts scored' },
    { val: '$' + fmtM(totalTAM),         lbl: 'Total TAM' },
    { val: '$' + fmtM(totalY5),          lbl: 'Y5 SOM' }
  ];
  document.getElementById('hero-stats').innerHTML = heroStats.map(s =>
    `<div class="hero-stat">
       <div class="hero-stat-num">${s.val}</div>
       <div class="hero-stat-lbl">${s.lbl}</div>
     </div>`
  ).join('');

  // ---- Market grid ---------------------------------------------------------
  const grid = document.getElementById('market-grid');
  grid.innerHTML = MARKET_ORDER.map(key => {
    const m = DATA.markets[key];
    const s = m.summary;
    const tc = m.tier_counts || { A:0,B:0,C:0,D:0 };
    const n = s.n_accounts;
    // tier distribution bars
    const total = (tc.A + tc.B + tc.C + tc.D) || 1;
    const tierBars = ['a','b','c','d'].map(t => {
      const count = tc[t.toUpperCase()];
      const pct = (count / total) * 100;
      return count > 0 ? `<div class="tier-bar ${t}" style="flex: ${pct}"></div>` : '';
    }).join('');
    const stateClass = s.state.toLowerCase();
    const stateLabel = s.state === 'WARM' ? 'Warm · 4 anchors' : 'Cold start';
    // tier chips (only ones with data)
    const tierChips = ['A','B','C','D'].map(t => {
      const c = tc[t];
      if (!c) return '';
      return `<span class="tier-chip"><span class="tier-dot" style="background: var(--tier-${t.toLowerCase()})"></span>${t} · ${c}</span>`;
    }).join('');

    return `
      <a class="market-card" href="./market.html?m=${key}">
        <div class="market-card-head">
          <div>
            <div class="market-card-title">${m.name}</div>
            <div class="market-card-sub">${n} accounts analyzed</div>
          </div>
          <span class="market-state-badge ${stateClass}">${stateLabel}</span>
        </div>

        <div class="tier-distribution" title="${tc.A} A · ${tc.B} B · ${tc.C} C · ${tc.D} D">
          ${tierBars}
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
            <div class="market-card-stat-val">${n}</div>
            <div class="market-card-stat-lbl">Accounts</div>
          </div>
        </div>

        <div class="market-card-tiers">${tierChips}</div>

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
  function fmtNum(n) {
    return new Intl.NumberFormat('en-US').format(n);
  }
  function fmtM(n) {
    if (n >= 1e9) return (n/1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n/1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n/1e3).toFixed(0) + 'K';
    return String(n);
  }
})();
