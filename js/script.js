document.getElementById("year").textContent = new Date().getFullYear();

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

/* Gallery lightbox — desktop/tablet only; on narrow screens the
   photos already run near full-width, so a zoom overlay adds
   nothing and just gets in the way of scrolling. */
const galleryImgs = Array.from(document.querySelectorAll(".gallery-tile--photo img"));
const lightbox = document.getElementById("lightbox");

if (galleryImgs.length && lightbox) {
  const lightboxImg = document.getElementById("lightboxImg");
  const closeBtn = document.getElementById("lightboxClose");
  const prevBtn = document.getElementById("lightboxPrev");
  const nextBtn = document.getElementById("lightboxNext");
  const isDesktop = () => window.matchMedia("(min-width: 641px)").matches;

  let currentIndex = 0;
  let lastFocused = null;

  const showAt = (index) => {
    currentIndex = (index + galleryImgs.length) % galleryImgs.length;
    const img = galleryImgs[currentIndex];
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
  };

  const openLightbox = (index, trigger) => {
    lastFocused = trigger;
    showAt(index);
    lightbox.hidden = false;
    closeBtn.focus();
    document.body.style.overflow = "hidden";
  };

  const closeLightbox = () => {
    lightbox.hidden = true;
    document.body.style.overflow = "";
    if (lastFocused) lastFocused.focus();
  };

  galleryImgs.forEach((img, index) => {
    img.addEventListener("click", () => {
      if (!isDesktop()) return;
      openLightbox(index, img);
    });
  });

  closeBtn.addEventListener("click", closeLightbox);
  prevBtn.addEventListener("click", () => showAt(currentIndex - 1));
  nextBtn.addEventListener("click", () => showAt(currentIndex + 1));

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (lightbox.hidden) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") showAt(currentIndex - 1);
    if (e.key === "ArrowRight") showAt(currentIndex + 1);
  });
}
