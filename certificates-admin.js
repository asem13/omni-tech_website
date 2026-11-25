'use strict';
const $ = id => document.getElementById(id);
let records = [], editing = null, dirty = false, ready = false;
let importing = false;
const report = message => { $('adminStatus').textContent = message; };
function cancelEdit() {
  editing = null; $('certificateForm').reset(); $('editorTitle').textContent = 'إضافة شهادة';
  $('saveRecord').textContent = 'إضافة الشهادة'; $('cancelEdit').hidden = true;
}
function render() {
  const query = CertificateStore.normalizeId($('searchRecords').value);
  const shown = records.filter(record => CertificateStore.normalizeId(record.name).includes(query) || record.id.includes(query));
  $('recordsBody').replaceChildren();
  $('recordCount').textContent = '(' + records.length + ')';
  $('recordsTable').hidden = !shown.length;
  $('emptyRecords').hidden = !!shown.length;
  $('emptyRecords').textContent = !ready ? 'لم يتم تحميل سجل بعد.' : records.length ? 'لا توجد نتائج لهذا البحث.' : 'السجل فارغ. أضف أول شهادة من النموذج أعلاه.';
  $('editorFields').disabled = !ready; $('exportFile').disabled = !ready;
  for (const record of shown) {
    const row = document.createElement('tr');
    for (const value of [record.name, record.id, record.course || '—', record.date || '—']) {
      const cell = document.createElement('td'); cell.textContent = value; cell.dir = 'auto'; row.append(cell);
    }
    const actions = document.createElement('td');
    const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'secondary'; edit.textContent = 'تعديل'; edit.setAttribute('aria-label', 'تعديل شهادة ' + record.name);
    edit.addEventListener('click', () => {
      editing = record.id;
      $('recordName').value = record.name; $('recordId').value = record.id; $('recordCourse').value = record.course; $('recordDate').value = record.date;
      $('editorTitle').textContent = 'تعديل الشهادة'; $('saveRecord').textContent = 'حفظ التعديل'; $('cancelEdit').hidden = false; $('recordName').focus();
    });
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'danger'; remove.textContent = 'حذف'; remove.setAttribute('aria-label', 'حذف شهادة ' + record.name);
    remove.addEventListener('click', () => {
      if (!confirm('حذف شهادة ' + record.name + ' (' + record.id + ') من الملف؟')) return;
      records = records.filter(item => item.id !== record.id); dirty = true;
      if (editing === record.id) cancelEdit();
      render(); report('تم الحذف من النسخة الحالية. نزّل الملف وارفعه لنشر التغيير.');
    });
    actions.append(edit, remove); row.append(actions); $('recordsBody').append(row);
  }
}
function replaceRecords(next, message) {
  if ((dirty || editing !== null) && !confirm('استبدال السجل الحالي؟ ستفقد التعديلات غير المنزّلة.')) return;
  records = next; ready = true; dirty = false; cancelEdit(); render(); report(message);
}
$('loadPublished').addEventListener('click', async () => {
  $('loadPublished').disabled = true;
  try {const next = await CertificateStore.load(); replaceRecords(next, 'تم تحميل السجل المنشور. يمكنك الآن تعديل البيانات.');}
  catch (_) {report('تعذّر تحميل السجل. لو فتحت الصفحة من جهازك مباشرة، استورد ملف certificates.json من زر اختيار الملف. لم تتغير بياناتك الحالية.');}
  finally {$('loadPublished').disabled = false;}
});
$('newRegistry').addEventListener('click', () => replaceRecords([], 'بدأت سجلًا فارغًا. لا تستبدل به سجلًا منشورًا إلا إذا كنت تريد إزالة البيانات القديمة.'));
async function importSelectedFile(event) {
  const file = event.target.files[0]; if (!file) return;
  if (importing || $('loadPublished').disabled) {event.target.value = ''; report('انتظر اكتمال تحميل الملف الحالي ثم اختر ملفك.'); return;}
  importing = true;
  const controls = [...document.querySelectorAll('main button, main input')].map(control => [control, control.disabled]);
  controls.forEach(([control]) => {control.disabled = true;});
  try {
    if (file.size > 10 * 1024 * 1024) throw new Error('حجم الملف أكبر من 10 ميجابايت.');
    if (/\.json$/i.test(file.name)) {
      const next = CertificateStore.validate(JSON.parse(await file.text()));
      replaceRecords(next, 'تم استيراد ملف JSON. راجع البيانات قبل النشر.');
      return;
    }
    if (!/\.xlsx$/i.test(file.name)) throw new Error('اختر ملف Excel بصيغة .xlsx. يمكنك حفظ ملفات .xls القديمة بهذه الصيغة من Excel.');
    report('جارٍ قراءة ملف Excel…');
    const incoming = CertificateExcel.parse(await file.arrayBuffer());
    let base = records;
    if (!ready) {
      report('جارٍ جلب الشهادات المنشورة تلقائيًا للحفاظ على الأشخاص الموجودين…');
      try {base = await CertificateStore.load();}
      catch (_) {throw new Error('تعذّر جلب الشهادات المنشورة، ولم تُضف أي بيانات. افتح صفحة الإدارة من رابط موقعك وأعد اختيار Excel. لو هذه أول شهادات لك، افتح «خيارات إضافية» واختر «بدء سجل فارغ» ثم ارفع Excel مرة أخرى.');}
    }
    const merged = CertificateExcel.merge(base, incoming);
    records = merged.records; ready = true; dirty = dirty || merged.added > 0;
    report('تمت إضافة ' + merged.added + ' شهادة من Excel. تم تجاهل ' + merged.skipped + ' شهادة موجودة بنفس البيانات.\nراجع السجل ثم نزّل ملف الشهادات وارفعه على GitHub لنشر التحديث.');
  } catch (error) {report(error instanceof SyntaxError ? 'الملف ليس JSON صالحًا. لم تتغير بياناتك الحالية.' : error.message);}
  finally {
    importing = false; controls.forEach(([control, disabled]) => {control.disabled = disabled;});
    render(); event.target.value = ''; $('adminStatus').scrollIntoView({block:'center'});
  }
}
$('importFile').addEventListener('change', importSelectedFile);
$('importExcel').addEventListener('change', importSelectedFile);
$('certificateForm').addEventListener('submit', event => {
  event.preventDefault();
  if (!ready) return;
  try {
    const record = CertificateStore.validate({version:1,certificates:[{id:$('recordId').value,name:$('recordName').value,course:$('recordCourse').value,date:$('recordDate').value}]})[0];
    if (records.some(item => item.id === record.id && item.id !== editing)) throw new Error('رقم الشهادة مستخدم بالفعل. اختر رقمًا مختلفًا أو عدّل الشهادة الموجودة.');
    if (editing === null) records.push(record);
    else records = records.map(item => item.id === editing ? record : item);
    dirty = true; cancelEdit(); render(); report('تم حفظ الشهادة في النسخة الحالية. نزّل الملف وارفعه على GitHub لنشر التغيير.');
  } catch (error) {report(error.message); $('adminStatus').scrollIntoView({block:'center'});}
});
$('cancelEdit').addEventListener('click', cancelEdit);
$('searchRecords').addEventListener('input', render);
$('exportFile').addEventListener('click', () => {
  if (!ready) return;
  if (!records.length && !confirm('السجل فارغ. رفع هذا الملف سيزيل كل الشهادات المنشورة. هل تريد تنزيله؟')) return;
  const data = {version:1,certificates:CertificateStore.validate({version:1,certificates:records})};
  const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2) + '\n'], {type:'application/json;charset=utf-8'}));
  const link = document.createElement('a'); link.href = url; link.download = 'certificates.json'; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  dirty = false; report('تم طلب تنزيل certificates.json. تأكد من حفظه ثم ارفعه مكان الملف القديم على GitHub. التغييرات لم تُنشر بعد.');
});
window.addEventListener('beforeunload', event => {
  const hasInput = ['recordName','recordId','recordCourse','recordDate'].some(id => $(id).value);
  if (dirty || hasInput) {event.preventDefault(); event.returnValue = '';}
});
