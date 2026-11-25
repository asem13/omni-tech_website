import fs from 'node:fs/promises';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';
const directory = new URL('./', import.meta.url);
export const workbook = Workbook.create();
const sheet = workbook.worksheets.add('الشهادات');
sheet.showGridLines = false;
sheet.getRange('A1:D1').values = [['اسم صاحب الشهادة','رقم الشهادة','اسم الدورة','تاريخ الإصدار']];
sheet.getRange('A1:F1001').format.font = {name:'Arial',size:12,color:'#172536'};
sheet.getRange('A1:D1001').format.verticalAlignment = 'center';
sheet.getRange('A1:D1').format = {fill:'#172536',font:{name:'Arial',size:12,bold:true,color:'#FFFFFF'},rowHeight:34,horizontalAlignment:'center'};
sheet.getRange('A2:D1001').format.rowHeight = 25;
sheet.getRange('A2:D1001').format.fill = '#FFF9E8';
sheet.getRange('A2:C1001').setNumberFormat('@');
sheet.getRange('D2:D1001').setNumberFormat('yyyy-mm-dd');
sheet.getRange('A1:A1001').format.columnWidth = 32;
sheet.getRange('B1:B1001').format.columnWidth = 26;
sheet.getRange('C1:C1001').format.columnWidth = 30;
sheet.getRange('D1:D1001').format.columnWidth = 24;
sheet.getRange('E1:E10').format.columnWidth = 3;
sheet.getRange('F1:F10').format.columnWidth = 64;
sheet.getRange('F1:F8').values = [
  ['تعليمات تعبئة الشهادات'],
  ['ابدأ من الصف الثاني. كل صف يمثل شهادة واحدة.'],
  ['الاسم ورقم الشهادة مطلوبان؛ الدورة والتاريخ اختياريان.'],
  ['لا تغيّر عناوين الأعمدة أو ترتيبها أو اسم الورقة.'],
  ['عمود رقم الشهادة نصي للحفاظ على الأصفار في البداية.'],
  ['اكتب التاريخ بصيغة YYYY-MM-DD، أو اتركه فارغًا.'],
  ['الخلايا الصفراء للكتابة. يمكنك إضافة صفوف أخرى.'],
  ['احفظ الملف بصيغة .xlsx ثم استورده من صفحة الإدارة.']
];
sheet.getRange('F1').format.font.bold = true;
sheet.getRange('F1:F8').format.horizontalAlignment = 'right';
sheet.freezePanes.freezeRows(1);
workbook.recalculate();
const exported = await SpreadsheetFile.exportXlsx(workbook);
await exported.save(new URL('certificates-template.xlsx',directory).pathname.replace(/^\/([A-Za-z]:)/,'$1'));
await fs.copyFile(new URL('certificates-template.xlsx',directory),new URL('../../certificates-template.xlsx',directory));
export async function renderPreview() {
  const preview = await workbook.render({sheetName:'الشهادات',range:'A1:F9',scale:1.5,format:'png'});
  const bytes = new Uint8Array(await preview.arrayBuffer());
  await fs.writeFile(new URL('template-preview.png',directory),bytes);
  return bytes;
}
