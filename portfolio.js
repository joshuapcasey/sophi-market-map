/* Sophi Mobility v2 — Portfolio Financial Rollup */
(function() {
  const DATA = window.SOPHI_DATA;
  if (!DATA) { console.error('SOPHI_DATA missing'); return; }

  const MARKET_ORDER = ['charlotte','phoenix','denver','indianapolis','cleveland','louisville'];
  const MARKET_LABEL = {
    charlotte:'Charlotte', phoenix:'Phoenix', denver:'Denver',
    indianapolis:'Indianapolis', cleveland:'Cleveland', louisville:'Louisville'
  };
  // Distinct color per market for the stacked chart (independent of pool colors)
  const MARKET_COLOR = {
    charlotte:    '#7C3AED', // violet (warm)
    phoenix:      '#DB2777', // pink
    denver:       '#0891B2', // teal — denver is the giant
    indianapolis: '#D97706', // amber — v7
    cleveland:    '#059669', // emerald
    louisville:   '#2563EB'  // blue
  };
  const POOL_LABEL = {
    anchor:'Anchor', cold_sam:'Cold SAM', ma_sam:'M&A SAM (Indy v7)'
  };
  const POOL_COLOR = {
    anchor:'#7C3AED', cold_sam:'#0891B2', ma_sam:'#D97706'
  };

  // ---- Compute rollup from accounts ---------------------------------------
  const portfolio = { y1:0,y2:0,y3:0,y4:0,y5:0, tam:0, sam:0, n_accounts:0, n_in_sam:0 };
  const byMarket = {};
  const byPool = { anchor:{y1:0,y2:0,y3:0,y4:0,y5:0}, cold_sam:{y1:0,y2:0,y3:0,y4:0,y5:0}, ma_sam:{y1:0,y2:0,y3:0,y4:0,y5:0} };

  MARKET_ORDER.forEach(mk => {
    const m = DATA.markets[mk];
    const s = m.summary;
    const row = { y1:0,y2:0,y3:0,y4:0,y5:0, tam:s.tam, sam:s.sam, n_accounts:s.n_accounts, n_in_sam:s.n_in_sam, state:s.state };
    m.accounts.forEach(a => {
      for (let i=1;i<=5;i++){
        const v = +a['y'+i] || 0;
        row['y'+i] += v;
        portfolio['y'+i] += v;
        if (byPool[a.pool]) byPool[a.pool]['y'+i] += v;
      }
    });
    byMarket[mk] = row;
    portfolio.tam += s.tam;
    portfolio.sam += s.sam;
    portfolio.n_accounts += s.n_accounts;
    portfolio.n_in_sam += s.n_in_sam;
  });

  const fiveYrTotal = portfolio.y1 + portfolio.y2 + portfolio.y3 + portfolio.y4 + portfolio.y5;

  // ---- Format helpers ------------------------------------------------------
  const fmtM = v => '$' + (v/1e6).toFixed(v >= 1e7 ? 1 : 2) + 'M';
  const fmtK = v => v >= 1e6 ? '$' + (v/1e6).toFixed(2) + 'M' : '$' + Math.round(v/1e3) + 'K';
  const fmtNum = v => v.toLocaleString('en-US');
  const fmtPct = (n,d) => d ? (n/d*100).toFixed(0)+'%' : '0%';

  // ---- Hero stats ----------------------------------------------------------
  const heroStats = [
    { val: fmtM(fiveYrTotal),       lbl: '5-Year Cumulative SOM',  sub: 'across 6 markets' },
    { val: fmtM(portfolio.y5),      lbl: 'Y5 Run-Rate SOM',        sub: fmtPct(portfolio.y5, portfolio.tam) + ' of TAM' },
    { val: fmtM(portfolio.y1),      lbl: 'Y1 SOM',                 sub: 'first-year contracted' },
    { val: ((portfolio.y5/portfolio.y1)).toFixed(1) + '×', lbl: 'Y1→Y5 Multiple', sub: 'portfolio ramp' },
  ];
  document.getElementById('rollup-hero-stats').innerHTML = heroStats.map(s =>
    `<div class="hero-stat">
       <div class="hero-stat-num">${s.val}</div>
       <div class="hero-stat-lbl">${s.lbl}</div>
       <div class="hero-stat-sub">${s.sub}</div>
     </div>`
  ).join('');

  // ---- Y1-Y5 Stacked Bar Chart --------------------------------------------
  const chartEl = document.getElementById('ramp-chart');
  const yearTotals = [portfolio.y1, portfolio.y2, portfolio.y3, portfolio.y4, portfolio.y5];
  const maxYear = Math.max(...yearTotals);
  // Round axis up to next $10M
  const axisMax = Math.ceil(maxYear / 10e6) * 10e6;
  const ticks = [];
  for (let v = 0; v <= axisMax; v += 10e6) ticks.push(v);

  let chartHTML = `
    <div class="ramp-axis">
      ${ticks.slice().reverse().map(t => `<div class="ramp-tick"><span>${t === 0 ? '0' : '$'+t/1e6+'M'}</span></div>`).join('')}
    </div>
    <div class="ramp-cols">
      ${[1,2,3,4,5].map(yr => {
        const yrTotal = portfolio['y'+yr];
        const totalH = (yrTotal / axisMax) * 100;
        // Stack segments per market, in MARKET_ORDER (warm market first/bottom)
        let stacked = '';
        let cumulativePct = 0;
        MARKET_ORDER.forEach(mk => {
          const v = byMarket[mk]['y'+yr];
          if (v <= 0) return;
          const segPct = (v / yrTotal) * 100;
          stacked += `<div class="ramp-seg" style="height:${segPct}%;background:${MARKET_COLOR[mk]};" title="${MARKET_LABEL[mk]} Y${yr}: ${fmtK(v)}"></div>`;
          cumulativePct += segPct;
        });
        return `
          <div class="ramp-col">
            <div class="ramp-col-total">${fmtM(yrTotal)}</div>
            <div class="ramp-bar-wrap">
              <div class="ramp-bar" style="height:${totalH}%;">${stacked}</div>
            </div>
            <div class="ramp-col-lbl">Y${yr}</div>
          </div>`;
      }).join('')}
    </div>
  `;
  chartEl.innerHTML = chartHTML;

  // ---- Chart legend --------------------------------------------------------
  document.getElementById('ramp-legend').innerHTML = MARKET_ORDER.map(mk => {
    const five = byMarket[mk].y1+byMarket[mk].y2+byMarket[mk].y3+byMarket[mk].y4+byMarket[mk].y5;
    return `<div class="ramp-legend-item">
      <span class="ramp-legend-dot" style="background:${MARKET_COLOR[mk]};"></span>
      <span class="ramp-legend-name">${MARKET_LABEL[mk]}</span>
      <span class="ramp-legend-val">${fmtM(five)}</span>
    </div>`;
  }).join('');

  // ---- 5-Year Cumulative list (horizontal bars) ---------------------------
  const cumulList = document.getElementById('cumulative-list');
  const marketTotals = MARKET_ORDER.map(mk => ({
    mk, label: MARKET_LABEL[mk], color: MARKET_COLOR[mk],
    total: byMarket[mk].y1+byMarket[mk].y2+byMarket[mk].y3+byMarket[mk].y4+byMarket[mk].y5,
    state: byMarket[mk].state
  })).sort((a,b) => b.total - a.total);
  const maxTotal = marketTotals[0].total;
  cumulList.innerHTML = marketTotals.map(r => {
    const pct = (r.total / maxTotal) * 100;
    const sharePct = (r.total / fiveYrTotal * 100).toFixed(1);
    return `<a class="cumul-row" href="./market.html?m=${r.mk}">
      <div class="cumul-row-head">
        <span class="cumul-row-name">${r.label}</span>
        <span class="cumul-row-state ${r.state.toLowerCase()}">${r.state === 'WARM' ? 'Warm' : 'Cold'}</span>
        <span class="cumul-row-val">${fmtM(r.total)}</span>
      </div>
      <div class="cumul-bar-track">
        <div class="cumul-bar-fill" style="width:${pct}%;background:${r.color};"></div>
      </div>
      <div class="cumul-row-share">${sharePct}% of portfolio</div>
    </a>`;
  }).join('');

  // ---- Y5 SOM by Pool ------------------------------------------------------
  const poolMix = document.getElementById('pool-mix');
  const poolEntries = ['cold_sam','anchor','ma_sam']
    .map(p => ({ pool:p, label:POOL_LABEL[p], color:POOL_COLOR[p], y5:byPool[p].y5,
                 five: byPool[p].y1+byPool[p].y2+byPool[p].y3+byPool[p].y4+byPool[p].y5 }))
    .filter(r => r.y5 > 0)
    .sort((a,b) => b.y5 - a.y5);
  const poolMaxY5 = poolEntries[0]?.y5 || 1;

  poolMix.innerHTML = poolEntries.map(r => {
    const pct = (r.y5 / poolMaxY5) * 100;
    const share = (r.y5 / portfolio.y5 * 100).toFixed(1);
    return `<div class="poolmix-row">
      <div class="poolmix-row-head">
        <span class="pool-dot" style="background:${r.color};"></span>
        <span class="poolmix-row-name">${r.label}</span>
        <span class="poolmix-row-val">${fmtM(r.y5)}</span>
      </div>
      <div class="poolmix-bar-track">
        <div class="poolmix-bar-fill" style="width:${pct}%;background:${r.color};"></div>
      </div>
      <div class="poolmix-row-share">${share}% of Y5 SOM · 5-yr ${fmtM(r.five)}</div>
    </div>`;
  }).join('');

  // ---- Comparison Table ---------------------------------------------------
  const tbody = document.querySelector('#rollup-table tbody');
  tbody.innerHTML = MARKET_ORDER.map(mk => {
    const r = byMarket[mk];
    const five = r.y1+r.y2+r.y3+r.y4+r.y5;
    const stateLbl = r.state === 'WARM' ? 'Warm' : 'Cold';
    return `<tr onclick="window.location.href='./market.html?m=${mk}'">
      <td class="t-left"><a href="./market.html?m=${mk}">${MARKET_LABEL[mk]}</a></td>
      <td><span class="state-pill ${r.state.toLowerCase()}">${stateLbl}</span></td>
      <td class="t-right">${fmtM(r.tam)}</td>
      <td class="t-right">${fmtM(r.sam)}</td>
      <td class="t-right">${fmtM(r.y1)}</td>
      <td class="t-right strong">${fmtM(r.y5)}</td>
      <td class="t-right strong">${fmtM(five)}</td>
      <td class="t-right">${r.n_accounts}</td>
      <td class="t-right">${r.n_in_sam}</td>
    </tr>`;
  }).join('');

  const tfoot = document.querySelector('#rollup-table tfoot');
  tfoot.innerHTML = `<tr class="totals-row">
    <td class="t-left">Portfolio</td>
    <td>—</td>
    <td class="t-right">${fmtM(portfolio.tam)}</td>
    <td class="t-right">${fmtM(portfolio.sam)}</td>
    <td class="t-right">${fmtM(portfolio.y1)}</td>
    <td class="t-right strong">${fmtM(portfolio.y5)}</td>
    <td class="t-right strong">${fmtM(fiveYrTotal)}</td>
    <td class="t-right">${portfolio.n_accounts}</td>
    <td class="t-right">${portfolio.n_in_sam}</td>
  </tr>`;

})();
