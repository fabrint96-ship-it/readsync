/* ==========================
   LibroMark — Marcapáginas de lectura
   - Añadir libros con progreso
   - Favoritos, estado (leyendo/terminado)
   - Búsqueda, filtro y etiquetas
   - Orden
   - Importar / Exportar JSON
   - LocalStorage
========================== */

const KEY = "libromark_v1";
const $ = (s) => document.querySelector(s);

const el = {
  search: $("#search"),
  filter: $("#filter"),
  sort: $("#sort"),
  tagBar: $("#tagBar"),
  grid: $("#grid"),
  empty: $("#empty"),
  stats: $("#stats"),

  form: $("#bookForm"),
  title: $("#title"),
  author: $("#author"),
  pages: $("#pages"),
  current: $("#current"),
  tags: $("#tags"),
  spineColor: $("#spineColor"),
  btnClear: $("#btnClear"),

  btnExport: $("#btnExport"),
  fileImport: $("#fileImport"),

  dialog: $("#editDialog"),
  editForm: $("#editForm"),
  eTitle: $("#eTitle"),
  eAuthor: $("#eAuthor"),
  ePages: $("#ePages"),
  eCurrent: $("#eCurrent"),
  eTags: $("#eTags"),
  eColor: $("#eColor"),
  eStatus: $("#eStatus"),
  btnCloseModal: $("#btnCloseModal"),
  btnCancel: $("#btnCancel"),
};

let state = {
  items: load(),
  activeTag: null,
  editingId: null,
};

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function parseTags(raw) {
  return (raw || "")
    .split(",")
    .map(t => t.trim())
    .filter(Boolean)
    .map(t => t.toLowerCase());
}

function unique(arr){ return [...new Set(arr)]; }

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(data)) return seed();
    return data.map(sanitizeItem);
  } catch {
    return seed();
  }
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(state.items));
}

function sanitizeItem(x) {
  const pages = Number(x.pages || 1);
  const current = clamp(Number(x.current || 0), 0, pages);
  const status = String(x.status || (current >= pages ? "finished" : "reading"));

  return {
    id: String(x.id || uid()),
    title: String(x.title || "Sin título"),
    author: String(x.author || "Autor/a"),
    pages,
    current,
    tags: Array.isArray(x.tags) ? unique(x.tags.map(t => String(t).toLowerCase())) : [],
    favorite: Boolean(x.favorite),
    spine: String(x.spine || "#7aa8ff"),
    status: status === "finished" ? "finished" : "reading",
    createdAt: Number(x.createdAt || Date.now()),
  };
}

function seed() {
  // Demo bonita para que se vea visual al abrir por primera vez
  return [
    {
      id: uid(),
      title: "Orgullo y prejuicio",
      author: "Jane Austen",
      pages: 432,
      current: 120,
      tags: ["clásico", "romance"],
      favorite: true,
      spine: "#d8a9ff",
      status: "reading",
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2
    },
    {
      id: uid(),
      title: "Cien años de soledad",
      author: "Gabriel García Márquez",
      pages: 496,
      current: 496,
      tags: ["realismo mágico", "clásico"],
      favorite: false,
      spine: "#ffd66b",
      status: "finished",
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 6
    },
    {
      id: uid(),
      title: "El Hobbit",
      author: "J.R.R. Tolkien",
      pages: 310,
      current: 78,
      tags: ["fantasía", "aventura"],
      favorite: false,
      spine: "#8be7c3",
      status: "reading",
      createdAt: Date.now() - 1000 * 60 * 60 * 12
    },
  ].map(sanitizeItem);
}

/* ===== Render ===== */
function render() {
  const q = (el.search.value || "").trim().toLowerCase();
  const filter = el.filter.value;
  const sort = el.sort.value;

  let items = [...state.items];

  // filtro etiqueta
  if (state.activeTag) items = items.filter(i => i.tags.includes(state.activeTag));

  // búsqueda
  if (q) {
    items = items.filter(i => {
      const hay = `${i.title} ${i.author} ${i.tags.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }

  // filtro estado/favs
  if (filter === "reading") items = items.filter(i => i.status === "reading");
  if (filter === "finished") items = items.filter(i => i.status === "finished");
  if (filter === "favorite") items = items.filter(i => i.favorite);

  // orden
  if (sort === "recent") items.sort((a,b) => b.createdAt - a.createdAt);
  if (sort === "progress") items.sort((a,b) => pct(b) - pct(a));
  if (sort === "az") items.sort((a,b) => a.title.localeCompare(b.title));
  if (sort === "spine") items.sort((a,b) => a.spine.localeCompare(b.spine));

  // stats
  const total = state.items.length;
  const finished = state.items.filter(i => i.status === "finished").length;
  const reading = state.items.filter(i => i.status === "reading").length;
  const favs = state.items.filter(i => i.favorite).length;
  el.stats.textContent = `${items.length} visibles · ${total} total · ${reading} leyendo · ${finished} terminados · ${favs} ⭐`;

  // tag bar
  buildTagBar();

  // empty
  el.empty.hidden = state.items.length !== 0;
  el.grid.innerHTML = "";

  if (items.length === 0 && state.items.length > 0) {
    el.grid.appendChild(noResults());
    return;
  }

  items.forEach(i => el.grid.appendChild(bookCard(i)));
}

function buildTagBar() {
  const counts = new Map();
  for (const it of state.items) for (const t of it.tags) counts.set(t, (counts.get(t)||0)+1);

  const tags = [...counts.entries()]
    .sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0]))
    .map(([tag,count]) => ({tag,count}));

  el.tagBar.innerHTML = "";

  el.tagBar.appendChild(chip("Todas", state.activeTag === null, () => {
    state.activeTag = null;
    render();
  }));

  tags.forEach(({tag,count}) => {
    const pressed = state.activeTag === tag;
    el.tagBar.appendChild(chip(`${tag} · ${count}`, pressed, () => {
      state.activeTag = pressed ? null : tag;
      render();
    }));
  });
}

function chip(text, pressed, onClick) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "chip";
  b.textContent = text;
  b.setAttribute("aria-pressed", String(pressed));
  b.addEventListener("click", onClick);
  return b;
}

function noResults() {
  const d = document.createElement("div");
  d.className = "empty";
  d.innerHTML = `
    <div class="emptyIcon" aria-hidden="true">🔎</div>
    <h3>Sin resultados</h3>
    <p>Prueba con otra búsqueda o cambia filtros.</p>
  `;
  return d;
}

function pct(item) {
  return item.pages ? Math.round((item.current / item.pages) * 100) : 0;
}

function bookCard(item) {
  const p = pct(item);

  const card = document.createElement("article");
  card.className = "book";
  card.style.setProperty("--spine", item.spine);

  const pills = [
    `<span class="pill">${item.status === "finished" ? "Terminado" : "Leyendo"}</span>`,
    ...(item.tags.slice(0,3).map(t => `<span class="pill">#${escapeHtml(t)}</span>`))
  ].join("");

  card.innerHTML = `
    <div class="spine" aria-hidden="true"></div>
    <div class="bookBody">
      <div class="bookTop">
        <div>
          <h3 class="bookTitle">${escapeHtml(item.title)}</h3>
          <p class="bookAuthor">${escapeHtml(item.author)}</p>
        </div>
        <button class="iconBtn star" type="button" aria-pressed="${item.favorite ? "true":"false"}" title="Favorito">
          ${item.favorite ? "⭐" : "☆"}
        </button>
      </div>

      <div class="pillRow">${pills}</div>

      <div class="progressWrap">
        <div class="progressMeta">
          <span>${item.current} / ${item.pages} pág.</span>
          <span>${p}%</span>
        </div>
        <div class="progress" aria-label="Progreso de lectura">
          <div style="--pct:${p}%"></div>
        </div>
      </div>

      <div class="bookActions">
        <button class="iconBtn" type="button" data-act="mark">
          ${item.status === "finished" ? "Reabrir" : "Marcar terminado"}
        </button>
        <div style="display:flex; gap:8px;">
          <button class="iconBtn" type="button" data-act="edit">Editar</button>
          <button class="iconBtn" type="button" data-act="del">Borrar</button>
        </div>
      </div>
    </div>
  `;

  // fav
  card.querySelector(".star").addEventListener("click", () => {
    item.favorite = !item.favorite;
    save(); render();
  });

  // acciones
  card.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-act]");
    if (!b) return;

    const act = b.dataset.act;
    if (act === "del") {
      if (confirm(`¿Borrar "${item.title}"?`)) {
        state.items = state.items.filter(x => x.id !== item.id);
        save(); render();
      }
    }

    if (act === "edit") openEdit(item.id);

    if (act === "mark") {
      if (item.status === "finished") {
        item.status = "reading";
        item.current = clamp(item.current, 0, item.pages);
      } else {
        item.status = "finished";
        item.current = item.pages;
      }
      save(); render();
    }
  });

  return card;
}

/* ===== Form añadir ===== */
el.form.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = el.title.value.trim() || "Sin título";
  const author = el.author.value.trim() || "Autor/a";
  const pages = Math.max(1, Number(el.pages.value || 1));
  const current = clamp(Number(el.current.value || 0), 0, pages);

  const item = sanitizeItem({
    id: uid(),
    title,
    author,
    pages,
    current,
    tags: unique(parseTags(el.tags.value)),
    favorite: false,
    spine: el.spineColor.value || "#7aa8ff",
    status: current >= pages ? "finished" : "reading",
    createdAt: Date.now(),
  });

  state.items.unshift(item);
  save();

  el.form.reset();
  el.spineColor.value = "#7aa8ff";
  el.title.focus();

  render();
});

el.btnClear.addEventListener("click", () => {
  el.form.reset();
  el.spineColor.value = "#7aa8ff";
  el.title.focus();
});

/* Swatches */
document.querySelectorAll(".sw").forEach(btn => {
  btn.addEventListener("click", () => {
    el.spineColor.value = btn.dataset.color;
  });
});

/* ===== Buscar / filtrar / ordenar ===== */
el.search.addEventListener("input", render);
el.filter.addEventListener("change", render);
el.sort.addEventListener("change", render);

/* ===== Modal editar ===== */
function openEdit(id) {
  const it = state.items.find(x => x.id === id);
  if (!it) return;

  state.editingId = id;
  el.eTitle.value = it.title;
  el.eAuthor.value = it.author;
  el.ePages.value = it.pages;
  el.eCurrent.value = it.current;
  el.eTags.value = it.tags.join(", ");
  el.eColor.value = it.spine;
  el.eStatus.value = it.status;

  if (typeof el.dialog.showModal === "function") el.dialog.showModal();
  else el.dialog.setAttribute("open", "");
}

function closeEdit() {
  state.editingId = null;
  if (el.dialog.open) el.dialog.close();
  else el.dialog.removeAttribute("open");
}

el.btnCloseModal.addEventListener("click", closeEdit);
el.btnCancel.addEventListener("click", closeEdit);

el.dialog.addEventListener("click", (e) => {
  const rect = el.dialog.getBoundingClientRect();
  const inDialog = rect.top <= e.clientY && e.clientY <= rect.bottom &&
                   rect.left <= e.clientX && e.clientX <= rect.right;
  if (!inDialog) closeEdit();
});

el.editForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const id = state.editingId;
  const it = state.items.find(x => x.id === id);
  if (!it) return;

  const pages = Math.max(1, Number(el.ePages.value || 1));
  const current = clamp(Number(el.eCurrent.value || 0), 0, pages);

  it.title = el.eTitle.value.trim() || "Sin título";
  it.author = el.eAuthor.value.trim() || "Autor/a";
  it.pages = pages;
  it.current = current;
  it.tags = unique(parseTags(el.eTags.value));
  it.spine = el.eColor.value || it.spine;
  it.status = el.eStatus.value === "finished" ? "finished" : "reading";

  // si está terminado, ajusta current
  if (it.status === "finished") it.current = it.pages;

  save();
  closeEdit();
  render();
});

/* ===== Importar / Exportar ===== */
el.btnExport.addEventListener("click", () => {
  const payload = { version: 1, exportedAt: new Date().toISOString(), items: state.items };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "libromark.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
});

el.fileImport.addEventListener("change", async () => {
  const file = el.fileImport.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const imported = Array.isArray(parsed) ? parsed : parsed?.items;
    if (!Array.isArray(imported)) throw new Error("Formato inválido");

    const cleaned = imported.map(sanitizeItem);

    // fusionar por (title+author) como clave simple
    const key = (x) => `${x.title}`.toLowerCase() + "||" + `${x.author}`.toLowerCase();
    const existing = new Map(state.items.map(x => [key(x), x]));

    for (const it of cleaned) {
      const k = key(it);
      if (!existing.has(k)) {
        state.items.push(it);
        existing.set(k, it);
      }
    }

    save();
    toast("Importación completada ✅");
    render();
  } catch {
    toast("No se pudo importar ❌");
  } finally {
    el.fileImport.value = "";
  }
});

/* ===== Helpers ===== */
function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function toast(msg){
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.position = "fixed";
  t.style.left = "50%";
  t.style.bottom = "18px";
  t.style.transform = "translateX(-50%)";
  t.style.padding = "10px 12px";
  t.style.borderRadius = "999px";
  t.style.border = "1px solid rgba(43,43,43,.12)";
  t.style.background = "rgba(255,253,248,.92)";
  t.style.boxShadow = "0 10px 25px rgba(20,10,5,.15)";
  t.style.fontFamily = "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial";
  t.style.zIndex = "9999";
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1700);
}

/* Init */
render();