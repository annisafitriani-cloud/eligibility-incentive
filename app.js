let dashboardData = window.DASHBOARD_DATA?.sheets ?? { bm: [], agent: [] };
const googleSheetId = "1puBeRozOEJnCxUoXLA1oGLCvOHZ6oRFd0yLUfqbDLRw";
const googleSheetTabs = {
  bm: "Eligible BM",
  agent: "Eligible Agent",
};
const liveDataRefreshMs = 2 * 60 * 1000;
const monthOrder = ["July", "Agustus", "September", "Oktober", "November", "Desember"];
const calendarMonths = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "July", "Agustus", "September", "Oktober", "November", "Desember"];

const viewConfigs = {
  bm: {
    label: "Tabsheet Eligible BM",
    title: "Indotim1 BM Incentive",
    tableTitle: "Leaderboard Eligible BM",
    searchPlaceholder: "BM, cabang, region",
    typeKey: "type",
    quickStatuses: ["Eligible", "Not Eligible"],
    scheme: [
      { th: "TH 0", range: "60% - 89%", incentive: "0.30%", detail: "Online revenue min. 3-4 juta dan min. 4 trx online" },
      { th: "TH 1", range: "90% - 119%", incentive: "0.50% - 0.75%", detail: "Online revenue min. 3-6 juta dan min. 6 trx online" },
      { th: "TH 2", range: "120% Above", incentive: "1.00% - 1.50%", detail: "Online revenue min. 3-9 juta dan min. 9 trx online" },
    ],
    columns: [
      ["Rank", "rank"],
      ["Branch Manager", "manager"],
      ["Branch", "branch"],
      ["Type", "type"],
      ["Ach Rev", "ach"],
      ["Eligibility Online Product", "revenueOnlineCheck"],
      ["Final Eligibility", "finalEligibility"],
      ["Gap Target", "bmProgress"],
      ["Final TH", "finalTh"],
    ],
  },
  agent: {
    label: "Tabsheet Eligible Agent",
    title: "Indotim1 Agent Incentive",
    tableTitle: "Leaderboard Eligible Agent",
    searchPlaceholder: "Agent, email, cabang",
    typeKey: "position",
    quickStatuses: ["TH 0", "TH 1", "TH 2", "TH 3", "Not Eligible"],
    scheme: [
      { th: "TH 0", range: "50% - 74%", incentive: "0.50% / 5.00%", detail: "Min. 1 user online atau achievement revenue sesuai target weekly" },
      { th: "TH 1", range: "75% - 99%", incentive: "1.60% / 7.70%", detail: "Min. 2 user online atau achievement revenue weekly" },
      { th: "TH 2", range: "100% - 124%", incentive: "2.00% / 8.80%", detail: "Min. 3 user online atau achievement revenue weekly" },
      { th: "TH 3", range: "125% Above", incentive: "3.00% / 11.00%", detail: "Min. 5 user online atau achievement revenue weekly" },
    ],
    columns: [
      ["Rank", "rank"],
      ["Agent", "agent"],
      ["Branch", "branch"],
      ["Month", "month"],
      ["Week", "week"],
      ["Ach Rev", "ach"],
      ["Gap Target", "agentProgress"],
      ["Final TH", "finalTh"],
    ],
  },
};

let activeView = "bm";
let quickStatus = "";

const els = {
  viewTabs: document.querySelectorAll("[data-open-view]"),
  sheetLabel: document.querySelector("#sheet-label"),
  title: document.querySelector("#dashboard-title"),
  month: document.querySelector("#month-filter"),
  branchWrap: document.querySelector("#branch-filter-wrap"),
  branch: document.querySelector("#branch-filter"),
  regionWrap: document.querySelector("#region-filter-wrap"),
  region: document.querySelector("#region-filter"),
  weekWrap: document.querySelector("#week-filter-wrap"),
  week: document.querySelector("#week-filter"),
  typeWrap: document.querySelector("#type-filter-wrap"),
  type: document.querySelector("#type-filter"),
  statusWrap: document.querySelector("#status-filter-wrap"),
  status: document.querySelector("#status-filter"),
  search: document.querySelector("#search-filter"),
  reset: document.querySelector("#reset-filters"),
  records: document.querySelector("#metric-records"),
  statusSummary: document.querySelector("#status-summary"),
  agentActionPanel: document.querySelector("#agent-action-panel"),
  agentFocusTitle: document.querySelector("#agent-focus-title"),
  agentFocusSubtitle: document.querySelector("#agent-focus-subtitle"),
  dayProgressText: document.querySelector("#day-progress-text"),
  dayRemainingText: document.querySelector("#day-remaining-text"),
  dayProgressFill: document.querySelector("#day-progress-fill"),
  nextLevelPanel: document.querySelector("#next-level-panel"),
  nextLevelTrack: document.querySelector("#next-level-track"),
  nextLevelLeft: document.querySelector("#next-level-left"),
  nextLevelRight: document.querySelector("#next-level-right"),
  quickToggleRow: document.querySelector("#quick-toggle-row"),
  schemeTitle: document.querySelector("#scheme-title"),
  schemeSubtitle: document.querySelector("#scheme-subtitle"),
  schemeGrid: document.querySelector("#scheme-grid"),
  schemeDetailButton: document.querySelector("#scheme-detail-button"),
  incentiveCalculatorButton: document.querySelector("#incentive-calculator-button"),
  schemeModal: document.querySelector("#scheme-modal"),
  schemeModalClose: document.querySelector("#scheme-modal-close"),
  calculatorModal: document.querySelector("#calculator-modal"),
  calculatorModalClose: document.querySelector("#calculator-modal-close"),
  calculatorReset: document.querySelector("#calculator-reset"),
  calcAgentSearch: document.querySelector("#calc-agent-search"),
  calcAgent: document.querySelector("#calc-agent"),
  calcAgentOptions: document.querySelector("#calc-agent-options"),
  calcMonth: document.querySelector("#calc-month"),
  calcWeek: document.querySelector("#calc-week"),
  calcTarget: document.querySelector("#calc-target"),
  calcTotalRevenue: document.querySelector("#calc-total-revenue"),
  calcAchievement: document.querySelector("#calc-achievement"),
  calcTh: document.querySelector("#calc-th"),
  calcRevenueInputs: document.querySelectorAll(".calc-revenue-input"),
  calcFinalTh: document.querySelector("#calc-final-th"),
  calcResult: document.querySelector("#calc-result"),
  calcBreakdownBody: document.querySelector("#calc-breakdown-body"),
  tableTitle: document.querySelector("#table-title"),
  tableCaption: document.querySelector("#table-caption"),
  tableHead: document.querySelector("#leaderboard-head"),
  tableBody: document.querySelector("#leaderboard-body"),
};

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function statusKey(value) {
  const key = normalize(value).replace(/\s+/g, " ");
  const thMatch = key.match(/^th\s*(\d)$/);
  if (thMatch) return `th ${thMatch[1]}`;
  if (key.includes("tidak") || key.includes("not")) return "not eligible";
  return key;
}

function canonicalStatus(value) {
  const key = statusKey(value);
  if (key === "not eligible") return "Not Eligible";
  const thMatch = key.match(/^th (\d)$/);
  if (thMatch) return `TH ${thMatch[1]}`;
  if (key === "eligible") return "Eligible";
  return String(value || "Not Eligible");
}

function rupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function numberOnly(value) {
  if (typeof value === "string" && value.trim() && !Number.isFinite(Number(value))) {
    return value;
  }
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function parseRupiah(value) {
  return Number(String(value || "").replace(/\D/g, ""));
}

function formatRupiahInput(input) {
  const value = parseRupiah(input.value);
  input.value = value ? rupiah(value) : "";
}

function percent(value) {
  return `${((value || 0) * 100).toLocaleString("id-ID", {
    maximumFractionDigits: 1,
  })}%`;
}

function uniqueSorted(rows, key) {
  return [...new Set(rows.map((row) => row[key]).filter(Boolean))].sort((a, b) => {
    const monthA = monthOrder.indexOf(a);
    const monthB = monthOrder.indexOf(b);
    if (monthA >= 0 || monthB >= 0) return monthA - monthB;
    return String(a).localeCompare(String(b), "id", { numeric: true });
  });
}

function fillSelect(select, values, label) {
  const current = select.value;
  select.innerHTML = [`<option value="">${label}</option>`, ...values.map((value) => `<option>${value}</option>`)].join("");
  select.value = values.includes(current) ? current : "";
}

function gvizUrl(sheetName, callbackName) {
  const params = new URLSearchParams({
    sheet: sheetName,
    tqx: `responseHandler:${callbackName}`,
    cacheBust: Date.now(),
  });
  return `https://docs.google.com/spreadsheets/d/${googleSheetId}/gviz/tq?${params.toString()}`;
}

function valueAt(cells, index) {
  return cells[index]?.v ?? "";
}

function fetchGvizRows(sheetName) {
  return new Promise((resolve, reject) => {
    const callbackName = `googleSheetCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const cleanup = () => {
      delete window[callbackName];
      script.remove();
    };
    window[callbackName] = (payload) => {
      cleanup();
      resolve((payload.table?.rows ?? []).map((row) => row.c ?? []));
    };
    script.onerror = () => {
      cleanup();
      reject(new Error(`Gagal memuat ${sheetName}`));
    };
    script.src = gvizUrl(sheetName, callbackName);
    document.head.appendChild(script);
  });
}

function cleanSheetText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function sheetNumber(value) {
  if (typeof value === "number") return value;
  const cleaned = cleanSheetText(value).replace(/%$/, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isRegionCells(cells) {
  return cleanSheetText(valueAt(cells, 0)).startsWith("Regional");
}

function buildBmRowsFromCells(rows) {
  return rows.filter(isRegionCells).map((cells) => {
    const eligibilityOnlineProduct = cleanSheetText(valueAt(cells, 29));
    const finalThText = cleanSheetText(valueAt(cells, 30));
    const finalThKey = statusKey(finalThText);
    const finalEligibility = finalThKey.startsWith("th ") ? "Eligible" : finalThText || "Not Eligible";
    const gapTH0Text = cleanSheetText(valueAt(cells, 31));
    return {
      region: cleanSheetText(valueAt(cells, 0)),
      branch: cleanSheetText(valueAt(cells, 1)),
      manager: cleanSheetText(valueAt(cells, 2)),
      type: cleanSheetText(valueAt(cells, 3)),
      month: cleanSheetText(valueAt(cells, 4)),
      target: Math.round(sheetNumber(valueAt(cells, 20))),
      revenue: Math.round(sheetNumber(valueAt(cells, 21))),
      ach: sheetNumber(valueAt(cells, 22)),
      tierRevenueTH0: Math.round(sheetNumber(valueAt(cells, 5))),
      tierRevenueTH1: Math.round(sheetNumber(valueAt(cells, 6))),
      tierRevenueTH2: Math.round(sheetNumber(valueAt(cells, 7))),
      onlineRevenue: Math.round(sheetNumber(valueAt(cells, 24))),
      onlineTrx: Math.round(sheetNumber(valueAt(cells, 25))),
      lkpSubmitted: cleanSheetText(valueAt(cells, 26)),
      revenueOnlineCheck: eligibilityOnlineProduct,
      trxOnlineCheck: cleanSheetText(valueAt(cells, 28)),
      finalEligibility,
      finalTh: finalThKey.startsWith("th ") ? canonicalStatus(finalThText) : "",
      revenueProgress: gapTH0Text || (finalThKey.startsWith("th ") ? "Unlocked" : "0"),
      gapTH0: Math.round(sheetNumber(valueAt(cells, 31))),
      gapTH1: Math.round(sheetNumber(valueAt(cells, 32))),
      gapTH2: Math.round(sheetNumber(valueAt(cells, 33))),
    };
  });
}

function buildAgentRowsFromCells(rows) {
  return rows.filter(isRegionCells).map((cells) => ({
    region: cleanSheetText(valueAt(cells, 0)),
    branch: cleanSheetText(valueAt(cells, 1)),
    agent: cleanSheetText(valueAt(cells, 2)),
    email: cleanSheetText(valueAt(cells, 3)),
    position: cleanSheetText(valueAt(cells, 4)),
    month: cleanSheetText(valueAt(cells, 5)),
    isoweek: cleanSheetText(valueAt(cells, 6)),
    week: cleanSheetText(valueAt(cells, 7)),
    target: Math.round(sheetNumber(valueAt(cells, 16))),
    revenue: Math.round(sheetNumber(valueAt(cells, 17))),
    ach: sheetNumber(valueAt(cells, 18)),
    tierRevenueTH0: Math.round(sheetNumber(valueAt(cells, 8))),
    tierRevenueTH1: Math.round(sheetNumber(valueAt(cells, 9))),
    tierRevenueTH2: Math.round(sheetNumber(valueAt(cells, 10))),
    tierRevenueTH3: Math.round(sheetNumber(valueAt(cells, 11))),
    onlineRevenue: Math.round(sheetNumber(valueAt(cells, 19))),
    onlineUser: Math.round(sheetNumber(valueAt(cells, 20))),
    onlineProduct: Math.round(sheetNumber(valueAt(cells, 21))),
    eligibilityAchievement: cleanSheetText(valueAt(cells, 22)),
    eligibilityOnline: cleanSheetText(valueAt(cells, 23)),
    finalEligibility: cleanSheetText(valueAt(cells, 24)),
    gapTH0: Math.round(sheetNumber(valueAt(cells, 25))),
    gapTH1: Math.round(sheetNumber(valueAt(cells, 26))),
    gapTH2: Math.round(sheetNumber(valueAt(cells, 27))),
    gapTH3: Math.round(sheetNumber(valueAt(cells, 28))),
  }));
}

async function refreshLiveData() {
  try {
    const [bmRows, agentRows] = await Promise.all([
      fetchGvizRows(googleSheetTabs.bm),
      fetchGvizRows(googleSheetTabs.agent),
    ]);
    dashboardData = {
      bm: buildBmRowsFromCells(bmRows),
      agent: buildAgentRowsFromCells(agentRows),
    };
    setupFilters();
    setupCalculatorFilters();
    calculateIncentive();
    renderDashboard();
  } catch (error) {
    console.warn("Menggunakan data cache karena live spreadsheet gagal dimuat.", error);
  }
}

function monthIndex(month) {
  return monthOrder.indexOf(month);
}

function weekNumber(week) {
  return Number(String(week || "").match(/\d+/)?.[0] || 0);
}

function compareLatestPeriod(a, b) {
  const monthCompare = monthIndex(b.month) - monthIndex(a.month);
  if (monthCompare !== 0) return monthCompare;
  const weekCompare = weekNumber(b.week) - weekNumber(a.week);
  if (weekCompare !== 0) return weekCompare;
  return Number(b.isoweek || 0) - Number(a.isoweek || 0);
}

function isBmEligible(row) {
  return statusKey(row.finalEligibility) === "eligible";
}

function optionRows() {
  const rows = dashboardData[activeView] ?? [];
  if (activeView !== "agent" || !els.month.value) return rows;
  return rows.filter((row) => row.month === els.month.value);
}

function rowsWithActualData(rows) {
  return rows.filter((row) => (row.revenue || 0) > 0 || (row.ach || 0) > 0);
}

function rowsWithCalculatorData(rows) {
  return rows.filter((row) => (row.target || 0) > 0 || (row.revenue || 0) > 0 || (row.ach || 0) > 0);
}

function setupFilters() {
  const rows = dashboardData[activeView] ?? [];
  const scopedRows = optionRows();
  const config = viewConfigs[activeView];

  fillSelect(els.branch, uniqueSorted(scopedRows, "branch"), "Semua cabang");
  fillSelect(els.month, uniqueSorted(rowsWithActualData(rows), "month"), "Semua bulan");
  fillSelect(els.region, uniqueSorted(scopedRows, "region"), "Semua region");
  fillSelect(els.week, uniqueSorted(scopedRows, "week"), "Semua week");
  fillSelect(els.type, uniqueSorted(scopedRows, config.typeKey), activeView === "bm" ? "Semua type" : "Semua posisi");
  fillSelect(els.status, config.quickStatuses, "Semua status");

  els.search.placeholder = config.searchPlaceholder;
  els.regionWrap.classList.toggle("is-hidden", activeView !== "bm");
  els.weekWrap.classList.toggle("is-hidden", activeView !== "agent");
  els.typeWrap.classList.toggle("is-hidden", activeView !== "bm");
  els.statusWrap.classList.add("is-hidden");
}

function filteredRows() {
  const rows = dashboardData[activeView] ?? [];
  const config = viewConfigs[activeView];
  const query = normalize(els.search.value);
  const quickStatusKey = normalize(quickStatus);

  return rows
    .filter((row) => (row.revenue || 0) > 0 || (row.ach || 0) > 0)
    .filter((row) => !els.branch.value || row.branch === els.branch.value)
    .filter((row) => !els.month.value || row.month === els.month.value)
    .filter((row) => activeView !== "bm" || !els.region.value || row.region === els.region.value)
    .filter((row) => activeView !== "agent" || !els.week.value || row.week === els.week.value)
    .filter((row) => activeView !== "bm" || !els.type.value || row[config.typeKey] === els.type.value)
    .filter((row) => {
      if (!quickStatus) return true;
      if (activeView === "bm") return statusKey(quickStatus) === "eligible" ? isBmEligible(row) : !isBmEligible(row);
      return normalize(finalTh(row)) === quickStatusKey;
    })
    .filter((row) => {
      if (!query) return true;
      const haystack = activeView === "bm"
        ? [row.manager, row.branch, row.region, row.type, row.finalEligibility]
        : [row.agent, row.email, row.branch, row.week, row.finalEligibility];
      return haystack.some((item) => normalize(item).includes(query));
    })
    .sort((a, b) => {
      const periodCompare = compareLatestPeriod(a, b);
      if (periodCompare !== 0) return periodCompare;
      return (b.ach || 0) - (a.ach || 0);
    });
}

function statusCounts(rows) {
  if (activeView === "bm") {
    const eligible = rows.filter(isBmEligible).length;
    return [
      ["Eligible", eligible],
      ["Not Eligible", rows.length - eligible],
    ];
  }

  return viewConfigs.agent.quickStatuses.map((status) => [
    status,
    rows.filter((row) => normalize(finalTh(row)) === normalize(status)).length,
  ]);
}

function renderSummary(rows) {
  const counts = statusCounts(rows);
  els.records.textContent = `${rows.length.toLocaleString("id-ID")} record filter`;
  els.statusSummary.style.setProperty("--status-count", counts.length);
  els.statusSummary.innerHTML = counts.map(([label, count]) => {
    const share = rows.length ? count / rows.length : 0;
    return `
      <div class="status-line">
        <span>${label}</span>
        <div class="status-bar"><i style="width:${share * 100}%"></i></div>
        <strong>${percent(share)}</strong>
        <em>${count.toLocaleString("id-ID")}</em>
      </div>
    `;
  }).join("");
}

function getSelectedAgentRows(rows) {
  if (activeView !== "agent") return [];
  const query = normalize(els.search.value);
  if (!query) return [];
  return rows.filter((row) => normalize(row.agent).includes(query) || normalize(row.email).includes(query));
}

function currentDayProgress() {
  const now = new Date();
  const day = now.getDay();
  const passed = Math.min(Math.max(day, 1), 6);
  const remaining = Math.max(6 - passed, 0);
  const percent = (passed / 6) * 100;
  return {
    passed,
    remaining,
    percent,
    dayName: new Intl.DateTimeFormat("id-ID", { weekday: "long" }).format(now),
  };
}

function remainingGap(row) {
  const gaps = [row.gapTH0, row.gapTH1, row.gapTH2, row.gapTH3].filter((value) => typeof value === "number" && value > 0);
  return gaps.length ? Math.min(...gaps) : 0;
}

function isQuickWin(row) {
  const gap = remainingGap(row);
  return gap > 0 && row.target > 0 && gap / row.target < 0.1;
}

function renderAgentAction(rows) {
  const selectedRows = getSelectedAgentRows(rows);
  els.agentActionPanel.classList.toggle("is-hidden", activeView !== "agent");
  if (activeView !== "agent") return;

  const progress = currentDayProgress();
  const target = selectedRows[0];
  const weekLabel = els.week.value || target?.week || "week berjalan";
  const monthLabel = els.month.value || target?.month || currentMonthWeek().month;

  els.agentFocusTitle.textContent = target
    ? `${target.agent} - ${weekLabel} ${monthLabel}`
    : `Progress Hari - ${weekLabel} ${monthLabel}`;
  els.agentFocusSubtitle.textContent = target
    ? `Hari ini hari ${progress.dayName}. Pantau sisa target dan aktivitas closing minggu ini.`
    : `Hari ini ${progress.dayName}. Gunakan filter nama agent untuk melihat fokus personal.`;
  els.dayProgressText.textContent = `${progress.passed} hari sudah terlewati`;
  els.dayRemainingText.textContent = `${progress.remaining} hari berikutnya tersisa`;
  els.dayProgressFill.style.width = `${progress.percent}%`;
}

function nextLevelInfo(row) {
  const levels = [
    { label: "TH 0", target: row.tierRevenueTH0, gap: row.gapTH0 },
    { label: "TH 1", target: row.tierRevenueTH1, gap: row.gapTH1 },
    { label: "TH 2", target: row.tierRevenueTH2, gap: row.gapTH2 },
    { label: "TH 3", target: row.tierRevenueTH3, gap: row.gapTH3 },
  ].filter((level) => level.target > 0);
  const next = levels.find((level) => level.gap > 0) || levels[levels.length - 1];
  if (!next) return null;
  const achieved = Math.max(0, Math.min(1, 1 - (next.gap || 0) / next.target));
  return {
    label: next.gap > 0 ? `Unlocked ${next.label}` : "Unlocked",
    gap: Math.max(next.gap || 0, 0),
    progress: achieved,
  };
}

function currentMonthWeek() {
  const date = new Date();
  return {
    month: calendarMonths[date.getMonth()],
    week: `Week ${Math.ceil(date.getDate() / 7)}`,
  };
}

function rowsForOngoingWeek(rows) {
  if (els.week.value) return rows;
  const ongoing = currentMonthWeek();
  const ongoingRows = rows.filter((row) => row.month === ongoing.month && row.week === ongoing.week);
  if (ongoingRows.length) return ongoingRows;
  const latest = [...rows].sort(compareLatestPeriod)[0];
  if (!latest) return [];
  return rows.filter((row) => row.month === latest.month && row.week === latest.week);
}

function renderNextLevel(rows) {
  els.nextLevelPanel.classList.toggle("is-hidden", activeView !== "agent");
  if (activeView !== "agent") return;
  const activeWeekRows = rowsForOngoingWeek(rows);
  const cards = activeWeekRows
    .map((row) => ({ row, info: nextLevelInfo(row) }))
    .filter((item) => item.info && item.info.gap > 0)
    .sort((a, b) => b.info.progress - a.info.progress)
    .slice(0, 12);

  els.nextLevelTrack.innerHTML = cards.length
    ? cards.map(({ row, info }) => `
      <article class="next-level-card">
        <div class="next-level-card-head">
          <div>
            <h3>${row.agent}</h3>
            <p>${row.branch}</p>
          </div>
          <span>${info.label}</span>
        </div>
        <div class="next-level-bar"><i style="width:${info.progress * 100}%"></i></div>
        <div class="next-level-meta">
          <strong>${Math.round(info.progress * 100)}%<small>tercapai</small></strong>
          <strong><small>sisa Rp</small>${numberOnly(info.gap)}</strong>
        </div>
      </article>
    `).join("")
    : `<p class="empty">Tidak ada agent dengan gap menuju level berikutnya pada week berjalan.</p>`;
}

function progressCell(items, type, missionComplete = false) {
  return `
    <div class="progress-stack">
      <div class="gap-grid ${type}">
        ${items.map(([label, value]) => {
          const unlocked = normalize(value) === "unlocked" || (typeof value === "number" && value <= 0);
          const empty = normalize(value) === "empty";
          return `
            <span class="gap-cell ${unlocked ? "unlocked" : ""} ${empty ? "empty-gap" : ""}">
              <small>${label}</small>
              <strong>${empty ? "0" : unlocked ? "Unlocked" : numberOnly(value)}</strong>
            </span>
          `;
        }).join("")}
      </div>
      ${missionComplete ? `<em class="mission-note">Mission Complete! Tambah revenue untuk menambah nominal incentive</em>` : ""}
    </div>
  `;
}

function bmProgress(row) {
  if (!row.revenue || row.revenue <= 0 || !row.ach || row.ach <= 0) {
    return progressCell([
      ["TH 0", "empty"],
      ["TH 1", "empty"],
      ["TH 2", "empty"],
    ], "bm");
  }
  const th0Unlocked = normalize(row.revenueProgress) === "unlocked";
  const th1Unlocked = th0Unlocked && row.gapTH0 <= 0;
  const th2Unlocked = th1Unlocked && row.gapTH1 <= 0;
  return progressCell([
    ["TH 0", th0Unlocked ? "Unlocked" : row.gapTH0],
    ["TH 1", th1Unlocked ? "Unlocked" : row.gapTH0],
    ["TH 2", th2Unlocked ? "Unlocked" : row.gapTH1],
  ], "bm");
}

function agentProgress(row) {
  if (!row.ach || row.ach <= 0) {
    return progressCell([
      ["TH 0", "empty"],
      ["TH 1", "empty"],
      ["TH 2", "empty"],
      ["TH 3", "empty"],
    ], "agent");
  }

  const th0Unlocked = row.gapTH0 <= 0;
  const th1Unlocked = th0Unlocked && row.gapTH1 <= 0;
  const th2Unlocked = th1Unlocked && row.gapTH2 <= 0;
  const th3Unlocked = th2Unlocked && row.gapTH3 <= 0;
  return progressCell([
    ["TH 0", th0Unlocked ? "Unlocked" : row.gapTH0],
    ["TH 1", th1Unlocked ? "Unlocked" : row.gapTH1],
    ["TH 2", th2Unlocked ? "Unlocked" : row.gapTH2],
    ["TH 3", th3Unlocked ? "Unlocked" : row.gapTH3],
  ], "agent", th3Unlocked);
}

function finalTh(row) {
  if (activeView === "agent") return row.finalEligibility || "Not Eligible";
  if (!row.revenue || row.revenue <= 0 || !row.ach || row.ach <= 0) return "Not Eligible";
  if (row.finalTh) return row.finalTh;
  const th0Unlocked = normalize(row.revenueProgress) === "unlocked";
  const th1Unlocked = th0Unlocked && row.gapTH0 <= 0;
  const th2Unlocked = th1Unlocked && row.gapTH1 <= 0;
  if (th2Unlocked) return "TH 2";
  if (th1Unlocked) return "TH 1";
  if (th0Unlocked) return "TH 0";
  return "Not Eligible";
}

function tableValue(row, key, index) {
  if (key === "rank") return index + 1;
  if (key === "revenue" || key === "target" || key === "onlineRevenue") return rupiah(row[key]);
  if (key === "ach") return percent(row.ach);
  if (key === "bmProgress") return bmProgress(row);
  if (key === "agentProgress") return agentProgress(row);
  if (key === "finalTh") return statusBadge(finalTh(row), "final-th");
  if (key === "finalEligibility" || key === "revenueOnlineCheck") return statusBadge(row[key] || "-");
  return row[key] || "-";
}

function statusBadge(value, extraClass = "") {
  const status = String(value || "-");
  const normalized = normalize(status);
  const tone = normalized.includes("not") || normalized.includes("tidak") ? "danger" : "success";
  return `<span class="status-badge ${tone} ${extraClass}">${status}</span>`;
}

function renderScheme() {
  const config = viewConfigs[activeView];
  els.schemeDetailButton.classList.toggle("is-hidden", activeView !== "agent");
  els.incentiveCalculatorButton.classList.toggle("is-hidden", activeView !== "agent");
  els.schemeTitle.textContent = activeView === "bm" ? "Ketentuan BM Incentive" : "Ketentuan Agent Incentive";
  els.schemeSubtitle.textContent = activeView === "bm"
    ? "Tier target revenue dan requirement online product untuk membuka TH."
    : "Penentuan TH Agent berdasarkan achievement weekly atau jumlah user online.";
  els.schemeGrid.innerHTML = config.scheme.map((item) => `
    <article class="scheme-card">
      <span>${item.th}</span>
      <strong>${item.range}</strong>
      <em>${item.incentive}</em>
      <p>${item.detail}</p>
    </article>
  `).join("");
}

const agentNewTransactionRates = {
  offline: [0.005, 0.016, 0.02, 0.03],
  online: [0.05, 0.077, 0.088, 0.11],
  others: [0.01, 0.018, 0.033, 0.033],
  kitab: [0.05, 0.05, 0.05, 0.05],
};

const calculatorCategories = {
  offline: "Offline (BAC, EAC, RGP Offline)",
  online: "Online (RB, BAON, EA Online)",
  others: "Others (Mathchamps, RGP Online, ruanguji, dll)",
  kitab: "Ruanguji Kitab",
};

function calculatorAgentOptions() {
  const rows = rowsWithCalculatorData(dashboardData.agent ?? []);
  const seen = new Map();
  rows.forEach((row) => {
    if (!seen.has(row.email)) {
      seen.set(row.email, { value: row.email, label: `${row.agent} - ${row.branch}` });
    }
  });
  return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label, "id", { numeric: true }));
}

function selectedCalculatorAgent() {
  const options = calculatorAgentOptions();
  return options.find((option) => option.value === els.calcAgent.value)
    ?? options.find((option) => option.label === els.calcAgentSearch.value)
    ?? null;
}

function syncCalculatorAgentFromSearch() {
  const selected = selectedCalculatorAgent();
  els.calcAgent.value = selected?.value || "";
}

function calcRowsForAgent() {
  const rows = rowsWithCalculatorData(dashboardData.agent ?? []);
  if (!els.calcAgent.value) return rows;
  return rows.filter((row) => row.email === els.calcAgent.value);
}

function selectedCalcRow() {
  if (!els.calcAgent.value || !els.calcMonth.value || !els.calcWeek.value) return null;
  return calcRowsForAgent().find((row) => row.month === els.calcMonth.value && row.week === els.calcWeek.value) ?? null;
}

function fillCalcSelect(select, options, label) {
  const current = select.value;
  select.innerHTML = [`<option value="">${label}</option>`, ...options.map((option) => (
    `<option value="${option.value}">${option.label}</option>`
  ))].join("");
  select.value = options.some((option) => option.value === current) ? current : "";
}

function thFromAchievement(achievement) {
  if (achievement >= 1.25) return "TH 3";
  if (achievement >= 1) return "TH 2";
  if (achievement >= 0.75) return "TH 1";
  if (achievement >= 0.5) return "TH 0";
  return "Not Eligible";
}

function thIndex(th) {
  return Number(String(th).replace("TH ", ""));
}

function setupCalculatorFilters() {
  const currentAgent = selectedCalculatorAgent();
  const agentOptions = calculatorAgentOptions();
  els.calcAgentOptions.innerHTML = agentOptions.map((option) => (
    `<option value="${option.label}"></option>`
  )).join("");
  els.calcAgent.value = currentAgent?.value || "";
  els.calcAgentSearch.value = currentAgent?.label || els.calcAgentSearch.value;

  const rows = calcRowsForAgent();
  const monthOptions = uniqueSorted(rows, "month").map((month) => ({ value: month, label: month }));
  fillCalcSelect(els.calcMonth, monthOptions, "Pilih bulan");

  const weekRows = els.calcMonth.value ? rows.filter((row) => row.month === els.calcMonth.value) : rows;
  const weekOptions = uniqueSorted(weekRows, "week").map((week) => ({ value: week, label: week }));
  fillCalcSelect(els.calcWeek, weekOptions, "Pilih week");
}

function calculateIncentive() {
  const row = selectedCalcRow();
  const target = row?.target || 0;
  const totalRevenue = parseRupiah(els.calcTotalRevenue.value);
  const achievement = target > 0 ? totalRevenue / target : 0;
  const finalTh = thFromAchievement(achievement);
  const index = finalTh.startsWith("TH") ? thIndex(finalTh) : -1;
  const breakdown = [...els.calcRevenueInputs].map((input) => {
    const revenue = parseRupiah(input.value);
    const rate = index >= 0 ? agentNewTransactionRates[input.dataset.category][index] : 0;
    return {
      category: input.dataset.category,
      revenue,
      rate,
      incentive: revenue * rate,
    };
  });
  const totalIncentive = breakdown.reduce((sum, item) => sum + item.incentive, 0);

  els.calcTarget.value = target || 0;
  els.calcAchievement.textContent = target ? percent(achievement) : "0%";
  els.calcTh.textContent = finalTh;
  els.calcFinalTh.textContent = finalTh;
  els.calcResult.textContent = rupiah(totalIncentive);
  els.calcBreakdownBody.innerHTML = breakdown.map((item) => `
    <tr>
      <td>${calculatorCategories[item.category]}</td>
      <td>${rupiah(item.revenue)}</td>
      <td>${percent(item.rate)}</td>
      <td>${rupiah(item.incentive)}</td>
    </tr>
  `).join("");
}

function resetCalculator() {
  els.calcAgent.value = "";
  els.calcAgentSearch.value = "";
  els.calcMonth.value = "";
  els.calcWeek.value = "";
  els.calcTotalRevenue.value = "";
  els.calcRevenueInputs.forEach((input) => {
    input.value = "";
  });
  setupCalculatorFilters();
  calculateIncentive();
}

function renderTable(rows) {
  const config = viewConfigs[activeView];
  els.tableHead.innerHTML = `<tr>${config.columns.map(([label]) => `<th>${label}</th>`).join("")}</tr>`;
  els.tableBody.innerHTML = rows.length
    ? rows.map((row, index) => `
      <tr class="${activeView === "agent" && isQuickWin(row) ? "quick-win-row" : ""}">
        ${config.columns.map(([, key]) => `<td>${tableValue(row, key, index)}</td>`).join("")}
      </tr>
    `).join("")
    : `<tr><td colspan="${config.columns.length}" class="empty">Tidak ada data untuk filter ini.</td></tr>`;
}

function renderQuickToggles() {
  const config = viewConfigs[activeView];
  els.quickToggleRow.innerHTML = [
    `<button class="status-toggle ${quickStatus === "" ? "active" : ""}" data-quick-status="" type="button">All</button>`,
    ...config.quickStatuses.map((status) => (
      `<button class="status-toggle ${quickStatus === status ? "active" : ""}" data-quick-status="${status}" type="button">${status}</button>`
    )),
  ].join("");

  els.quickToggleRow.querySelectorAll("[data-quick-status]").forEach((button) => {
    button.addEventListener("click", () => {
      quickStatus = button.dataset.quickStatus;
      renderDashboard();
    });
  });
}

function renderDashboard() {
  const config = viewConfigs[activeView];
  const rows = filteredRows();
  els.viewTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.openView === activeView));
  els.sheetLabel.textContent = config.label;
  els.title.textContent = config.title;
  els.tableTitle.textContent = config.tableTitle;
  els.tableCaption.textContent = `${rows.length.toLocaleString("id-ID")} record, sorted by Ach Revenue`;
  renderScheme();
  renderQuickToggles();
  renderSummary(rows);
  renderAgentAction(rows);
  renderNextLevel(rows);
  renderTable(rows);
}

function switchView(view) {
  activeView = view;
  quickStatus = "";
  els.branch.value = "";
  els.month.value = "";
  els.region.value = "";
  els.week.value = "";
  els.type.value = "";
  els.search.value = "";
  setupFilters();
  renderDashboard();
}

function resetFilters() {
  els.branch.value = "";
  els.month.value = "";
  els.region.value = "";
  els.week.value = "";
  els.type.value = "";
  els.search.value = "";
  quickStatus = "";
  setupFilters();
  renderDashboard();
}

els.viewTabs.forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.openView));
});

els.month.addEventListener("input", () => {
  els.branch.value = "";
  els.week.value = "";
  els.type.value = "";
  setupFilters();
  renderDashboard();
});

[els.branch, els.region, els.week, els.type, els.search].forEach((control) => {
  control.addEventListener("input", renderDashboard);
});

els.reset.addEventListener("click", resetFilters);
els.schemeDetailButton.addEventListener("click", () => els.schemeModal.showModal());
els.schemeModalClose.addEventListener("click", () => els.schemeModal.close());
els.schemeModal.addEventListener("click", (event) => {
  if (event.target === els.schemeModal) els.schemeModal.close();
});
els.incentiveCalculatorButton.addEventListener("click", () => {
  setupCalculatorFilters();
  calculateIncentive();
  els.calculatorModal.showModal();
});
els.calculatorModalClose.addEventListener("click", () => els.calculatorModal.close());
els.calculatorModal.addEventListener("click", (event) => {
  if (event.target === els.calculatorModal) els.calculatorModal.close();
});
els.calculatorReset.addEventListener("click", resetCalculator);
[els.calcTotalRevenue, ...els.calcRevenueInputs].forEach((control) => {
  control.addEventListener("input", () => {
    const cursorAtEnd = control.selectionStart === control.value.length;
    formatRupiahInput(control);
    if (cursorAtEnd) control.setSelectionRange(control.value.length, control.value.length);
    calculateIncentive();
  });
});
els.calcAgentSearch.addEventListener("input", () => {
  syncCalculatorAgentFromSearch();
  els.calcMonth.value = "";
  els.calcWeek.value = "";
  setupCalculatorFilters();
  calculateIncentive();
});
els.calcMonth.addEventListener("input", () => {
  els.calcWeek.value = "";
  setupCalculatorFilters();
  calculateIncentive();
});
els.calcWeek.addEventListener("input", calculateIncentive);
els.nextLevelLeft.addEventListener("click", () => {
  els.nextLevelTrack.scrollBy({ left: -420, behavior: "smooth" });
});
els.nextLevelRight.addEventListener("click", () => {
  els.nextLevelTrack.scrollBy({ left: 420, behavior: "smooth" });
});
setupFilters();
setupCalculatorFilters();
calculateIncentive();
renderDashboard();
refreshLiveData();
setInterval(refreshLiveData, liveDataRefreshMs);
