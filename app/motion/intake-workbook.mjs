// Small, browser-only OOXML export. All customer values use inline strings, never formulas.
const encoder = new TextEncoder();
const namespace = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const declaration = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

/** @param {string} value */
function xml(value) {
  return [...value].filter(ch => { const n = ch.codePointAt(0); return n === 9 || n === 10 || n === 13 || n >= 32 && n <= 0xd7ff || n >= 0xe000 && n <= 0xfffd || n >= 0x10000 && n <= 0x10ffff; }).join('')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/** @param {Uint8Array} bytes */
function crc32(bytes) {
  let result = 0xffffffff;
  for (const byte of bytes) {
    result ^= byte;
    for (let bit = 0; bit < 8; bit++) result = (result >>> 1) ^ (result & 1 ? 0xedb88320 : 0);
  }
  return (result ^ 0xffffffff) >>> 0;
}

/** @param {Uint8Array[]} parts */
function concat(parts) {
  const output = new Uint8Array(parts.reduce((sum, item) => sum + item.length, 0));
  let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.length; }
  return output;
}

/** @param {Record<string, string>} files */
function zip(files) {
  /** @type {Uint8Array[]} */ const locals = [];
  /** @type {Uint8Array[]} */ const directory = [];
  let offset = 0;
  for (const [path, text] of Object.entries(files)) {
    const name = encoder.encode(path), data = encoder.encode(text), crc = crc32(data);
    const header = new Uint8Array(30), view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true); view.setUint16(4, 20, true); view.setUint16(6, 0x0800, true);
    view.setUint16(12, 33, true); // ZIP's minimum valid DOS date: 1980-01-01.
    view.setUint32(14, crc, true); view.setUint32(18, data.length, true); view.setUint32(22, data.length, true);
    view.setUint16(26, name.length, true);
    locals.push(header, name, data);
    const central = new Uint8Array(46), cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true); cv.setUint16(14, 33, true); cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true); cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true); directory.push(central, name);
    offset += header.length + name.length + data.length;
  }
  const centralBytes = concat(directory), end = new Uint8Array(22), ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, Object.keys(files).length, true); ev.setUint16(10, Object.keys(files).length, true);
  ev.setUint32(12, centralBytes.length, true); ev.setUint32(16, offset, true);
  return concat([...locals, centralBytes, end]);
}

/** @param {string} product @param {string} company */
export function intakeFilename(product, company) {
  const safe = ([...company.trim()].filter(ch => ch.charCodeAt(0) >= 32).join('').replace(/[\\/:<>"|?*]/g, '').replace(/\.{2,}/g, '').replace(/[. ]+$/g, '').slice(0, 80) || '未填写公司');
  return `鲨保保-${product}-信息收集表-${safe}.xlsx`;
}

const styles = `${declaration}<styleSheet xmlns="${namespace}">
<fonts count="6">
<font><sz val="11"/><color rgb="FF183B66"/><name val="Microsoft YaHei"/></font>
<font><b/><sz val="18"/><color rgb="FFFFFFFF"/><name val="Microsoft YaHei"/></font>
<font><sz val="10"/><color rgb="FF647A94"/><name val="Microsoft YaHei"/></font>
<font><b/><sz val="12"/><color rgb="FF0055BB"/><name val="Microsoft YaHei"/></font>
<font><sz val="11"/><color rgb="FF0055BB"/><name val="Microsoft YaHei"/></font>
<font><sz val="10"/><color rgb="FF9E421F"/><name val="Microsoft YaHei"/></font></fonts>
<fills count="6"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0055BB"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEAF2FC"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF4F7FB"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF1E8"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border/><border><left style="thin"><color rgb="FFDBE5F1"/></left><right style="thin"><color rgb="FFDBE5F1"/></right><top style="thin"><color rgb="FFDBE5F1"/></top><bottom style="thin"><color rgb="FFDBE5F1"/></bottom></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="7">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1" indent="1"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1" indent="1"/></xf>
<xf numFmtId="0" fontId="3" fillId="3" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1" indent="1"/></xf>
<xf numFmtId="49" fontId="0" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="center" wrapText="1" indent="1"/></xf>
<xf numFmtId="49" fontId="4" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="center" wrapText="1" indent="1"/></xf>
<xf numFmtId="0" fontId="5" fillId="5" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1" indent="1"/></xf>
</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

/**
 * @param {{productName:string, groups:Array<{title:string,fields:Array<{label:string,value:string}>}>, notice:string, contactText:string, createdAt?:Date}} options
 * @returns {Uint8Array<ArrayBuffer>}
 */
export function buildIntakeWorkbook({ productName, groups, notice, contactText, createdAt = new Date() }) {
  /** @type {string[]} */ const rows = [], merges = [];
  let row = 0;
  /** @param {string} address @param {string} value @param {number} style */
  const cell = (address, value, style) => `<c r="${address}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
  /** @param {string} value @param {number} style @param {number} height */
  const merged = (value, style, height) => {
    row++; rows.push(`<row r="${row}" ht="${height}" customHeight="1">${cell(`A${row}`, value, style)}</row>`); merges.push(`A${row}:B${row}`);
  };
  merged(`鲨保保｜${productName}信息收集表`, 1, 44);
  merged(notice, 6, 67);
  merged(`导出日期：${createdAt.toISOString().slice(0, 10)} | 请将本表发送给鲨保保服务人员，勿作为保险凭证使用。`, 2, 32);
  for (const group of groups) {
    merged(group.title, 3, 30);
    for (const field of group.fields) {
      row++;
      const lines = Math.max(Math.ceil(field.label.length / 11), ...field.value.split('\n').map(line => Math.ceil([...line].reduce((n, ch) => n + (ch.charCodeAt(0) > 255 ? 2 : 1), 0) / 75)), field.value.split('\n').length);
      const height = Math.min(409, Math.max(32, lines * 16 + 12));
      rows.push(`<row r="${row}" ht="${height}" customHeight="1">${cell(`A${row}`, field.label, 4)}${cell(`B${row}`, field.value, 5)}</row>`);
    }
  }
  merged('联系鲨保保出单', 3, 30);
  merged(contactText, 2, 95);
  const sheet = `${declaration}<worksheet xmlns="${namespace}"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:B${row}"/><sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="3" topLeftCell="A4" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="32"/><cols><col min="1" max="1" width="29" customWidth="1"/><col min="2" max="2" width="90" customWidth="1"/></cols><sheetData>${rows.join('')}</sheetData><mergeCells count="${merges.length}">${merges.map(ref => `<mergeCell ref="${ref}"/>`).join('')}</mergeCells><pageMargins left="0.3" right="0.3" top="0.45" bottom="0.45" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/></worksheet>`;
  return zip({
    '[Content_Types].xml': `${declaration}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    '_rels/.rels': `${declaration}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `${declaration}<workbook xmlns="${namespace}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="信息收集表" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `${declaration}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': styles,
    'xl/worksheets/sheet1.xml': sheet,
  });
}
