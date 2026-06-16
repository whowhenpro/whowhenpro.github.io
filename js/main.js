// Top-level orchestration: counter animation, scroll reveal, pipeline toggle, bibtex copy.
(function () {

  // ── Animated stat counters ──────────────────────────────────
  function animateCount(el, target, duration = 1400) {
    const start = performance.now();
    const startVal = 0;
    function step(t) {
      const p = Math.min(1, (t - start) / duration);
      const ease = 1 - Math.pow(1 - p, 3); // easeOutCubic
      const v = Math.floor(startVal + (target - startVal) * ease);
      el.textContent = v.toLocaleString();
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target.toLocaleString();
    }
    requestAnimationFrame(step);
  }

  function wireStats() {
    const stats = document.querySelectorAll(".stat .num");
    if (!stats.length) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting && !e.target.dataset.done) {
          e.target.dataset.done = "1";
          animateCount(e.target, parseInt(e.target.dataset.count, 10));
        }
      });
    }, { threshold: 0.4 });
    stats.forEach(s => io.observe(s));
  }

  // ── Scroll-reveal sections ──────────────────────────────────
  function wireReveal() {
    const els = document.querySelectorAll(".section");
    els.forEach(el => el.classList.add("reveal"));
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.08 });
    els.forEach(el => io.observe(el));
  }

  // ── BibTeX copy ─────────────────────────────────────────────
  function wireBibtex() {
    const btn = document.getElementById("copy-bib");
    const bib = document.getElementById("bibtex");
    if (!btn || !bib) return;
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(bib.textContent.trim());
        const orig = btn.textContent;
        btn.textContent = "Copied ✓";
        setTimeout(() => (btn.textContent = orig), 1600);
      } catch (e) {
        // fallback
        const r = document.createRange();
        r.selectNodeContents(bib);
        getSelection().removeAllRanges();
        getSelection().addRange(r);
        document.execCommand("copy");
      }
    });
  }

  // ── Nav highlight on scroll ─────────────────────────────────
  function wireNavHighlight() {
    const sections = document.querySelectorAll("section.section, header.hero");
    const links = document.querySelectorAll(".nav-links a");
    const map = {};
    links.forEach(a => {
      const id = a.getAttribute("href").slice(1);
      map[id] = a;
    });
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        const id = e.target.id;
        if (map[id] && e.isIntersecting) {
          links.forEach(a => a.style.color = "");
          map[id].style.color = "var(--accent)";
        }
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    sections.forEach(s => io.observe(s));
  }

  function init() {
    wireStats();
    wireReveal();
    wireBibtex();
    wireNavHighlight();
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
