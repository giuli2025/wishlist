// ============================================================
//  giuli-wishes — configuration
//  Edit this file to point the site at your real data.
//  Crea il Google Form (vedi README) e compila "form".
// ============================================================
const CONFIG = {
  // Id del Google Sheet "Regali" (Pubblica: File -> Condividi -> Pubblica nel web)
  spreadsheetId: "1-50UEOSUl8GV0c0_TfagDuchqv3bdRgblBxsdj8PGEQ",

  // Facoltativo: Sheet "Risposte" (collegato al Form). Vuoto = salta il merge.
  // Dopo aver creato il Form, metti qui l'id dello sheet delle risposte.
  answersSpreadsheetId: "1YdvJZ3F7r70ujz2G43VwCQi_U6vH1wQSRaGBRaSFQas",

  form: {
    baseUrl: "https://docs.google.com/forms/d/e/1FAIpQLScWC4pMbucXFBVeAhdTqS4lQabOoFP1VqGkEQXujBW5q5-0aA/viewform",
    entries: {
      id: "entry.2025041747",
      titolo: "entry.1341644938",
      tipo: "entry.2049914023",
    },
    tipi: {
      acquisto: "Lo acquisto io!",
      contributo: "Contribuisco con una quota a questo regalo",
    },
  },

  answersSheetGid: "1900763737",

  // Polling in millisecondi (default 30000 = 30 s)
  pollInterval: 30000,

  // Mappatura intestazioni colonne -> campo canonico.
  // La prima chiave trovata vince; supporta sheet con nomi diversi.
  headerMap: {
    id:          ["id"],
    nome:        ["titolo", "nome", "name"],
    descrizione: ["descrizione", "description", "desc"],
    immagine:    ["immagine", "image", "img", "foto"],
    links:       ["links", "link", "link prodotto", "url"],
    prezzo:      ["prezzo", "price"],
    tags:        ["tags", "tag"],
    nascosto:    ["nascosto", "hidden"],
    preso:       ["presi preso", "preso", "acquistato", "gia preso", "già preso"],
    ordine:      ["ordine", "order"],
  },

  fondoDesideri: {
    id: "fondo-desideri-da-grande",
    nome: "Fondo desideri da grande",
    descrizione: "Un contributo per i desideri futuri di Giulia, da custodire e far crescere nel tempo.",
    immagine: "https://i.etsystatic.com/49999102/r/il/27aaff/6707848656/il_1588xN.6707848656_f8kf.jpg",
    tags: ["Futuro"],
    ordine: -1,
  },

  // Dettagli festa — personalizzabili
  festa: {
    nome: "Giulia",
    eta: "1", // età che compie
    titolo: "Giulia",
    sottotitolo: "",
    intro:
      "Se vi fa piacere partecipare con un regalo, abbiamo preparato una lista di idee. Naturalmente la vostra presenza sarà il regalo più bello. 🌟"
  },
};
