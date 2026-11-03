/* Executar: node --test tools/gasometria-static.test.cjs
   Teste puramente estático: não faz rede, não inicia servidor e não toca no banco. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, statSync } = require("node:fs");
const { join } = require("node:path");

const raiz = join(__dirname, "..");
const texto = (arquivo) => readFileSync(join(raiz, arquivo), "utf8");

test("landing de Gasometria referencia apenas artefatos locais existentes", () => {
  const html = texto("gasometria.html");
  for (const arquivo of [
    "css/landing-me.css", "css/landing-gasometria.css",
    "img/agoramed-logo-branco.png", "img/gasometria-hero.webp",
    "img/gasometria-hero-800.webp", "icons/icon-192.png",
    "icons/apple-touch-icon-v2.png", "fonts/playfair-display-400-latin.woff2",
  ]) {
    assert.ok(statSync(join(raiz, arquivo)).isFile(), `ausente: ${arquivo}`);
  }
  assert.match(html, /href=\"css\/landing-me\.css\?v=57\"/);
  assert.match(html, /href=\"css\/landing-gasometria\.css\?v=74\"/);
  assert.match(html, /src=\"img\/gasometria-hero\.webp\"/);
  assert.match(html, /srcset=\"img\/gasometria-hero-800\.webp 800w, img\/gasometria-hero\.webp 1536w\"/);
});

test("CTA de Gasometria não aciona aviso, matrícula ou API", () => {
  const html = texto("gasometria.html");
  assert.match(html, /href=\"#aviso\"[^>]*>Quero ser avisado/);
  assert.match(html, /id=\"aviso\"/);
  assert.doesNotMatch(html, /fetch\s*\(/);
  assert.doesNotMatch(html, /\/api\//);
  assert.doesNotMatch(html, /Store\./);
  assert.doesNotMatch(html, /matr[ií]cul/i);
});

test("texto de lançamento permanece como programa em produção", () => {
  const html = texto("gasometria.html");
  assert.match(html, /CURSO ONLINE[^<]*<strong>EM PRODUÇÃO<\/strong>/);
  assert.match(html, /programa proposto/i);
  assert.match(html, /Para internos, recém-formados e médicos/);
});
