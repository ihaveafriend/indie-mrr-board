(function () {
  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  const state = {
    items: [],
    meta: {},
    query: "",
    sort: "rank",
  };

  const els = {
    tbody: document.getElementById("rank-body"),
    search: document.getElementById("search"),
    sort: document.getElementById("sort"),
    count: document.getElementById("result-count"),
    fetched: document.getElementById("fetched-at"),
    sourceNote: document.getElementById("source-note"),
    statCount: document.getElementById("stat-count"),
    statTop: document.getElementById("stat-top"),
    statMedian: document.getElementById("stat-median"),
    statGrowth: document.getElementById("stat-growth"),
    casesList: document.getElementById("cases-list"),
    casesCount: document.getElementById("cases-count"),
    menuToggle: document.getElementById("menu-toggle"),
    drawer: document.getElementById("drawer"),
    drawerBackdrop: document.getElementById("drawer-backdrop"),
    drawerClose: document.getElementById("drawer-close"),
  };

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatGrowth(v) {
    if (v === null || v === undefined || Number.isNaN(Number(v))) {
      return { text: "—", cls: "flat" };
    }
    const n = Number(v);
    const sign = n > 0 ? "+" : "";
    return {
      text: `${sign}${n}%`,
      cls: n > 0 ? "up" : n < 0 ? "down" : "flat",
    };
  }

  function median(nums) {
    if (!nums.length) return null;
    const a = [...nums].sort((x, y) => x - y);
    const mid = Math.floor(a.length / 2);
    return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
  }

  /* ---------- drawer ---------- */
  let lastFocus = null;

  function getDrawerFocusables() {
    if (!els.drawer) return [];
    return Array.from(
      els.drawer.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
  }

  function openDrawer() {
    if (!els.drawer || !els.menuToggle) return;
    lastFocus = document.activeElement;
    els.drawer.classList.add("is-open");
    els.drawer.setAttribute("aria-hidden", "false");
    els.menuToggle.setAttribute("aria-expanded", "true");
    els.menuToggle.setAttribute("aria-label", "关闭菜单");
    if (els.drawerBackdrop) els.drawerBackdrop.hidden = false;
    document.body.classList.add("drawer-open");
    const focusables = getDrawerFocusables();
    (focusables[0] || els.drawerClose || els.drawer).focus();
  }

  function closeDrawer() {
    if (!els.drawer || !els.menuToggle) return;
    els.drawer.classList.remove("is-open");
    els.drawer.setAttribute("aria-hidden", "true");
    els.menuToggle.setAttribute("aria-expanded", "false");
    els.menuToggle.setAttribute("aria-label", "打开菜单");
    if (els.drawerBackdrop) els.drawerBackdrop.hidden = true;
    document.body.classList.remove("drawer-open");
    if (lastFocus && typeof lastFocus.focus === "function") {
      lastFocus.focus();
    } else {
      els.menuToggle.focus();
    }
  }

  function isDrawerOpen() {
    return els.drawer && els.drawer.classList.contains("is-open");
  }

  function setupDrawer() {
    if (!els.menuToggle || !els.drawer) return;

    els.menuToggle.addEventListener("click", () => {
      if (isDrawerOpen()) closeDrawer();
      else openDrawer();
    });

    if (els.drawerClose) {
      els.drawerClose.addEventListener("click", closeDrawer);
    }
    if (els.drawerBackdrop) {
      els.drawerBackdrop.addEventListener("click", closeDrawer);
    }

    els.drawer.querySelectorAll("a[href]").forEach((link) => {
      link.addEventListener("click", () => closeDrawer());
    });

    document.addEventListener("keydown", (e) => {
      if (!isDrawerOpen()) return;
      if (e.key === "Escape") {
        e.preventDefault();
        closeDrawer();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = getDrawerFocusables();
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  /* ---------- cases ---------- */
  function renderCases(items) {
    if (!els.casesList) return;
    if (!items.length) {
      els.casesList.innerHTML = `<p class="empty">暂无案例，稍后再来。</p>`;
      if (els.casesCount) els.casesCount.textContent = "0 条";
      return;
    }
    if (els.casesCount) els.casesCount.textContent = `${items.length} 条`;
    els.casesList.innerHTML = items
      .map((item) => {
        const href = item.url || "#";
        const title = escapeHtml(item.title || "未命名案例");
        const source = escapeHtml(item.source || "");
        const added = escapeHtml(item.added_at || "");
        const summary = item.summary
          ? `<p class="case-summary">${escapeHtml(item.summary)}</p>`
          : "";
        return `<article class="case-card">
          <h3><a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${title}</a></h3>
          <div class="case-meta">
            ${source ? `<span class="source">${source}</span>` : ""}
            ${added ? `<span>收录 ${added}</span>` : ""}
          </div>
          ${summary}
        </article>`;
      })
      .join("");
  }

  async function loadCases() {
    if (!els.casesList) return;
    try {
      const res = await fetch("./data/cases.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items : [];
      renderCases(items);
    } catch (err) {
      els.casesList.innerHTML = `<p class="empty">加载案例失败：${escapeHtml(err.message)}</p>`;
      if (els.casesCount) els.casesCount.textContent = "失败";
    }
  }

  /* ---------- board ---------- */
  function filtered() {
    const q = state.query.trim().toLowerCase();
    let rows = state.items.slice();
    if (q) {
      rows = rows.filter((item) => {
        const hay = [item.name, item.description, item.founder, item.source]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    rows.sort((a, b) => {
      switch (state.sort) {
        case "mrr_desc":
          return (b.mrr_usd || 0) - (a.mrr_usd || 0);
        case "mrr_asc":
          return (a.mrr_usd || 0) - (b.mrr_usd || 0);
        case "growth_desc": {
          const ag = a.mom_growth_pct;
          const bg = b.mom_growth_pct;
          if (ag == null && bg == null) return a.rank - b.rank;
          if (ag == null) return 1;
          if (bg == null) return -1;
          return bg - ag;
        }
        case "growth_asc": {
          const ag = a.mom_growth_pct;
          const bg = b.mom_growth_pct;
          if (ag == null && bg == null) return a.rank - b.rank;
          if (ag == null) return 1;
          if (bg == null) return -1;
          return ag - bg;
        }
        case "name":
          return String(a.name).localeCompare(String(b.name), "zh");
        case "rank":
        default:
          return (a.rank || 0) - (b.rank || 0);
      }
    });
    return rows;
  }

  function render() {
    const rows = filtered();
    els.count.textContent = `显示 ${rows.length} / ${state.items.length} 条`;
    if (!rows.length) {
      els.tbody.innerHTML = `<tr><td colspan="6" class="empty">没有匹配的项目，试试别的关键词。</td></tr>`;
      return;
    }
    els.tbody.innerHTML = rows
      .map((item) => {
        const growth = formatGrowth(item.mom_growth_pct);
        const href = item.source_url || "https://trustmrr.com/";
        const rankCls = item.rank <= 3 ? "rank top" : "rank";
        return `<tr>
          <td class="${rankCls}">#${escapeHtml(item.rank)}</td>
          <td class="name-cell">
            <strong>${escapeHtml(item.name)}</strong>
            <div class="desc">${escapeHtml(item.description || "")}</div>
          </td>
          <td class="founder">${escapeHtml(item.founder || "—")}</td>
          <td class="mrr">${money.format(item.mrr_usd || 0)}</td>
          <td class="growth ${growth.cls}">${growth.text}</td>
          <td><a class="link-btn" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">TrustMRR ↗</a></td>
        </tr>`;
      })
      .join("");
  }

  function updateStats() {
    const mrrs = state.items.map((i) => i.mrr_usd || 0);
    const growths = state.items
      .map((i) => i.mom_growth_pct)
      .filter((v) => v !== null && v !== undefined);
    els.statCount.textContent = String(state.items.length);
    els.statTop.textContent = mrrs.length ? money.format(Math.max(...mrrs)) : "—";
    const med = median(mrrs);
    els.statMedian.textContent = med == null ? "—" : money.format(Math.round(med));
    els.statGrowth.textContent = growths.length
      ? `${growths.filter((g) => g > 0).length} 家正增长`
      : "—";
    els.fetched.textContent = state.meta.fetched_at || "—";
    if (els.sourceNote) els.sourceNote.textContent = state.meta.note || "";
  }

  async function bootBoard() {
    try {
      const res = await fetch("./data/trustmrr_top50.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      state.meta = data;
      state.items = Array.isArray(data.items) ? data.items : [];
      updateStats();
      render();
    } catch (err) {
      els.tbody.innerHTML = `<tr><td colspan="6" class="empty">加载榜单失败：${escapeHtml(err.message)}</td></tr>`;
    }
  }

  if (els.search) {
    els.search.addEventListener("input", (e) => {
      state.query = e.target.value;
      render();
    });
  }
  if (els.sort) {
    els.sort.addEventListener("change", (e) => {
      state.sort = e.target.value;
      render();
    });
  }

  setupDrawer();
  loadCases();
  bootBoard();
})();
