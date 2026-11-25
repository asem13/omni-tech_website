(function (root) {
  'use strict';
  function normalizeId(value) {
    return String(value).trim().replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 1632)).replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 1776)).toUpperCase();
  }
  function validate(data) {
    if (!data || data.version !== 1 || !Array.isArray(data.certificates)) throw new Error('ملف الشهادات غير صالح. اختر ملف certificates.json الذي صدّرته من صفحة الإدارة.');
    const ids = new Set();
    return data.certificates.map(item => {
      if (!item || typeof item.id !== 'string' || typeof item.name !== 'string') throw new Error('كل شهادة يجب أن تحتوي على اسم ورقم صحيحين.');
      const id = normalizeId(item.id), name = item.name.trim();
      if (!id || id.length > 100 || !name || name.length > 200 || /[\u0000-\u001f\u007f]/.test(id)) throw new Error('راجع أسماء أصحاب الشهادات وأرقامها في الملف.');
      if (ids.has(id)) throw new Error('يوجد رقم شهادة مكرر: ' + id);
      ids.add(id);
      const course = item.course === undefined ? '' : item.course;
      const date = item.date === undefined ? '' : item.date;
      if (typeof course !== 'string' || course.length > 200 || typeof date !== 'string' || (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date))) throw new Error('اسم الدورة أو تاريخ الإصدار غير صالح.');
      return {id, name, course: course.trim(), date};
    });
  }
  async function load() {
    const response = await fetch('certificates.json', {cache: 'no-store'});
    if (!response.ok) throw new Error('تعذّر تحميل سجل الشهادات. جرّب مرة أخرى أو تواصل معنا.');
    return validate(await response.json());
  }
  root.CertificateStore = {normalizeId, validate, load};
})(globalThis);
