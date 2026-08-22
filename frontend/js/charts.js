function minToHM(totalMinutes){
  const h = Math.floor(totalMinutes / 60), m = Math.round(totalMinutes % 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}
function hoursToHM(hoursFloat){
  return minToHM(hoursFloat * 60);
}

function donutSVG(pct1, centerLabel){
  const r = 70, cx = 90, cy = 90, circumference = 2 * Math.PI * r;
  const dash1 = circumference * (pct1 / 100);
  return `<svg width="180" height="180" viewBox="0 0 180 180">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#f59e0b" stroke-width="26"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#2563eb" stroke-width="26"
      stroke-dasharray="${dash1} ${circumference}" transform="rotate(-90 ${cx} ${cy})"
      style="transition:stroke-dasharray .8s ease;"/>
    <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="18" font-weight="800" fill="#111827">${centerLabel}</text>
    <text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="12" fill="#6b7280">Total Hours</text>
  </svg>`;
}
function donutMiniSVG(segments, total){
  const r = 55, cx = 70, cy = 70, circumference = 2 * Math.PI * r;
  let offset = 0, arcs = '';
  segments.forEach(s => {
    const len = total > 0 ? circumference * (s.value / total) : 0;
    arcs += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}" stroke-width="24"
      stroke-dasharray="${len} ${circumference}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})"/>`;
    offset += len;
  });
  return `<div class="donut-wrap"><svg width="140" height="140" viewBox="0 0 140 140">${arcs}
    <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="20" font-weight="800">${total}</text>
    <text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="11" fill="#6b7280">Total</text>
  </svg>
  <div>${segments.map(s => `<div class="legend-item"><span class="legend-dot" style="background:${s.color}"></span><div><b>${s.label}</b><span class="pct">${s.value} (${total > 0 ? Math.round(s.value / total * 100) : 0}%)</span></div></div>`).join('')}</div>
  </div>`;
}

function trendChartSVG(daily, daysInMonth, monthLabel){
  const w = 760, h = 260, padL = 40, padB = 30, padT = 10;
  const byDate = {};
  daily.forEach(d => { byDate[d.d.slice(0, 10)] = d; });
  const days = daysInMonth || 30;
  const billable = [], nonBillable = [];
  const monthPrefix = daily.length ? daily[0].d.slice(0, 7) : localMonthValue(new Date());
  for (let i = 1; i <= days; i++) {
    const key = `${monthPrefix}-${String(i).padStart(2, '0')}`;
    const rec = byDate[key];
    billable.push(rec ? Number(rec.billable) : 0);
    nonBillable.push(rec ? Number(rec.non_billable) : 0);
  }
  const maxVal = Math.max(1, ...billable.map((b, i) => b + nonBillable[i]));
  const maxY = Math.ceil(maxVal / 5) * 5 || 5;
  const step = Math.max(1, Math.ceil(maxY / 5));

  const plotW = w - padL - 20, plotH = h - padT - padB;
  const xFor = i => padL + (i / (days - 1)) * plotW;
  const yFor = v => padT + plotH - (v / maxY) * plotH;
  const barW = plotW / days * 0.55;

  let bars = '';
  for (let i = 0; i < days; i++) {
    const xb = xFor(i) - barW;
    const bH1 = plotH - (yFor(billable[i]) - padT);
    const bH2 = plotH - (yFor(nonBillable[i]) - padT);
    bars += `<rect x="${xb - barW / 2}" y="${yFor(billable[i])}" width="${barW / 1.6}" height="${bH1}" fill="#2563eb"/>`;
    bars += `<rect x="${xb + barW / 2.2}" y="${yFor(nonBillable[i])}" width="${barW / 1.6}" height="${bH2}" fill="#f59e0b"/>`;
  }
  let linePts = '';
  for (let i = 0; i < days; i++) {
    const tot = billable[i] + nonBillable[i];
    linePts += (i === 0 ? 'M' : 'L') + xFor(i) + ',' + yFor(Math.min(tot, maxY)) + ' ';
  }
  let gridlines = '';
  for (let v = 0; v <= maxY; v += step) {
    gridlines += `<line x1="${padL}" y1="${yFor(v)}" x2="${w - 20}" y2="${yFor(v)}" stroke="#eef1f5"/><text x="4" y="${yFor(v) + 4}" font-size="10" fill="#9ca3af">${v}</text>`;
  }
  let xlabels = '';
  [1, 6, 11, 16, 21, 26].forEach(d => {
    if (d <= days) xlabels += `<text x="${xFor(d - 1)}" y="${h - 8}" font-size="10" fill="#9ca3af" text-anchor="middle">${monthLabel || ''} ${d}</text>`;
  });
  return `<div style="overflow-x:auto;"><svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="min-width:700px;">
    ${gridlines}${bars}
    <path d="${linePts}" fill="none" stroke="#16a34a" stroke-width="2"/>
    ${xlabels}
    <g transform="translate(${w - 260},-2)" font-size="12">
      <rect x="0" y="6" width="12" height="12" fill="#2563eb"/><text x="16" y="16">Billable Hours</text>
      <rect x="115" y="6" width="12" height="12" fill="#f59e0b"/><text x="131" y="16">Non-Billable Hours</text>
      <circle cx="256" cy="12" r="4" fill="#16a34a"/><text x="266" y="16">Total Hours</text>
    </g>
  </svg></div>`;
}
