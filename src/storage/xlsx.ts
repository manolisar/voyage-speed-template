// Dependency-free .xlsx export — ported from the design artifact (lines
// 564–661). Hand-builds a minimal OOXML workbook (CRC32 + ZIP + the part XML)
// with one worksheet per voyage, preserving the original template layout and
// the LIVE Time/Speed formulas + Σ TOTAL so the file recomputes in Excel.
import type { Leg, ShipCode, Voyage, VoyageMap } from '../types';
import { dayNum, hhmmToMin, instUTC } from '../domain/time';
import { shipByCode } from '../domain/ships';

// ── low-level encoders ──────────────────────────────────────────────────
function xmlEsc(s: unknown): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function col(n: number): string {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function serial(iso: string): number | null {
  const d = dayNum(iso);
  return d == null ? null : d + 25569; // Excel epoch offset (1899-12-30)
}

// ── ZIP container ───────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

interface ZipFile {
  name: string;
  data: string | Uint8Array;
}

function zip(files: ZipFile[]): Uint8Array {
  const enc = new TextEncoder();
  const u16 = (n: number) => [n & 255, (n >> 8) & 255];
  const u32 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >> 24) & 255];
  const parts: Uint8Array[] = [];
  const cdir: Uint8Array[] = [];
  let off = 0;
  for (const f of files) {
    const nameB = enc.encode(f.name);
    const data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
    const crc = crc32(data);
    const lh = [0x50, 0x4b, 0x03, 0x04]
      .concat(u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(nameB.length), u16(0));
    parts.push(new Uint8Array(lh));
    parts.push(nameB);
    parts.push(data);
    const ch = [0x50, 0x4b, 0x01, 0x02]
      .concat(u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(nameB.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(off));
    cdir.push(new Uint8Array(ch));
    cdir.push(nameB);
    off += lh.length + nameB.length + data.length;
  }
  let cdSize = 0;
  cdir.forEach((c) => (cdSize += c.length));
  const cdOff = off;
  const eocd = new Uint8Array(
    [0x50, 0x4b, 0x05, 0x06].concat(u16(0), u16(0), u16(files.length), u16(files.length), u32(cdSize), u32(cdOff), u16(0)),
  );
  const all = parts.concat(cdir, [eocd]);
  let tot = 0;
  all.forEach((x) => (tot += x.length));
  const out = new Uint8Array(tot);
  let p = 0;
  all.forEach((x) => {
    out.set(x, p);
    p += x.length;
  });
  return out;
}

// ── workbook parts ──────────────────────────────────────────────────────
function contentTypes(n: number): string {
  let o = '';
  for (let i = 1; i <= n; i++)
    o += `<Override PartName="/xl/worksheets/sheet${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`;
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    o +
    '</Types>'
  );
}

function workbookXml(sheets: { id: string }[]): string {
  let o = '';
  sheets.forEach((s, i) => (o += `<sheet name="${xmlEsc(s.id)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`));
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheets>' +
    o +
    '</sheets><calcPr calcId="0" fullCalcOnLoad="1"/></workbook>'
  );
}

function wbRels(n: number): string {
  let o = '';
  for (let i = 1; i <= n; i++)
    o += `<Relationship Id="rId${i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i}.xml"/>`;
  o += `<Relationship Id="rId${n + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`;
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    o +
    '</Relationships>'
  );
}

function stylesXml(): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="4"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/><numFmt numFmtId="165" formatCode="hh:mm"/><numFmt numFmtId="166" formatCode="[h]:mm"/><numFmt numFmtId="167" formatCode="0.0"/></numFmts>' +
    '<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font></fonts>' +
    '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF3F5F9"/><bgColor indexed="64"/></patternFill></fill></fills>' +
    '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FFB0BAC6"/></bottom><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="8">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>' +
    '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="167" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="1" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '</cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'
  );
}

function sheetXml(vo: Voyage, shipName: string): string {
  const START = 5;
  const legs = vo.legs;
  const rowOf = (r: number, inner: string) => `<row r="${r}">${inner}</row>`;
  const cStr = (c: number, r: number, v: unknown, s?: number) =>
    v == null || v === ''
      ? ''
      : `<c r="${col(c)}${r}"${s ? ` s="${s}"` : ''} t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
  const cNum = (c: number, r: number, v: number | string | null, s?: number) =>
    v == null || v === '' || isNaN(Number(v)) ? '' : `<c r="${col(c)}${r}"${s ? ` s="${s}"` : ''}><v>${v}</v></c>`;
  const cF = (c: number, r: number, f: string, v: number | null, s?: number) =>
    `<c r="${col(c)}${r}"${s ? ` s="${s}"` : ''}><f>${xmlEsc(f)}</f>${v != null && !isNaN(v) ? `<v>${v}</v>` : ''}</c>`;
  const t = (hhmm: string): number | null => {
    const m = hhmmToMin(hhmm);
    return m == null ? null : m / 1440;
  };

  let rows = '';
  const route = legs
    .filter((l) => l.type !== 'Sea')
    .map((l) => (l.port || '').split(',')[0])
    .filter(Boolean)
    .join('  -  ');
  rows += rowOf(1, cStr(1, 1, shipName + '  —  Voyage ' + vo.id, 1));
  rows += rowOf(2, cStr(1, 2, route, 0));
  rows += rowOf(3, '');
  const heads: [number, string][] = [
    [2, 'Date'], [3, 'Location'], [4, 'Type'], [5, 'Distance'], [6, 'Time'], [7, 'Speed'], [8, 'ETA'],
    [9, 'Arrival'], [10, 'Departure'], [11, 'FAW'], [12, 'Sunrise'], [13, 'Sunset'], [14, 'ZT'], [15, 'Remarks'],
    [16, 'Open Loop Time'], [17, 'Sea Condition'],
    [18, 'Arr St/By nm'], [19, 'Arr St/By kn'], [20, 'Dep St/By nm'], [21, 'Dep St/By kn'],
  ];
  rows += rowOf(4, heads.map((h) => cStr(h[0], 4, h[1], 2)).join(''));

  let lastPort: { row: number; dateNum: number | null; utc: string; depInstant: number | null } | null = null;
  legs.forEach((leg: Leg, k: number) => {
    const r = START + k;
    const isCall = leg.type === 'Port' || leg.type === 'Tender';
    const typeCode = leg.type === 'Sea' ? 'C' : leg.type === 'Tender' ? 'T' : 'D';
    let cs = '';
    cs += cNum(2, r, serial(leg.date), 3);
    cs += cStr(3, r, leg.port, 0);
    cs += cStr(4, r, typeCode, 0);
    let etaFrac: number | null = null;
    if (isCall) {
      const dist = Number(leg.dist);
      cs += cNum(5, r, leg.dist !== '' && !isNaN(dist) ? dist : '', 7);
      if (lastPort) {
        const N = ((dayNum(leg.date) ?? 0) - (lastPort.dateNum ?? 0)) - 1;
        const M = Number(lastPort.utc) - Number(leg.utc);
        let timeFrac: number | null = null;
        let spd: number | null = null;
        if (leg.mode === 'time') {
          const sp = Number(leg.speed);
          if (sp > 0 && dist > 0) {
            const hrs = dist / sp;
            timeFrac = hrs / 24;
            spd = sp;
            const arrInst = (lastPort.depInstant as number) + hrs * 60;
            etaFrac = ((((arrInst + Number(leg.utc) * 60) % 1440) + 1440) % 1440) / 1440;
          }
        } else {
          etaFrac = t(leg.eta);
          const a = instUTC(leg, hhmmToMin(leg.eta));
          if (a != null) {
            const hrs = (a - (lastPort.depInstant as number)) / 60;
            timeFrac = hrs / 24;
            if (dist > 0 && hrs > 0) spd = dist / hrs;
          }
        }
        cs += cF(6, r, '(24/24+' + col(8) + r + '-' + col(11) + lastPort.row + ')+' + N + '+(' + M + ')/24', timeFrac, 5);
        cs += cF(7, r, col(5) + r + '/' + col(6) + r + '/24', spd, 6);
      } else {
        etaFrac = t(leg.eta);
      }
      cs += cNum(8, r, etaFrac, 4);
      cs += cNum(9, r, t(leg.arr), 4);
      cs += cNum(10, r, t(leg.dep), 4);
      cs += cNum(11, r, t(leg.faw), 4);
      cs += cNum(12, r, t(leg.sunrise), 4);
      cs += cNum(13, r, t(leg.sunset), 4);
    }
    cs += cStr(14, r, leg.utc !== '' && leg.utc != null ? 'UTC ' + (Number(leg.utc) >= 0 ? '+' : '') + leg.utc : '', 0);
    cs += cStr(15, r, leg.remarks, 0);
    const olm = hhmmToMin(leg.openLoop);
    cs += cNum(16, r, olm != null ? olm / 1440 : '', 5);
    const scm = hhmmToMin(leg.seaCond);
    cs += cNum(17, r, scm != null ? scm / 1440 : '', 5);
    if (isCall) {
      // St/By split: arrival (Arr−ETA) and departure (FAW−Dep) distance + speed.
      const eMin = hhmmToMin(leg.eta);
      const aMin = hhmmToMin(leg.arr);
      const dpMin = hhmmToMin(leg.dep);
      const fMin = hhmmToMin(leg.faw);
      const arrMin = aMin != null && eMin != null && aMin >= eMin ? aMin - eMin : null;
      const depMin = fMin != null && dpMin != null && fMin >= dpMin ? fMin - dpMin : null;
      const arrDist = Number(leg.stbyArrDist);
      const depDistN = Number(leg.stbyDepDist);
      cs += cNum(18, r, leg.stbyArrDist !== '' && !isNaN(arrDist) ? arrDist : '', 7);
      cs += cNum(19, r, arrMin && arrMin > 0 && arrDist > 0 ? arrDist / (arrMin / 60) : '', 6);
      cs += cNum(20, r, leg.stbyDepDist !== '' && !isNaN(depDistN) ? depDistN : '', 7);
      cs += cNum(21, r, depMin && depMin > 0 && depDistN > 0 ? depDistN / (depMin / 60) : '', 6);
    }
    rows += rowOf(r, cs);
    if (isCall) {
      const fawMin = hhmmToMin(leg.faw);
      const altMin = hhmmToMin(leg.dep);
      const di = instUTC(leg, fawMin != null ? fawMin : altMin);
      lastPort = { row: r, dateNum: dayNum(leg.date), utc: leg.utc, depInstant: di };
    }
  });

  const sumRow = START + legs.length;
  rows += rowOf(
    sumRow,
    cStr(4, sumRow, 'Σ TOTAL', 2) + cF(5, sumRow, 'SUM(' + col(5) + START + ':' + col(5) + (sumRow - 1) + ')', null, 7),
  );
  const cols =
    '<cols><col min="2" max="2" width="11"/><col min="3" max="3" width="26"/><col min="4" max="4" width="6"/><col min="5" max="13" width="9"/><col min="14" max="14" width="9"/><col min="15" max="15" width="24"/><col min="16" max="16" width="13"/><col min="17" max="17" width="13"/><col min="18" max="21" width="11"/></cols>';
  const merges = '<mergeCells count="2"><mergeCell ref="A1:U1"/><mergeCell ref="A2:U2"/></mergeCells>';
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    cols +
    '<sheetData>' +
    rows +
    '</sheetData>' +
    merges +
    '</worksheet>'
  );
}

export function buildXlsx(list: Voyage[], shipName = 'Celebrity Eclipse'): Uint8Array {
  const sheets = list.map((vo) => ({ id: vo.id, xml: sheetXml(vo, shipName) }));
  const files: ZipFile[] = [];
  files.push({ name: '[Content_Types].xml', data: contentTypes(sheets.length) });
  files.push({
    name: '_rels/.rels',
    data:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
  });
  files.push({ name: 'xl/workbook.xml', data: workbookXml(sheets) });
  files.push({ name: 'xl/_rels/workbook.xml.rels', data: wbRels(sheets.length) });
  files.push({ name: 'xl/styles.xml', data: stylesXml() });
  sheets.forEach((s, i) => files.push({ name: 'xl/worksheets/sheet' + (i + 1) + '.xml', data: s.xml }));
  return zip(files);
}

export type XlsxScope = 'current' | 'all';

/** Build and download the workbook. Returns the filename used. */
export function exportXlsx(ship: ShipCode, voyages: VoyageMap, currentId: string, scope: XlsxScope): string {
  const shipName = shipByCode(ship).name;
  const list =
    scope === 'all'
      ? Object.keys(voyages)
          .sort((a, b) => Number(a) - Number(b))
          .map((id) => voyages[id])
      : [voyages[currentId]];
  const bytes = buildXlsx(list, shipName);
  const blob = new Blob([bytes as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const filename = scope === 'all' ? `${ship}_Speed-Templates.xlsx` : `${ship}_${currentId}_speed-template.xlsx`;
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 900);
  return filename;
}
