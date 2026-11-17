// Impulso · Frase del día
// Widget para la app Scriptable (iPhone). Muestra la misma frase del día que la app Impulso,
// en la pantalla de bloqueo o en la de inicio. Se actualiza solo cada medianoche.
// Opcional: en el campo «Parameter» del widget puedes escribir un tema:
// marea, alba, bosque, noche, arena, lavanda, terraza, niebla u oceano.

const APP_URL = "https://alvarosoriiiaa.github.io/impulso/";
const QUOTES_URL = APP_URL + "quotes.json";

const THEMES = {
  marea:   { colors: ["#1d2b3a", "#2c4a5e", "#6a8a8c"], text: "#fbf8f2", scrim: 0.06 },
  alba:    { colors: ["#f6b17a", "#e9787a", "#7a4f86"], text: "#fffaf4", scrim: 0.2 },
  bosque:  { colors: ["#13261d", "#24453a", "#5b7a5a"], text: "#f2f5ec", scrim: 0 },
  noche:   { colors: ["#2a2f4a", "#12141f", "#07080d"], text: "#f1f0fa", scrim: 0 },
  arena:   { colors: ["#f3ead9", "#e6d6bb"], text: "#2b2620", scrim: 0 },
  lavanda: { colors: ["#c8c2ea", "#9a8fcf", "#5d548f"], text: "#fbfaff", scrim: 0.2 },
  terraza: { colors: ["#b4472f", "#d88450", "#f0c38a"], text: "#fff8ef", scrim: 0.22 },
  niebla:  { colors: ["#e9ecef", "#c9d1d8"], text: "#1e252c", scrim: 0 },
  oceano:  { colors: ["#022b44", "#05607a", "#3fb1b0"], text: "#f0fbfb", scrim: 0.14 },
};

// Frases: se descargan de la web y se guardan para funcionar también sin conexión.
async function loadQuotes() {
  const fm = FileManager.local();
  const cache = fm.joinPath(fm.documentsDirectory(), "impulso-quotes.json");
  try {
    const quotes = await new Request(QUOTES_URL).loadJSON();
    fm.writeString(cache, JSON.stringify(quotes));
    return quotes;
  } catch (e) {
    if (fm.fileExists(cache)) return JSON.parse(fm.readString(cache));
    return [{ text: "Conéctate a internet una vez para cargar tus frases." }];
  }
}

// Misma fórmula que la app (SplitMix64 sobre la fecha): la frase coincide en todas partes.
function quoteOfTheDay(quotes, d) {
  const M = (1n << 64n) - 1n;
  let x = (BigInt(d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()) + 0x9E3779B97F4A7C15n) & M;
  x = ((x ^ (x >> 30n)) * 0xBF58476D1CE4E5B9n) & M;
  x = ((x ^ (x >> 27n)) * 0x94D049BB133111EBn) & M;
  x ^= x >> 31n;
  return quotes[Number(x % BigInt(quotes.length))];
}

function darken(hex, amount) {
  const v = parseInt(hex.slice(1), 16);
  const f = c => Math.round(c * (1 - amount)).toString(16).padStart(2, "0");
  return "#" + f((v >> 16) & 255) + f((v >> 8) & 255) + f(v & 255);
}

const quotes = await loadQuotes();
const q = quoteOfTheDay(quotes, new Date());
const family = config.widgetFamily || "medium";
const theme = THEMES[(args.widgetParameter || "").trim().toLowerCase()] || THEMES.marea;

const w = new ListWidget();
w.url = APP_URL;
const midnight = new Date();
midnight.setHours(24, 0, 30, 0);
w.refreshAfterDate = midnight;

if (family === "accessoryInline") {
  // Una línea encima de la hora
  w.addText("❝ " + q.text);
} else if (family.startsWith("accessory")) {
  // Pantalla de bloqueo, debajo de la hora
  const t = w.addText(q.text);
  t.font = Font.mediumSystemFont(13);
  t.minimumScaleFactor = 0.6;
  t.lineLimit = q.author ? 3 : 4;
  if (q.author) {
    const a = w.addText(q.author);
    a.font = Font.systemFont(10);
    a.textOpacity = 0.7;
    a.lineLimit = 1;
  }
} else {
  // Pantalla de inicio, con el degradado del tema
  const g = new LinearGradient();
  g.colors = theme.colors.map(c => new Color(darken(c, theme.scrim)));
  g.locations = theme.colors.map((_, i) => i / (theme.colors.length - 1));
  g.startPoint = new Point(0.3, 0);
  g.endPoint = new Point(0.7, 1);
  w.backgroundGradient = g;
  w.setPadding(14, 16, 14, 16);

  const size = family === "small" ? 16 : family === "large" ? 28 : 20;
  if (family === "large") {
    const label = w.addText("FRASE DEL DÍA");
    label.font = Font.semiboldSystemFont(11);
    label.textColor = new Color(theme.text, 0.75);
    label.centerAlignText();
  }
  w.addSpacer();
  const t = w.addText(q.text);
  t.font = new Font("Georgia", size);
  t.textColor = new Color(theme.text);
  t.centerAlignText();
  t.minimumScaleFactor = 0.5;
  if (q.author) {
    w.addSpacer(6);
    const a = w.addText(q.author.toUpperCase());
    a.font = Font.semiboldSystemFont(family === "small" ? 8 : 10);
    a.textColor = new Color(theme.text, 0.8);
    a.centerAlignText();
  }
  w.addSpacer();
}

if (config.runsInWidget) {
  Script.setWidget(w);
} else {
  await w.presentMedium();
}
Script.complete();
