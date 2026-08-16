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

## Configurazione rapida

Tutto si edita in `js/config.js`.

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

### 2. Google Form (da creare)

Crea un modulo con 4 campi:

1. **Nome** — obbligatorio
2. **Messaggio** — facoltativo
3. **ID regalo** — campo nascosto / precompilato tramite URL
4. **Tipo azione** — campo nascosto / precompilato tramite URL (valori `acquisto` / `contributo`)

Collega il modulo a uno Sheet "Risposte" (l'opzione crea lo sheet automaticamente).

Poi riempi in `config.js`:

```js
form: {
  baseUrl: "https://docs.google.com/forms/d/e/FORM_ID/viewform?usp=pp_url",
  entries: {
    id:   "entry.1234567890", // entry del campo "ID regalo"
    tipo: "entry.0987654321", // entry del campo "Tipo azione"
  }
},
answersSpreadsheetId: "ID_DEL_SHEET_RISPOSTE",
```

> **Come trovare gli `entry.xxxx`:** nell'editor del Form apri il menu `⋮` → **Ottieni link precompilato**, inserisci valori di prova nei campi "ID regalo" e "Tipo azione", quindi premi **Ottieni link**. I parametri `entry.xxxxxxxx=...` nell'URL generato sono gli ID da copiare. Lo Sheet "Risposte" serve inoltre per `answersSpreadsheetId`.

### 3. Titolo e introduzione

In `js/config.js` → `festa`: nome, età, titolo, sottotitolo e testo introduttivo della lista.

---

## Anteprima locale

```bash
python3 -m http.server 8000
# apri http://localhost:8000
```

## Deploy su GitHub Pages

Crea un repo GitHub e:

```bash
git init && git add . && git commit -m "feat: lista regali compleanno Giulia"
git branch -M main
git remote add origin git@github.com:TUO_USER/giuli-wishes.git
git push -u origin main
```

Nel repo: *Settings → Pages → Source: branch `main`*, e il sito è live su
`https://TUO_USER.github.io/giuli-wishes/`.

---

## Possibili evoluzioni

Ricerca, categorie, barra di avanzamento quote, importo contributo, galleria foto,
countdown, tema grafico personalizzato, pagina di ringraziamento.
