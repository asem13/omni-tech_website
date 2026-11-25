(function (root) {
  'use strict';
  const headers = ['اسم صاحب الشهادة', 'رقم الشهادة', 'اسم الدورة', 'تاريخ الإصدار'];
  function parse(buffer) {
    if (!root.XLSX) throw new Error('تعذّر تحميل قارئ Excel. تأكد من رفع مجلد vendor مع ملفات الموقع.');
    const XLSX = root.XLSX;
    let workbook;
    try { workbook = XLSX.read(buffer, {type:'array', cellDates:false, cellNF:true, sheetRows:10002}); }
    catch (_) { throw new Error('تعذّر قراءة الملف. احفظه بصيغة Excel (.xlsx) بدون كلمة مرور وأعد المحاولة.'); }
    const sheet = workbook.Sheets['الشهادات'] || workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet || !sheet['!ref']) throw new Error('ملف Excel فارغ. استخدم القالب المتاح في الصفحة.');
    const range = XLSX.utils.decode_range(sheet['!fullref'] || sheet['!ref']);
    if (range.e.r > 10000) throw new Error('الحد الأقصى 10000 صف بيانات في الملف الواحد. قسّم الملف إلى أجزاء.');
    const columns = headers.map((title, column) => {
      const cell = sheet[XLSX.utils.encode_cell({r:0,c:column})];
      return cell && !cell.f && String(cell.v || '').trim() === title;
    });
    if (columns.some(ok => !ok)) throw new Error('عناوين الأعمدة غير مطابقة. استخدم القالب الفارغ دون تغيير أول صف أو ترتيب الأعمدة.');
    const records = [], rowById = new Map();
    for (let row = 1; row <= range.e.r; row++) {
      const cells = headers.map((_, column) => sheet[XLSX.utils.encode_cell({r:row,c:column})]);
      if (cells.every(cell => !cell || (!cell.f && (cell.v == null || String(cell.v).trim() === '')))) continue;
      try {
        if (cells.some(cell => cell && (cell.f || cell.t === 'e'))) throw new Error('استخدم قيمًا مباشرة بدون معادلات أو أخطاء Excel.');
        const text = cell => {
          if (!cell || cell.v == null) return '';
          if (!['s','str','n'].includes(cell.t)) throw new Error('توجد قيمة غير صالحة. استخدم نصًا للاسم والرقم والدورة.');
          return (cell.t === 'n' ? XLSX.utils.format_cell(cell) : String(cell.v)).trim();
        };
        const idCell = cells[1];
        if (idCell && idCell.t === 'n' && (!Number.isSafeInteger(idCell.v) || idCell.v < 0 || idCell.v >= 1e15 || (idCell.z && XLSX.SSF.is_date(idCell.z)))) throw new Error('اكتب رقم الشهادة كنص للحفاظ عليه، خصوصًا الأرقام الطويلة والأصفار في البداية.');
        let date = text(cells[3]);
        if (cells[3] && cells[3].t === 'n') {
          const parts = XLSX.SSF.parse_date_code(cells[3].v, {date1904:!!(workbook.Workbook && workbook.Workbook.WBProps && workbook.Workbook.WBProps.date1904)});
          if (!parts || parts.H || parts.M || parts.S) throw new Error('تاريخ الإصدار غير صالح. استخدم تاريخًا بدون وقت.');
          date = String(parts.y).padStart(4,'0') + '-' + String(parts.m).padStart(2,'0') + '-' + String(parts.d).padStart(2,'0');
        } else if (date) date = root.CertificateStore.normalizeId(date);
        const record = root.CertificateStore.validate({version:1,certificates:[{name:text(cells[0]),id:text(idCell),course:text(cells[2]),date}]})[0];
        if (rowById.has(record.id)) throw new Error('رقم الشهادة مكرر داخل الملف (ظهر أولًا في الصف ' + rowById.get(record.id) + ').');
        rowById.set(record.id, row + 1); records.push(record);
      } catch (error) { throw new Error('الصف ' + (row + 1) + ': ' + error.message); }
    }
    if (!records.length) throw new Error('القالب فارغ. أضف أسماء وأرقام شهادات بدايةً من الصف الثاني.');
    return records;
  }
  function merge(existing, incoming) {
    const index = new Map(existing.map(record => [record.id, record]));
    const additions = []; let skipped = 0;
    for (const record of incoming) {
      const old = index.get(record.id);
      if (!old) {additions.push(record); index.set(record.id, record); continue;}
      if (['name','course','date'].some(key => (old[key] || '') !== (record[key] || ''))) throw new Error('رقم ' + record.id + ' موجود بالفعل ببيانات مختلفة. لم يُستورد أي صف. راجع الملف أو عدّل الشهادة الموجودة أولًا.');
      skipped++;
    }
    return {records:root.CertificateStore.validate({version:1,certificates:[...existing,...additions]}),added:additions.length,skipped};
  }
  root.CertificateExcel = {parse, merge};
})(globalThis);
