#!/usr/bin/env node
/* Headless smoke test for index.html.
   Usage:  python3 -m http.server 8765 &   (from the repo root)
           npm install                      (once; installs playwright)
           npx playwright install chromium  (once, if no browser is installed)
           node tools/smoke.js [base-url]   (default http://localhost:8766/)
   Prints each scenario's tiers, cards and flags so a change in ranking is visible in the diff,
   checks the evidence-browser tabs and trial links for every histology, checks phone width,
   and exits 1 on any page error or console error. */
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8766/';

const CASES = [
  // endometrioid
  {n:"EEC adj IB G3 p53abn", p:{hist:"eec",setting:"adjuvant",stage:"IB",grade:"3",mi:"ge50",lvsi:"substantial",age:66,mol:"p53abn",er:"negative"}},
  {n:"EEC adj IB G2 NSMP ER+", p:{hist:"eec",setting:"adjuvant",stage:"IB",grade:"2",mi:"ge50",lvsi:"none",age:68,mol:"NSMP",er:"positive"}},
  {n:"EEC adj FIGO2023 IA2 G1 LVSI- NSMP ER- POLE untested (low risk)", p:{hist:"eec",setting:"adjuvant",sys:"2023",stage:"IA2",grade:"1",mi:"lt50",lvsi:"none",resid:"none",mol:"NSMP_noPOLE",er:"negative"}},
  {n:"EEC adj FIGO2023 IIB G2 MI<50 (substantial LVSI → HIR)", p:{hist:"eec",setting:"adjuvant",sys:"2023",stage:"IIB",grade:"2",mi:"lt50",age:65,mol:"NSMP",er:"positive"}},
  {n:"EEC adj FIGO2023 IA2 G2 p53abn ER- cytology+", p:{hist:"eec",setting:"adjuvant",sys:"2023",stage:"IA2",grade:"2",mi:"lt50",lvsi:"none",resid:"none",cyto:"positive",mol:"p53abn",mmr:"pMMR",er:"negative",her2:"0"}},
  {n:"EEC adj IA G1 POLEmut", p:{hist:"eec",setting:"adjuvant",stage:"IA",grade:"1",mi:"lt50",age:55,mol:"POLEmut"}},
  {n:"EEC adj IIIC1 MMRd", p:{hist:"eec",setting:"adjuvant",stage:"IIIC1",grade:"3",mi:"ge50",resid:"none",mol:"MMRd"}},
  {n:"EEC 1L IVB dMMR", p:{hist:"eec",setting:"first_line",status:"primary",stage:"IVB",meas:"yes",mol:"MMRd",mmr:"dMMR"}},
  {n:"EEC 1L IVB pMMR", p:{hist:"eec",setting:"first_line",status:"primary",stage:"IVB",meas:"yes",mol:"NSMP",mmr:"pMMR"}},
  {n:"EEC 1L IVB MMR unknown", p:{hist:"eec",setting:"first_line",status:"primary",stage:"IVB",meas:"yes"}},
  {n:"EEC 1L recurrence G1 ER+ 8 mo after adjuvant chemo", p:{hist:"eec",setting:"first_line",status:"recurrence",stage:"IB",grade:"1",mol:"NSMP",er:"positive",pfi:8,ledger:[["platinum","completed_maintenance"]]}},
  {n:"EEC maintenance PR NSMP", p:{hist:"eec",setting:"maintenance",resp:"PR",mol:"NSMP"}},
  {n:"EEC 2L after chemo-IO pMMR, autoimmune", p:{hist:"eec",setting:"second_line",mol:"NSMP",mmr:"pMMR",lines:1,pfi:8,flags:["active_autoimmune_disease"],ledger:[["platinum","progressed_after"],["io","progressed_after"]]}},
  {n:"EEC fertility G1 IA", p:{hist:"eec",setting:"fertility_sparing",stage:"IA",grade:"1",mi:"none",age:32,mol:"NSMP",flags:["vte_history"]}},
  // serous
  {n:"USC adj IA MI p53abn", p:{hist:"usc",setting:"adjuvant",stage:"IA",mi:"lt50",mol:"p53abn"}},
  {n:"USC 1L IIIC2 HER2 3+", p:{hist:"usc",setting:"first_line",status:"primary",stage:"IIIC2",meas:"yes",mol:"p53abn",her2:"3+"}},
  // clear cell
  {n:"CCC adj I NSMP", p:{hist:"ccc",setting:"adjuvant",stage:"IA",mi:"lt50",mol:"NSMP"}},
  {n:"CCC 2L pMMR HER2 2+", p:{hist:"ccc",setting:"second_line",mol:"NSMP",mmr:"pMMR",her2:"2+",lines:1,ledger:[["platinum","progressed_after"]]}},
  // carcinosarcoma
  {n:"UCS adj IB sarcoma-dominant", p:{hist:"ucs",setting:"adjuvant",stage:"IB",mi:"ge50",sarc:"yes",mol:"p53abn"}},
  {n:"UCS 1L IVB pMMR", p:{hist:"ucs",setting:"first_line",status:"primary",stage:"IVB",meas:"yes",mol:"p53abn",mmr:"pMMR"}},
  {n:"UCS 2L HER2 1+ after IO, ILD", p:{hist:"ucs",setting:"second_line",mol:"p53abn",her2:"1+",flags:["ild_or_pneumonitis"],ledger:[["platinum","progressed_after"],["io","progressed_after"]]}},
];

(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const errs = [];
  const page = async (w, h) => {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(BASE + 'index.html', { waitUntil: 'networkidle' });
    await p.evaluate(() => { try { localStorage.clear() } catch (e) {} });
    await p.reload({ waitUntil: 'networkidle' });
    return p;
  };

  const p = await page(1280, 1000);
  for (const c of CASES) {
    await p.evaluate(x => applyPreset(x), c.p);
    await p.waitForTimeout(80);
    const fields = await p.$$eval('#pf .fld', fs => fs.filter(f => f.offsetParent !== null).map(f => f.querySelector('select,input').id.replace('f_', '')).join(','));
    const notices = await p.$$eval('#results .notice', n => n.map(x => x.textContent.slice(0, 90)));
    const tiers = await p.$$eval('#results > details', ds => ds.map(d => {
      const h = d.querySelector('summary h3').textContent;
      const items = [...d.querySelectorAll('.rcard')].map(c => {
        const t = c.querySelector('.tierbadge').textContent, nm = c.querySelector('.name').textContent;
        const fl = [...c.querySelectorAll('.flag')].map(f => f.querySelector('b').textContent + ': ' + f.querySelector('span').textContent.slice(0, 60));
        return `   [${t}] ${nm.slice(0, 72)}` + (fl.length ? '\n      ' + fl.join('\n      ') : '');
      });
      return (d.open ? '▼ ' : '▶ ') + h + '\n' + items.join('\n');
    }));
    console.log(`=== ${c.n}\n  fields: ${fields}` + (notices.length ? '\n  NOTICE: ' + notices.join('\n  NOTICE: ') : '') + '\n' + tiers.join('\n'));
  }

  // evidence browser: every histology renders tabs; a trial link from the ranker opens the right page
  await p.evaluate(() => switchView('browser'));
  for (const h of await p.$$eval('#hswitch button', bs => bs.map(x => x.dataset.hist))) {
    await p.click(`#hswitch button[data-hist="${h}"]`); await p.waitForTimeout(120);
    const tabs = await p.$$eval('#tabs [role=tab]', t => t.length);
    const cards = await p.$$eval('#panels .card', c => c.length);
    console.log(`browser ${h}: ${tabs} tabs, ${cards} cards`);
    if (!tabs) errs.push(`browser ${h}: no tabs`);
  }
  await p.evaluate(() => switchView('ranker'));
  await p.evaluate(x => applyPreset(x), CASES.find(c => c.n.startsWith('UCS 1L')).p);
  const tl = await p.$('#results .tlink');
  if (tl) {
    await tl.click(); await p.waitForTimeout(250);
    const s = await p.evaluate(() => ({ browser: document.querySelector('#viewBrowser').classList.contains('on'), hist: browserHist, tab: state.tab }));
    console.log('trial link →', JSON.stringify(s));
    if (!s.browser || s.hist !== 'ucs') errs.push('trial link did not open the carcinosarcoma evidence page');
  }
  await p.close();

  // phone width: no horizontal page scroll
  const ph = await page(390, 844);
  for (const c of [CASES[0], CASES[CASES.length - 1]]) {
    await ph.evaluate(x => applyPreset(x), c.p); await ph.waitForTimeout(80);
    const sw = await ph.evaluate(() => document.documentElement.scrollWidth);
    console.log(`phone ${c.n}: scrollWidth ${sw}`);
    if (sw > 390) errs.push(`phone overflow ${sw}px on ${c.n}`);
  }
  await b.close();
  console.log(errs.length ? 'FAIL\n' + errs.join('\n') : 'OK — no page or console errors');
  process.exit(errs.length ? 1 : 0);
})();
