// ============================================================
//  giuli-wishes — app
//  Legge Google Sheet (CSV) + Risposte, costruisce vista unificata.
// ============================================================

(function () {
  "use strict";

  // ---------- Piccoli util ----------
  const elem = (id) => document.getElementById(id);
  const norm = (s) =>
    String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const isYes = (v) => /^(si|sì|yes|true|1|x|✓|✔)$/i.test(String(v || "").trim());

  // ---------- CSV parse (gestisce campi tra virgolette) ----------
  function csvToArray(text) {
    const rows = [];
    let row = [], cell = "", inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { cell += '"'; i++; } else inQuotes = false;
        } else cell += c;
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(cell); cell = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); cell = "";
        if (row.some((v) => v !== "")) rows.push(row);
        row = [];
      } else cell += c;
    }
    row.push(cell);
    if (row.some((v) => v !== "")) rows.push(row);
    return rows;
  }

  async function fetchCsv(id, gid = "0") {
    // Cache-buster: il redirect 307 di /export può essere servito da un cache
    // (snapshot stale). Ogni richiesta ha un URL nuovo -> dato sempre aggiornato.
    const url =
      `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${encodeURIComponent(gid)}` +
      `&_cb=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Sheet non raggiungibile (" + res.status + ")");

    const text = await res.text();
    if (text.trimStart().startsWith("<")) {
      throw new Error("Google ha restituito una pagina di accesso invece del CSV");
    }
    return csvToArray(text);
  }

  // ---------- Build gifts ----------
  function buildGifts(rows) {
    if (!rows.length) return [];
    const header = rows[0].map(norm);
    const colFor = (canonical) => {
      const keys = CONFIG.headerMap[canonical] || [];
      for (const k of keys) {
        const idx = header.indexOf(norm(k));
        if (idx !== -1) return idx;
      }
      return -1;
    };
    const C = {
      id: colFor("id"), nome: colFor("nome"), descrizione: colFor("descrizione"),
      immagine: colFor("immagine"), links: colFor("links"), prezzo: colFor("prezzo"), tags: colFor("tags"),
      nascosto: colFor("nascosto"), preso: colFor("preso"), ordine: colFor("ordine"),
    };

    const gifts = [];
    const used = new Set();
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const get = (c) => (c >= 0 ? (row[c] || "").trim() : "");
      if (isYes(get(C.nascosto))) continue; // le righe nascoste non vengono mai validate o mostrate
      const nome = get(C.nome);
      if (!nome) continue; // salta righe vuote

      const id = get(C.id);
      if (!id) throw new Error(`Manca l'ID del regalo “${nome}” (riga ${r + 1} del foglio). Aggiungi un valore univoco nella colonna ID.`);
      if (used.has(id)) throw new Error(`L'ID “${id}” del regalo “${nome}” è duplicato (riga ${r + 1} del foglio). Ogni regalo visibile deve avere un ID univoco.`);
      used.add(id);

      gifts.push({
        id,
        nome,
        descrizione: get(C.descrizione),
        immagine: get(C.immagine),
        links: get(C.links)
          .split(/\s+-\s+|\s*\|\s*|\r?\n/)
          .map((s) => s.trim())
          .filter((s) => s.startsWith("http")),
        prezzo: get(C.prezzo),
        tags: get(C.tags)
          .split(/\s*,\s*|\s*\|\s*|\r?\n/)
          .map((tag) => tag.trim())
          .filter(Boolean),
        ordine: C.ordine >= 0 ? Number(get(C.ordine)) || r : r,
        hidden: isYes(get(C.nascosto)),
        preso: isYes(get(C.preso)),
      });
    }
    return gifts;
  }

  // ---------- Risposte (contributi / acquisti) ----------
  function buildAnswers(rows) {
    const byGift = new Map();
    if (!rows.length) return byGift;
    const header = rows[0].map(norm);
    const iId = header.findIndex((h) => h.includes("id") || h.includes("regalo"));
    const iTipo = header.findIndex((h) => h.includes("tipo"));
    if (iId < 0 || iTipo < 0) return byGift;
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const gid = (row[iId] || "").trim();
      const tipo = norm(row[iTipo] || "");
      if (!gid) continue;
      if (!byGift.has(gid)) byGift.set(gid, { contributi: 0, acquistato: false });
      const rec = byGift.get(gid);
      if (tipo.includes("acquisto") || tipo.includes("prendo")) rec.acquistato = true;
      if (tipo.includes("contribuisco") || tipo.includes("contributo")) rec.contributi++;
    }
    return byGift;
  }

  // ---------- Vista unificata + ordinamento ----------
  function compute(items, answers) {
    const fondo = CONFIG.fondoDesideri;
    return [fondo, ...items]
      .filter((g) => !g.hidden)
      .map((g) => {
        const isFondo = g.id === fondo.id;
        return {
          ...g,
          fondo: isFondo,
          taken: !isFondo && (g.preso || (answers.get(g.id) || {}).acquistato === true),
          contributi: (answers.get(g.id) || {}).contributi || 0,
        };
      })
      .sort(
        (a, b) =>
          Number(a.taken) - Number(b.taken) ||
          (Number(a.ordine) || 0) - (Number(b.ordine) || 0)
      );
  }

  // ---------- Form precompilato ----------
  function formUrl(gift, action) {
    const { entries, tipi } = CONFIG.form;
    const base = safeUrl(CONFIG.form.baseUrl);
    if (!base) return "#";
    const params = new URLSearchParams({
      [entries.id]: gift.id,
      [entries.titolo]: gift.nome,
      [entries.tipo]: tipi[action],
    });
    return `${base}?${params}`;
  }

  // ---------- Render ----------
  const grid = elem("gifts");
  const emptyEl = elem("empty");
  const tagFilters = elem("tag-filters");
  const DOM = new Map();
  let selectedTag = ""; // id regalo -> card element

  const PLACEHOLDER_IMG =
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 260'>
        <rect width='400' height='260' fill='#FCE8B3'/>
        <circle cx='200' cy='120' r='46' fill='#F6C453'/>
        <g stroke='#9CAF88' stroke-width='7' stroke-linecap='round'>
          <path d='M200 44 v-22'/><path d='M200 196 v22'/>
          <path d='M124 120 H102'/><path d='M276 120 H298'/>
          <path d='M146 66 l-16 -16'/><path d='M254 66 l16 -16'/>
          <path d='M146 174 l-16 16'/><path d='M254 174 l16 16'/>
        </g>
      </svg>`
    );

  function prezzoText(g) {
    if (!g.prezzo) return "";
    return /\d/.test(g.prezzo) && !g.prezzo.includes("€") ? "Circa " + g.prezzo + " €" : g.prezzo;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function safeUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
    } catch {
      return "";
    }
  }

  function cardHtml(g) {
    const linksList = Array.isArray(g.links) ? g.links : [];
    const links = linksList
      .map(safeUrl)
      .filter(Boolean)
      .map(
        (l, i) =>
          `<a class="prod-btn" href="${escapeHtml(l)}" target="_blank" rel="noopener">${
            linksList.length > 1 ? `Esempio ${i + 1}` : "Esempio"
          }</a>`
      )
      .join("");
    const image = safeUrl(g.immagine) || PLACEHOLDER_IMG;
    const tags = (g.tags || [])
      .map((tag) => `<span class="card-tag">${escapeHtml(tag)}</span>`)
      .join("");
    return `
      <article class="card ${g.taken ? "taken" : ""}" data-id="${escapeHtml(g.id)}">
        <div class="card-img-wrap">
          <img class="card-img" src="${escapeHtml(image)}" alt="${escapeHtml(g.nome)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" />
          <span class="badge badge-taken" data-role="taken-badge" ${g.taken ? "" : "hidden"}>✅ Già preso</span>
          <span class="badge badge-contributi" data-role="contributi" ${g.contributi > 0 ? "" : "hidden"}>👥 <span data-role="contributi-num">${g.contributi}</span> <span data-role="contributi-label">${g.contributi === 1 ? "persona contribuisce" : "persone contribuiscono"}</span></span>
        </div>
        <div class="card-body">
          <h3 class="card-nome">${escapeHtml(g.nome)}</h3>
          <span class="card-prezzo">${escapeHtml(prezzoText(g))}</span>
          ${tags ? `<div class="card-tags">${tags}</div>` : ""}
          <p class="card-desc">${escapeHtml(g.descrizione)}</p>
          ${links ? `<div class="card-links">${links}</div>` : ""}
          <div class="card-actions ${g.fondo ? "card-actions-single" : ""}">
            ${g.fondo ? "" : `<a class="btn btn-primary ${g.taken ? "disabled" : ""}" href="${formUrl(g, "acquisto")}" target="_blank" rel="noopener">Lo prendo io!</a>`}
            <a class="btn btn-secondary ${g.taken ? "disabled" : ""}" href="${formUrl(g, "contributo")}" target="_blank" rel="noopener">Voglio contribuire</a>
          </div>
          <p class="card-taken-note" data-role="taken-note" ${g.taken ? "" : "hidden"}>Questo regalo è già stato preso ❤️</p>
        </div>
      </article>`;
  }

  function patch(card, g) {
    card.classList.toggle("taken", g.taken);
    const badge = card.querySelector('[data-role="taken-badge"]');
    const note = card.querySelector('[data-role="taken-note"]');
    const contrib = card.querySelector('[data-role="contributi"]');
    const contribNum = card.querySelector('[data-role="contributi-num"]');

    badge.hidden = !g.taken;
    note.hidden = !g.taken;

    if (g.contributi > 0) {
      const wasHidden = contrib.hidden;
      const was = Number(contribNum.textContent) || 0;
      contrib.hidden = false;
      contribNum.textContent = g.contributi;
      contrib.querySelector('[data-role="contributi-label"]').textContent = g.contributi === 1 ? "persona contribuisce" : "persone contribuiscono";
      if (wasHidden || g.contributi > was) {
        contribNum.classList.remove("pop");
        void contribNum.offsetWidth;
        contribNum.classList.add("pop");
      }
    } else {
      contrib.hidden = true;
    }

    card.querySelectorAll(".btn").forEach((b) => {
      const action = b.classList.contains("btn-primary") ? "acquisto" : "contributo";
      b.classList.toggle("disabled", g.taken);
      b.setAttribute("aria-disabled", g.taken ? "true" : "false");
      b.setAttribute("href", g.taken ? "#" : formUrl(g, action));
    });
  }

  let firstRender = true;

  function showSkeleton() {
    grid.innerHTML = "";
    for (let i = 0; i < 6; i++) {
      grid.insertAdjacentHTML(
        "beforeend",
        `<div class="card skeleton"><div class="sk-img shimmer"></div><div class="card-body"><div class="sk-line shimmer" style="width:60%"></div><div class="sk-line shimmer" style="width:90%"></div><div class="sk-line shimmer" style="width:45%"></div></div></div>`
      );
    }
  }

  // Riordina/minimale: riutilizza i nodi esistenti, ne crea solo i nuovi,
  // elimina quelli che non esistono più. appendChild su un nodo già attaccato
  // lo riposiziona senza ricaricare nulla.
  function renderTagFilters(items) {
    const tags = [...new Set(items.flatMap((gift) => gift.tags || []))].sort((a, b) => a.localeCompare(b, "it"));
    if (!tags.length) {
      tagFilters.hidden = true;
      return;
    }
    tagFilters.hidden = false;
    tagFilters.innerHTML = [`<button class="tag-filter ${selectedTag ? "" : "active"}" type="button" data-tag="">Tutti</button>`, ...tags.map((tag) => `<button class="tag-filter ${selectedTag === tag ? "active" : ""}" type="button" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`)].join("");
    tagFilters.querySelectorAll(".tag-filter").forEach((button) => {
      button.addEventListener("click", () => {
        selectedTag = button.dataset.tag;
        render(items);
      });
    });
  }

  function render(items) {
    renderTagFilters(items);
    const visibleItems = selectedTag ? items.filter((gift) => (gift.tags || []).includes(selectedTag)) : items;
    if (firstRender) {
      grid.innerHTML = "";
      firstRender = false;
    }
    const ids = new Set(visibleItems.map((g) => g.id));

    for (const [id, card] of DOM) {
      if (!ids.has(id)) {
        card.remove();
        DOM.delete(id);
      }
    }

    visibleItems.forEach((g) => {
      let card = DOM.get(g.id);
      if (!card) {
        grid.insertAdjacentHTML("beforeend", cardHtml(g));
        card = grid.lastElementChild;
        card.querySelectorAll(".btn").forEach((button) => {
          button.addEventListener("click", (event) => {
            if (button.classList.contains("disabled") || button.getAttribute("href") === "#") {
              event.preventDefault();
            }
          });
        });
        DOM.set(g.id, card);
      }
      grid.appendChild(card); // riordina se serve (no-cost se già in posizione)
    });

    visibleItems.forEach((g) => patch(DOM.get(g.id), g));
    emptyEl.hidden = visibleItems.length > 0;
  }

  // ---------- Init ----------
  async function load() {
    const rows = await fetchCsv(CONFIG.spreadsheetId);
    const gifts = buildGifts(rows);

    let answers = new Map();
    if (CONFIG.answersSpreadsheetId) {
      try {
        answers = buildAnswers(await fetchCsv(CONFIG.answersSpreadsheetId, CONFIG.answersSheetGid));
      } catch (e) {
        console.warn("Risposte non leggibili", e);
      }
    }
    render(compute(gifts, answers));
  }

  function renderFesta() {
    const f = CONFIG.festa;
    document.title = f.titolo + " 🎉";
    elem("festa-titolo").textContent = f.titolo;
    elem("festa-eta").textContent = f.eta;
    elem("festa-sottotitolo").textContent = f.sottotitolo;
  }

  function showLoadError(error) {
    grid.innerHTML = `
      <div class="error-card">
        <span class="error-flower" aria-hidden="true">🌻</span>
        <p>Non riesco a mostrare la lista dei regali.</p>
        <p class="error-detail">${escapeHtml(error.message || "Controlla il foglio e riprova.")}</p>
        <button class="retry-btn" type="button">Riprova</button>
      </div>`;
    grid.querySelector(".retry-btn").addEventListener("click", loadInitial);
    console.error(error);
  }

  async function loadInitial() {
    showSkeleton();
    firstRender = true;
    try {
      await load();
    } catch (error) {
      showLoadError(error);
    }
  }

  function start() {
    renderFesta();
    loadInitial();

    if (CONFIG.pollInterval > 0) {
      setInterval(() => load().catch((e) => console.warn("Polling fallito", e)), CONFIG.pollInterval);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
