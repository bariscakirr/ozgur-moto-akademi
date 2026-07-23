/* ═══════════════════════════════════════════════
   Özgür Motosiklet Akademisi — main.js
   ═══════════════════════════════════════════════ */

(function () {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ─── 1. Hero canvas: gece yolunda far izleri ─── */
  const canvas = document.getElementById("heroCanvas");
  if (canvas && !prefersReduced) {
    const ctx = canvas.getContext("2d");
    let w, h, dpr;
    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    window.addEventListener("pointermove", (e) => {
      mouse.tx = e.clientX / window.innerWidth;
      mouse.ty = e.clientY / window.innerHeight;
    });

    // Far izi: perspektif içinde akan ışık şeritleri
    const COLORS = ["#ff6b3d", "#e6392b", "#ffd9c2", "#ffffff"];
    const streaks = [];
    const STREAK_COUNT = 46;

    function spawnStreak(initial) {
      return {
        // yatay konum: -1 (sol) .. 1 (sağ), merkezden dağıt
        lane: (Math.random() * 2 - 1) * (0.25 + Math.random() * 0.75),
        z: initial ? Math.random() : 1,          // 1 = ufuk, 0 = kamera
        speed: 0.0016 + Math.random() * 0.0045,
        len: 0.045 + Math.random() * 0.11,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        alpha: 0.25 + Math.random() * 0.55,
        width: 0.6 + Math.random() * 1.8,
      };
    }
    for (let i = 0; i < STREAK_COUNT; i++) streaks.push(spawnStreak(true));

    // z-derinliğini ekran koordinatına çevir
    function project(lane, z, vpx, vpy) {
      const p = 1 - Math.pow(z, 1.7);          // perspektif eğrisi
      const x = vpx + lane * (w * 0.75) * p;
      const y = vpy + (h - vpy) * p * 1.06;
      return { x, y, p };
    }

    let raf;
    function tick() {
      // fare yumuşatma
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;

      // kaçış noktası fareyle hafifçe kayar
      const vpx = w * 0.5 + (mouse.x - 0.5) * w * 0.12;
      const vpy = h * 0.38 + (mouse.y - 0.5) * h * 0.07;

      ctx.clearRect(0, 0, w, h);

      // zemin: yola vuran hafif sıcak parıltı
      const glow = ctx.createRadialGradient(vpx, vpy, 10, vpx, vpy, h * 0.85);
      glow.addColorStop(0, "rgba(255, 107, 61, 0.10)");
      glow.addColorStop(0.4, "rgba(230, 57, 43, 0.04)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // şerit çizgileri (statik yol hissi)
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      for (const laneX of [-0.55, -0.18, 0.18, 0.55]) {
        ctx.beginPath();
        const a = project(laneX, 0.985, vpx, vpy);
        const b = project(laneX, 0.05, vpx, vpy);
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      // far izleri
      for (let i = 0; i < streaks.length; i++) {
        const s = streaks[i];
        s.z -= s.speed;
        if (s.z <= 0.02) { streaks[i] = spawnStreak(false); continue; }

        const head = project(s.lane, s.z, vpx, vpy);
        const tail = project(s.lane, Math.min(s.z + s.len, 0.995), vpx, vpy);

        const grad = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(1, s.color);

        ctx.globalAlpha = s.alpha * Math.min(1, (1 - s.z) * 3);
        ctx.strokeStyle = grad;
        ctx.lineWidth = s.width * (0.4 + head.p * 2.4);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(tail.x, tail.y);
        ctx.lineTo(head.x, head.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(tick);
    }
    tick();

    // hero görünmüyorken animasyonu durdur (pil/performans)
    new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        if (!raf) tick();
      } else {
        cancelAnimationFrame(raf);
        raf = null;
      }
    }).observe(canvas);
  }

  /* ─── 2. Scroll reveal ─── */
  const revealEls = document.querySelectorAll(".reveal");
  if (prefersReduced) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const delay = parseInt(el.dataset.delay || "0", 10);
          setTimeout(() => el.classList.add("is-visible"), delay);
          revealObserver.unobserve(el);
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el) => revealObserver.observe(el));
  }

  /* ─── 3. Sayaçlar ─── */
  const counters = document.querySelectorAll(".stat__num");
  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        counterObserver.unobserve(el);
        const target = parseInt(el.dataset.count, 10);
        const suffix = el.dataset.suffix || "";
        if (prefersReduced) { el.textContent = target + suffix; return; }
        const dur = 1600;
        const t0 = performance.now();
        (function step(t) {
          const k = Math.min((t - t0) / dur, 1);
          const eased = 1 - Math.pow(1 - k, 3);
          el.textContent = Math.round(target * eased) + suffix;
          if (k < 1) requestAnimationFrame(step);
        })(t0);
      });
    },
    { threshold: 0.6 }
  );
  counters.forEach((el) => counterObserver.observe(el));

  /* ─── 4. Nav: scroll durumu + aktif bölüm ─── */
  const nav = document.getElementById("nav");
  const navLinks = document.querySelectorAll(".nav__link");
  const sections = [...navLinks]
    .map((l) => document.querySelector(l.getAttribute("href")))
    .filter(Boolean);

  function onScroll() {
    nav.classList.toggle("is-scrolled", window.scrollY > 40);
    const pos = window.scrollY + window.innerHeight * 0.35;
    let current = sections[0];
    for (const sec of sections) if (sec.offsetTop <= pos) current = sec;
    navLinks.forEach((l) =>
      l.classList.toggle("is-active", l.getAttribute("href") === "#" + current.id)
    );
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ─── 5. Mobil menü ─── */
  const burger = document.getElementById("navBurger");
  const linksBox = document.getElementById("navLinks");
  burger.addEventListener("click", () => {
    burger.classList.toggle("is-open");
    linksBox.classList.toggle("is-open");
  });
  linksBox.addEventListener("click", (e) => {
    if (e.target.closest("a")) {
      burger.classList.remove("is-open");
      linksBox.classList.remove("is-open");
    }
  });
})();
