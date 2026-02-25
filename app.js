// --- Helpers ---
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// --- Mobile nav ---
const navToggle = $("#navToggle");
const navLinks = $("#navLinks");

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  // Cierra menú al clicar un enlace (móvil)
  $$(".nav__link, .btn", navLinks).forEach((a) => {
    a.addEventListener("click", () => {
      navLinks.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

// --- Tabs ---
const tabs = $$(".tab");
const panels = $$(".panel");

function activateTab(tabId) {
  tabs.forEach((t) => {
    const active = t.dataset.tab === tabId;
    t.classList.toggle("active", active);
    t.setAttribute("aria-selected", active ? "true" : "false");
  });

  panels.forEach((p) => {
    const active = p.id === `panel-${tabId}`;
    p.classList.toggle("active", active);
  });
}

tabs.forEach((t) => {
  t.addEventListener("click", () => activateTab(t.dataset.tab));
});

// --- Active nav link on scroll ---
const sections = ["inicio", "producto", "tabs", "opiniones", "contacto"].map((id) => document.getElementById(id));
const navAnchors = $$(".nav__link");

function setActiveLink(id) {
  navAnchors.forEach((a) => {
    const href = a.getAttribute("href");
    a.classList.toggle("active", href === `#${id}`);
  });
}

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) setActiveLink(e.target.id);
    });
  },
  { root: null, threshold: 0.35 }
);

sections.forEach((s) => s && observer.observe(s));

// --- Contact form (demo) ---
const contactForm = $("#contactForm");
const formStatus = $("#formStatus");

if (contactForm) {
  contactForm.addEventListener("submit", (ev) => {
    ev.preventDefault();

    // Simulación de envío
    const name = $("#name").value.trim();
    formStatus.textContent = `¡Gracias, ${name || "lector"}! Hemos recibido tu mensaje (demo).`;

    contactForm.reset();
  });
}

// --- Footer year ---
const year = $("#year");
if (year) year.textContent = new Date().getFullYear();