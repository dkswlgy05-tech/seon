import JSZip from "jszip";
import type { Week, EducationRole, EducationMember } from "./types";

const SECTION_PATH = "Contents/section0.xml";

export async function buildHwpx(template: ArrayBuffer, week: Week): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(template);
  const sectionFile = zip.file(SECTION_PATH);
  if (!sectionFile) throw new Error("template missing Contents/section0.xml");
  let xml = await sectionFile.async("string");

  xml = replaceTitle(xml, week.label);
  xml = replaceProjectTable(xml, week);
  xml = replaceUpcomingTable(xml, week);
  xml = replacePostTablesText(xml, week);

  zip.file(SECTION_PATH, xml);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

/* ---------- Helpers ---------- */

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// `<hp:t>` in HWPX never has attributes — use exact match to avoid colliding with <hp:tc>/<hp:tbl>/etc.
const RE_HP_T = /<hp:t>[\s\S]*?<\/hp:t>/;
const RE_HP_T_G = /<hp:t>([\s\S]*?)<\/hp:t>/g;

function setRunText(paragraph: string, text: string): string {
  const safe = `<hp:t>${escapeXml(text)}</hp:t>`;
  if (RE_HP_T.test(paragraph)) {
    return paragraph.replace(RE_HP_T, safe);
  }
  // Empty cell — first <hp:run> is self-closing (<hp:run charPrIDRef="X"/>).
  // Expand it to wrap our text.
  if (/<hp:run\b[^>]*\/>/.test(paragraph)) {
    return paragraph.replace(
      /<hp:run\b([^>]*)\/>/,
      (_m, attrs) => `<hp:run${attrs}>${safe}</hp:run>`
    );
  }
  // Or an empty <hp:run>...</hp:run> with no <hp:t> child.
  if (/<hp:run\b[^>]*><\/hp:run>/.test(paragraph)) {
    return paragraph.replace(
      /<hp:run\b([^>]*)><\/hp:run>/,
      (_m, attrs) => `<hp:run${attrs}>${safe}</hp:run>`
    );
  }
  // Last resort: append a run before </hp:p>
  return paragraph.replace(/<\/hp:p>/, `<hp:run charPrIDRef="0">${safe}</hp:run></hp:p>`);
}

function setCellText(cellXml: string, text: string): string {
  const subMatch = cellXml.match(/<hp:subList[^>]*>([\s\S]*?)<\/hp:subList>/);
  if (!subMatch) return cellXml;

  const pMatch = subMatch[1].match(/<hp:p\b[^>]*>[\s\S]*?<\/hp:p>/);
  if (!pMatch) return cellXml;
  const firstP = pMatch[0];

  const lines = (text ?? "").toString().split(/\r?\n/);
  const safeLines = lines.length === 0 ? [""] : lines;
  const newParagraphs = safeLines.map((l) => setRunText(firstP, l)).join("");

  return cellXml.replace(
    /<hp:subList([^>]*)>[\s\S]*?<\/hp:subList>/,
    (_m, attrs) => `<hp:subList${attrs}>${newParagraphs}</hp:subList>`
  );
}

function splitCells(rowXml: string): string[] {
  const cells: string[] = [];
  const re = /<hp:tc\b[\s\S]*?<\/hp:tc>/g;
  let m;
  while ((m = re.exec(rowXml)) !== null) cells.push(m[0]);
  return cells;
}

function joinRow(rowAttrs: string, cells: string[]): string {
  return `<hp:tr${rowAttrs}>${cells.join("")}</hp:tr>`;
}

function getRowAttrs(rowXml: string): string {
  const m = rowXml.match(/^<hp:tr([^>]*)>/);
  return m ? m[1] : "";
}

function setCellSpan(cellXml: string, rowSpan: number): string {
  return cellXml.replace(
    /<hp:cellSpan\s+colSpan="(\d+)"\s+rowSpan="\d+"\s*\/>/,
    (_m, c) => `<hp:cellSpan colSpan="${c}" rowSpan="${rowSpan}"/>`
  );
}

function setCellAddrRow(cellXml: string, rowAddr: number): string {
  return cellXml.replace(
    /<hp:cellAddr\s+colAddr="(\d+)"\s+rowAddr="\d+"\s*\/>/,
    (_m, c) => `<hp:cellAddr colAddr="${c}" rowAddr="${rowAddr}"/>`
  );
}

function findTables(xml: string): { start: number; end: number; body: string }[] {
  const out: { start: number; end: number; body: string }[] = [];
  const re = /<hp:tbl\b[\s\S]*?<\/hp:tbl>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    out.push({ start: m.index, end: m.index + m[0].length, body: m[0] });
  }
  return out;
}

function splitRows(tableXml: string): { open: string; rows: string[]; close: string } {
  const re = /<hp:tr\b[\s\S]*?<\/hp:tr>/g;
  const rows: string[] = [];
  let m;
  while ((m = re.exec(tableXml)) !== null) rows.push(m[0]);
  if (rows.length === 0) return { open: tableXml, rows: [], close: "" };
  const firstIdx = tableXml.indexOf(rows[0]);
  const lastIdx = tableXml.lastIndexOf(rows[rows.length - 1]) + rows[rows.length - 1].length;
  return {
    open: tableXml.slice(0, firstIdx),
    rows,
    close: tableXml.slice(lastIdx),
  };
}

function updateTableRowCount(tableXml: string, newRowCount: number): string {
  return tableXml.replace(
    /(<hp:tbl\b[^>]*\srowCnt=")\d+(")/,
    (_m, a, b) => `${a}${newRowCount}${b}`
  );
}

/* ---------- 1) Title ---------- */

function replaceTitle(xml: string, weekLabel: string): string {
  return xml.replace(
    /<hp:t>\(\d{4}\.\d{1,2}\.\d{1,2}\.\)<\/hp:t>/,
    `<hp:t>(${escapeXml(weekLabel)})</hp:t>`
  );
}

/* ---------- 2) 수행 Project table ---------- */

function replaceProjectTable(xml: string, week: Week): string {
  const tables = findTables(xml);
  if (tables.length === 0) return xml;
  const table0 = tables[0];
  const { open, rows, close } = splitRows(table0.body);
  if (rows.length < 3) return xml;

  const headerRow = rows[0];
  const groupFirstTemplate = rows[1];
  const dataTemplate = rows[2];

  const bidGroup = week.projects.filter((p) => p.status === "개찰");
  const progressGroup = week.projects.filter((p) => p.status === "진행중");

  const newRows: string[] = [headerRow];
  let seq = 1;
  let rowAddr = 1;

  function buildGroup(items: typeof week.projects, label: "개찰" | "진행중") {
    if (items.length === 0) return;
    const span = items.length;

    const firstCells = splitCells(groupFirstTemplate);
    let groupCell = setCellText(firstCells[0], label);
    groupCell = setCellSpan(groupCell, span);
    groupCell = setCellAddrRow(groupCell, rowAddr);

    const firstFilled = fillProjectCells(firstCells.slice(1), seq, items[0]);
    const firstAddr = firstFilled.map((c) => setCellAddrRow(c, rowAddr));
    newRows.push(joinRow(getRowAttrs(groupFirstTemplate), [groupCell, ...firstAddr]));
    seq += 1;
    rowAddr += 1;

    for (let i = 1; i < items.length; i++) {
      const cells = splitCells(dataTemplate);
      const filled = fillProjectCells(cells, seq, items[i]);
      const re = filled.map((c) => setCellAddrRow(c, rowAddr));
      newRows.push(joinRow(getRowAttrs(dataTemplate), re));
      seq += 1;
      rowAddr += 1;
    }
  }

  buildGroup(bidGroup, "개찰");
  buildGroup(progressGroup, "진행중");

  let newTable = open + newRows.join("") + close;
  newTable = updateTableRowCount(newTable, newRows.length);
  return xml.slice(0, table0.start) + newTable + xml.slice(table0.end);
}

function fillProjectCells(
  cells: string[],
  seq: number,
  p: {
    name: string;
    leader: string;
    submitDate: string;
    interviewDate: string;
    bidDate: string;
    fee: string;
    note: string;
  }
): string[] {
  const values = [
    String(seq),
    p.name,
    p.leader,
    p.submitDate,
    p.interviewDate,
    p.bidDate,
    p.fee,
    p.note,
  ];
  return cells.map((c, i) => setCellText(c, values[i] ?? ""));
}

/* ---------- 3) 발주예상 ---------- */

function replaceUpcomingTable(xml: string, week: Week): string {
  const tables = findTables(xml);
  if (tables.length < 2) return xml;
  const t = tables[1];
  const { open, rows, close } = splitRows(t.body);
  if (rows.length < 2) return xml;

  const headerRow = rows[0];
  const dataTemplate = rows[1];

  const visibleItems =
    week.upcoming.length === 0
      ? [{ name: "", client: "", leader: "", budget: "", orderMonth: "", fee: "", note: "" }]
      : week.upcoming;

  const newRows: string[] = [headerRow];
  visibleItems.forEach((u, idx) => {
    const cells = splitCells(dataTemplate);
    const values = [
      String(idx + 1),
      u.name,
      u.client,
      u.leader,
      u.budget,
      u.orderMonth,
      u.fee,
      u.note,
    ];
    const filled = cells.map((c, i) => setCellText(c, values[i] ?? ""));
    const reAddr = filled.map((c) => setCellAddrRow(c, idx + 1));
    newRows.push(joinRow(getRowAttrs(dataTemplate), reAddr));
  });

  let newTable = open + newRows.join("") + close;
  newTable = updateTableRowCount(newTable, newRows.length);
  return xml.slice(0, t.start) + newTable + xml.slice(t.end);
}

/* ---------- 4) 교육참가자 + 5) 기타 (post-tables zone only) ---------- */

function replacePostTablesText(xml: string, week: Week): string {
  // Only operate on the slice AFTER the last </hp:tbl> — that's where the
  // education + 기타 paragraphs live, and never touch table-internal paragraphs.
  const tail = "</hp:tbl>";
  const lastClose = xml.lastIndexOf(tail);
  if (lastClose === -1) return xml;
  const splitAt = lastClose + tail.length;
  const before = xml.slice(0, splitAt);
  let after = xml.slice(splitAt);

  after = rewriteEducation(after, week.members);
  after = rewriteEtc(after, week.etc);

  return before + after;
}

function rewriteEducation(xml: string, members: EducationMember[]): string {
  const byRole: Record<EducationRole, EducationMember[]> = {
    책임: [],
    건축: [],
    토목: [],
    안전: [],
    기계: [],
  };
  members.forEach((m) => {
    if (byRole[m.role]) byRole[m.role].push(m);
  });
  const fmt = (m: EducationMember) => (m.org ? `${m.name}(${m.org})` : m.name);
  const list = (r: EducationRole) => byRole[r].map(fmt).join(", ");

  const respList = list("책임");
  const respLine = `   - 책  임 기술자 : ${respList} - ${byRole["책임"].length}명`;
  const discipLines: Record<Exclude<EducationRole, "책임">, string> = {
    건축: `${list("건축")} – 건축 ${byRole["건축"].length}명`,
    토목: `${list("토목")} – 토목 ${byRole["토목"].length}명`,
    안전: `${list("안전")} – 안전 ${byRole["안전"].length}명`,
    기계: `${list("기계")} – 기계 ${byRole["기계"].length}명`,
  };

  // Replace each role-anchored paragraph (1 paragraph each in post-tables zone)
  xml = rewriteFirstParagraph(xml, "책", () => respLine);
  xml = rewriteFirstParagraph(
    xml,
    "분야별",
    () => `   - 분야별 기술자 : ${discipLines["건축"]}`
  );
  xml = rewriteFirstParagraph(
    xml,
    "토목",
    () => `                     ${discipLines["토목"]}`
  );
  xml = rewriteFirstParagraph(
    xml,
    "안전",
    () => `                     ${discipLines["안전"]}`
  );
  xml = rewriteFirstParagraph(
    xml,
    "기계",
    () => `                     ${discipLines["기계"]}`
  );

  return xml;
}

// Find the FIRST <hp:p>...</hp:p> whose joined <hp:t> content contains `keyword`,
// then replace its first <hp:t> with `builder()` and blank subsequent <hp:t>s.
function rewriteFirstParagraph(
  xml: string,
  keyword: string,
  builder: () => string
): string {
  let done = false;
  return xml.replace(/<hp:p\b[^>]*>[\s\S]*?<\/hp:p>/g, (pXml) => {
    if (done) return pXml;
    const joined = [...pXml.matchAll(RE_HP_T_G)].map((m) => m[1]).join("");
    if (!joined.includes(keyword)) return pXml;
    done = true;
    let first = true;
    return pXml.replace(RE_HP_T_G, () => {
      if (first) {
        first = false;
        return `<hp:t>${escapeXml(builder())}</hp:t>`;
      }
      return `<hp:t></hp:t>`;
    });
  });
}

function rewriteEtc(xml: string, etc: string): string {
  if (!etc?.trim()) return xml;
  // Find the "4) 기  타" paragraph
  let headerP: string | null = null;
  const re = /<hp:p\b[^>]*>[\s\S]*?<\/hp:p>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const joined = [...m[0].matchAll(RE_HP_T_G)].map((x) => x[1]).join("");
    if (/4\)\s*기/.test(joined) && /타/.test(joined)) {
      headerP = m[0];
      break;
    }
  }
  if (!headerP) return xml;

  const lines = etc.split(/\r?\n/);
  // Build new paragraphs by cloning header structure, but reset paraPrIDRef to a body style if possible.
  const cloned = lines
    .map((line) => setRunText(headerP!, line))
    .join("");

  return xml.replace(headerP, headerP + cloned);
}
