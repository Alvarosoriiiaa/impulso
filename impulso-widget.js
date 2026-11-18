// Impulso · Frase del día
// Widget para la app Scriptable (iPhone). Muestra la misma frase del día que la app Impulso.
// Tamaños de widget:
//   Pantalla de bloqueo: rectangular (debajo de la hora) o en línea (encima de la hora).
//   Pantalla de inicio, vista «Hoy» y StandBy: pequeño, mediano, grande y extra grande (iPad).
// Se actualiza solo cada medianoche.
// Si abres el script dentro de Scriptable, la frase se muestra a pantalla completa.
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

// Frases: se guardan en el móvil. Los widgets usan la copia guardada (es instantáneo) y solo
// la descargan de nuevo si tiene más de un día; la descarga tiene un tiempo máximo para que
// el widget de la pantalla de bloqueo nunca se quede vacío esperando.
async function loadQuotes() {
  const fm = FileManager.local();
  const cache = fm.joinPath(fm.documentsDirectory(), "impulso-quotes.json");
  const hasCache = fm.fileExists(cache);
  const fresh = hasCache && (Date.now() - fm.modificationDate(cache).getTime()) < 24 * 3600 * 1000;
  if (hasCache && fresh && config.runsInWidget) {
    try { return JSON.parse(fm.readString(cache)); } catch (e) {}
  }
  try {
    const req = new Request(QUOTES_URL);
    req.timeoutInterval = config.runsInWidget ? 6 : 15;
    const quotes = await req.loadJSON();
    if (!Array.isArray(quotes) || !quotes.length) throw new Error("lista vacía");
    fm.writeString(cache, JSON.stringify(quotes));
    return quotes;
  } catch (e) {
    if (hasCache) {
      try { return JSON.parse(fm.readString(cache)); } catch (e2) {}
    }
    return [{ text: "Abre Impulso en Scriptable con internet una vez para cargar tus frases." }];
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

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// ---------- Dentro de Scriptable: la frase a pantalla completa ----------
async function showFullScreen(q, theme) {
  const colors = theme.colors.map(c => darken(c, theme.scrim));
  const html = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<style>
  html, body { margin: 0; height: 100%; }
  body {
    min-height: 100vh; box-sizing: border-box;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: calc(env(safe-area-inset-top) + 32px) 32px calc(env(safe-area-inset-bottom) + 32px);
    background: linear-gradient(160deg, ${colors.join(", ")}) fixed;
    color: ${theme.text}; text-align: center;
    -webkit-font-smoothing: antialiased;
  }
  .label { font: 600 13px -apple-system, system-ui; letter-spacing: .14em; opacity: .75; margin-bottom: 28px; }
  .quote { font-family: Georgia, serif; font-size: clamp(28px, 8.5vw, 48px); line-height: 1.3; margin: 0; }
  .author { font: 600 14px -apple-system, system-ui; letter-spacing: .12em; opacity: .8; margin-top: 24px; }
</style></head><body>
  <div class="label">FRASE DEL DÍA</div>
  <p class="quote">${esc(q.text)}</p>
  ${q.author ? `<div class="author">${esc(q.author.toUpperCase())}</div>` : ""}
</body></html>`;
  await WebView.loadHTML(html, null, null, true); // true = pantalla completa
}

// ---------- Widget ----------
function buildWidget(q, theme, family) {
  const w = new ListWidget();
  w.url = APP_URL;
  const midnight = new Date();
  midnight.setHours(24, 0, 30, 0);
  w.refreshAfterDate = midnight;

  if (family === "accessoryInline") {
    // Pantalla de bloqueo: una línea encima de la hora
    const t = w.addText("❝ " + q.text);
    t.lineLimit = 1;
    t.minimumScaleFactor = 0.7;
  } else if (family.startsWith("accessory")) {
    // Pantalla de bloqueo: rectángulo debajo de la hora
    w.setPadding(0, 0, 0, 0);
    const t = w.addText(q.text);
    t.font = Font.mediumSystemFont(13);
    t.minimumScaleFactor = 0.5;
    t.lineLimit = q.author ? 3 : 4;
    if (q.author) {
      const a = w.addText(q.author);
      a.font = Font.systemFont(10);
      a.textOpacity = 0.7;
      a.lineLimit = 1;
    }
  } else {
    // Pantalla de inicio, vista «Hoy» y StandBy: pequeño, mediano, grande y extra grande (iPad).
    // El degradado ocupa todo el widget y la frase se agranda para llenarlo.
    const g = new LinearGradient();
    g.colors = theme.colors.map(c => new Color(darken(c, theme.scrim)));
    g.locations = theme.colors.map((_, i) => i / (theme.colors.length - 1));
    g.startPoint = new Point(0.3, 0);
    g.endPoint = new Point(0.7, 1);
    w.backgroundGradient = g;

    const big = family === "large" || family === "extraLarge";
    const pad = big ? 18 : 12;
    w.setPadding(pad, pad, pad, pad);

    // Tamaño grande de partida; minimumScaleFactor lo reduce lo justo para que quepa
    const size = { small: 26, medium: 30, large: 44, extraLarge: 56 }[family] || 30;

    if (big) {
      const label = w.addText("FRASE DEL DÍA");
      label.font = Font.semiboldSystemFont(family === "extraLarge" ? 14 : 12);
      label.textColor = new Color(theme.text, 0.75);
      label.centerAlignText();
      w.addSpacer(8);
    }
    w.addSpacer();
    const t = w.addText(q.text);
    t.font = new Font("Georgia", size);
    t.textColor = new Color(theme.text);
    t.centerAlignText();
    t.minimumScaleFactor = 0.25;
    if (q.author) {
      w.addSpacer(big ? 10 : 6);
      const a = w.addText(q.author.toUpperCase());
      a.font = Font.semiboldSystemFont(family === "small" ? 9 : big ? 13 : 11);
      a.textColor = new Color(theme.text, 0.8);
      a.centerAlignText();
      a.lineLimit = 1;
    }
    w.addSpacer();
  }
  return w;
}

// ---------- Inicio ----------
try {
  const quotes = await loadQuotes();
  const q = quoteOfTheDay(quotes, new Date()) || quotes[0];
  const theme = THEMES[(args.widgetParameter || "").trim().toLowerCase()] || THEMES.marea;

  if (config.runsInWidget) {
    Script.setWidget(buildWidget(q, theme, config.widgetFamily || "medium"));
  } else {
    await showFullScreen(q, theme);
  }
} catch (e) {
  // Si algo falla, el widget muestra el error en vez de quedarse vacío
  const w = new ListWidget();
  const t = w.addText("Impulso: " + e.message);
  t.font = Font.systemFont(11);
  t.minimumScaleFactor = 0.5;
  if (config.runsInWidget) Script.setWidget(w);
  else await w.presentSmall();
}
Script.complete();
