document.getElementById("year").textContent = new Date().getFullYear();

/* Signature element: the page "toasts" as you scroll, from raw-dough
   cream at the top to golden-brown by the footer. Skipped for dark mode
   (which already commits to a deep palette) and reduced-motion users. */
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const prefersReducedMotionForToast = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!prefersDark && !prefersReducedMotionForToast) {
  const raw = { cream: [251, 243, 231], creamDim: [243, 230, 211], accent: [200, 114, 47] };
  const toasted = { cream: [240, 213, 168], creamDim: [227, 190, 138], accent: [166, 84, 30] };
  const lerp = (a, b, t) => Math.round(a + (b - a) * t);
  const mix = (from, to, t) =>
    `rgb(${lerp(from[0], to[0], t)}, ${lerp(from[1], to[1], t)}, ${lerp(from[2], to[2], t)})`;

  let ticking = false;
  const applyToast = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const t = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
    const root = document.documentElement.style;
    root.setProperty("--cream", mix(raw.cream, toasted.cream, t));
    root.setProperty("--cream-dim", mix(raw.creamDim, toasted.creamDim, t));
    root.setProperty("--accent", mix(raw.accent, toasted.accent, t));
    ticking = false;
  };

  applyToast();
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        requestAnimationFrame(applyToast);
        ticking = true;
      }
    },
    { passive: true }
  );
}

const navToggle = document.getElementById("navToggle");
const primaryNav = document.getElementById("primaryNav");

navToggle.addEventListener("click", () => {
  const isOpen = primaryNav.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

primaryNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    primaryNav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  });
});

const revealEls = document.querySelectorAll(".reveal");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (prefersReducedMotion || !("IntersectionObserver" in window)) {
  revealEls.forEach((el) => el.classList.add("is-visible"));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  revealEls.forEach((el) => observer.observe(el));
}
