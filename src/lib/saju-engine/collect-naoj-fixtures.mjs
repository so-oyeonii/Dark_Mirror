// Development-only independent evidence collector. Never imported by the app.
// (c) NAOJ; https://eco.mtk.nao.ac.jp/koyomi/site/index.html.en
// No engine imports: expected values come only from the published NAOJ table.
import { writeFile } from "node:fs/promises";

const years = [];
for (let year = 1989; year <= 2026; year++) {
  const source = `https://eco.mtk.nao.ac.jp/cgi-bin/koyomi/cande/phenomena_sy_en.cgi?year=${year}&lst=9`;
  const response = await fetch(source, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`NAOJ ${year}: ${response.status}`);
  const html = await response.text();
  if (!html.includes("LST:UT+9")) throw new Error("Unexpected NAOJ time zone");
  const terms = [];
  for (const match of html.matchAll(/<tr><td>(\d{4}-\d{2}-\d{2})<\/td>\s*<td>(\d{2}:\d{2})<\/td>\s*<td>Sun<\/td>\s*<td>24 Solar Terms<\/td>\s*<td><\/td>\s*<td>[^<]*&lambda; = (\d+)&deg;/g)) {
    terms.push({ local: `${match[1]}T${match[2]}:00+09:00`, longitude: Number(match[3]) });
  }
  if (terms.length !== 24 || terms.some(t => !t.local.startsWith(String(year)))) throw new Error(`Invalid NAOJ table ${year}`);
  years.push({ year, source, terms });
}
await writeFile(new URL("./naoj-fixtures.json", import.meta.url), JSON.stringify({
  credit: "(c) NAOJ, Ephemeris Computation Office",
  termsOfUse: "https://eco.mtk.nao.ac.jp/koyomi/site/index.html.en",
  retrievedOn: "2026-10-29",
  note: "Published UT+9 times, independent of manseryeok/6tail. Numerical ephemeris data only.",
  years,
}, null, 2) + "\n");
console.log(`Stored ${years.length * 24} independent NAOJ solar-term fixtures.`);
