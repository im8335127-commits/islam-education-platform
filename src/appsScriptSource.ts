export const APPS_SCRIPT_CODE_GS = `/**
 * Google Apps Script - Code.gs
 * نظام إدارة الطلاب باستخدام Google Sheets كقاعدة بيانات
 */

const SHEET_NAME = 'الطلاب';

// عناوين الأعمدة المطلوبة
const HEADERS = [
  'كود الطالب',         // A
  'اسم الطالب',         // B
  'الصف',              // C
  'الهاتف',            // D
  'الحضور',            // E
  'الغياب',            // F
  'نسبة الحضور',        // G
  'الامتحان الشهري 1',  // H
  'الامتحان الشهري 2',  // I
  'الملاحظات'          // J
];

/**
 * دالة التشغيل الرئيسية لعرض صفحة الويب
 */
function doGet() {
  initializeSheetIfNeeded();
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('نظام إدارة الطلاب - لوحة التحكم')
    .setXFrameOptionsMode(HtmlService.SandboxMode.IFRAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * تضمين ملفات HTML أخرى (مثل التنسيقات والبرمجة النصية)
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * تهيئة ورقة البيانات بالترويسات المناسبة إذا كانت فارغة
 */
function initializeSheetIfNeeded() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    
    // إضافة بيانات تجريبية
    sheet.appendRow(['STU-101', 'أحمد محمد علي', 'الصف الأول الثانوي', '0501234567', '18', '2', '90%', '95', '92', 'طالب متميز ومجتهد']);
    sheet.appendRow(['STU-102', 'فاطمة عمر خالد', 'الصف الأول الثانوي', '0507654321', '19', '1', '95%', '88', '94', 'تحتاج لمراجعة بسيطة في الجبر']);
  }
}

/**
 * جلب جميع بيانات الطلاب
 */
function getStudents() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return [];
  
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return []; // فقط العناوين متوفرة
  
  const students = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    
    // حساب نسبة الحضور في الخلفية كإجراء احتياطي
    const attendance = parseInt(row[4]) || 0;
    const absence = parseInt(row[5]) || 0;
    const total = attendance + absence;
    const attendancePct = total > 0 ? Math.round((attendance / total) * 100) : 100;

    students.push({
      rowIndex: i - 1, // فهرس نسبي من البيانات الفعلية (0 للسطر الثاني)
      code: row[0] || '',
      name: row[1] || '',
      grade: row[2] || '',
      phone: row[3] || '',
      attendance: attendance,
      absence: absence,
      attendancePercentage: attendancePct,
      exam1: row[7] !== undefined && row[7] !== null ? row[7] : '',
      exam2: row[8] !== undefined && row[8] !== null ? row[8] : '',
      notes: row[9] || ''
    });
  }
  
  return students;
}

/**
 * إضافة طالب جديد
 */
function addStudent(student) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('لم يتم العثور على ورقة البيانات "الطلاب".');
  
  const total = parseInt(student.attendance) + parseInt(student.absence);
  const attendancePct = total > 0 ? Math.round((parseInt(student.attendance) / total) * 100) + '%' : '100%';

  sheet.appendRow([
    student.code,
    student.name,
    student.grade,
    student.phone,
    student.attendance.toString(),
    student.absence.toString(),
    attendancePct,
    student.exam1.toString(),
    student.exam2.toString(),
    student.notes
  ]);
  
  return { success: true, message: 'تم إضافة الطالب بنجاح' };
}

/**
 * تحديث بيانات طالب موجود
 */
function updateStudent(student) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('لم يتم العثور على ورقة البيانات "الطلاب".');
  
  const rowIndex = parseInt(student.rowIndex);
  const actualRow = rowIndex + 2; // السطر الأول عناوين والفرس يبدأ من 0
  
  const total = parseInt(student.attendance) + parseInt(student.absence);
  const attendancePct = total > 0 ? Math.round((parseInt(student.attendance) / total) * 100) + '%' : '100%';

  const range = sheet.getRange(actualRow, 1, 1, 10);
  range.setValues([[
    student.code,
    student.name,
    student.grade,
    student.phone,
    student.attendance.toString(),
    student.absence.toString(),
    attendancePct,
    student.exam1.toString(),
    student.exam2.toString(),
    student.notes
  ]]);
  
  return { success: true, message: 'تم تحديث بيانات الطالب بنجاح' };
}

/**
 * حذف طالب من القائمة
 */
function deleteStudent(rowIndex) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('لم يتم العثور على ورقة البيانات.');
  
  const targetRow = parseInt(rowIndex) + 2;
  sheet.deleteRow(targetRow);
  
  return { success: true, message: 'تم حذف الطالب بنجاح' };
}
`;

export const APPS_SCRIPT_INDEX_HTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>نظام إدارة الطلاب</title>
  <!-- Bootstrap 5 RTL -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.rtl.min.css">
  <!-- Google Cairo Font -->
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap" rel="stylesheet">
  <!-- CSS Stylesheet -->
  <?!= include('Stylesheet'); ?>
</head>
<body>

  <!-- رأس الصفحة -->
  <header class="navbar navbar-dark bg-primary shadow-sm py-3 mb-4">
    <div class="container d-flex justify-content-between align-items-center">
      <a class="navbar-brand d-flex align-items-center gap-2 m-0" href="#">
        <span class="fs-4 fw-bold">نظام إدارة الطلاب</span>
      </a>
      <span class="badge bg-light text-primary fs-6 p-2 shadow-sm rounded-3">قاعدة بيانات Google Sheets</span>
    </div>
  </header>

  <main class="container mb-5">
    <!-- حقل البحث والزرار -->
    <div class="card border-0 shadow-sm p-4 rounded-4 mb-4 bg-white">
      <div class="row g-3 align-items-center">
        <!-- البحث -->
        <div class="col-md-7">
          <div class="input-group">
            <span class="input-group-text bg-light border-end-0 text-muted">🔍</span>
            <input type="text" id="searchInput" class="form-control bg-light border-start-0 py-2.5" placeholder="ابحث بكود الطالب أو بالاسم...">
          </div>
        </div>
        <!-- الفلترة بالصف -->
        <div class="col-md-3">
          <select id="gradeFilter" class="form-select bg-light py-2.5">
            <option value="">جميع الصفوف الدراسية</option>
            <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
            <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
            <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
          </select>
        </div>
        <!-- زر إضافة طالب -->
        <div class="col-md-2">
          <button class="btn btn-primary w-100 py-2.5 rounded-3 fw-medium d-flex align-items-center justify-content-center gap-2" onclick="showAddModal()">
            <span>➕</span> إضافة طالب
          </button>
        </div>
      </div>
    </div>

    <!-- بطاقة الطالب المحدد للبحث السريع (كارت الطالب) -->
    <div id="quickSearchCardContainer" class="mb-4 d-none">
      <div class="card border-0 shadow border-start border-4 border-success rounded-4 overflow-hidden">
        <div class="card-header bg-success bg-opacity-10 text-success fw-bold py-3 d-flex justify-content-between align-items-center">
          <span class="fs-5">✨ تم العثور على الطالب كارت معلومات سريع</span>
          <button type="button" class="btn-close" onclick="closeQuickCard()"></button>
        </div>
        <div class="card-body p-4" id="quickCardBody">
          <!-- سيتم بناؤه بالـ JS -->
        </div>
      </div>
    </div>

    <!-- جدول عرض الطلاب -->
    <div class="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
      <div class="card-header bg-light py-3 border-0">
        <h5 class="m-0 fw-bold text-dark d-flex align-items-center gap-2">
          <span>📋</span> قائمة الطلاب المقيدين
        </h5>
      </div>
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light text-secondary">
            <tr>
              <th scope="col" class="py-3 px-4">كود الطالب</th>
              <th scope="col" class="py-3">الاسم بالكامل</th>
              <th scope="col" class="py-3">الصف</th>
              <th scope="col" class="py-3 text-center">الحضور والغياب</th>
              <th scope="col" class="py-3 text-center">نسبة الحضور</th>
              <th scope="col" class="py-3 text-center">الامتحان 1</th>
              <th scope="col" class="py-3 text-center">الامتحان 2</th>
              <th scope="col" class="py-3 text-center">الملاحظات</th>
              <th scope="col" class="py-3 text-center px-4" style="width: 150px;">الإجراءات</th>
            </tr>
          </thead>
          <tbody id="studentsTableBody">
            <tr>
              <td colspan="9" class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">جاري التحميل...</span>
                </div>
                <p class="mt-3 mb-0 text-muted">جاري تحميل بيانات الطلاب من Google Sheets...</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>

  <!-- نافذة إضافة / تعديل طالب (Modal) -->
  <div class="modal fade" id="studentModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
      <div class="modal-content border-0 rounded-4 shadow">
        <div class="modal-header border-0 bg-primary text-white py-3">
          <h5 class="modal-title fw-bold" id="modalTitle">إضافة طالب جديد</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body p-4 bg-light bg-opacity-25">
          <form id="studentForm" onsubmit="saveStudentForm(event)">
            <input type="hidden" id="studentRowIndex">
            
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label fw-bold">كود الطالب <span class="text-danger">*</span></label>
                <input type="text" id="studentCode" class="form-control" required placeholder="مثال: STU-100">
              </div>
              <div class="col-md-6">
                <label class="form-label fw-bold">اسم الطالب بالكامل <span class="text-danger">*</span></label>
                <input type="text" id="studentName" class="form-control" required placeholder="الاسم ثلاثي أو رباعي">
              </div>

              <div class="col-md-6">
                <label class="form-label fw-bold">الصف الدراسي <span class="text-danger">*</span></label>
                <select id="studentGrade" class="form-select" required>
                  <option value="" disabled selected>اختر الصف...</option>
                  <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
                  <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
                  <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label fw-bold">هاتف ولي الأمر</label>
                <input type="tel" id="studentPhone" class="form-control" placeholder="05xxxxxxxx">
              </div>

              <div class="col-md-6 col-lg-3">
                <label class="form-label fw-bold">عدد أيام الحضور</label>
                <input type="number" id="studentAttendance" class="form-control" min="0" value="0">
              </div>
              <div class="col-md-6 col-lg-3">
                <label class="form-label fw-bold">عدد أيام الغياب</label>
                <input type="number" id="studentAbsence" class="form-control" min="0" value="0">
              </div>
              <div class="col-md-6 col-lg-3">
                <label class="form-label fw-bold">الامتحان الشهري 1</label>
                <input type="text" id="studentExam1" class="form-control" placeholder="درجة الامتحان">
              </div>
              <div class="col-md-6 col-lg-3">
                <label class="form-label fw-bold">الامتحان الشهري 2</label>
                <input type="text" id="studentExam2" class="form-control" placeholder="درجة الامتحان">
              </div>

              <div class="col-12">
                <label class="form-label fw-bold">ملاحظات إضافية</label>
                <textarea id="studentNotes" class="form-control" rows="3" placeholder="ملاحظات حول مستوى الطالب أو الحضور..."></textarea>
              </div>
            </div>

            <div class="d-flex justify-content-end gap-2 mt-4">
              <button type="button" class="btn btn-secondary px-4 py-2" data-bs-dismiss="modal">إلغاء</button>
              <button type="submit" id="saveBtn" class="btn btn-primary px-4 py-2">
                حفظ البيانات
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>

  <!-- نخب التنبيه (Toast) لرسائل الحالة الإيجابية والخطأ -->
  <div class="toast-container position-fixed bottom-0 start-0 p-3">
    <div id="toastNotification" class="toast align-items-center border-0 shadow-lg text-white" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body fw-bold" id="toastMessage"></div>
        <button type="button" class="btn-close btn-close-white me-auto m-2" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  </div>

  <!-- Bootstrap Bundle with Popper JS -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
  <!-- JavaScript -->
  <?!= include('JavaScript'); ?>
</body>
</html>
`;

export const APPS_SCRIPT_STYLESHEET_HTML = `<style>
  :root {
    --bs-primary: #1e3a8a;
    --bs-primary-rgb: 30, 58, 138;
    --bs-success: #10b981;
    --bs-success-rgb: 16, 185, 129;
    --bs-danger: #ef4444;
    --bs-danger-rgb: 239, 68, 68;
    --bs-warning: #f59e0b;
    --bs-warning-rgb: 245, 158, 11;
    --bs-font-sans-serif: 'Cairo', system-ui, -apple-system, sans-serif;
  }

  body {
    font-family: var(--bs-font-sans-serif);
    background-color: #f8fafc;
    color: #334155;
    text-align: right;
  }

  /* تخصيص مظهر الحقول والمدخلات */
  .form-control, .form-select {
    font-family: var(--bs-font-sans-serif);
    padding: 0.6rem 1rem;
    border-radius: 0.5rem;
    border: 1px solid #cbd5e1;
  }
  .form-control:focus, .form-select:focus {
    box-shadow: 0 0 0 0.25rem rgba(var(--bs-primary-rgb), 0.15);
    border-color: var(--bs-primary);
  }

  /* مظهر الأزرار */
  .btn-primary {
    background-color: var(--bs-primary);
    border-color: var(--bs-primary);
  }
  .btn-primary:hover {
    background-color: #1e40af;
    border-color: #1e40af;
  }

  /* تأثيرات انتقالية ورسومية للجدول */
  .table {
    border-collapse: separate;
    border-spacing: 0;
  }
  .table > :not(caption) > * > * {
    padding: 1rem 1rem;
    border-bottom: 1px solid #f1f5f9;
  }
  tbody tr {
    transition: background-color 0.2s ease;
  }
  tbody tr:hover {
    background-color: #f1f5f9 !important;
  }

  /* منزلقات ومؤشرات نسبة الحضور */
  .progress {
    height: 10px;
    border-radius: 9999px;
  }

  /* مظهر البطاقات الفرعية والمربعات */
  .badge {
    font-weight: 500;
  }

  /* التفاف نصوص الملاحظات الطويلة */
  .text-truncate-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* تخصيص الـ scrollbar */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background: #f1f5f9;
  }
  ::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
</style>
`;

export const APPS_SCRIPT_JAVASCRIPT_HTML = `<script>
  let allStudents = [];
  let modalInstance = null;
  let toastInstance = null;

  // عند تحميل المستند بالكامل
  document.addEventListener('DOMContentLoaded', () => {
    modalInstance = new bootstrap.Modal(document.getElementById('studentModal'));
    toastInstance = new bootstrap.Toast(document.getElementById('toastNotification'));
    
    // تحميل البيانات من Sheets
    loadStudentsData();

    // ربط ميزات تصفية وحقول البحث
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('gradeFilter').addEventListener('change', applyFilters);
  });

  /**
   * استدعاء دالة جلب البيانات من Google Apps Script
   */
  function loadStudentsData() {
    showTableLoadingState();
    google.script.run
      .withSuccessHandler((students) => {
        allStudents = students;
        renderStudentsTable(students);
      })
      .withFailureHandler((err) => {
        showToast('فشل تحميل البيانات: ' + err.message, 'bg-danger');
      })
      .getStudents();
  }

  /**
   * حالة التحميل للجدول
   */
  function showTableLoadingState() {
    const tableBody = document.getElementById('studentsTableBody');
    tableBody.innerHTML = \`
      <tr>
        <td colspan="9" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">جاري التحميل...</span>
          </div>
          <p class="mt-3 mb-0 text-muted">جاري سحب أحدث السجلات والدرجات من Google Sheets...</p>
        </td>
      </tr>
    \`;
  }

  /**
   * بناء الجدول بالكامل
   */
  function renderStudentsTable(students) {
    const tableBody = document.getElementById('studentsTableBody');
    if (students.length === 0) {
      tableBody.innerHTML = \`
        <tr>
          <td colspan="9" class="text-center py-5 text-muted">
            لا توجد أي بيانات طلاب حالياً. اضغط على "إضافة طالب" لبدء الإدخال.
          </td>
        </tr>
      \`;
      return;
    }

    let rowsHtml = '';
    students.forEach((student) => {
      // تصنيف نسبة الحضور للحصول على ألوان ديناميكية
      let pctColor = 'bg-danger';
      if (student.attendancePercentage >= 90) {
        pctColor = 'bg-success';
      } else if (student.attendancePercentage >= 75) {
        pctColor = 'bg-warning';
      }

      rowsHtml += \`
        <tr id="student-row-\${student.rowIndex}">
          <td class="fw-bold text-primary px-4">\${escapeHtml(student.code)}</td>
          <td class="fw-medium">\${escapeHtml(student.name)}</td>
          <td>\${escapeHtml(student.grade)}</td>
          <td class="text-center text-secondary font-monospace">\${escapeHtml(student.phone || '-')}</td>
          <td class="text-center text-nowrap">
            <span class="badge bg-success-subtle text-success fs-7 border border-success-subtle px-2 py-1">\${student.attendance} حضور</span>
            <span class="badge bg-danger-subtle text-danger fs-7 border border-danger-subtle px-2 py-1">\&nbsp;\${student.absence} غياب</span>
          </td>
          <td>
            <div class="d-flex align-items-center gap-2 justify-content-center" style="min-width: 120px;">
              <div class="progress flex-grow-1" style="height: 6px;">
                <div class="progress-bar \${pctColor}" role="progressbar" style="width: \${student.attendancePercentage}%" aria-valuenow="\${student.attendancePercentage}" aria-valuemin="0" aria-valuemax="100"></div>
              </div>
              <span class="text-nowrap font-monospace fw-bold small text-secondary">\${student.attendancePercentage}%</span>
            </div>
          </td>
          <td class="text-center fw-bold text-success font-monospace">\${student.exam1 || '-'}</td>
          <td class="text-center fw-bold text-success font-monospace">\${student.exam2 || '-'}</td>
          <td>
            <div class="text-truncate-2 small text-muted text-center" title="\${escapeHtml(student.notes)}" style="max-width: 150px;">
              \${escapeHtml(student.notes || '-')}
            </div>
          </td>
          <td class="text-center px-4 text-nowrap">
            <button class="btn btn-sm btn-outline-primary rounded-3 me-1" onclick="editStudent(\${student.rowIndex})">✏️ تعديل</button>
            <button class="btn btn-sm btn-outline-danger rounded-3" onclick="confirmDeleteStudent(\${student.rowIndex})">🗑️ حذف</button>
          </td>
        </tr>
      \`;
    });

    tableBody.innerHTML = rowsHtml;
  }

  /**
   * تطبيق فلترة البحث بالاسم أو الكود
   */
  function applyFilters() {
    const searchText = document.getElementById('searchInput').value.trim().toLowerCase();
    const selectedGrade = document.getElementById('gradeFilter').value;

    let filtered = allStudents;

    // فلترة الصف الدراسي
    if (selectedGrade) {
      filtered = filtered.filter(s => s.grade === selectedGrade);
    }

    // فلترة النص
    if (searchText) {
      filtered = filtered.filter(s => 
        s.code.toLowerCase().includes(searchText) || 
        s.name.toLowerCase().includes(searchText)
      );

      // إذا كان البحث عبارة عن كود دقيق جداً ومتطابق، نعرض الكرت السريع
      const exactMatch = allStudents.find(s => s.code.toLowerCase() === searchText);
      if (exactMatch) {
        showQuickSearchCard(exactMatch);
      } else {
        closeQuickCard();
      }
    } else {
      closeQuickCard();
    }

    renderStudentsTable(filtered);
  }

  /**
   * عرض كارت الطالب السريع الحديث
   */
  function showQuickSearchCard(student) {
    const container = document.getElementById('quickSearchCardContainer');
    const body = document.getElementById('quickCardBody');
    
    let pctColor = 'text-danger';
    if (student.attendancePercentage >= 90) pctColor = 'text-success';
    else if (student.attendancePercentage >= 75) pctColor = 'text-warning';

    body.innerHTML = \`
      <div class="row g-4">
        <div class="col-md-4">
          <h5 class="text-muted small fw-bold mb-1">الاسم بالكامل</h5>
          <p class="fs-5 fw-bold text-dark mb-0">\${escapeHtml(student.name)}</p>
        </div>
        <div class="col-md-2">
          <h5 class="text-muted small fw-bold mb-1">كود الطالب</h5>
          <p class="fs-5 font-monospace fw-bold text-primary mb-0">\${escapeHtml(student.code)}</p>
        </div>
        <div class="col-md-3">
          <h5 class="text-muted small fw-bold mb-1">الصف الدراسي</h5>
          <p class="fs-5 fw-medium text-dark mb-0">\${escapeHtml(student.grade)}</p>
        </div>
        <div class="col-md-3">
          <h5 class="text-muted small fw-bold mb-1">الهاتف</h5>
          <p class="fs-5 font-monospace text-secondary mb-0">\${escapeHtml(student.phone || 'غير مسجل')}</p>
        </div>
        <div class="col-12"><hr class="my-1 border-light"></div>
        <div class="col-md-3 text-center">
          <h5 class="text-muted small fw-bold mb-1">نسبة الحضور</h5>
          <p class="fs-4 fw-black font-monospace \${pctColor} mb-0">\${student.attendancePercentage}%</p>
          <small class="text-muted">\${student.attendance} حضور / \${student.absence} غياب</small>
        </div>
        <div class="col-md-3 text-center">
          <h5 class="text-muted small fw-bold mb-1">الامتحان الشهري 1</h5>
          <p class="fs-4 font-monospace fw-bold text-success mb-0">\${student.exam1 || '-'}</p>
        </div>
        <div class="col-md-3 text-center">
          <h5 class="text-muted small fw-bold mb-1">الامتحان الشهري 2</h5>
          <p class="fs-4 font-monospace fw-bold text-success mb-0">\${student.exam2 || '-'}</p>
        </div>
        <div class="col-md-3">
          <h5 class="text-muted small fw-bold mb-1">الملاحظات والتقييم</h5>
          <p class="small text-muted mb-0">\${escapeHtml(student.notes || 'لا توجد ملاحظات مسجلة')}</p>
        </div>
      </div>
    \`;
    container.classList.remove('d-none');
  }

  function closeQuickCard() {
    document.getElementById('quickSearchCardContainer').classList.add('d-none');
  }

  /**
   * عرض نافذة الإضافة
   */
  function showAddModal() {
    document.getElementById('modalTitle').innerText = 'إضافة طالب جديد';
    document.getElementById('studentForm').reset();
    document.getElementById('studentRowIndex').value = '';
    document.getElementById('studentCode').removeAttribute('readonly');
    modalInstance.show();
  }

  /**
   * عرض نافذة التعديل
   */
  function editStudent(rowIndex) {
    const student = allStudents.find(s => s.rowIndex === rowIndex);
    if (!student) return;

    document.getElementById('modalTitle').innerText = 'تعديل بيانات الطالب';
    document.getElementById('studentRowIndex').value = student.rowIndex;
    document.getElementById('studentCode').value = student.code;
    // منع تعديل الكود لضمان اتساق البيانات
    document.getElementById('studentCode').setAttribute('readonly', 'true');
    
    document.getElementById('studentName').value = student.name;
    document.getElementById('studentGrade').value = student.grade;
    document.getElementById('studentPhone').value = student.phone || '';
    document.getElementById('studentAttendance').value = student.attendance;
    document.getElementById('studentAbsence').value = student.absence;
    document.getElementById('studentExam1').value = student.exam1;
    document.getElementById('studentExam2').value = student.exam2;
    document.getElementById('studentNotes').value = student.notes || '';

    modalInstance.show();
  }

  /**
   * حفظ استمارة الطالب (إضافة أو تعديل)
   */
  function saveStudentForm(event) {
    event.preventDefault();
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.setAttribute('disabled', 'true');
    saveBtn.innerHTML = 'جاري الحفظ والرفع...';

    const rowIndexVal = document.getElementById('studentRowIndex').value;
    const student = {
      code: document.getElementById('studentCode').value.trim(),
      name: document.getElementById('studentName').value.trim(),
      grade: document.getElementById('studentGrade').value,
      phone: document.getElementById('studentPhone').value.trim(),
      attendance: parseInt(document.getElementById('studentAttendance').value) || 0,
      absence: parseInt(document.getElementById('studentAbsence').value) || 0,
      exam1: document.getElementById('studentExam1').value.trim(),
      exam2: document.getElementById('studentExam2').value.trim(),
      notes: document.getElementById('studentNotes').value.trim()
    };

    if (rowIndexVal !== '') {
      student.rowIndex = parseInt(rowIndexVal);
      // تعديل
      google.script.run
        .withSuccessHandler((res) => {
          modalInstance.hide();
          showToast('تم تعديل بيانات الطالب وتحديث Google Sheets بنجاح', 'bg-success');
          loadStudentsData();
          saveBtn.removeAttribute('disabled');
          saveBtn.innerHTML = 'حفظ البيانات';
        })
        .withFailureHandler((err) => {
          showToast('خطأ أثناء تحديث البيانات: ' + err.message, 'bg-danger');
          saveBtn.removeAttribute('disabled');
          saveBtn.innerHTML = 'حفظ البيانات';
        })
        .updateStudent(student);
    } else {
      // إضافة جديد
      // التحقق أولا من عدم تكرار الكود
      const codeExists = allStudents.some(s => s.code.toLowerCase() === student.code.toLowerCase());
      if (codeExists) {
        showToast('كود الطالب مسجل مسبقاً! يرجى استخدام كود فريد.', 'bg-danger');
        saveBtn.removeAttribute('disabled');
        saveBtn.innerHTML = 'حفظ البيانات';
        return;
      }

      google.script.run
        .withSuccessHandler((res) => {
          modalInstance.hide();
          showToast('تم إضافة الطالب وتوليد الصف الجديد في Google Sheets', 'bg-success');
          loadStudentsData();
          saveBtn.removeAttribute('disabled');
          saveBtn.innerHTML = 'حفظ البيانات';
        })
        .withFailureHandler((err) => {
          showToast('خطأ أثناء إضافة الطالب: ' + err.message, 'bg-danger');
          saveBtn.removeAttribute('disabled');
          saveBtn.innerHTML = 'حفظ البيانات';
        })
        .addStudent(student);
    }
  }

  /**
   * تأكيد عملية الحذف وحذف الطالب نهائياً
   */
  function confirmDeleteStudent(rowIndex) {
    const student = allStudents.find(s => s.rowIndex === rowIndex);
    if (!student) return;

    if (confirm(\`هل أنت متأكد تماماً من حذف الطالب "\${student.name}"؟ سيتم إزالة الصف الخاص به نهائياً من ورقة Google Sheets ولا يمكن التراجع عن هذا.\`)) {
      showTableLoadingState();
      google.script.run
        .withSuccessHandler((res) => {
          showToast('تم حذف الطالب وإعادة ترتيب الأسطر بنجاح', 'bg-success');
          loadStudentsData();
        })
        .withFailureHandler((err) => {
          showToast('فشل حذف الطالب: ' + err.message, 'bg-danger');
          loadStudentsData();
        })
        .deleteStudent(rowIndex);
    }
  }

  /**
   * دالة عرض التنبيهات المنبثقة
   */
  function showToast(message, bgClass = 'bg-primary') {
    const toastEl = document.getElementById('toastNotification');
    const toastMsg = document.getElementById('toastMessage');
    
    // إعادة تعيين كلاسات الخلفية
    toastEl.className = 'toast align-items-center border-0 shadow-lg text-white ' + bgClass;
    toastMsg.innerText = message;
    
    toastInstance.show();
  }

  /**
   * تأمين وتنظيف النصوص لمنع ثغرات الـ XSS
   */
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
  }
</script>
`;
