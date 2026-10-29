// Development-only. Expected data comes from KASI HTML, never from manseryeok.
import { writeFile } from "node:fs/promises";

const months = Array.from({ length: 38 }, (_, i) => [1989 + i, 1]);
// Korean/Chinese new-moon and leap-month differences; recent leap/small months.
months.push([1997, 2], [2012, 4], [2012, 5], [2017, 6], [2017, 7], [2020, 5], [2020, 6], [2023, 3], [2023, 4], [2024, 2], [2025, 7], [2025, 8], [2026, 10]);
const tables = [];
for (const [year, month] of months) {
  const source = `https://astro.kasi.re.kr/kor/life/pageView/5?search_year=${year}&search_month=${String(month).padStart(2, "0")}&search_check=G&search_dp=1`;
  const response = await fetch(source, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`KASI ${year}/${month}: ${response.status}`);
  const html = await response.text();
  const table = html.slice(html.indexOf("달력정보"));
  const rows = [];
  for (const match of table.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const cells = [...match[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m => m[1].replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim());
    if (cells.length !== 5) continue;
    const solar = cells[0].match(/(\d+)년\s*(\d+)월\s*(\d+)일/);
    const lunar = cells[1].match(/(\d+)년\s*(?:윤\s*)?(\d+)월\s*(\d+)일/);
    const dayPillar = cells[2].match(/([가-힣]{2})\([^)]*\)일/);
    if (!solar || !lunar || !dayPillar) throw new Error(`Unexpected KASI row: ${cells.join(" | ")}`);
    rows.push({ solar: solar.slice(1).map(Number), lunar: lunar.slice(1).map(Number), leap: cells[1].includes("윤"), dayPillar: dayPillar[1] });
  }
  if (rows.length !== new Date(Date.UTC(year, month, 0)).getUTCDate()) throw new Error(`Incomplete KASI ${year}/${month}: ${rows.length}`);
  tables.push({ source, rows });
}
await writeFile(new URL("./kasi-fixtures.json", import.meta.url), JSON.stringify({
  credit: "한국천문연구원(KASI), 월별음양력 공개 수치 자료",
  retrievedOn: "2026-10-29",
  note: "Only solar/lunar dates, leap markers and day ganji. Lunar month ganji is intentionally NOT used as the saju month pillar.",
  tables,
}, null, 2) + "\n");
console.log(`Stored ${tables.reduce((sum, t) => sum + t.rows.length, 0)} independent KASI date fixtures.`);
