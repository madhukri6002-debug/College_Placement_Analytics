/**
 * College Placement Analytics — Dashboard Script (v2)
 * =====================================================
 * Features:
 *   - Sidebar navigation with smooth scroll + active state
 *   - Dark / light mode toggle (persisted in localStorage)
 *   - Mobile sidebar open/close
 *   - Animated number counters on cards
 *   - 7 Chart.js charts (bar, doughnut, scatter, horizontal bar)
 *   - Branch summary table with progress bars
 *   - Student table with multi-filter + column sort
 */

"use strict";

// ── Colour palette ───────────────────────────────────────────────────────────
const PALETTE = [
  "#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6",
  "#06b6d4","#f97316","#ec4899","#14b8a6","#a855f7",
  "#6366f1","#84cc16","#e11d48","#0ea5e9","#d97706"
];

// ── State ────────────────────────────────────────────────────────────────────
let allStudents  = [];
let sortState    = { col: null, dir: "asc" };
let activeCharts = {};

// ── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initSidebar();
  initNavScroll();
  fetchData();
  setupFilters();
  setupSort();
});

// ════════════════════════════════════════════════════════════════
//  THEME (dark / light)
// ════════════════════════════════════════════════════════════════
function initTheme() {
  const saved = localStorage.getItem("cpa-theme") || "light";
  applyTheme(saved);

  document.getElementById("themeToggle").addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next    = current === "dark" ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem("cpa-theme", next);
    // Rebuild charts so they pick up new grid colours
    if (allStudents.length) rebuildCharts();
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.getElementById("themeToggle").textContent = theme === "dark" ? "☀️" : "🌙";
}

// ════════════════════════════════════════════════════════════════
//  SIDEBAR (mobile toggle)
// ════════════════════════════════════════════════════════════════
function initSidebar() {
  const btn = document.getElementById("menuToggle");
  btn.addEventListener("click", () => {
    document.body.classList.toggle("sidebar-open");
  });
  // Close sidebar when clicking outside on mobile
  document.getElementById("mainContent").addEventListener("click", () => {
    document.body.classList.remove("sidebar-open");
  });
}

// ════════════════════════════════════════════════════════════════
//  SIDEBAR NAV — active link on scroll
// ════════════════════════════════════════════════════════════════
function initNavScroll() {
  const sections = document.querySelectorAll(".page-section");
  const navItems = document.querySelectorAll(".nav-item");

  // Smooth scroll on nav click
  navItems.forEach(item => {
    item.addEventListener("click", e => {
      e.preventDefault();
      const id = item.getAttribute("data-section");
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      navItems.forEach(n => n.classList.remove("active"));
      item.classList.add("active");
      document.body.classList.remove("sidebar-open");
    });
  });

  // IntersectionObserver to highlight active section while scrolling
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navItems.forEach(n => n.classList.remove("active"));
        const active = document.querySelector(`.nav-item[data-section="${entry.target.id}"]`);
        if (active) active.classList.add("active");
      }
    });
  }, { rootMargin: "-40% 0px -55% 0px" });

  sections.forEach(s => observer.observe(s));
}

// ════════════════════════════════════════════════════════════════
//  DATA FETCH
// ════════════════════════════════════════════════════════════════
async function fetchData() {
  try {
    const res  = await fetch("/api/summary");
    if (!res.ok) throw new Error(`Server responded ${res.status}`);
    const data = await res.json();
    init(data);
  } catch (err) {
    document.getElementById("mainContent").innerHTML =
      `<div class="error-msg">
         <strong>Could not load data.</strong><br>
         Make sure the server is running: <code>node server.js</code><br><br>
         Error: ${err.message}
       </div>`;
  }
}

// ── Store raw data for chart rebuild on theme change ─────────────────────────
let _chartData = null;

// ════════════════════════════════════════════════════════════════
//  INIT — wire everything up once data arrives
// ════════════════════════════════════════════════════════════════
function init(data) {
  _chartData = data;   // save for dark-mode chart rebuild

  renderCards(data.overall);
  renderPlacementStatus(data.overall);
  renderOfferType(data.offer_type_split);
  renderBranchPlacement(data.branch_wise);
  renderBranchSalary(data.branch_wise);
  renderBranchTable(data.branch_wise);
  renderRecruiters(data.top_recruiters);
  renderCgpaSalary(data.cgpa_vs_salary);

  populateBranchFilter(data.branch_wise);
  allStudents = data.students;
  renderTable(allStudents);

  document.getElementById("lastUpdated").textContent =
    "Updated: " + new Date().toLocaleTimeString();
}

function rebuildCharts() {
  if (!_chartData) return;
  Object.values(activeCharts).forEach(c => c.destroy());
  activeCharts = {};
  renderPlacementStatus(_chartData.overall);
  renderOfferType(_chartData.offer_type_split);
  renderBranchPlacement(_chartData.branch_wise);
  renderBranchSalary(_chartData.branch_wise);
  renderRecruiters(_chartData.top_recruiters);
  renderCgpaSalary(_chartData.cgpa_vs_salary);
}

// ════════════════════════════════════════════════════════════════
//  CARDS — animated number counter
// ════════════════════════════════════════════════════════════════
function renderCards(o) {
  animateCount("totalStudents",   0, o.total_students,     0);
  animateCount("placedStudents",  0, o.placed_students,    0);
  animateCount("unplacedStudents",0, o.unplaced_students,  0);
  animateCount("avgPackage",      0, o.average_package_lpa,2);
  animateCount("highestPackage",  0, o.highest_package_lpa,1);
  animateCount("lowestPackage",   0, o.lowest_package_lpa, 1);
  setText("placementRate", o.placement_rate_pct + "% placement rate");
}

function animateCount(id, from, to, decimals) {
  const el = document.getElementById(id);
  if (!el) return;
  const duration = 900;
  const start    = performance.now();
  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const ease     = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
    const value    = from + (to - from) * ease;
    el.textContent = decimals > 0 ? value.toFixed(decimals) : Math.round(value);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ════════════════════════════════════════════════════════════════
//  CHART HELPERS
// ════════════════════════════════════════════════════════════════
function gridColor() {
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "#334155" : "#e2e8f0";
}
function textColor() {
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "#94a3b8" : "#718096";
}
function baseOptions(extra = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    ...extra
  };
}

// ════════════════════════════════════════════════════════════════
//  CHART: Placement Status Doughnut
// ════════════════════════════════════════════════════════════════
function renderPlacementStatus(o) {
  activeCharts.placementStatus = new Chart(
    document.getElementById("placementStatusChart"),
    {
      type: "doughnut",
      data: {
        labels: ["Placed", "Not Placed"],
        datasets: [{
          data: [o.placed_students, o.unplaced_students],
          backgroundColor: ["#10b981", "#ef4444"],
          hoverOffset: 6,
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { padding: 16, color: textColor(), font: { size: 12 } } }
        },
        cutout: "60%"
      }
    }
  );
}

// ════════════════════════════════════════════════════════════════
//  CHART: Offer Type Doughnut
// ════════════════════════════════════════════════════════════════
function renderOfferType(offerData) {
  activeCharts.offerType = new Chart(
    document.getElementById("offerTypeChart"),
    {
      type: "doughnut",
      data: {
        labels: Object.keys(offerData),
        datasets: [{
          data: Object.values(offerData),
          backgroundColor: ["#3b82f6", "#8b5cf6", "#f59e0b"],
          hoverOffset: 6,
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { padding: 16, color: textColor(), font: { size: 12 } } }
        },
        cutout: "60%"
      }
    }
  );
}

// ════════════════════════════════════════════════════════════════
//  CHART: Branch Placement Rate (Bar)
// ════════════════════════════════════════════════════════════════
function renderBranchPlacement(branchData) {
  const labels = Object.keys(branchData);
  const values = labels.map(b => branchData[b].placement_rate_pct);

  activeCharts.branchPlacement = new Chart(
    document.getElementById("branchPlacementChart"),
    {
      type: "bar",
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: PALETTE.slice(0, labels.length),
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        ...baseOptions(),
        scales: {
          y: {
            beginAtZero: true, max: 100,
            ticks: { callback: v => v + "%", color: textColor() },
            grid: { color: gridColor() }
          },
          x: { grid: { display: false }, ticks: { color: textColor() } }
        }
      }
    }
  );
}

// ════════════════════════════════════════════════════════════════
//  CHART: Branch Average Salary (Bar)
// ════════════════════════════════════════════════════════════════
function renderBranchSalary(branchData) {
  const labels = Object.keys(branchData);
  const values = labels.map(b => branchData[b].average_package_lpa);

  activeCharts.branchSalary = new Chart(
    document.getElementById("branchSalaryChart"),
    {
      type: "bar",
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: PALETTE.slice(0, labels.length).map(c => c + "bb"),
          borderColor:     PALETTE.slice(0, labels.length),
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        ...baseOptions(),
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: v => v + " L", color: textColor() },
            grid: { color: gridColor() }
          },
          x: { grid: { display: false }, ticks: { color: textColor() } }
        }
      }
    }
  );
}

// ════════════════════════════════════════════════════════════════
//  CHART: Top Recruiters (Horizontal Bar)
// ════════════════════════════════════════════════════════════════
function renderRecruiters(recruiters) {
  activeCharts.recruiters = new Chart(
    document.getElementById("recruitersChart"),
    {
      type: "bar",
      data: {
        labels: recruiters.map(r => r.company),
        datasets: [{
          data: recruiters.map(r => r.students_hired),
          backgroundColor: PALETTE.map(c => c + "cc"),
          borderColor:     PALETTE,
          borderWidth: 1,
          borderRadius: 4,
        }]
      },
      options: {
        indexAxis: "y",
        ...baseOptions(),
        scales: {
          x: {
            beginAtZero: true,
            ticks: { stepSize: 1, color: textColor() },
            grid: { color: gridColor() }
          },
          y: { grid: { display: false }, ticks: { color: textColor(), font: { size: 11 } } }
        }
      }
    }
  );
}

// ════════════════════════════════════════════════════════════════
//  CHART: CGPA vs Salary (Scatter)
// ════════════════════════════════════════════════════════════════
function renderCgpaSalary(cgpaData) {
  const branchMap = {};
  cgpaData.forEach(s => {
    if (!branchMap[s.branch]) branchMap[s.branch] = [];
    branchMap[s.branch].push({ x: s.cgpa, y: s.package_lpa, name: s.name });
  });

  const datasets = Object.entries(branchMap).map(([branch, pts], i) => ({
    label: branch,
    data: pts,
    backgroundColor: PALETTE[i % PALETTE.length] + "cc",
    pointRadius: 8,
    pointHoverRadius: 11,
  }));

  activeCharts.cgpaSalary = new Chart(
    document.getElementById("cgpaSalaryChart"),
    {
      type: "scatter",
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { color: textColor(), padding: 16 } },
          tooltip: {
            callbacks: {
              label: ctx => {
                const pt = ctx.raw;
                return ` ${pt.name}  |  CGPA: ${pt.x}  |  ${pt.y} LPA`;
              }
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: "CGPA", color: textColor() },
            min: 6, max: 10,
            ticks: { stepSize: 0.5, color: textColor() },
            grid: { color: gridColor() }
          },
          y: {
            title: { display: true, text: "Package (LPA)", color: textColor() },
            beginAtZero: true,
            ticks: { callback: v => v + " L", color: textColor() },
            grid: { color: gridColor() }
          }
        }
      }
    }
  );
}

// ════════════════════════════════════════════════════════════════
//  BRANCH SUMMARY TABLE
// ════════════════════════════════════════════════════════════════
function renderBranchTable(branchData) {
  const tbody = document.getElementById("branchTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  Object.entries(branchData).forEach(([branch, d], i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${branch}</strong></td>
      <td>${d.total_students}</td>
      <td>${d.placed_students}</td>
      <td>
        <div class="rate-bar">
          <div class="rate-bar-track">
            <div class="rate-bar-fill" style="width:${d.placement_rate_pct}%"></div>
          </div>
          <span class="rate-val">${d.placement_rate_pct}%</span>
        </div>
      </td>
      <td>${d.average_package_lpa.toFixed(2)}</td>
      <td>${d.highest_package_lpa}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ════════════════════════════════════════════════════════════════
//  STUDENT TABLE
// ════════════════════════════════════════════════════════════════
function renderTable(students) {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";

  students.forEach(s => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><code style="font-size:.8rem">${s.student_id}</code></td>
      <td>${s.name}</td>
      <td><span class="branch-pill">${s.branch}</span></td>
      <td><strong>${s.cgpa.toFixed(1)}</strong></td>
      <td>
        <span class="badge ${s.placed ? "badge-placed" : "badge-unplaced"}">
          ${s.placed ? "✓ Placed" : "✗ Not Placed"}
        </span>
      </td>
      <td>${s.company}</td>
      <td>${s.placed ? "<strong>" + s.package_lpa.toFixed(1) + "</strong>" : "—"}</td>
      <td>${s.offer_type}</td>
    `;
    tbody.appendChild(tr);
  });

  setText("tableCount", `Showing ${students.length} of ${allStudents.length} students`);
}

// ════════════════════════════════════════════════════════════════
//  FILTERS
// ════════════════════════════════════════════════════════════════
function setupFilters() {
  ["branchFilter", "statusFilter", "offerFilter", "searchBox"].forEach(id => {
    document.getElementById(id)?.addEventListener("input", applyFilters);
  });
}

function populateBranchFilter(branchData) {
  const sel = document.getElementById("branchFilter");
  Object.keys(branchData).sort().forEach(b => {
    const opt    = document.createElement("option");
    opt.value    = b;
    opt.textContent = b;
    sel.appendChild(opt);
  });
}

function applyFilters() {
  const branch = document.getElementById("branchFilter").value;
  const status = document.getElementById("statusFilter").value;
  const offer  = document.getElementById("offerFilter").value;
  const query  = document.getElementById("searchBox").value.toLowerCase().trim();

  let filtered = allStudents.filter(s => {
    const matchBranch = branch === "ALL" || s.branch === branch;
    const matchStatus = status === "ALL"
      || (status === "Yes" && s.placed)
      || (status === "No"  && !s.placed);
    const matchOffer  = offer === "ALL" || s.offer_type === offer;
    const matchQuery  = !query
      || s.name.toLowerCase().includes(query)
      || s.company.toLowerCase().includes(query)
      || s.student_id.toLowerCase().includes(query);
    return matchBranch && matchStatus && matchOffer && matchQuery;
  });

  // Re-apply current sort
  if (sortState.col) filtered = sortStudents(filtered, sortState.col, sortState.dir);

  renderTable(filtered);
}

// ════════════════════════════════════════════════════════════════
//  COLUMN SORT
// ════════════════════════════════════════════════════════════════
function setupSort() {
  document.querySelectorAll("th.sortable").forEach(th => {
    th.addEventListener("click", () => {
      const col = th.dataset.col;
      if (sortState.col === col) {
        sortState.dir = sortState.dir === "asc" ? "desc" : "asc";
      } else {
        sortState.col = col;
        sortState.dir = "asc";
      }
      // Update header indicators
      document.querySelectorAll("th.sortable").forEach(h => {
        h.classList.remove("sort-asc", "sort-desc");
      });
      th.classList.add(sortState.dir === "asc" ? "sort-asc" : "sort-desc");
      applyFilters();
    });
  });
}

function sortStudents(list, col, dir) {
  return [...list].sort((a, b) => {
    let va = a[col], vb = b[col];
    if (typeof va === "string") va = va.toLowerCase();
    if (typeof vb === "string") vb = vb.toLowerCase();
    if (va < vb) return dir === "asc" ? -1 : 1;
    if (va > vb) return dir === "asc" ?  1 : -1;
    return 0;
  });
}

// ════════════════════════════════════════════════════════════════
//  UTILITY
// ════════════════════════════════════════════════════════════════
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}
