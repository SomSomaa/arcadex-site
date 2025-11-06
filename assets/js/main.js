// Minimál funkció: animációk tiltása, ha a user kikapcsolta
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

document.addEventListener('DOMContentLoaded', function(){
  // ===== Navbar burger =====
  const burger = document.querySelector('.nav-burger');
  const menu = document.querySelector('.nav-menu');
  if (burger && menu){
    burger.addEventListener('click', function(){
      const isOpen = menu.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Linkre kattintva záródiik mobilon
    menu.addEventListener('click', function(e){
      const link = e.target.closest('.nav-link');
      if (link && menu.classList.contains('is-open')){
        menu.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ===== Scroll progress bar =====
  const progressBar = document.querySelector('.nav-progress-bar');
  function updateProgress(){
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    if (progressBar) progressBar.style.width = progress.toFixed(2) + '%';
  }
  updateProgress();
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);

  // ===== Hero staggered reveal on load =====
  if (!prefersReducedMotion()){
    const heroItems = document.querySelectorAll('.reveal');
    heroItems.forEach(el => {
      // Kényszerített újrarenderelés, hogy biztos elinduljon az animáció
      void el.offsetWidth;
      el.style.willChange = 'transform, opacity, filter';
      // Az animációt a CSS kezeli — a késleltetés (--stagger) elemenként be van állítvaa
    });
    // Animáció után töröljük a will-change-et (optimalizáció)
    document.addEventListener('animationend', (e) => {
      if (e.target.classList.contains('reveal')){
        e.target.style.willChange = 'auto';
      }
    }, true);
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.style.opacity = 1);
  }

 // ===== Scrollra megjelenő elemek (IntersectionObserver) =====
  const observer = ('IntersectionObserver' in window) ? new IntersectionObserver((entries) => {
    for (const entry of entries){
      if (entry.isIntersecting){
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 }) : null;

  if (observer && !prefersReducedMotion()){
    document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));
  } else {
    // Fallback: láthatóvá tesszük
    document.querySelectorAll('.reveal-on-scroll').forEach(el => el.classList.add('is-visible'));
  }

  // ===== Finom kártya-dőlés egérmozgásra (tilt efekt) =====
  // Csak pointer fine eszközökön és ha nincs reduced motion
  const canTilt = window.matchMedia('(pointer:fine)').matches && !prefersReducedMotion();
  if (canTilt){
    const targets = document.querySelectorAll('.tilt-target');
    targets.forEach(card => {
      let rect;
      const maxTilt = 6; // fok
      function onEnter(){ rect = card.getBoundingClientRect(); card.style.transformStyle = 'preserve-3d'; }
      function onMove(e){
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        const tiltX = (py - 0.5) * -2 * maxTilt;
        const tiltY = (px - 0.5) *  2 * maxTilt;
        card.style.transform = `perspective(900px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) translateY(-6px)`;
      }
      function onLeave(){ card.style.transform = ''; }

      card.addEventListener('mouseenter', onEnter);
      card.addEventListener('mousemove', onMove);
      card.addEventListener('mouseleave', onLeave);
    });
  }
    // ===== BG képek sorban (egyesével) preload + fade =====

  function getBgUrl(el){
    // background-image vagy összesített background esetén is működik
    const style = getComputedStyle(el);
    const bg = style.backgroundImage; // pl. url("/img/game-1.jpg")
    if (!bg || bg === 'none') return null;
    const m = bg.match(/url\(["']?([^"')]+)["']?\)/);
    return m ? m[1] : null;
  }

  function preload(url){
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false); // hiba esetén se akadjon meg a sor
      img.src = url;
    });
  }

  // Egyszerre csak 1 képet töltünk, egymás után (szép, sorban érkező hatás)
  async function revealInSequence(els){
    for (let i = 0; i < els.length; i++){
      const el = els[i];
      // ha már egyszer betöltöttük (pl. visszagörgetés), ne töltsük újra
      if (el.classList.contains('is-loaded')) continue;

      const url = getBgUrl(el);
      el.classList.add('bg-fade');     // biztos ami biztos
      if (url) await preload(url);

      // kis, növekvő késleltetés a sor érzetért
      const delay = i * 200; // ms
      setTimeout(() => el.classList.add('is-loaded'), delay);
    }
  }

  // HERO azonnal (mindig a legelső legyen)
  const heroEl = document.querySelector('.hero.bg-fade');
  if (heroEl){
    const firstBatch = [heroEl];
    revealInSequence(firstBatch);
  }

  // A többinél csak akkor kezdjük a sorozatot, amikor a konténer a viewportba ér
  const seqTargets = document.querySelectorAll('.card-media.bg-fade, .game-thumb.bg-fade');
  if (seqTargets.length){
    if ('IntersectionObserver' in window && !prefersReducedMotion()){
      const seen = new Set();
      const io = new IntersectionObserver((entries) => {
        // amikor ELŐSZÖR megjelenik bármelyik target, indítsuk a sorozatot
        const needStart = entries.some(e => e.isIntersecting && !seen.has(e.target));
        entries.forEach(e => { if (e.isIntersecting) seen.add(e.target); });
        if (needStart){
          io.disconnect(); // egyszer indítjuk
          revealInSequence(seqTargets);
        }
      }, { rootMargin: '0px 0px -15% 0px', threshold: 0.15 });
      seqTargets.forEach(t => io.observe(t));
    } else {
      // fallback: azonnal, de még így is sorban jönnek
      revealInSequence(seqTargets);
    }
  }

});
