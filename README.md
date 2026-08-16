# 🌼 giuli-wishes — Lista regali compleanno di Giulia

Sito **statico** (HTML + CSS + Vanilla JS) per la lista regali del compleanno di Giulia.
Hosting: **GitHub Pages**. Dati: **Google Sheets** (publici). Azioni: **Google Form** precompilati.
Niente backend, niente database, niente autenticazione. È quindi compatibile con **GitHub Pages**.

Tema **Sunshine & Petals**: giallo sole, bianco/cream, verde salvia. Mobile-first.

---

## Cos'è

Gli invitati aprono il sito, leggono le info della festa e la lista dei regali.
Per ogni regalo disponibile possono:

- **"L'ho preso"** → apre il Google Form precompilato (acquisto)
- **"Voglio contribuire"** → apre il Google Form precompilato (contributo)

Il sito rilegge automaticamente i dati ogni **30 s** (configurabile) e aggiorna la lista
senza bisogno di ricaricare la pagina. I regali acquistati si spostano in fondo e si disabilitano.

---

## Struttura

```
index.html       → pagina
css/style.css    → stile (tema Sunshine & Petals)
js/config.js     → ⚙️ QUI configuri tutto
js/app.js        → logica (fetch CSV, stato, render, polling)
```

---

## Configurazione

Tutto è configurato in `js/config.js`. Qui sotto trovi lo stato attuale e come
modificarlo. Form e repo sono già pronti.

### 1. Google Sheet "Regali"

Colonne usate dal sito (le prime chiavi valide vincono, con nomi alternativi):

| Colonna | Campi riconosciuti | Uso |
|---|---|---|
| `Titolo` | titolo / nome / name | nome regalo |
| `Descrizione` | descrizione / description / desc | testo |
| `Immagine` | immagine / image / img / foto | URL foto |
| `Links` | links / link / url | 1+ URL separati da `-` o `\|` o righe |
| `Prezzo` | prezzo / price | facoltativo (mostrato se presente) |
| `Nascosto` | nascosto / hidden | `Sì`/`TRUE` → il regalo è ignorato completamente |
| `Presi preso` | presi preso / preso / acquistato | `Sì`/`TRUE` → il regalo resta visibile, appare come già preso ed è disabilitato |
| `Id` | id | facoltativo; se assente si usa uno slug del titolo |
| `Ordine` | ordine / order | facoltativo; se assente si usa l'ordine delle righe |

Nel `CONFIG` imposta `spreadsheetId` = l'id nel link dello sheet.

**Pubblica lo sheet:** *File → Condividi → Pubblica nel web → CSV*, e salva.
(Mi raccomando: il sito legge il CSV; senza pubblicazione non funziona.)

### 2. Google Form (già creato)

Il modulo è già pronto: si apre con link precompilati per **ID regalo**,
**Titolo** e **Tipo azione** (valori `Lo acquisto io!` / `Contribuisco con una
quota a questo regalo`). È collegato a uno Sheet "Risposte".

In `config.js` è già impostato:

```js
form: {
  baseUrl: "https://docs.google.com/forms/d/e/1FAIpQLS.../viewform",
  entries: {
    id:    "entry.2025041747", // campo "ID regalo"
    titolo: "entry.1341644938", // campo "Titolo"
    tipo:  "entry.2049914023", // campo "Tipo azione"
  },
},
answersSpreadsheetId: "1YdvJZ3F7r70ujz2G43VwCQi_U6vH1wQSRaGBRaSFQas",
answersSheetGid: "1900763737",
```

> **Se ri-crei il Form o cambi i campi:** apri il menu `⋮` → **Ottieni link
> precompilato**, inserisci valori di prova nei campi precompilati, premi
> **Ottieni link** e copia i parametri `entry.xxxxxxxx=...` nell'URL per
> aggiornare `form.entries`. Lo Sheet "Risposte" serve a `answersSpreadsheetId`
> e `answersSheetGid` (gid da `?gid=` nel link dello sheet).

### 3. Titolo e introduzione

In `js/config.js` → `festa`: nome, età, titolo, sottotitolo e testo introduttivo della lista.

---

## Anteprima locale

```bash
python3 -m http.server 8000
# apri http://localhost:8000
```

## Deploy su GitHub Pages

Il repo è già online: `github.com/giuli2025/wishlist` (branch `main`).

```bash
git add . && git commit -m "chore: aggiornamento readme"
git push
```

*Settings → Pages → Source: branch `main`*, e il sito è live su
`https://giuli2025.github.io/wishlist/`.

---

## Possibili evoluzioni

Ricerca, categorie, barra di avanzamento quote, importo contributo, galleria foto,
countdown, tema grafico personalizzato, pagina di ringraziamento.
