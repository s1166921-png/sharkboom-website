import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIntakeWorkbook, intakeFilename } from '../app/motion/intake-workbook.mjs';

function entries(bytes) {
  const buffer = Buffer.from(bytes);
  const files = new Map();
  let offset = 0;
  while (buffer.readUInt32LE(offset) === 0x04034b50) {
    assert.equal(buffer.readUInt16LE(offset + 8), 0, 'stored ZIP entries have no external decoder dependency');
    const size = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const name = buffer.subarray(offset + 30, offset + 30 + nameLength).toString('utf8');
    const start = offset + 30 + nameLength + extraLength;
    files.set(name, buffer.subarray(start, start + size).toString('utf8'));
    offset = start + size;
  }
  assert.equal(buffer.readUInt32LE(offset), 0x02014b50, 'a central ZIP directory follows the entries');
  assert.equal(buffer.readUInt32LE(buffer.length - 22), 0x06054b50, 'ZIP has a complete end record');
  return files;
}

test('the exported file is an OOXML workbook with all groups, empty fields and contact instructions', () => {
  const files = entries(buildIntakeWorkbook({
    productName: 'VIES 保函', notice: '信息收集，不代表投保成功', contactText: '微信联系人：苏苏\n邮箱：test@example.com',
    groups: [{ title: '企业资料', fields: [{ label: '公司名', value: '测试公司' }, { label: '电话', value: '0019386967340' }, { label: 'VAT 税号', value: '' }] }],
    createdAt: new Date('2026-11-23T06:00:00Z'),
  }));
  for (const file of ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml']) assert(files.has(file), file);
  const sheet = files.get('xl/worksheets/sheet1.xml');
  for (const content of ['VIES 保函', '企业资料', '测试公司', '0019386967340', 'VAT 税号', 'test@example.com', '不代表投保成功']) assert(sheet.includes(content), content);
  assert.match(sheet, /<c r="B\d+" s="5" t="inlineStr"><is><t xml:space="preserve"><\/t>/, 'optional empty fields remain editable');
  assert(sheet.includes('<pageSetup') && sheet.includes('fitToWidth="1"'), 'workbook can be printed legibly');
});

test('customer content stays text and cannot create Excel formulas or malformed XML', () => {
  const files = entries(buildIntakeWorkbook({
    productName: '产品责任险', notice: '人工核保', contactText: '邮箱',
    groups: [{ title: '测试', fields: [
      { label: '公司', value: '=HYPERLINK("https://example.test","click")' },
      { label: '备注', value: '<tag>&"\n第一行\u0000第二行' },
      { label: '货值', value: '+1000' },
    ] }],
  }));
  const sheet = files.get('xl/worksheets/sheet1.xml');
  assert(!/<f(?:\s|>)/.test(sheet), 'no formula cells are generated from customer data');
  assert(sheet.includes('=HYPERLINK(&quot;https://example.test&quot;,&quot;click&quot;)'));
  assert(sheet.includes('&lt;tag&gt;&amp;&quot;\n第一行第二行'));
  assert(sheet.includes('+1000'));
  assert(!sheet.includes('\u0000'));
});

test('download filenames preserve Chinese company names and remove unsafe path characters', () => {
  assert.equal(intakeFilename('VIES保函', '深圳鲨鲨科技有限公司'), '鲨保保-VIES保函-信息收集表-深圳鲨鲨科技有限公司.xlsx');
  const name = intakeFilename('产品责任险', '../A\\B:<bad>|?*\u0000');
  assert(!/[\\/:<>"|?*]/.test(name));
  assert(!name.includes('\u0000'));
  assert(!name.includes('..'));
  assert(name.endsWith('.xlsx'));
  assert(intakeFilename('国际货运险', '  ').includes('未填写公司'));
  assert(intakeFilename('TRO侵权险', '公'.repeat(500)).length < 150);
});
