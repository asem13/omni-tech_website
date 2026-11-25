'use strict';
const form = document.getElementById('verifyForm');
const input = document.getElementById('certificateId');
const result = document.getElementById('result');
const status = document.getElementById('status');
const button = document.getElementById('verifyButton');
let request = 0;
function message(title, body, success) {
  result.replaceChildren();
  result.className = 'panel ' + (success ? 'success' : 'error');
  const heading = document.createElement('h2'); heading.textContent = title;
  const paragraph = document.createElement('p'); paragraph.textContent = body;
  result.append(heading, paragraph); result.hidden = false;
}
input.addEventListener('input', () => {request++; result.hidden = true; status.textContent = ''; button.disabled = false;});
form.addEventListener('submit', async event => {
  event.preventDefault();
  const id = CertificateStore.normalizeId(input.value);
  result.hidden = true;
  if (!id) {status.textContent = 'اكتب رقم الشهادة أولًا.'; input.focus(); return;}
  const current = ++request;
  button.disabled = true; status.textContent = 'جارٍ التحقق من سجل الشهادات…';
  try {
    const records = await CertificateStore.load();
    if (current !== request) return;
    const record = records.find(item => item.id === id);
    status.textContent = '';
    if (!record) {message('لم نعثر على هذا الرقم', 'لا توجد شهادة بهذا الرقم في السجل المنشور. تأكد من كتابته كما هو مطبوع، أو تواصل معنا لمراجعة البيانات.', false); return;}
    message('شهادة صحيحة وصادرة عن OmniTech', 'البيانات التالية مطابقة لسجل الشهادات المنشور لدينا.', true);
    const details = document.createElement('dl');
    for (const [label, value] of [['اسم صاحب الشهادة', record.name], ['رقم الشهادة', record.id], ['الدورة', record.course], ['تاريخ الإصدار', record.date]]) {
      if (!value) continue;
      const dt = document.createElement('dt'); dt.textContent = label;
      const dd = document.createElement('dd'); dd.textContent = value; dd.dir = 'auto';
      details.append(dt, dd);
    }
    result.append(details);
  } catch (_) {
    if (current === request) {status.textContent = ''; message('تعذّر التحقق الآن', 'لم نتمكن من تحميل سجل الشهادات. أعد المحاولة عند توفر الاتصال أو تواصل معنا. هذا لا يعني أن الشهادة غير صحيحة.', false);}
  } finally {if (current === request) button.disabled = false;}
});
