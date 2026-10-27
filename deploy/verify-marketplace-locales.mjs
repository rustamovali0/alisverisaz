import assert from "node:assert/strict";
const base = process.argv[2] || "https://alisveris.az";
const copies = {
  az: ["Hər ehtiyacına", "Ana səhifə", "Kateqoriyalar", "İstifadəçi razılaşması"],
  en: ["For every need,", "Home", "Categories", "Privacy policy"],
  ru: ["Для любых желаний", "Главная", "Категории", "Политика конфиденциальности"],
};
const checks = [];
for (const [locale, phrases] of Object.entries(copies)) {
  for (const path of ["/", "/categories"]) {
    const response = await fetch(new URL(path, base), {
      headers: { Cookie: `NEXT_LOCALE=${locale}` },
      signal: AbortSignal.timeout(20000),
    });
    assert.equal(response.status, 200, `${locale} ${path}`);
    const html = await response.text();
    assert.ok(html.includes(`lang="${locale}"`), `${locale}: document language`);
    for (const phrase of path === "/" ? phrases : [phrases[2]]) {
      assert.ok(html.includes(phrase), `${locale} ${path}: missing ${phrase}`);
    }
    checks.push({ locale, path, status: response.status });
  }
}
console.log(JSON.stringify({ base, checks }, null, 2));
