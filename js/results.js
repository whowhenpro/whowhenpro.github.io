// One unified leaderboard table: Model × (Text | Image | Video) × (Agent/Step/Error/Joint).
// Best / second-best are computed per (modality, metric) column over all model rows,
// so the highlighting is always self-consistent with the numbers shown.
(function () {
  function ranksFor(rows, mods, metrics) {
    const r = {};
    mods.forEach(mod => {
      r[mod] = {};
      metrics.forEach(m => {
        const vals = rows
          .filter(row => row.model && row[mod] && typeof row[mod][m.key] === "number")
          .map(row => row[mod][m.key]);
        const uniq = [...new Set(vals)].sort((a, b) => b - a);
        r[mod][m.key] = { best: uniq[0], second: uniq[1] };
      });
    });
    return r;
  }

  function cellClass(mod, metricKey, val, ranks) {
    if (typeof val !== "number") return "na";
    const rk = ranks[mod][metricKey];
    if (val === rk.best) return `best m-${mod}`;
    if (val === rk.second) return `second m-${mod}`;
    return "";
  }

  function render() {
    const tbody = document.querySelector("#leaderboard tbody");
    // NB: top-level `const LEADERBOARD` is a global *binding*, not a property of
    // window, so check the bare identifier rather than window.LEADERBOARD.
    if (!tbody || typeof LEADERBOARD === "undefined") return;
    const { rows, modalities, metrics } = LEADERBOARD;
    const mods = modalities.map(m => m.key);
    const ranks = ranksFor(rows, mods, metrics);
    const ncols = 1 + mods.length * metrics.length;

    tbody.innerHTML = rows.map(row => {
      if (row.section) {
        return `<tr class="section-row"><td colspan="${ncols}">${row.section}</td></tr>`;
      }
      const cells = mods.map(mod =>
        metrics.map((m, i) => {
          const v = row[mod] ? row[mod][m.key] : null;
          const cls = cellClass(mod, m.key, v, ranks);
          const start = i === 0 ? " grp-start" : "";
          const disp = typeof v === "number" ? v.toFixed(1) : "—";
          return `<td class="${cls}${start}">${disp}</td>`;
        }).join("")
      ).join("");
      return `<tr>
        <td class="model-cell"><img src="assets/logos/${row.logo}.svg" alt="" loading="lazy" onerror="this.onerror=null;this.src='assets/logos/${row.logo}.png'"><span>${row.model}</span></td>
        ${cells}
      </tr>`;
    }).join("");
  }

  function init() {
    if (!document.getElementById("leaderboard")) return;
    render();
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
