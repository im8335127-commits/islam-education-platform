import React, { useState, useEffect } from 'react';
import { 
  initAuth, 
  googleSignIn, 
  googleSignOut, 
  auth 
} from './googleAuth';
import { 
  createSpreadsheet, 
  fetchStudents, 
  addStudent, 
  updateStudent, 
  deleteStudent,
  getSpreadsheetTitle,
  fetchAttendanceLogs,
  saveAttendanceLog,
  ensureGradesSheetExists,
  saveGradeEntry,
  fetchGradeEntries,
  fetchUsers,
  fetchPaymentRecords,
  savePaymentRecord
} from './sheetsService';
import { Student, AttendanceLog, GradeEntry, UserCredential, PaymentRecord } from './types';
import { 
  APPS_SCRIPT_CODE_GS, 
  APPS_SCRIPT_INDEX_HTML, 
  APPS_SCRIPT_STYLESHEET_HTML, 
  APPS_SCRIPT_JAVASCRIPT_HTML 
} from './appsScriptSource';
import { 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  FileSpreadsheet, 
  LogOut, 
  Info, 
  Code, 
  GraduationCap, 
  Phone, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  Check, 
  Copy, 
  X, 
  Sparkles, 
  BookOpen, 
  HelpCircle,
  FolderOpen,
  RefreshCw
} from 'lucide-react';
// @ts-ignore
import brandLogo from './assets/images/eslam_brand_logo_original_1784147647928.jpg';
// @ts-ignore
import appIcon from './assets/images/eslam_simplified_app_icon_1784147865716.jpg';

export default function App() {
  // Authentication states
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Spreadsheet state
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => {
    return localStorage.getItem('student_mgmt_spreadsheet_id') || '';
  });
  const [spreadsheetTitle, setSpreadsheetTitle] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [spreadsheetError, setSpreadsheetError] = useState<string | null>(null);

  // Student list states
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('student_mgmt_cached_students');
    return saved ? JSON.parse(saved) : [];
  });
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Modal / Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [formStudent, setFormStudent] = useState<Partial<Student>>({
    code: '',
    name: '',
    grade: '',
    phone: '',
    attendance: 0,
    absence: 0,
    exam1: '',
    exam2: '',
    notes: ''
  });
  const [isFormSaving, setIsFormSaving] = useState(false);

  // Delete Confirm
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'teacherDashboard' | 'dashboard' | 'attendance' | 'appsScript' | 'gradesEntry' | 'parentPortal'>(() => {
    const savedParent = localStorage.getItem('parent_logged_in_student');
    return savedParent ? 'parentPortal' : 'teacherDashboard';
  });
  const [savingStudentCodes, setSavingStudentCodes] = useState<Record<string, 'present' | 'absent'>>({});

  // Teacher Dashboard States
  const [dashboardDate, setDashboardDate] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [dashboardSearchQuery, setDashboardSearchQuery] = useState('');
  const [selectedHistoryStudentCode, setSelectedHistoryStudentCode] = useState<string | null>(null);

  // Grades entry states
  const [gradesStudentCode, setGradesStudentCode] = useState('');
  const [gradesStudentName, setGradesStudentName] = useState('');
  const [gradesSubject, setGradesSubject] = useState('عربي ورقة أولى');
  const [gradesExamName, setGradesExamName] = useState('');
  const [gradesScore, setGradesScore] = useState('');
  const [gradesMaxScore, setGradesMaxScore] = useState('');
  const [gradesExamDate, setGradesExamDate] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [isSavingGrade, setIsSavingGrade] = useState(false);

  // Payment states
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>(() => {
    const saved = localStorage.getItem('student_mgmt_cached_payments');
    return saved ? JSON.parse(saved) : [];
  });
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [collectPaymentStudent, setCollectPaymentStudent] = useState<Student | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [paymentTotalFees, setPaymentTotalFees] = useState<string>('1000'); // default total fees 1000
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  // Parent portal states
  const [loginTab, setLoginTab] = useState<'teacher' | 'parent'>('teacher');
  const [parentCode, setParentCode] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [isParentLoggingIn, setIsParentLoggingIn] = useState(false);
  const [parentLoginError, setParentLoginError] = useState<string | null>(null);
  const [isRefreshingParent, setIsRefreshingParent] = useState(false);
  const [parentFromDate, setParentFromDate] = useState('');
  const [parentToDate, setParentToDate] = useState('');
  const [loggedInStudent, setLoggedInStudent] = useState<Student | null>(() => {
    const saved = localStorage.getItem('parent_logged_in_student');
    return saved ? JSON.parse(saved) : null;
  });

  // Teacher portal credentials states
  const [loggedInTeacher, setLoggedInTeacher] = useState<{ username: string; role: string } | null>(() => {
    const saved = localStorage.getItem('logged_in_teacher');
    return saved ? JSON.parse(saved) : null;
  });
  const [teacherUsername, setTeacherUsername] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [isLoggingInTeacher, setIsLoggingInTeacher] = useState(false);
  const [teacherLoginError, setTeacherLoginError] = useState<string | null>(null);

  // Attendance Logs and Date Picker state
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>(() => {
    const saved = localStorage.getItem('student_mgmt_cached_logs');
    return saved ? JSON.parse(saved) : [];
  });
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const [gradeEntries, setGradeEntries] = useState<GradeEntry[]>(() => {
    const saved = localStorage.getItem('student_mgmt_cached_grades');
    return saved ? JSON.parse(saved) : [];
  });
  const [isLoadingGrades, setIsLoadingGrades] = useState(false);

  const loadAttendanceLogs = async (id: string = spreadsheetId) => {
    if (!token || !id) return;
    setIsLoadingLogs(true);
    try {
      const logs = await fetchAttendanceLogs(token, id);
      setAttendanceLogs(logs);
      localStorage.setItem('student_mgmt_cached_logs', JSON.stringify(logs));
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const loadGradeEntries = async (id: string = spreadsheetId) => {
    if (!token || !id) return;
    setIsLoadingGrades(true);
    try {
      const grades = await fetchGradeEntries(token, id);
      setGradeEntries(grades);
      localStorage.setItem('student_mgmt_cached_grades', JSON.stringify(grades));
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingGrades(false);
    }
  };

  const loadPaymentRecords = async (id: string = spreadsheetId) => {
    if (!token || !id) return;
    setIsLoadingPayments(true);
    try {
      const payments = await fetchPaymentRecords(token, id);
      setPaymentRecords(payments);
      localStorage.setItem('student_mgmt_cached_payments', JSON.stringify(payments));
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingPayments(false);
    }
  };

  // Copy-paste section active file
  const [activeScriptFile, setActiveScriptFile] = useState<'Code.gs' | 'Index.html' | 'Stylesheet.html' | 'JavaScript.html'>('Code.gs');
  const [copiedState, setCopiedState] = useState(false);

  // Alert Notifications
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load auth status
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, currentToken) => {
        setUser(currentUser);
        setToken(currentToken);
        localStorage.setItem('student_mgmt_google_token', currentToken);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // Sync Google Sheet when token and sheetId are available
  useEffect(() => {
    if (token && spreadsheetId) {
      loadSpreadsheetDetails();
      loadAttendanceLogs();
      loadGradeEntries();
      loadPaymentRecords();
    }
  }, [token, spreadsheetId]);

  // Sync logs and grades when tabs become active
  useEffect(() => {
    if (token && spreadsheetId) {
      if (activeTab === 'attendance') {
        loadAttendanceLogs();
      } else if (activeTab === 'gradesEntry' || activeTab === 'parentPortal') {
        loadGradeEntries();
        loadPaymentRecords();
      } else if (activeTab === 'dashboard') {
        loadPaymentRecords();
      }
    }
  }, [activeTab, token, spreadsheetId]);

  // Flash notification helper
  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        localStorage.setItem('student_mgmt_google_token', result.accessToken);
        setNeedsAuth(false);
        showNotification('تم تسجيل الدخول بنجاح عبر حساب Google');
      }
    } catch (err: any) {
      console.error(err);
      showNotification('فشل تسجيل الدخول. يرجى تجربة المحاولة مجدداً.', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherUsername.trim() || !teacherPassword.trim()) {
      setTeacherLoginError('يرجى إدخال اسم المستخدم وكلمة المرور.');
      return;
    }

    if (!token || !spreadsheetId) {
      setTeacherLoginError('يرجى ربط مستند Google Sheets أولاً عبر حساب Google الخاص بك.');
      return;
    }

    setIsLoggingInTeacher(true);
    setTeacherLoginError(null);

    try {
      const users = await fetchUsers(token, spreadsheetId);
      const matched = users.find(
        u => u.username.trim().toLowerCase() === teacherUsername.trim().toLowerCase() && 
             u.password.trim() === teacherPassword.trim()
      );

      if (matched) {
        if (matched.role === 'Admin') {
          const teacherInfo = { username: matched.username, role: matched.role };
          setLoggedInTeacher(teacherInfo);
          localStorage.setItem('logged_in_teacher', JSON.stringify(teacherInfo));
          showNotification('تم تسجيل دخول المعلم بنجاح! مرحباً بك.');
          setTeacherUsername('');
          setTeacherPassword('');
        } else {
          setTeacherLoginError('عذراً، هذا الحساب لا يملك صلاحية مدير (Admin) للوصول للوحة التحكم.');
        }
      } else {
        setTeacherLoginError('اسم المستخدم أو كلمة المرور غير صحيحة.');
      }
    } catch (err: any) {
      console.error(err);
      setTeacherLoginError('حدث خطأ أثناء محاولة جلب الحسابات من جدول البيانات. يرجى التحقق من الملف.');
    } finally {
      setIsLoggingInTeacher(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('هل أنت متأكد من تسجيل الخروج؟')) {
      await googleSignOut();
      setUser(null);
      setToken(null);
      setLoggedInTeacher(null);
      localStorage.removeItem('student_mgmt_google_token');
      localStorage.removeItem('logged_in_teacher');
      setNeedsAuth(true);
      setStudents([]);
      setSpreadsheetTitle('');
      setSelectedStudent(null);
      showNotification('تم تسجيل الخروج بنجاح');
    }
  };

  const handleParentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentCode || !parentPhone) {
      setParentLoginError('يرجى إدخال كود الطالب ورقم الهاتف.');
      return;
    }

    setIsParentLoggingIn(true);
    setParentLoginError(null);

    try {
      const storedSpreadsheetId = localStorage.getItem('student_mgmt_spreadsheet_id') || spreadsheetId;
      const storedToken = localStorage.getItem('student_mgmt_google_token') || token;

      let freshStudents = students;
      let freshLogs = attendanceLogs;

      // Try to fetch latest data if spreadsheet ID and token exist
      if (storedToken && storedSpreadsheetId) {
        try {
          freshStudents = await fetchStudents(storedToken, storedSpreadsheetId);
          setStudents(freshStudents);
          localStorage.setItem('student_mgmt_cached_students', JSON.stringify(freshStudents));

          freshLogs = await fetchAttendanceLogs(storedToken, storedSpreadsheetId);
          setAttendanceLogs(freshLogs);
          localStorage.setItem('student_mgmt_cached_logs', JSON.stringify(freshLogs));

          const freshGrades = await fetchGradeEntries(storedToken, storedSpreadsheetId);
          setGradeEntries(freshGrades);
          localStorage.setItem('student_mgmt_cached_grades', JSON.stringify(freshGrades));

          const freshPayments = await fetchPaymentRecords(storedToken, storedSpreadsheetId);
          setPaymentRecords(freshPayments);
          localStorage.setItem('student_mgmt_cached_payments', JSON.stringify(freshPayments));
        } catch (fetchErr) {
          console.warn('Failed to fetch fresh data for parent, falling back to cache:', fetchErr);
        }
      }

      // If fresh load didn't run or failed, load from local cache
      if (!freshStudents || freshStudents.length === 0) {
        const cachedS = localStorage.getItem('student_mgmt_cached_students');
        if (cachedS) {
          freshStudents = JSON.parse(cachedS);
          setStudents(freshStudents);
        }
      }
      if (!freshLogs || freshLogs.length === 0) {
        const cachedL = localStorage.getItem('student_mgmt_cached_logs');
        if (cachedL) {
          freshLogs = JSON.parse(cachedL);
          setAttendanceLogs(freshLogs);
        }
      }

      // Find student matching code and parent phone (column D / .phone)
      const normalizedInputCode = parentCode.trim().toLowerCase();
      const normalizedInputPhone = parentPhone.trim();

      const matched = freshStudents.find(student => {
        const dbCode = (student.code || '').trim().toLowerCase();
        const dbPhone = (student.phone || '').trim();
        return dbCode === normalizedInputCode && dbPhone === normalizedInputPhone;
      });

      if (matched) {
        setLoggedInStudent(matched);
        localStorage.setItem('parent_logged_in_student', JSON.stringify(matched));
        setActiveTab('parentPortal');
        showNotification('تم تسجيل دخول ولي الأمر بنجاح ✅');
      } else {
        setParentLoginError('كود الطالب أو رقم الهاتف غير صحيح. يرجى التحقق من المدخلات.');
      }
    } catch (err: any) {
      console.error(err);
      setParentLoginError('حدث خطأ أثناء محاولة تسجيل الدخول. يرجى مراجعة الاتصال بالإنترنت.');
    } finally {
      setIsParentLoggingIn(false);
    }
  };

  const handleParentLogout = () => {
    setLoggedInStudent(null);
    localStorage.removeItem('parent_logged_in_student');
    setParentCode('');
    setParentPhone('');
    showNotification('تم تسجيل خروج ولي الأمر بنجاح');
  };

  const handleRefreshParentData = async () => {
    const storedSpreadsheetId = localStorage.getItem('student_mgmt_spreadsheet_id') || spreadsheetId;
    const storedToken = localStorage.getItem('student_mgmt_google_token') || token;
    if (!storedSpreadsheetId || !storedToken) {
      showNotification('لم يتم العثور على جدول بيانات للربط معه', 'error');
      return;
    }
    setIsRefreshingParent(true);
    try {
      const freshStudents = await fetchStudents(storedToken, storedSpreadsheetId);
      setStudents(freshStudents);
      localStorage.setItem('student_mgmt_cached_students', JSON.stringify(freshStudents));

      const freshLogs = await fetchAttendanceLogs(storedToken, storedSpreadsheetId);
      setAttendanceLogs(freshLogs);
      localStorage.setItem('student_mgmt_cached_logs', JSON.stringify(freshLogs));

      const freshGrades = await fetchGradeEntries(storedToken, storedSpreadsheetId);
      setGradeEntries(freshGrades);
      localStorage.setItem('student_mgmt_cached_grades', JSON.stringify(freshGrades));

      const freshPayments = await fetchPaymentRecords(storedToken, storedSpreadsheetId);
      setPaymentRecords(freshPayments);
      localStorage.setItem('student_mgmt_cached_payments', JSON.stringify(freshPayments));

      if (loggedInStudent) {
        const updated = freshStudents.find(s => s.code.toLowerCase().trim() === loggedInStudent.code.toLowerCase().trim());
        if (updated) {
          setLoggedInStudent(updated);
          localStorage.setItem('parent_logged_in_student', JSON.stringify(updated));
        }
      }
      showNotification('تم تحديث جميع الدرجات والمصروفات بنجاح 🔄');
    } catch (err: any) {
      console.error(err);
      showNotification('فشل تحديث البيانات، يرجى مراجعة الاتصال بالإنترنت', 'error');
    } finally {
      setIsRefreshingParent(false);
    }
  };

  // Load Spreadsheet metadata and students list
  const loadSpreadsheetDetails = async () => {
    if (!token || !spreadsheetId) return;
    setIsConnecting(true);
    setSpreadsheetError(null);
    try {
      const title = await getSpreadsheetTitle(token, spreadsheetId);
      setSpreadsheetTitle(title);
      localStorage.setItem('student_mgmt_spreadsheet_id', spreadsheetId);
      
      // Auto-ensure the grades sheet and attendance sheet are created
      try {
        await ensureGradesSheetExists(token, spreadsheetId);
      } catch (sheetErr) {
        console.warn('Failed to auto-create Grades sheet:', sheetErr);
      }

      await loadStudentsList(spreadsheetId);
    } catch (err: any) {
      console.error(err);
      setSpreadsheetError(err.message || 'لا يمكن الاتصال بجدول البيانات المحدد.');
      setStudents([]);
    } finally {
      setIsConnecting(false);
    }
  };

  const loadStudentsList = async (id: string = spreadsheetId) => {
    if (!token || !id) return;
    setIsLoadingStudents(true);
    try {
      const list = await fetchStudents(token, id);
      setStudents(list);
      // Auto-select first student if available and none selected
      if (list.length > 0 && !selectedStudent) {
        setSelectedStudent(list[0]);
      } else if (selectedStudent) {
        // Refresh selected student data if they still exist
        const updated = list.find(s => s.code === selectedStudent.code);
        if (updated) {
          setSelectedStudent(updated);
        }
      }
    } catch (err: any) {
      console.error(err);
      showNotification('حدث خطأ أثناء تحميل بيانات الطلاب.', 'error');
    } finally {
      setIsLoadingStudents(false);
    }
  };

  // Auto create a Spreadsheet with single click
  const handleCreateNewSpreadsheet = async () => {
    if (!token) return;
    setIsConnecting(true);
    setSpreadsheetError(null);
    try {
      const newId = await createSpreadsheet(token);
      setSpreadsheetId(newId);
      showNotification('تم إنشاء قاعدة بيانات جديدة بنجاح في Google Sheets!');
    } catch (err: any) {
      console.error(err);
      showNotification('فشل إنشاء قاعدة بيانات جديدة.', 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  // Form actions
  const openAddForm = () => {
    setFormMode('add');
    setFormStudent({
      code: `STU-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      grade: 'الصف الأول الثانوي',
      phone: '',
      attendance: 0,
      absence: 0,
      exam1: '',
      exam2: '',
      notes: ''
    });
    setIsFormOpen(true);
  };

  const openEditForm = (student: Student) => {
    setFormMode('edit');
    setFormStudent({ ...student });
    setIsFormOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !spreadsheetId) return;

    if (!formStudent.code || !formStudent.name || !formStudent.grade) {
      showNotification('يرجى ملء جميع الحقول الإلزامية.', 'error');
      return;
    }

    setIsFormSaving(true);
    try {
      if (formMode === 'add') {
        // Validate duplicate code
        const isDuplicate = students.some(s => s.code.toLowerCase() === formStudent.code?.toLowerCase());
        if (isDuplicate) {
          showNotification('كود الطالب هذا مسجل بالفعل. يرجى استخدام كود فريد.', 'error');
          setIsFormSaving(false);
          return;
        }

        const newStudent: Student = {
          code: formStudent.code,
          name: formStudent.name,
          grade: formStudent.grade,
          phone: formStudent.phone || '',
          attendance: Number(formStudent.attendance) || 0,
          absence: Number(formStudent.absence) || 0,
          attendancePercentage: 100,
          exam1: formStudent.exam1 || '',
          exam2: formStudent.exam2 || '',
          notes: formStudent.notes || ''
        };

        await addStudent(token, spreadsheetId, newStudent);
        showNotification('تمت إضافة الطالب الجديد بنجاح في Google Sheets');
      } else {
        // Update existing
        const updatedStudent: Student = {
          rowIndex: formStudent.rowIndex,
          code: formStudent.code!,
          name: formStudent.name!,
          grade: formStudent.grade!,
          phone: formStudent.phone || '',
          attendance: Number(formStudent.attendance) || 0,
          absence: Number(formStudent.absence) || 0,
          attendancePercentage: 100, // Calculated automatically in the service
          exam1: formStudent.exam1 || '',
          exam2: formStudent.exam2 || '',
          notes: formStudent.notes || ''
        };

        await updateStudent(token, spreadsheetId, updatedStudent);
        showNotification('تم تحديث بيانات الطالب وحفظها في Google Sheets');
      }
      setIsFormOpen(false);
      await loadStudentsList();
    } catch (err: any) {
      console.error(err);
      showNotification('فشل حفظ بيانات الطالب في الملف.', 'error');
    } finally {
      setIsFormSaving(false);
    }
  };

  // Delete student
  const handleDeleteConfirm = (student: Student) => {
    setStudentToDelete(student);
  };

  const handleExecuteDelete = async () => {
    if (!token || !spreadsheetId || !studentToDelete || studentToDelete.rowIndex === undefined) return;
    setIsDeleting(true);
    try {
      await deleteStudent(token, spreadsheetId, studentToDelete.rowIndex);
      showNotification(`تم حذف الطالب "${studentToDelete.name}" وإعادة ترتيب الصفوف.`);
      if (selectedStudent?.code === studentToDelete.code) {
        setSelectedStudent(null);
      }
      setStudentToDelete(null);
      await loadStudentsList();
    } catch (err: any) {
      console.error(err);
      showNotification('حدث خطأ أثناء محاولة حذف الطالب.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Collect payment helpers
  const openCollectPayment = (student: Student) => {
    setCollectPaymentStudent(student);
    setPaymentAmount('');
    
    // Find latest payment record for this student to pre-populate total fees
    const latestRec = [...paymentRecords]
      .reverse()
      .find(r => r.studentCode === student.code);
      
    setPaymentTotalFees(latestRec ? latestRec.totalFees.toString() : '1000');
    setPaymentNotes('');
    
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setPaymentDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleCollectPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectPaymentStudent || !token || !spreadsheetId) return;

    const amount = Number(paymentAmount);
    const fees = Number(paymentTotalFees);
    if (isNaN(amount) || amount <= 0) {
      showNotification('يرجى إدخال مبلغ صحيح أكبر من الصفر', 'error');
      return;
    }
    if (isNaN(fees) || fees < 0) {
      showNotification('يرجى إدخال إجمالي مصروفات صحيح', 'error');
      return;
    }

    setIsSavingPayment(true);
    try {
      // Calculate previous paid amount
      const previousPaid = paymentRecords
        .filter(r => r.studentCode === collectPaymentStudent.code)
        .reduce((sum, r) => sum + r.amountPaid, 0);

      const totalPaidNew = previousPaid + amount;
      const remaining = fees - totalPaidNew;

      const record: Omit<PaymentRecord, 'rowIndex'> = {
        studentCode: collectPaymentStudent.code,
        studentName: collectPaymentStudent.name,
        paymentDate: paymentDate || new Date().toISOString().split('T')[0],
        amountPaid: amount,
        totalFees: fees,
        remainingBalance: remaining,
        notes: paymentNotes
      };

      await savePaymentRecord(token, spreadsheetId, record);
      showNotification(`تم تسجيل دفعة بقيمة ${amount} جنيه للطالب ${collectPaymentStudent.name} بنجاح`);
      
      // Close modal and reset fields
      setCollectPaymentStudent(null);
      setPaymentAmount('');
      setPaymentNotes('');
      
      // Reload payment records to refresh list and values
      await loadPaymentRecords();
    } catch (err: any) {
      console.error(err);
      showNotification(err.message || 'فشل تسجيل عملية التحصيل', 'error');
    } finally {
      setIsSavingPayment(false);
    }
  };

  // Record attendance/absence immediately and sync to Google Sheets
  const handleMarkAttendance = async (student: Student, isPresent: boolean) => {
    if (!token || !spreadsheetId) {
      showNotification('يرجى ربط أو إنشاء مستند Google Sheets أولاً لبدء تسجيل الحضور.', 'error');
      return;
    }

    const dateToUse = selectedDate || (() => {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    })();

    // Check for existing log
    const existingLog = attendanceLogs.find(
      log => log.date === dateToUse && log.studentCode === student.code
    );

    const newStatus: 'حاضر' | 'غائب' = isPresent ? 'حاضر' : 'غائب';

    if (existingLog && existingLog.status === newStatus) {
      showNotification(`تم تسجيل الطالب "${student.name}" كـ ${newStatus} بالفعل لهذا اليوم (${dateToUse}).`, 'success');
      return;
    }

    let newAttendance = Number(student.attendance) || 0;
    let newAbsence = Number(student.absence) || 0;

    if (existingLog) {
      // Status is different (e.g., changed from present to absent, or vice versa)
      if (isPresent) {
        // Was absent, now present
        newAttendance += 1;
        newAbsence = Math.max(0, newAbsence - 1);
      } else {
        // Was present, now absent
        newAttendance = Math.max(0, newAttendance - 1);
        newAbsence += 1;
      }
    } else {
      // New record
      if (isPresent) {
        newAttendance += 1;
      } else {
        newAbsence += 1;
      }
    }

    const total = newAttendance + newAbsence;
    const newPercentage = total > 0 ? Math.round((newAttendance / total) * 100) : 100;

    const updatedStudent: Student = {
      ...student,
      attendance: newAttendance,
      absence: newAbsence,
      attendancePercentage: newPercentage
    };

    // Update locally for instant user response
    setStudents(prev => prev.map(s => s.code === student.code ? updatedStudent : s));
    
    // Set saving loading state for this specific student and action
    setSavingStudentCodes(prev => ({ ...prev, [student.code]: isPresent ? 'present' : 'absent' }));

    try {
      // 1. Save or Update log in "سجل الحضور"
      await saveAttendanceLog(token, spreadsheetId, {
        rowIndex: existingLog?.rowIndex,
        date: dateToUse,
        studentCode: student.code,
        studentName: student.name,
        grade: student.grade,
        status: newStatus
      });

      // 2. Update student summary in "الطلاب"
      await updateStudent(token, spreadsheetId, updatedStudent);

      // 3. Reload attendance logs to stay fully in sync (gets correct row index)
      await loadAttendanceLogs();

      showNotification(`تم تسجيل الطالب "${student.name}" كـ ${isPresent ? 'حاضر ✅' : 'غائب ❌'} لليوم ${dateToUse} وتحديث السجل بنجاح.`);
    } catch (err: any) {
      console.error(err);
      // Revert local state if Sheets update failed
      setStudents(prev => prev.map(s => s.code === student.code ? student : s));
      showNotification(`فشل تحديث بيانات حضور الطالب "${student.name}". تأكد من اتصال الإنترنت ثم حاول مجدداً.`, 'error');
    } finally {
      setSavingStudentCodes(prev => {
        const copy = { ...prev };
        delete copy[student.code];
        return copy;
      });
    }
  };

  // Save new grade entry to Google Sheet
  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!spreadsheetId) {
      showNotification('الرجاء ربط أو إنشاء مستند Google Sheets أولاً قبل حفظ الدرجات.', 'error');
      return;
    }

    if (!gradesStudentCode.trim()) {
      showNotification('الرجاء إدخال كود الطالب.', 'error');
      return;
    }

    if (!gradesStudentName.trim()) {
      showNotification('لم يتم العثور على اسم طالب لهذا الكود. الرجاء إدخال كود صحيح من المسجلين.', 'error');
      return;
    }

    if (!gradesExamName.trim()) {
      showNotification('الرجاء إدخال اسم الاختبار.', 'error');
      return;
    }

    if (gradesScore === '') {
      showNotification('الرجاء إدخال درجة الطالب.', 'error');
      return;
    }

    if (gradesMaxScore === '') {
      showNotification('الرجاء إدخال الدرجة النهائية للاختبار.', 'error');
      return;
    }

    const scoreNum = Number(gradesScore);
    const maxScoreNum = Number(gradesMaxScore);

    if (isNaN(scoreNum) || scoreNum < 0) {
      showNotification('الرجاء إدخال درجة صالحة (صفر أو أكبر).', 'error');
      return;
    }

    if (isNaN(maxScoreNum) || maxScoreNum <= 0) {
      showNotification('الرجاء إدخال درجة نهائية صالحة (أكبر من صفر).', 'error');
      return;
    }

    setIsSavingGrade(true);

    if (!token) {
      showNotification('الرجاء تسجيل الدخول باستخدام Google أولاً.', 'error');
      setIsSavingGrade(false);
      return;
    }

    try {
      await saveGradeEntry(token, spreadsheetId, {
        studentCode: gradesStudentCode.trim(),
        studentName: gradesStudentName.trim(),
        subject: gradesSubject,
        examName: gradesExamName.trim(),
        score: scoreNum,
        maxScore: maxScoreNum,
        examDate: gradesExamDate
      });

      // Reload fresh grade entries to keep states synced
      await loadGradeEntries();

      showNotification(`تم حفظ درجة الطالب "${gradesStudentName}" في مادة "${gradesSubject}" بنجاح! ✅`);
      
      // Reset student details and score but keep Subject, Exam Name & Date for easier repetitive entry
      setGradesStudentCode('');
      setGradesStudentName('');
      setGradesScore('');
    } catch (err: any) {
      console.error(err);
      showNotification(`فشل حفظ الدرجة: ${err.message || 'حدث خطأ أثناء الاتصال بـ Google Sheets'}.`, 'error');
    } finally {
      setIsSavingGrade(false);
    }
  };

  // Copy to clipboard helper
  const handleCopyCode = (codeContent: string) => {
    navigator.clipboard.writeText(codeContent);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2000);
  };

  // Filter students based on search query and grade
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          student.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = gradeFilter ? student.grade === gradeFilter : true;
    return matchesSearch && matchesGrade;
  });

  // Filter students for Teacher Dashboard
  const filteredDashboardStudents = students.filter(student => {
    return student.code.toLowerCase().includes(dashboardSearchQuery.toLowerCase()) || 
           student.name.toLowerCase().includes(dashboardSearchQuery.toLowerCase());
  });

  // Automatically update selected student if search returns a direct single exact code match
  useEffect(() => {
    if (searchQuery.trim()) {
      const exactMatch = students.find(s => s.code.toLowerCase() === searchQuery.trim().toLowerCase());
      if (exactMatch) {
        setSelectedStudent(exactMatch);
      }
    }
  }, [searchQuery, students]);

  // Auto-fill student name in Grades Entry when student code matches
  useEffect(() => {
    if (!gradesStudentCode) {
      setGradesStudentName('');
      return;
    }
    const matched = students.find(s => s.code.toLowerCase().trim() === gradesStudentCode.toLowerCase().trim());
    if (matched) {
      setGradesStudentName(matched.name);
    } else {
      setGradesStudentName('');
    }
  }, [gradesStudentCode, students]);

  // Statistics calculations
  const totalStudents = students.length;
  const avgAttendance = totalStudents > 0 
    ? Math.round(students.reduce((sum, s) => sum + s.attendancePercentage, 0) / totalStudents)
    : 0;
  const gradesCount = Array.from(new Set(students.map(s => s.grade))).length;
  
  // Find top student (based on Exam 1 score primarily, if numeric)
  const topStudent = students.length > 0 
    ? [...students].sort((a, b) => {
        const scoreA = parseFloat(a.exam1 as string) || 0;
        const scoreB = parseFloat(b.exam1 as string) || 0;
        return scoreB - scoreA;
      })[0]
    : null;

  // --- Start of Parent Portal State-derived calculations ---
  // Filter logs for this specific student
  const parentStudentLogs = loggedInStudent ? attendanceLogs.filter(log => log.studentCode === loggedInStudent.code) : [];
  
  // Sort logs descending (latest first)
  const parentSortedLogs = [...parentStudentLogs].sort((a, b) => b.date.localeCompare(a.date));

  // Filter by parent-selected date range
  const parentFilteredLogs = parentSortedLogs.filter(log => {
    if (parentFromDate && log.date < parentFromDate) return false;
    if (parentToDate && log.date > parentToDate) return false;
    return true;
  });

  // Compute stats
  const parentHasAnyLogs = parentStudentLogs.length > 0;
  const parentIsDateFiltered = !!(parentFromDate || parentToDate);

  let parentTotalPresent = 0;
  let parentTotalAbsent = 0;
  let parentFinalPercentage = 100;

  if (loggedInStudent) {
    if (parentIsDateFiltered) {
      parentTotalPresent = parentFilteredLogs.filter(l => l.status === 'حاضر').length;
      parentTotalAbsent = parentFilteredLogs.filter(l => l.status === 'غائب').length;
      const totalDays = parentTotalPresent + parentTotalAbsent;
      parentFinalPercentage = totalDays > 0 ? Math.round((parentTotalPresent / totalDays) * 100) : 100;
    } else {
      if (parentHasAnyLogs) {
        parentTotalPresent = parentStudentLogs.filter(l => l.status === 'حاضر').length;
        parentTotalAbsent = parentStudentLogs.filter(l => l.status === 'غائب').length;
        const totalDays = parentTotalPresent + parentTotalAbsent;
        parentFinalPercentage = totalDays > 0 ? Math.round((parentTotalPresent / totalDays) * 100) : 100;
      } else {
        parentTotalPresent = Number(loggedInStudent.attendance) || 0;
        parentTotalAbsent = Number(loggedInStudent.absence) || 0;
        parentFinalPercentage = loggedInStudent.attendancePercentage !== undefined ? loggedInStudent.attendancePercentage : 100;
      }
    }
  }

  // Color theme for progress
  let parentPctThemeColor = 'bg-rose-500';
  let parentPctTextThemeColor = 'text-rose-600';
  if (parentFinalPercentage >= 90) {
    parentPctThemeColor = 'bg-emerald-500';
    parentPctTextThemeColor = 'text-emerald-600';
  } else if (parentFinalPercentage >= 75) {
    parentPctThemeColor = 'bg-amber-500';
    parentPctTextThemeColor = 'text-amber-600';
  }

  const getArabicDayOfWeek = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('ar-EG', { weekday: 'long' });
    } catch {
      return '';
    }
  };
  // --- End of Parent Portal State-derived calculations ---

  // Reusable component for teacher login requirements on protected tabs
  const renderTeacherLoginRequired = () => {
    if (needsAuth) {
      return (
        <div className="max-w-md mx-auto my-12 bg-white rounded-3xl shadow-lg border border-slate-100 p-8 text-right animate-fade-in" dir="rtl">
          <div className="flex flex-col items-center text-center pb-6 border-b border-slate-100">
            <img 
              src={brandLogo} 
              alt="منصة الأستاذ إسلام الشرقاوي" 
              className="w-24 h-24 object-contain mb-3 drop-shadow-md select-none hover:scale-105 transition-transform duration-300"
              referrerPolicy="no-referrer"
            />
            <h1 className="text-sm font-black text-brand-teal">منصة الأستاذ إسلام الشرقاوي</h1>
            <p className="text-brand-gold text-xs mt-1 font-bold">لتعليم اللغة العربية والمواد الشرعية • تتطلب دخول المعلم</p>
          </div>

          <div className="py-6 space-y-5">
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center">
              <p className="text-slate-600 text-xs leading-relaxed">
                يرجى تسجيل الدخول باستخدام حسابك في Google لتمكين التطبيق من الوصول لملفات جداول البيانات وقراءة قاعدة البيانات وإنشائها نيابة عنك.
              </p>
            </div>

            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full py-3.5 px-4 bg-white border border-slate-200 hover:border-brand-teal/30 text-slate-700 rounded-2xl shadow-sm hover:bg-slate-50 transition-all duration-200 flex items-center justify-center gap-3 font-bold text-sm cursor-pointer disabled:opacity-50"
            >
              {isLoggingIn ? (
                <div className="w-4 h-4 border-2 border-slate-300 border-t-brand-teal rounded-full animate-spin"></div>
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-.1.85-2.11 3.52v2.92h3.41c2-.07 3.73-1.8 4.75-4.22.95-2.28 1-4.07 1-4.07z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.41-2.92c-1.09.73-2.48 1.16-3.95 1.16-3.04 0-5.61-2.05-6.53-4.81H2.43v3.01C4.42 21.43 7.98 24 12 24z" />
                  <path fill="#FBBC05" d="M5.47 14.52a7.14 7.14 0 0 1 0-4.52V6.99H2.43a11.94 11.94 0 0 0 0 10.54l3.04-3.01z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.96 1.19 15.24 0 12 0 7.98 0 4.42 2.57 2.43 5.58l3.04 3.01c.92-2.76 3.49-4.81 6.53-4.81z" />
                </svg>
              )}
              <span>تسجيل الدخول باستخدام Google</span>
            </button>
          </div>
        </div>
      );
    }

    // Step 2: Username & Password Teacher Login (Requires Admin role)
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl shadow-lg border border-slate-100 p-8 text-right animate-fade-in" dir="rtl">
        <div className="flex flex-col items-center text-center pb-6 border-b border-slate-100">
          <img 
            src={brandLogo} 
            alt="منصة الأستاذ إسلام الشرقاوي" 
            className="w-24 h-24 object-contain mb-3 drop-shadow-md select-none hover:scale-105 transition-transform duration-300"
            referrerPolicy="no-referrer"
          />
          <h1 className="text-sm font-black text-brand-teal">بوابة تسجيل دخول المعلم (صلاحية مدير)</h1>
          <p className="text-brand-gold text-xs mt-1 font-bold">منصة الأستاذ إسلام الشرقاوي • لتعليم اللغة العربية والمواد الشرعية</p>
        </div>

        <form onSubmit={handleTeacherLogin} className="py-6 space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500">اسم المستخدم <span className="text-red-500">*</span></label>
            <input
              type="text"
              placeholder="مثال: admin"
              value={teacherUsername}
              onChange={(e) => setTeacherUsername(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 hover:border-brand-teal/30 focus:bg-white focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal rounded-2xl transition-all outline-none text-xs text-slate-800 font-sans"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500">كلمة المرور <span className="text-red-500">*</span></label>
            <input
              type="password"
              placeholder="••••••••"
              value={teacherPassword}
              onChange={(e) => setTeacherPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 hover:border-brand-teal/30 focus:bg-white focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal rounded-2xl transition-all outline-none text-xs text-slate-800 font-sans"
              required
            />
          </div>

          {teacherLoginError && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-rose-800 text-[11px] flex items-center gap-2 font-sans">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <p className="font-semibold">{teacherLoginError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoggingInTeacher}
            className="w-full py-3 px-4 bg-brand-teal hover:bg-brand-teal/90 text-white rounded-2xl shadow-md transition-all duration-200 flex items-center justify-center gap-2 font-bold text-xs cursor-pointer disabled:opacity-50"
          >
            {isLoggingInTeacher ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span>🔐 تسجيل دخول كمعلم</span>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-slate-400 text-[10px]">
          <span>الحساب متصل بـ Google: {user?.email}</span>
          <button 
            type="button"
            onClick={handleLogout}
            className="text-red-500 hover:text-red-600 font-bold transition-colors cursor-pointer"
          >
            تبديل الحساب / تسجيل الخروج 🚪
          </button>
        </div>
      </div>
    );
  };
 
  // Render Login state with teacher / parent portal toggle if fully unauthenticated
  if (needsAuth && !loggedInStudent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans" dir="rtl">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden animate-fade-in">
          <div className="flex flex-col items-center text-center p-8 bg-slate-50/50 border-b border-slate-100">
            <img 
              src={brandLogo} 
              alt="منصة الأستاذ إسلام الشرقاوي" 
              className="w-32 h-32 object-contain mb-4 drop-shadow-md select-none hover:scale-105 transition-transform duration-300"
              referrerPolicy="no-referrer"
            />
            <h1 className="text-xl font-black text-brand-teal">منصة الأستاذ إسلام الشرقاوي</h1>
            <p className="text-brand-gold text-xs mt-1.5 font-bold tracking-wide">لتعليم اللغة العربية والمواد الشرعية</p>
          </div>

          {/* Toggle Tab Header */}
          <div className="flex border-b border-slate-100 bg-slate-50/30 p-1.5">
            <button
              onClick={() => {
                setLoginTab('teacher');
                setParentLoginError(null);
              }}
              className={`flex-1 py-3 text-xs font-bold transition-all cursor-pointer rounded-xl ${
                loginTab === 'teacher'
                  ? 'bg-white text-brand-teal shadow-md'
                  : 'text-slate-500 hover:text-brand-teal hover:bg-slate-50'
              }`}
            >
              🔐 بوابة المعلم
            </button>
            <button
              onClick={() => {
                setLoginTab('parent');
                setParentLoginError(null);
              }}
              className={`flex-1 py-3 text-xs font-bold transition-all cursor-pointer rounded-xl ${
                loginTab === 'parent'
                  ? 'bg-white text-brand-teal shadow-md'
                  : 'text-slate-500 hover:text-brand-teal hover:bg-slate-50'
              }`}
            >
              👪 بوابة أولياء الأمور
            </button>
          </div>

          <div className="p-8">
            {loginTab === 'teacher' ? (
              <div className="space-y-6">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                  <p className="text-slate-600 text-xs leading-relaxed">
                    يرجى تسجيل الدخول باستخدام حسابك في Google لتمكين التطبيق من الوصول لملفات جداول البيانات وقراءة قاعدة البيانات وإنشائها نيابة عنك.
                  </p>
                </div>

                <button
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="w-full py-3.5 px-4 bg-white border border-slate-200 hover:border-brand-teal/30 text-slate-700 rounded-2xl shadow-sm hover:bg-slate-50 transition-all duration-200 flex items-center justify-center gap-3 font-bold text-sm cursor-pointer disabled:opacity-50"
                >
                  {isLoggingIn ? (
                    <div className="w-4 h-4 border-2 border-slate-300 border-t-brand-teal rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-.1.85-2.11 3.52v2.92h3.41c2-.07 3.73-1.8 4.75-4.22.95-2.28 1-4.07 1-4.07z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.41-2.92c-1.09.73-2.48 1.16-3.95 1.16-3.04 0-5.61-2.05-6.53-4.81H2.43v3.01C4.42 21.43 7.98 24 12 24z" />
                      <path fill="#FBBC05" d="M5.47 14.52a7.14 7.14 0 0 1 0-4.52V6.99H2.43a11.94 11.94 0 0 0 0 10.54l3.04-3.01z" />
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.96 1.19 15.24 0 12 0 7.98 0 4.42 2.57 2.43 5.58l3.04 3.01c.92-2.76 3.49-4.81 6.53-4.81z" />
                    </svg>
                  )}
                  <span>تسجيل الدخول باستخدام Google</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleParentLogin} className="space-y-5">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                  <p className="text-slate-600 text-xs leading-relaxed">
                    مرحباً بك في بوابة أولياء الأمور. يرجى إدخال كود الطالب ورقم الهاتف (كما هو مسجل في قاعدة البيانات) للاستعلام.
                  </p>
                </div>

                {parentLoginError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="font-semibold">{parentLoginError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">كود الطالب</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: STU-101"
                    value={parentCode}
                    onChange={(e) => setParentCode(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal rounded-2xl text-xs outline-none text-slate-800 font-mono font-bold transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">رقم الهاتف</label>
                  <input
                    type="tel"
                    required
                    placeholder="مثال: 0501234567"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal rounded-2xl text-xs outline-none text-slate-800 font-mono transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isParentLoggingIn}
                  className="w-full py-3.5 px-4 bg-brand-teal hover:bg-brand-teal/90 text-white font-bold text-xs rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isParentLoggingIn ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span className="flex items-center gap-1">دخول البوابة والاستعلام ➔</span>
                  )}
                </button>
              </form>
            )}

            <div className="border-t border-slate-100 pt-5 mt-5 text-center text-[10px] text-slate-400">
              <p>نظام آمن ومحمي • جميع البيانات تحفظ مباشرة في حسابك على Google Drive</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Main app once authenticated
  return (
    <div className="min-h-screen bg-slate-50/50 pb-16 text-slate-800" dir="rtl">
      {/* Top Banner Alert Notific      {/* Modern Main Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img 
              src={appIcon} 
              alt="منصة الأستاذ إسلام الشرقاوي" 
              className="w-10 h-10 object-contain rounded-lg shadow-sm"
              referrerPolicy="no-referrer"
            />
            <div>
              <h1 className="text-sm font-bold text-slate-800 leading-tight">منصة الأستاذ إسلام الشرقاوي</h1>
              <p className="text-[10px] text-brand-gold font-bold mt-0.5">لتعليم اللغة العربية والمواد الشرعية • لوحة التحكم</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="hidden md:flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1">
            <button
              onClick={() => setActiveTab('teacherDashboard')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'teacherDashboard' 
                  ? 'bg-brand-teal text-white shadow-sm' 
                  : 'text-slate-600 hover:text-brand-teal hover:bg-white/60'
              }`}
            >
              📊 لوحة التحكم
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
                activeTab === 'dashboard' 
                  ? 'bg-brand-teal text-white shadow-sm' 
                  : 'text-slate-600 hover:text-brand-teal hover:bg-white/60'
              }`}
            >
              👥 الطلاب المقيدين
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'attendance' 
                  ? 'bg-brand-teal text-white shadow-sm' 
                  : 'text-slate-600 hover:text-brand-teal hover:bg-white/60'
              }`}
            >
              📅 الحضور
            </button>
            <button
              onClick={() => setActiveTab('gradesEntry')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'gradesEntry' 
                  ? 'bg-brand-teal text-white shadow-sm' 
                  : 'text-slate-600 hover:text-brand-teal hover:bg-white/60'
              }`}
            >
              📝 إدخال الدرجات
            </button>
            <button
              onClick={() => setActiveTab('parentPortal')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'parentPortal' 
                  ? 'bg-brand-teal text-white shadow-sm' 
                  : 'text-slate-600 hover:text-brand-teal hover:bg-white/60'
              }`}
            >
              👪 ولي الأمر
            </button>
            <button
              onClick={() => setActiveTab('appsScript')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'appsScript' 
                  ? 'bg-brand-teal text-white shadow-sm' 
                  : 'text-slate-600 hover:text-brand-teal hover:bg-white/60'
              }`}
            >
              <Code className="w-3.5 h-3.5" /> Apps Script
            </button>
          </div>

          {/* Profile Info & Logout */}
          <div className="flex items-center gap-3">
            {loggedInStudent ? (
              <div className="flex items-center gap-2">
                <div className="text-left hidden sm:block">
                  <span className="text-[11px] text-indigo-600 font-bold">مرحباً ولي أمر الطالب / {loggedInStudent.name}</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs border border-indigo-200">
                  👪
                </div>
              </div>
            ) : user ? (
              <div className="flex items-center gap-2">
                <div className="text-left hidden sm:block">
                  <span className="text-[11px] text-slate-500 font-medium">مرحباً، {user.displayName || user.email}</span>
                </div>
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs border border-slate-300">
                    {user.displayName?.charAt(0) || '👤'}
                  </div>
                )}
              </div>
            ) : null}
            <button
              onClick={loggedInStudent ? handleParentLogout : handleLogout}
              title="تسجيل الخروج"
              className="p-1.5 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-200 transition-all duration-150 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Tabs */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2 flex gap-2 overflow-x-auto whitespace-nowrap">
        <button
          onClick={() => setActiveTab('teacherDashboard')}
          className={`flex-1 min-w-[85px] text-center py-2 px-3 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
            activeTab === 'teacherDashboard' 
              ? 'bg-brand-teal text-white' 
              : 'text-slate-600 bg-slate-50 hover:text-brand-teal'
          }`}
        >
          لوحة التحكم
        </button>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 min-w-[85px] text-center py-2 px-3 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
            activeTab === 'dashboard' 
              ? 'bg-brand-teal text-white' 
              : 'text-slate-600 bg-slate-50 hover:text-brand-teal'
          }`}
        >
          الطلاب
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex-1 text-center py-2 px-3 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
            activeTab === 'attendance' 
              ? 'bg-brand-teal text-white' 
              : 'text-slate-600 bg-slate-50 hover:text-brand-teal'
          }`}
        >
          التحضير
        </button>
        <button
          onClick={() => setActiveTab('gradesEntry')}
          className={`flex-1 min-w-[85px] text-center py-2 px-3 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
            activeTab === 'gradesEntry' 
              ? 'bg-brand-teal text-white' 
              : 'text-slate-600 bg-slate-50 hover:text-brand-teal'
          }`}
        >
          الدرجات
        </button>
        <button
          onClick={() => setActiveTab('parentPortal')}
          className={`flex-1 min-w-[85px] text-center py-2 px-3 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
            activeTab === 'parentPortal' 
              ? 'bg-brand-teal text-white' 
              : 'text-slate-600 bg-slate-50 hover:text-brand-teal'
          }`}
        >
          ولي الأمر
        </button>
        <button
          onClick={() => setActiveTab('appsScript')}
          className={`flex-1 text-center py-2 px-3 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'appsScript' 
              ? 'bg-brand-teal text-white' 
              : 'text-slate-600 bg-slate-50 hover:text-brand-teal'
          }`}
        >
          <Code className="w-3.5 h-3.5" /> Apps Script
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        {/* Spreadsheet Sync Controller Panel */}
        {!loggedInStudent && activeTab !== 'parentPortal' && !needsAuth && loggedInTeacher?.role === 'Admin' && (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 shrink-0 border border-blue-100">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h2 className="text-xs font-bold text-slate-800">قاعدة بيانات Google Sheets المتصلة</h2>
                {spreadsheetTitle ? (
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-emerald-700 font-bold text-[11px] bg-green-50 px-2 py-0.5 rounded-md border border-green-100">
                      مستند نشط: {spreadsheetTitle}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono select-all">
                      ID: {spreadsheetId}
                    </span>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-1">يرجى تحديد أو إنشاء جدول بيانات جديد في حسابك لحفظ الطلاب وسحب السجلات.</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 border border-transparent">
                <input
                  type="text"
                  placeholder="رقم المستند (Spreadsheet ID)"
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value.trim())}
                  className="bg-transparent border-0 outline-none px-3 py-1.5 text-xs font-mono w-48 md:w-64 text-slate-700"
                />
                <button
                  onClick={loadSpreadsheetDetails}
                  disabled={isConnecting || !spreadsheetId}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-xs px-4 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm"
                >
                  {isConnecting ? 'جاري الاتصال...' : 'ربط المستند'}
                </button>
              </div>

              <span className="text-xs text-slate-400 font-medium px-1">أو</span>

              <button
                onClick={handleCreateNewSpreadsheet}
                disabled={isConnecting}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> إنشاء قاعدة بيانات جديدة مسبقة الإعداد
              </button>
            </div>
          </div>

          {spreadsheetError && (
            <div className="mt-3 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-[11px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <p className="font-semibold">{spreadsheetError}</p>
            </div>
          )}
        </section>
        )}

        {activeTab === 'gradesEntry' && ((needsAuth || loggedInTeacher?.role !== 'Admin') ? renderTeacherLoginRequired() : (
          <div className="space-y-6 animate-fade-in text-right" dir="rtl">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <span className="text-xl">📝</span>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">إدخال درجات الطلاب</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    سجل درجات الطلاب في المواد المختلفة مباشرة في ورقة العمل السحابية "الدرجات".
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Form Column */}
              <div className="lg:col-span-2">
                <form onSubmit={handleSaveGrade} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                    <span>📋</span> نموذج إدخال الدرجة
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Student Code & Name */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-600">كود الطالب <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        placeholder="أدخل كود الطالب (مثال: STU123)"
                        value={gradesStudentCode}
                        onChange={(e) => setGradesStudentCode(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl transition-all outline-none text-xs text-slate-800 font-mono"
                      />
                      <p className="text-[10px] text-slate-400">سيتم البحث عن الطالب تلقائياً بمجرد إدخال الكود الصحيح.</p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-600">اسم الطالب</label>
                      <input
                        type="text"
                        placeholder="سيظهر اسم الطالب تلقائياً هنا..."
                        value={gradesStudentName}
                        readOnly
                        className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl outline-none text-xs text-slate-600 font-bold"
                      />
                      {gradesStudentCode && !gradesStudentName && (
                        <p className="text-[10px] text-rose-500 font-bold">⚠️ الكود المدخل غير مطابق لأي طالب مسجل في النظام.</p>
                      )}
                      {gradesStudentName && (
                        <p className="text-[10px] text-emerald-600 font-bold">✅ تم التحقق: {gradesStudentName}</p>
                      )}
                    </div>

                    {/* Subject & Exam Name */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-600">المادة الدراسية <span className="text-red-500">*</span></label>
                      <select
                        value={gradesSubject}
                        onChange={(e) => setGradesSubject(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl transition-all outline-none text-xs text-slate-800 font-bold cursor-pointer"
                      >
                        <option value="عربي ورقة أولى">عربي ورقة أولى</option>
                        <option value="عربي ورقة ثانية">عربي ورقة ثانية</option>
                        <option value="فقه">فقه</option>
                        <option value="تفسير وحديث">تفسير وحديث</option>
                        <option value="توحيد وسيرة">توحيد وسيرة</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-600">اسم الاختبار / التقويم <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        placeholder="أدخل اسم الاختبار (مثال: اختبار الشهر الأول، الامتحان النهائي)"
                        value={gradesExamName}
                        onChange={(e) => setGradesExamName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl transition-all outline-none text-xs text-slate-800"
                      />
                    </div>

                    {/* Score & Max Score */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-600">درجة الطالب <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        placeholder="مثال: 18.5"
                        min="0"
                        step="any"
                        value={gradesScore}
                        onChange={(e) => setGradesScore(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl transition-all outline-none text-xs text-slate-800"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-600">الدرجة النهائية المقررة <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        placeholder="مثال: 20"
                        min="1"
                        step="any"
                        value={gradesMaxScore}
                        onChange={(e) => setGradesMaxScore(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl transition-all outline-none text-xs text-slate-800"
                      />
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-600">تاريخ الاختبار <span className="text-red-500">*</span></label>
                      <input
                        type="date"
                        value={gradesExamDate}
                        onChange={(e) => setGradesExamDate(e.target.value || '')}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl transition-all outline-none text-xs text-slate-800 text-left"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-5 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setGradesStudentCode('');
                        setGradesStudentName('');
                        setGradesExamName('');
                        setGradesScore('');
                        setGradesMaxScore('');
                      }}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-bold transition-all duration-150 cursor-pointer"
                    >
                      مسح المدخلات
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingGrade || !gradesStudentName}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSavingGrade ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>جاري حفظ الدرجة...</span>
                        </>
                      ) : (
                        <span>حفظ الدرجة في ورقة العمل ➔</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Student Directory Panel */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[520px]">
                  <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/50">
                    <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <span>👥</span> دليل الطلاب السريع
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                      اختر أي طالب من القائمة بالضغط عليه لملء بيانات الكود والاسم فوراً في نموذج الدرجات.
                    </p>
                  </div>

                  {/* Student Directory Search */}
                  <div className="p-3 border-b border-slate-100 bg-slate-50/20">
                    <div className="relative flex items-center">
                      <Search className="w-3.5 h-3.5 absolute right-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="ابحث باسم الطالب أو الكود..."
                        value={dashboardSearchQuery}
                        onChange={(e) => setDashboardSearchQuery(e.target.value)}
                        className="w-full pr-9 pl-3 py-2 bg-slate-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-lg transition-all outline-none text-xs text-slate-700 placeholder-slate-400"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1">
                    {isLoadingStudents ? (
                      <div className="p-12 text-center text-slate-400">
                        <div className="w-5 h-5 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-[11px]">جاري تحميل بيانات الطلاب...</p>
                      </div>
                    ) : filteredDashboardStudents.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">
                        <p className="text-xs font-bold">لم يتم العثور على أي نتائج مطابقة</p>
                      </div>
                    ) : (
                      filteredDashboardStudents.map((std) => {
                        const isSelected = gradesStudentCode === std.code;
                        return (
                          <div
                            key={std.code}
                            onClick={() => {
                              setGradesStudentCode(std.code);
                              setGradesStudentName(std.name);
                            }}
                            className={`p-3 text-right hover:bg-brand-teal/5 transition-all cursor-pointer flex justify-between items-center ${
                              isSelected ? 'bg-brand-teal/5 border-r-4 border-brand-teal font-black text-brand-teal' : ''
                            }`}
                          >
                            <div className="text-right">
                              <h4 className="text-xs font-bold text-slate-800">{std.name}</h4>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">#{std.code}</p>
                            </div>
                            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/50">
                              {std.grade}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {activeTab === 'teacherDashboard' && ((needsAuth || loggedInTeacher?.role !== 'Admin') ? renderTeacherLoginRequired() : (
          <div className="space-y-6 animate-fade-in text-right" dir="rtl">
            
            {/* 1. Date Selector Card */}
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-md">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-brand-teal/10 text-brand-teal rounded-2xl">
                    <span className="text-xl">📊</span>
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-brand-teal">لوحة تحكم المعلم وإحصائيات الحضور</h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      اختر التاريخ لعرض إحصائيات الحضور والغياب التفصيلية لليوم المحدد.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/50 rounded-2xl px-4 py-2 w-full sm:w-auto justify-between sm:justify-start">
                  <span className="text-xs font-bold text-slate-600">تاريخ الإحصائيات:</span>
                  <input
                    type="date"
                    value={dashboardDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        const today = new Date();
                        const yyyy = today.getFullYear();
                        const mm = String(today.getMonth() + 1).padStart(2, '0');
                        const dd = String(today.getDate()).padStart(2, '0');
                        setDashboardDate(`${yyyy}-${mm}-${dd}`);
                      } else {
                        setDashboardDate(val);
                      }
                    }}
                    className="bg-transparent border-none text-xs font-bold text-slate-850 focus:outline-none cursor-pointer focus:ring-2 focus:ring-brand-teal/30 rounded px-1 text-left"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {/* 2. Summary Cards at the Top */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Students */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-teal/10 transition-all duration-300 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-teal/10 text-brand-teal flex items-center justify-center shrink-0 border border-brand-teal/20">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">إجمالي الطلاب</p>
                  <p className="text-xl font-bold text-slate-800 mt-0.5">{students.length} طالب</p>
                </div>
              </div>

              {/* Card 2: Present Count */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-500/10 transition-all duration-300 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">حضور اليوم</p>
                  <p className="text-xl font-bold text-emerald-600 mt-0.5">
                    {(() => {
                      const logsForDate = attendanceLogs.filter(log => log.date === dashboardDate);
                      const present = logsForDate.filter(log => log.status === 'حاضر').length;
                      return `${present} طالب`;
                    })()}
                  </p>
                </div>
              </div>

              {/* Card 3: Absent Count */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-rose-500/10 transition-all duration-300 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">غياب اليوم</p>
                  <p className="text-xl font-bold text-rose-600 mt-0.5">
                    {(() => {
                      const logsForDate = attendanceLogs.filter(log => log.date === dashboardDate);
                      const absent = logsForDate.filter(log => log.status === 'غائب').length;
                      return `${absent} طالب`;
                    })()}
                  </p>
                </div>
              </div>

              {/* Card 4: Attendance Percentage */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-gold/10 transition-all duration-300 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-gold/10 text-brand-gold flex items-center justify-center shrink-0 border border-brand-gold/20">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">نسبة حضور اليوم</p>
                  <p className="text-xl font-bold text-brand-teal mt-0.5">
                    {(() => {
                      const logsForDate = attendanceLogs.filter(log => log.date === dashboardDate);
                      const present = logsForDate.filter(log => log.status === 'حاضر').length;
                      const absent = logsForDate.filter(log => log.status === 'غائب').length;
                      const total = present + absent;
                      return total > 0 ? `${Math.round((present / total) * 100)}%` : '0%';
                    })()}
                  </p>
                </div>
              </div>
            </section>

            {/* 3. Search and Layout Grid */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
              <div className="relative w-full md:flex-1 flex items-center">
                <Search className="w-4 h-4 absolute right-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث بكود الطالب أو بالاسم بالكامل..."
                  value={dashboardSearchQuery}
                  onChange={(e) => setDashboardSearchQuery(e.target.value)}
                  className="w-full pr-12 pl-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl transition-all outline-none text-xs text-slate-800 placeholder-slate-400"
                />
              </div>
              <div className="text-xs text-slate-500 font-medium">
                تم العثور على {filteredDashboardStudents.length} نتائج بحث
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Right/Middle Column: Students Attendance list */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>📋</span> معلومات حضور الطلاب
                    </h3>
                  </div>

                  {isLoadingStudents ? (
                    <div className="p-12 text-center text-slate-400">
                      <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
                      <p className="text-xs">جاري تحميل بيانات الطلاب...</p>
                    </div>
                  ) : filteredDashboardStudents.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                      <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold">لم يتم العثور على أي نتائج مطابقة</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold">
                            <th className="py-3 px-4 text-right">كود الطالب</th>
                            <th className="py-3 px-3 text-right">الاسم بالكامل</th>
                            <th className="py-3 px-3 text-right">الصف الدراسي</th>
                            <th className="py-3 px-3 text-center">نسبة الحضور العامة</th>
                            <th className="py-3 px-3 text-center">حالة اليوم المحدد</th>
                            <th className="py-3 px-4 text-center">سجل الحضور</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredDashboardStudents.map((student) => {
                            const studentLogs = attendanceLogs.filter(l => l.studentCode === student.code);
                            
                            // Log on selected date
                            const selectedDateLog = studentLogs.find(l => l.date === dashboardDate);
                            const loggedStatus = selectedDateLog?.status;

                            const isSelectedHistory = selectedHistoryStudentCode === student.code;

                            return (
                              <tr 
                                key={student.code} 
                                className={`text-xs text-slate-700 hover:bg-slate-50/65 transition-colors ${
                                  isSelectedHistory ? 'bg-blue-50/40' : ''
                                }`}
                              >
                                <td className="py-3 px-4 font-mono font-bold text-slate-500">#{student.code}</td>
                                <td className="py-3 px-3">
                                  <div className="font-bold text-slate-800">{student.name}</div>
                                </td>
                                <td className="py-3 px-3">
                                  <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/50">
                                    {student.grade}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className={`font-bold px-2 py-0.5 rounded-md border text-[11px] ${
                                    student.attendancePercentage >= 90 
                                      ? 'bg-green-50 text-green-600 border-green-100' 
                                      : student.attendancePercentage >= 75 
                                      ? 'bg-amber-50 text-amber-600 border-amber-100' 
                                      : 'bg-rose-50 text-rose-600 border-rose-100'
                                  }`}>
                                    {student.attendancePercentage}%
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  {loggedStatus === 'حاضر' ? (
                                    <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-bold text-[10px]">
                                      حاضر ✅
                                    </span>
                                  ) : loggedStatus === 'غائب' ? (
                                    <span className="text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full font-bold text-[10px]">
                                      غائب ❌
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full font-bold text-[10px]">
                                      غير مسجل
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <button
                                    onClick={() => setSelectedHistoryStudentCode(isSelectedHistory ? null : student.code)}
                                    className="px-2.5 py-1 text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 rounded-lg transition-all cursor-pointer"
                                  >
                                    {isSelectedHistory ? 'إغلاق السجل' : 'عرض السجل 📅'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Left Column: Focused Attendance History */}
              <div className="lg:col-span-1">
                <div className="sticky top-6 space-y-4">
                  <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <span>📅</span> تفاصيل سجل الحضور والغياب
                  </h3>

                  {(() => {
                    if (!selectedHistoryStudentCode) {
                      return (
                        <div className="bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm p-8 text-center text-slate-400 flex flex-col items-center justify-center min-h-[300px]">
                          <span className="text-3xl mb-3">📅</span>
                          <p className="text-xs font-bold">لم يتم اختيار أي طالب بعد.</p>
                          <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                            اضغط على زر "عرض السجل" بجانب أي طالب لعرض جدول تواريخ حضور وغياب الطالب الكامل هنا.
                          </p>
                        </div>
                      );
                    }

                    const targetStudent = students.find(s => s.code === selectedHistoryStudentCode);
                    if (!targetStudent) return null;

                    const studentLogs = attendanceLogs.filter(l => l.studentCode === targetStudent.code);
                    const sortedLogs = [...studentLogs].sort((a, b) => b.date.localeCompare(a.date));

                    return (
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                          <div>
                            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-md">
                              كود: #{targetStudent.code}
                            </span>
                            <h4 className="text-xs font-bold text-slate-900 mt-1">{targetStudent.name}</h4>
                          </div>
                          <button
                            onClick={() => setSelectedHistoryStudentCode(null)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="p-4 space-y-4">
                          <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                            <div className="bg-emerald-50 text-emerald-800 p-2 rounded-xl border border-emerald-100/30">
                              <span className="block font-bold">حضر</span>
                              <span className="block font-mono font-bold text-sm mt-0.5">
                                {sortedLogs.filter(l => l.status === 'حاضر').length || targetStudent.attendance}
                              </span>
                            </div>
                            <div className="bg-rose-50 text-rose-800 p-2 rounded-xl border border-rose-100/30">
                              <span className="block font-bold">غاب</span>
                              <span className="block font-mono font-bold text-sm mt-0.5">
                                {sortedLogs.filter(l => l.status === 'غائب').length || targetStudent.absence}
                              </span>
                            </div>
                            <div className="bg-purple-50 text-purple-800 p-2 rounded-xl border border-purple-100/30">
                              <span className="block font-bold">النسبة</span>
                              <span className="block font-mono font-bold text-sm mt-0.5">
                                {targetStudent.attendancePercentage}%
                              </span>
                            </div>
                          </div>

                          <div className="border-t border-slate-100 pt-3">
                            <h5 className="text-[10px] font-bold text-slate-400 mb-2 uppercase">تواريخ الحضور والغياب المسجلة ({sortedLogs.length})</h5>
                            
                            {sortedLogs.length === 0 ? (
                              <p className="text-[10px] text-slate-400 italic py-4 text-center">لا توجد سجلات حضور مسجلة لهذا الطالب في المستند بعد.</p>
                            ) : (
                              <div className="max-h-60 overflow-y-auto space-y-2 pr-1" style={{ direction: 'ltr' }}>
                                {sortedLogs.map((log, index) => (
                                  <div key={index} className="flex justify-between items-center p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px]" style={{ direction: 'rtl' }}>
                                    <span className="font-mono font-medium text-slate-600">{log.date}</span>
                                    {log.status === 'حاضر' ? (
                                      <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 text-[9px]">
                                        حاضر ✅
                                      </span>
                                    ) : (
                                      <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 text-[9px]">
                                        غائب ❌
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

          </div>
        ))}

        {activeTab === 'dashboard' && ((needsAuth || loggedInTeacher?.role !== 'Admin') ? renderTeacherLoginRequired() : (
          <>
            {/* Dashboard Stats Panel */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Card 1: Total Students */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-teal/10 transition-all duration-300 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-teal/10 text-brand-teal flex items-center justify-center shrink-0 border border-brand-teal/20">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">إجمالي الطلاب</p>
                  <p className="text-xl font-bold text-slate-800 mt-0.5">{totalStudents} طالب</p>
                </div>
              </div>

              {/* Card 2: Average Attendance */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-500/10 transition-all duration-300 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">متوسط الحضور</p>
                  <p className="text-xl font-bold text-emerald-600 mt-0.5">{avgAttendance}%</p>
                </div>
              </div>

              {/* Card 3: Active Grades */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-gold/10 transition-all duration-300 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-gold/10 text-brand-gold flex items-center justify-center shrink-0 border border-brand-gold/20">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">الصفوف النشطة</p>
                  <p className="text-xl font-bold text-slate-800 mt-0.5">{gradesCount} صفوف</p>
                </div>
              </div>

              {/* Card 4: Top Student */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-teal/10 transition-all duration-300 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-teal/10 text-brand-gold flex items-center justify-center shrink-0 border border-brand-teal/20">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">المتصدر (امتحان 1)</p>
                  <p className="text-xs font-black text-brand-teal mt-1 truncate" title={topStudent?.name}>
                    {topStudent ? topStudent.name : 'لا يوجد'}
                  </p>
                </div>
              </div>
            </section>

            {/* Quick Actions Search & Filter Toolbar */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center">
              <div className="relative w-full md:flex-1 flex items-center">
                <Search className="w-4 h-4 absolute right-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث بكود الطالب أو بالاسم بالكامل..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-12 pl-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl transition-all outline-none text-xs text-slate-800 placeholder-slate-400"
                />
              </div>

              <div className="w-full md:w-64">
                <select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl text-xs outline-none text-slate-700 cursor-pointer"
                >
                  <option value="">جميع الصفوف الدراسية</option>
                  <option value="الصف الأول الإعدادي">الصف الأول الإعدادي</option>
                  <option value="الصف الثاني الإعدادي">الصف الثاني الإعدادي</option>
                  <option value="الصف الثالث الإعدادي">الصف الثالث الإعدادي</option>
                  <option value="الصف الأول الثانوي الأزهري">الصف الأول الثانوي الأزهري</option>
                  <option value="الصف الثاني الثانوي الأزهري">الصف الثاني الثانوي الأزهري</option>
                </select>
              </div>

              <button
                onClick={openAddForm}
                disabled={!spreadsheetId}
                className="w-full md:w-auto px-4 py-2 bg-blue-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> إضافة طالب جديد
              </button>
            </div>

            {/* Core Workspace Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Focused Student Detail Card (Modern Card - Core Requirement) */}
              <div className="lg:col-span-1">
                <div className="sticky top-6">
                  <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <span>✨</span> كارت معلومات الطالب المختار
                  </h3>

                  {selectedStudent ? (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
                      {/* Card Header Profile Banner */}
                      <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                        <div className="flex gap-4">
                          <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center text-2xl border border-slate-200 shrink-0 select-none">
                            👨‍🎓
                          </div>
                          <div className="space-y-1">
                            <div className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-md">
                              كود الطالب: #{selectedStudent.code}
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 leading-tight">{selectedStudent.name}</h4>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                              <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                              {selectedStudent.grade}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Card Info Details */}
                      <div className="p-5 space-y-4">
                        {/* Attendance visual bar */}
                        <div>
                          <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold mb-1">
                            <span>نسبة حضور الطالب</span>
                            <span className={`font-bold text-xs ${
                              selectedStudent.attendancePercentage >= 90 ? 'text-green-600' : selectedStudent.attendancePercentage >= 75 ? 'text-amber-500' : 'text-rose-500'
                            }`}>{selectedStudent.attendancePercentage}%</span>
                          </div>
                          
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                selectedStudent.attendancePercentage >= 90 ? 'bg-green-500' : selectedStudent.attendancePercentage >= 75 ? 'bg-amber-400' : 'bg-rose-500'
                              }`}
                              style={{ width: `${selectedStudent.attendancePercentage}%` }}
                            ></div>
                          </div>

                          <div className="flex justify-between items-center mt-2 text-[10px] font-medium">
                            <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded-md border border-green-100/50">
                              حضر: {selectedStudent.attendance} أيام
                            </span>
                            <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100/50">
                              غاب: {selectedStudent.absence} أيام
                            </span>
                          </div>
                        </div>

                        {/* Exam Scores Grid */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                            <p className="text-[9px] text-slate-400 font-bold mb-0.5">الامتحان الشهري 1</p>
                            <p className="text-xs font-bold text-slate-700 font-mono">{selectedStudent.exam1 || '-'}</p>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                            <p className="text-[9px] text-slate-400 font-bold mb-0.5">الامتحان الشهري 2</p>
                            <p className="text-xs font-bold text-slate-700 font-mono">{selectedStudent.exam2 || '-'}</p>
                          </div>
                        </div>

                        {/* Attendance summary counters */}
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div className="p-2 border border-slate-100 rounded-xl">
                            <p className="text-[9px] text-slate-400 mb-0.5">أيام الحضور</p>
                            <p className="text-xs font-bold text-slate-700 font-mono">{selectedStudent.attendance}</p>
                          </div>
                          <div className="p-2 border border-slate-100 rounded-xl">
                            <p className="text-[9px] text-slate-400 mb-0.5">أيام الغياب</p>
                            <p className="text-xs font-bold text-red-500 font-mono">{selectedStudent.absence}</p>
                          </div>
                          <div className="p-2 border border-slate-100 rounded-xl">
                            <p className="text-[9px] text-slate-400 mb-0.5">الحالة</p>
                            <p className={`text-[10px] font-bold ${selectedStudent.attendancePercentage >= 75 ? 'text-green-600' : 'text-red-500'}`}>
                              {selectedStudent.attendancePercentage >= 75 ? 'منتظم' : 'ضعيف'}
                            </p>
                          </div>
                        </div>

                        {/* Phone Details */}
                        {selectedStudent.phone && (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <p className="text-[9px] text-slate-400 mb-0.5">رقم الهاتف</p>
                            <p className="font-mono font-bold text-xs text-slate-700 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" /> {selectedStudent.phone}
                            </p>
                          </div>
                        )}

                        {/* Academic results list */}
                        <div className="space-y-3">
                          <h5 className="font-bold text-slate-800 text-xs border-r-4 border-blue-500 pr-2">النتائج الأكاديمية</h5>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center text-[9px] text-blue-600 font-bold">01</div>
                                <span className="font-medium text-xs text-slate-700">اختبار الشهر الأول</span>
                              </div>
                              <span className="text-xs font-bold text-slate-800 font-mono">{selectedStudent.exam1 || '-'} <span className="text-[9px] text-slate-400 font-normal">/ 100</span></span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center text-[9px] text-blue-600 font-bold">02</div>
                                <span className="font-medium text-xs text-slate-700">اختبار الشهر الثاني</span>
                              </div>
                              <span className="text-xs font-bold text-slate-800 font-mono">{selectedStudent.exam2 || '-'} <span className="text-[9px] text-slate-400 font-normal">/ 100</span></span>
                            </div>
                            
                            {/* Average calculation */}
                            {(() => {
                              const score1 = parseFloat(selectedStudent.exam1 as string) || 0;
                              const score2 = parseFloat(selectedStudent.exam2 as string) || 0;
                              const hasScores = selectedStudent.exam1 || selectedStudent.exam2;
                              const avgScore = hasScores ? ((score1 + score2) / (selectedStudent.exam1 && selectedStudent.exam2 ? 2 : 1)).toFixed(1) : '-';
                              
                              return hasScores ? (
                                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] text-blue-700 font-bold">المعدل التراكمي الجزئي</span>
                                    <span className="text-sm font-black text-blue-800 font-mono">{avgScore}</span>
                                  </div>
                                  <div className="w-full h-1 bg-blue-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600" style={{ width: `${Math.min(100, parseFloat(avgScore) || 0)}%` }}></div>
                                  </div>
                                </div>
                              ) : null;
                            })()}
                          </div>
                        </div>

                        {/* Notes Details */}
                        <div className="p-3 border border-slate-100 rounded-xl bg-amber-50/20">
                          <p className="text-[9px] text-slate-400 font-bold mb-1">ملاحظات إضافية</p>
                          <p className="text-xs text-slate-600 leading-relaxed italic">
                            {selectedStudent.notes || 'لا توجد ملاحظات مسجلة لطالب حالياً.'}
                          </p>
                        </div>

                        {/* Actions for this student */}
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => openEditForm(selectedStudent)}
                            className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-blue-700 transition-all cursor-pointer text-center"
                          >
                            تعديل البيانات
                          </button>
                          <button
                            onClick={() => handleDeleteConfirm(selectedStudent)}
                            className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-red-50 hover:text-rose-600 transition-all cursor-pointer text-center"
                          >
                            حذف السجل
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm p-8 text-center text-slate-400 flex flex-col items-center justify-center min-h-[350px]">
                      <GraduationCap className="w-10 h-10 text-slate-300 mb-3" />
                      <p className="text-xs font-bold">لم يتم اختيار أي طالب حالياً.</p>
                      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">يرجى الضغط على أي صف في الجدول لعرض كارت معلومات الطالب التفصيلي، أو البحث بكود الطالب.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right/Middle Column: Students Table List (Responsive and Complete) */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>📋</span> قائمة الطلاب المقيدين
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                        {filteredStudents.length} طلاب
                      </span>
                    </h3>
                  </div>

                  {isLoadingStudents ? (
                    <div className="p-12 text-center text-slate-400">
                      <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
                      <p className="text-xs">جاري جلب أحدث السجلات والتقييمات من Google Sheets...</p>
                    </div>
                  ) : filteredStudents.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                      <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold">لم يتم العثور على أي نتائج مطابقة</p>
                      <p className="text-[10px] mt-1 text-slate-400 leading-relaxed">
                        {!spreadsheetId ? 'يرجى ربط أو إنشاء مستند Google Sheets أولاً لبدء سحب الطلاب.' : 'يرجى مراجعة تصفية البحث أو الضغط على "إضافة طالب جديد" لتسجيل سطر جديد.'}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold">
                            <th className="py-3 px-4 text-right">كود الطالب</th>
                            <th className="py-3 px-3 text-right">الاسم بالكامل</th>
                            <th className="py-3 px-3 text-right">المصروفات</th>
                            <th className="py-3 px-3 text-right">الصف الدراسي</th>
                            <th className="py-3 px-3 text-center">الحضور / نسبة الحضور</th>
                            <th className="py-3 px-3 text-center">الامتحان 1</th>
                            <th className="py-3 px-4 text-center">الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredStudents.map((student) => {
                            const isFocused = selectedStudent?.code === student.code;
                            let pctBadgeColor = 'text-rose-600 bg-rose-50 border-rose-100';
                            if (student.attendancePercentage >= 90) {
                              pctBadgeColor = 'text-green-600 bg-green-50 border-green-100';
                            } else if (student.attendancePercentage >= 75) {
                              pctBadgeColor = 'text-amber-600 bg-amber-50 border-amber-100';
                            }

                            return (
                              <tr 
                                key={student.code}
                                onClick={() => setSelectedStudent(student)}
                                className={`group hover:bg-slate-50/70 transition-all cursor-pointer text-xs ${
                                  isFocused ? 'bg-blue-50/70 font-semibold' : ''
                                }`}
                              >
                                <td className="py-3 px-4 font-mono font-bold text-blue-600">
                                  {student.code}
                                </td>
                                <td className="py-3 px-3 font-semibold text-slate-800">
                                  {student.name}
                                </td>
                                <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                                  {(() => {
                                    const studentPayments = paymentRecords.filter(r => r.studentCode === student.code);
                                    const paidAmt = studentPayments.reduce((sum, r) => sum + r.amountPaid, 0);
                                    const latestPayment = studentPayments.length > 0 ? studentPayments[studentPayments.length - 1] : null;
                                    const totalFeesAmt = latestPayment ? latestPayment.totalFees : 1000;
                                    const remainingAmt = totalFeesAmt - paidAmt;

                                    return (
                                      <div className="flex flex-col gap-1 text-[11px] min-w-[130px] bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                                        <div className="flex justify-between gap-2 text-slate-500">
                                          <span>الإجمالي:</span>
                                          <span className="font-bold font-mono text-slate-700">{totalFeesAmt} ج.م</span>
                                        </div>
                                        <div className="flex justify-between gap-2 text-emerald-600">
                                          <span>المدفوع:</span>
                                          <span className="font-bold font-mono">{paidAmt} ج.م</span>
                                        </div>
                                        <div className="flex justify-between gap-2 text-rose-600">
                                          <span>المتبقي:</span>
                                          <span className="font-bold font-mono">{remainingAmt} ج.م</span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openCollectPayment(student);
                                          }}
                                          className="mt-1 w-full py-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg shadow-sm transition-all text-center cursor-pointer flex items-center justify-center gap-1"
                                        >
                                          <span>💸 تحصيل</span>
                                        </button>
                                      </div>
                                    );
                                  })()}
                                </td>
                                <td className="py-3 px-3 text-slate-500">
                                  {student.grade}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <div className="inline-flex flex-col items-center">
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      {student.attendance} حضور • {student.absence} غياب
                                    </span>
                                    <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border mt-0.5 ${pctBadgeColor}`}>
                                      {student.attendancePercentage}%
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center font-mono font-bold text-green-600">
                                  {student.exam1 || '-'}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <div className="flex items-center justify-center gap-1.5 opacity-80 group-hover:opacity-100 transition-all">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openEditForm(student);
                                      }}
                                      title="تعديل السجل"
                                      className="p-1 rounded-lg border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-white hover:border-slate-300 transition-all cursor-pointer"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteConfirm(student);
                                      }}
                                      title="حذف الطالب"
                                      className="p-1 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-white hover:border-slate-300 transition-all cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </>
        ))}

        {activeTab === 'attendance' && ((needsAuth || loggedInTeacher?.role !== 'Admin') ? renderTeacherLoginRequired() : (
          <div className="space-y-6 animate-fade-in text-right" dir="rtl">
            {/* Date Picker Card at the Top */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <span className="text-xl">📅</span>
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-800">تاريخ تسجيل الحضور والغياب</h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      حدد تاريخ اليوم لتسجيل أو تعديل حضور الطلاب. يتم الحفظ تلقائياً في ورقة <strong className="text-slate-600 font-bold">سجل الحضور</strong>.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 w-full sm:w-auto justify-between sm:justify-start">
                  <span className="text-xs font-bold text-slate-600">التاريخ المحدد:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        const today = new Date();
                        const yyyy = today.getFullYear();
                        const mm = String(today.getMonth() + 1).padStart(2, '0');
                        const dd = String(today.getDate()).padStart(2, '0');
                        setSelectedDate(`${yyyy}-${mm}-${dd}`);
                      } else {
                        setSelectedDate(val);
                      }
                    }}
                    className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-none cursor-pointer focus:ring-2 focus:ring-blue-500 rounded px-1 text-left"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {/* Header / Info Panel */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span>📝</span> تسجيل الحضور اليومي للمجموعات
                </h2>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  سجل حضور وغياب الطلاب بضغطة زر واحدة لتاريخ <strong className="text-blue-600 font-mono">{selectedDate}</strong>. سيتم تحديث نسب الحضور تراكمياً وحفظ سجل مفصل لكل تاريخ.
                </p>
              </div>

              {/* Attendance Quick Search */}
              <div className="relative w-full md:w-72">
                <input
                  type="text"
                  placeholder="ابحث عن طالب بالاسم أو الكود..."
                  value={attendanceSearch}
                  onChange={(e) => setAttendanceSearch(e.target.value)}
                  className="w-full px-3 py-2 pr-9 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 transition-all text-slate-700"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                {attendanceSearch && (
                  <button
                    onClick={() => setAttendanceSearch('')}
                    className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    مسح
                  </button>
                )}
              </div>
            </div>

            {/* Attendance Main Body */}
            {students.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm p-12 text-center text-slate-400">
                <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-sm font-bold text-slate-700">لا يوجد طلاب مسجلين حالياً</h3>
                <p className="text-xs mt-1">يرجى ربط مستند Google Sheets يحتوي على بيانات، أو إضافة طلاب جدد من لوحة التحكم الرئيسية.</p>
              </div>
            ) : (
              (() => {
                // Group students by Grade
                const studentsByGrade: Record<string, Student[]> = {};
                
                // First filter by search
                const query = attendanceSearch.trim().toLowerCase();
                const matchedStudents = students.filter(s => 
                  !query || 
                  s.name.toLowerCase().includes(query) || 
                  s.code.toLowerCase().includes(query)
                );

                if (matchedStudents.length === 0) {
                  return (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center animate-fade-in">
                      <p className="text-slate-500 text-xs font-semibold">لم يتم العثور على أي طالب يطابق "{attendanceSearch}"</p>
                      <button 
                        onClick={() => setAttendanceSearch('')}
                        className="mt-3 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-[11px] font-bold rounded-lg transition-all cursor-pointer"
                      >
                        إلغاء البحث والعودة
                      </button>
                    </div>
                  );
                }

                matchedStudents.forEach(student => {
                  const grade = student.grade || 'غير محدد';
                  if (!studentsByGrade[grade]) {
                    studentsByGrade[grade] = [];
                  }
                  studentsByGrade[grade].push(student);
                });

                // Grade display ordering
                const standardGradesOrder = [
                  'الصف الأول الإعدادي',
                  'الصف الثاني الإعدادي',
                  'الصف الثالث الإعدادي',
                  'الصف الأول الثانوي الأزهري',
                  'الصف الثاني الثانوي الأزهري'
                ];
                const allGradesInSheet = Object.keys(studentsByGrade);
                const otherGradesInSheet = allGradesInSheet.filter(g => !standardGradesOrder.includes(g));
                const gradesToRender = [...standardGradesOrder.filter(g => allGradesInSheet.includes(g)), ...otherGradesInSheet];

                return (
                  <div className="space-y-6">
                    {gradesToRender.map(grade => {
                      const gradeStudents = studentsByGrade[grade];
                      return (
                        <div key={grade} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
                          {/* Grade Header */}
                          <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex justify-between items-center">
                            <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                              {grade}
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-full">
                                {gradeStudents.length} {gradeStudents.length > 10 ? 'طالب وطالبة' : 'طلاب'}
                              </span>
                            </h3>
                          </div>

                          {/* Grade Students Attendance Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-right border-collapse">
                              <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-wider select-none">
                                  <th className="py-3 px-4 w-28 text-right">كود الطالب</th>
                                  <th className="py-3 px-4 text-right">اسم الطالب</th>
                                  <th className="py-3 px-4 w-24 text-center">أيام الحضور</th>
                                  <th className="py-3 px-4 w-24 text-center">أيام الغياب</th>
                                  <th className="py-3 px-4 w-24 text-center">نسبة الحضور</th>
                                  <th className="py-3 px-4 w-60 text-center">تسجيل الحضور لليوم</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-xs">
                                {gradeStudents.map(student => {
                                  const pct = student.attendancePercentage;
                                  let pctColor = 'text-slate-700 bg-slate-50';
                                  if (pct >= 90) pctColor = 'text-emerald-700 bg-emerald-50 border-emerald-100';
                                  else if (pct >= 75) pctColor = 'text-amber-700 bg-amber-50 border-amber-100';
                                  else pctColor = 'text-rose-700 bg-rose-50 border-rose-100';

                                  const isSavingPresent = savingStudentCodes[student.code] === 'present';
                                  const isSavingAbsent = savingStudentCodes[student.code] === 'absent';
                                  const isSavingAny = !!savingStudentCodes[student.code];

                                  const studentLog = attendanceLogs.find(
                                    log => log.date === selectedDate && log.studentCode === student.code
                                  );
                                  const loggedStatus = studentLog?.status;

                                  let presentBtnStyle = '';
                                  if (loggedStatus === 'حاضر') {
                                    presentBtnStyle = 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm border-emerald-600';
                                  } else if (loggedStatus === 'غائب') {
                                    presentBtnStyle = 'bg-slate-50 text-slate-400 hover:bg-slate-100/80 border-slate-200';
                                  } else {
                                    presentBtnStyle = 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/50';
                                  }

                                  let absentBtnStyle = '';
                                  if (loggedStatus === 'غائب') {
                                    absentBtnStyle = 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm border-rose-600';
                                  } else if (loggedStatus === 'حاضر') {
                                    absentBtnStyle = 'bg-slate-50 text-slate-400 hover:bg-slate-100/80 border-slate-200';
                                  } else {
                                    absentBtnStyle = 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/50';
                                  }

                                  return (
                                    <tr key={student.code} className="hover:bg-slate-50/50 transition-colors">
                                      {/* Code */}
                                      <td className="py-2.5 px-4 font-mono font-bold text-blue-600">
                                        {student.code}
                                      </td>
                                      
                                      {/* Name */}
                                      <td className="py-2.5 px-4 font-bold text-slate-800">
                                        {student.name}
                                      </td>

                                      {/* Attendance days count */}
                                      <td className="py-2.5 px-4 text-center font-semibold text-emerald-600">
                                        {student.attendance} أيام
                                      </td>

                                      {/* Absence days count */}
                                      <td className="py-2.5 px-4 text-center font-semibold text-rose-600">
                                        {student.absence} غياب
                                      </td>

                                      {/* Attendance Percentage */}
                                      <td className="py-2.5 px-4 text-center">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${pctColor}`}>
                                          {pct}%
                                        </span>
                                      </td>

                                      {/* Attendance Quick Buttons */}
                                      <td className="py-2.5 px-4">
                                        <div className="flex gap-2 justify-center">
                                          {/* Present Button */}
                                          <button
                                            onClick={() => handleMarkAttendance(student, true)}
                                            disabled={isSavingAny}
                                            className={`flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${presentBtnStyle} disabled:opacity-50 disabled:cursor-not-allowed`}
                                          >
                                            {isSavingPresent ? (
                                              <>
                                                <div className="w-3 h-3 border-2 border-emerald-400 border-t-emerald-700 rounded-full animate-spin"></div>
                                                <span>جاري الحفظ...</span>
                                              </>
                                            ) : (
                                              <>
                                                <Check className="w-3.5 h-3.5 shrink-0" />
                                                <span>{loggedStatus === 'حاضر' ? 'حاضر ✅' : 'حاضر'}</span>
                                              </>
                                            )}
                                          </button>

                                          {/* Absent Button */}
                                          <button
                                            onClick={() => handleMarkAttendance(student, false)}
                                            disabled={isSavingAny}
                                            className={`flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${absentBtnStyle} disabled:opacity-50 disabled:cursor-not-allowed`}
                                          >
                                            {isSavingAbsent ? (
                                              <>
                                                <div className="w-3 h-3 border-2 border-rose-400 border-t-rose-700 rounded-full animate-spin"></div>
                                                <span>جاري الحفظ...</span>
                                              </>
                                            ) : (
                                              <>
                                                <X className="w-3.5 h-3.5 shrink-0" />
                                                <span>{loggedStatus === 'غائب' ? 'غائب ❌' : 'غائب'}</span>
                                              </>
                                            )}
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </div>
        ))}

        {activeTab === 'appsScript' && ((needsAuth || loggedInTeacher?.role !== 'Admin') ? renderTeacherLoginRequired() : (
          /* Apps Script Copy-Paste Center Panel */
          <section className="bg-white rounded-2xl border border-slate-200 p-5 animate-fade-in">
            <div className="max-w-3xl mb-6">
              <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-1 rounded-md border border-blue-100 uppercase tracking-wider">
                شرح التثبيت المستقل لـ Google Apps Script
              </span>
              <h2 className="text-lg font-bold text-slate-800 mt-2">تطبيق إدارة الطلاب كويب مستقل (Standalone Web App)</h2>
              <p className="text-slate-500 text-xs leading-relaxed mt-1">
                يمكنك تحويل جدول بيانات Google Sheets الخاص بك إلى نظام ويب متكامل ومستقل تماماً ومجاني! للقيام بذلك، اتبع الخطوات الـ 5 البسيطة التالية وانسخ الأكواد المصدرية الجاهزة بالأسفل:
              </p>
            </div>

            {/* Instruction Steps */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 text-right">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative">
                <span className="absolute top-2 left-3 text-2xl font-black text-slate-200">1</span>
                <h4 className="font-bold text-xs text-slate-800">فتح Apps Script</h4>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  من جدول Google Sheet الخاص بك، اضغط على <strong>امتدادات (Extensions)</strong> ثم اختر <strong>Apps Script</strong>.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative">
                <span className="absolute top-2 left-3 text-2xl font-black text-slate-200">2</span>
                <h4 className="font-bold text-xs text-slate-800">إنشاء الملفات الأربعة</h4>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  أنشئ 4 ملفات بنفس الأسماء الدقيقة: ملف نصي (Script) باسم <code>Code</code>، و3 ملفات HTML بأسماء <code>Index</code> و <code>Stylesheet</code> و <code>JavaScript</code>.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative">
                <span className="absolute top-2 left-3 text-2xl font-black text-slate-200">3</span>
                <h4 className="font-bold text-xs text-slate-800">نسخ الأكواد</h4>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  انسخ الكود الخاص بكل ملف من المربع التفاعلي بالأسفل وألصقه في الملف المقابل له في محررك على Google Cloud.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative">
                <span className="absolute top-2 left-3 text-2xl font-black text-slate-200">4</span>
                <h4 className="font-bold text-xs text-slate-800">حفظ وحفظ المشروع</h4>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  اضغط على أيقونة <strong>حفظ المشروع (Save Project)</strong> بالأعلى لتسجيل وتثبيت كافة التعديلات في النظام.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative">
                <span className="absolute top-2 left-3 text-2xl font-black text-slate-200">5</span>
                <h4 className="font-bold text-xs text-slate-800">نشر التطبيق</h4>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  اضغط على <strong>نشر (Deploy)</strong> ثم <strong>نشر جديد</strong>. اختر النوع <strong>Web App</strong> واجعل الصلاحيات <strong>Anyone (أي شخص)</strong> لتحصل على رابط التطبيق!
                </p>
              </div>
            </div>

            {/* Source Code Viewer Container */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                {/* File selectors */}
                <div className="flex flex-wrap gap-1 bg-slate-200/60 p-1 rounded-lg">
                  {(['Code.gs', 'Index.html', 'Stylesheet.html', 'JavaScript.html'] as const).map((fileName) => (
                    <button
                      key={fileName}
                      onClick={() => {
                        setActiveScriptFile(fileName);
                        setCopiedState(false);
                      }}
                      className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        activeScriptFile === fileName 
                          ? 'bg-white text-blue-600 shadow-sm' 
                          : 'text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      {fileName}
                    </button>
                  ))}
                </div>

                {/* Copy button */}
                <button
                  onClick={() => {
                    const contentMap = {
                      'Code.gs': APPS_SCRIPT_CODE_GS,
                      'Index.html': APPS_SCRIPT_INDEX_HTML,
                      'Stylesheet.html': APPS_SCRIPT_STYLESHEET_HTML,
                      'JavaScript.html': APPS_SCRIPT_JAVASCRIPT_HTML
                    };
                    handleCopyCode(contentMap[activeScriptFile]);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] px-3.5 py-1.5 rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  {copiedState ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> تم نسخ الكود بنجاح!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> نسخ محتوى الملف بالكامل
                    </>
                  )}
                </button>
              </div>

              {/* Code block preformatted content */}
              <div className="p-0 bg-slate-900 text-slate-100 relative max-h-[400px] overflow-y-auto">
                <pre className="p-4 font-mono text-xs leading-relaxed overflow-x-auto text-left" dir="ltr">
                  <code>
                    {activeScriptFile === 'Code.gs' && APPS_SCRIPT_CODE_GS}
                    {activeScriptFile === 'Index.html' && APPS_SCRIPT_INDEX_HTML}
                    {activeScriptFile === 'Stylesheet.html' && APPS_SCRIPT_STYLESHEET_HTML}
                    {activeScriptFile === 'JavaScript.html' && APPS_SCRIPT_JAVASCRIPT_HTML}
                  </code>
                </pre>
              </div>
            </div>
          </section>
        ))}

        {activeTab === 'parentPortal' && (
          <div className="space-y-6 animate-fade-in text-right" dir="rtl">
            {loggedInStudent ? (
              <>
                {/* Parent Welcome Greeting card */}
                <div className="bg-gradient-to-r from-brand-teal via-brand-teal/95 to-brand-teal/80 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden border border-brand-teal/10">
                  <div className="absolute top-0 left-0 transform -translate-x-4 -translate-y-4 text-white/10">
                    <GraduationCap className="w-40 h-40" />
                  </div>
                  <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <span className="bg-white/20 text-white font-bold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider">
                        بوابة متابعة الطالب الأكاديمية
                      </span>
                      <h2 className="text-xl font-bold mt-2 font-sans tracking-tight">مرحباً بولي أمر الطالب: {loggedInStudent.name}</h2>
                      <p className="text-white/80 text-xs mt-1 leading-relaxed">
                        يمكنكم متابعة أحدث نسب الحضور والغياب اليومية وسجلات تقييم الدرجات والمصروفات المستخرجة من جدول البيانات مباشرة.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <button
                        onClick={handleRefreshParentData}
                        disabled={isRefreshingParent}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-inner shrink-0"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingParent ? 'animate-spin' : ''}`} /> {isRefreshingParent ? 'جاري التحديث...' : 'تحديث البيانات'}
                      </button>
                      <button
                        onClick={() => {
                          localStorage.removeItem('parent_logged_in_student');
                          setLoggedInStudent(null);
                          setNeedsAuth(true);
                        }}
                        className="px-4 py-2 bg-rose-500/30 hover:bg-rose-500/50 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-inner shrink-0"
                      >
                        <LogOut className="w-3.5 h-3.5" /> تسجيل الخروج من البوابة
                      </button>
                    </div>
                  </div>
                </div>

                {/* Info Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Card 1: Student Profile */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <span>👤</span> الملف الشخصي للطالب
                    </h3>
                    <div className="space-y-2.5 pt-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">اسم الطالب:</span>
                        <span className="font-bold text-slate-800">{loggedInStudent.name}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">كود الطالب الأكاديمي:</span>
                        <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          #{loggedInStudent.code}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">الصف الدراسي المقيد به:</span>
                        <span className="font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200/50">
                          {loggedInStudent.grade}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">رقم هاتف ولي الأمر:</span>
                        <span className="font-mono font-bold text-slate-700">{loggedInStudent.phone || 'غير مسجل'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Attendance Summary */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                          <span>📅</span> ملخص الحضور والغياب
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-1">نسبة الحضور التراكمية لطالب منذ بدء العام الدراسي.</p>
                      </div>
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg border ${
                        parentFinalPercentage >= 90
                          ? 'bg-green-50 text-emerald-600 border-green-100'
                          : parentFinalPercentage >= 75
                          ? 'bg-amber-50 text-amber-600 border-amber-100'
                          : 'bg-rose-50 text-rose-600 border-rose-100'
                      }`}>
                        {parentFinalPercentage}%
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 my-3 text-center">
                      <div className="p-2.5 bg-emerald-50/50 border border-emerald-100/50 rounded-xl">
                        <span className="block text-[10px] text-slate-500 font-bold">أيام الحضور</span>
                        <span className="block text-lg font-bold text-emerald-600 font-mono mt-0.5">
                          {parentTotalPresent} يوم
                        </span>
                      </div>
                      <div className="p-2.5 bg-rose-50/50 border border-rose-100/50 rounded-xl">
                        <span className="block text-[10px] text-slate-500 font-bold">أيام الغياب</span>
                        <span className="block text-lg font-bold text-rose-600 font-mono mt-0.5">
                          {parentTotalAbsent} يوم
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className={`h-full ${parentPctThemeColor}`} style={{ width: `${parentFinalPercentage}%` }}></div>
                    </div>
                  </div>

                  {/* Card 3: Academic Grades Summary */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <span>📊</span> المستوى الدراسي العام
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-1">متوسط تقييم درجات الطالب من واقع نتائج الامتحانات.</p>
                    </div>

                    {(() => {
                      const studentGrades = gradeEntries.filter(entry => entry.studentCode.toLowerCase().trim() === loggedInStudent.code.toLowerCase().trim());
                      const totalExams = studentGrades.length;
                      
                      let avgPct = 0;
                      if (totalExams > 0) {
                        const totalScore = studentGrades.reduce((sum, entry) => sum + (entry.score / entry.maxScore), 0);
                        avgPct = Math.round((totalScore / totalExams) * 100);
                      }

                      let gradeLevelColor = 'text-rose-600 bg-rose-50 border-rose-100';
                      let gradeLevelText = 'يحتاج لمتابعة مستمرة';
                      if (avgPct >= 90) {
                        gradeLevelColor = 'text-green-600 bg-green-50 border-green-100';
                        gradeLevelText = 'ممتاز ومتميز جداً 🌟';
                      } else if (avgPct >= 80) {
                        gradeLevelColor = 'text-blue-600 bg-blue-50 border-blue-100';
                        gradeLevelText = 'جيد جداً مرتفع';
                      } else if (avgPct >= 65) {
                        gradeLevelColor = 'text-amber-600 bg-amber-50 border-amber-100';
                        gradeLevelText = 'مستوى متوسط مقبول';
                      }

                      return (
                        <>
                          <div className="my-3 flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                            <div>
                              <span className="block text-[10px] text-slate-500 font-bold">الامتحانات المسجلة</span>
                              <span className="block text-xs font-bold text-slate-800 font-mono mt-0.5">{totalExams} اختبارات</span>
                            </div>
                            <div className="text-left">
                              <span className="block text-[10px] text-slate-500 font-bold">معدل التحصيل</span>
                              <span className="block text-sm font-bold font-mono text-indigo-600 mt-0.5">{avgPct}%</span>
                            </div>
                          </div>

                          <div className={`text-[10px] font-bold text-center py-1 rounded border ${gradeLevelColor}`}>
                            التقدير العام: {totalExams > 0 ? gradeLevelText : 'لا توجد امتحانات مسجلة'}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Section: Expenses (المصروفات) */}
                {(() => {
                  const studentPayments = paymentRecords.filter(
                    record => record.studentCode.toLowerCase().trim() === loggedInStudent.code.toLowerCase().trim()
                  );

                  const totalPaid = studentPayments.reduce((sum, r) => sum + Number(r.amountPaid), 0);
                  const latestPayment = studentPayments[studentPayments.length - 1];
                  const totalFees = latestPayment ? Number(latestPayment.totalFees) : 0;
                  const remaining = latestPayment ? latestPayment.remainingBalance : 0;

                  // Payment Status calculation
                  let statusText = '';
                  let statusBadgeColor = '';
                  
                  if (studentPayments.length === 0) {
                    statusText = '🔴 غير مسدد';
                    statusBadgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                  } else if (totalFees > 0 && remaining <= 0) {
                    statusText = '🟢 مسدد بالكامل';
                    statusBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  } else if (totalPaid > 0 && remaining > 0) {
                    statusText = '🟡 سداد جزئي';
                    statusBadgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                  } else {
                    statusText = '🔴 غير مسدد';
                    statusBadgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                  }

                  return (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">💰</span>
                          <h3 className="text-sm font-bold text-slate-800">المصروفات</h3>
                        </div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${statusBadgeColor}`}>
                          حالة السداد: {statusText}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Card: Total Fees */}
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-between">
                          <div>
                            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">إجمالي المصروفات</span>
                            <span className="block text-xl font-bold font-mono text-slate-800 mt-1">{totalFees.toLocaleString()} جنيه</span>
                          </div>
                          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                            <span className="text-lg">📖</span>
                          </div>
                        </div>

                        {/* Card: Total Paid */}
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-between">
                          <div>
                            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">المدفوع</span>
                            <span className="block text-xl font-bold font-mono text-emerald-600 mt-1">{totalPaid.toLocaleString()} جنيه</span>
                          </div>
                          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <span className="text-lg">💵</span>
                          </div>
                        </div>

                        {/* Card: Remaining Balance */}
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-between">
                          <div>
                            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">المتبقي</span>
                            <span className={`block text-xl font-bold font-mono mt-1 ${remaining > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                              {remaining.toLocaleString()} جنيه
                            </span>
                          </div>
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${remaining > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                            <span className="text-lg">⏳</span>
                          </div>
                        </div>
                      </div>

                      {/* Payment History / Transactions list inside Expenses section */}
                      {studentPayments.length > 0 && (
                        <div className="border-t border-slate-100 pt-4">
                          <h4 className="text-[11px] font-bold text-slate-500 mb-3 flex items-center gap-1">
                            <span>🧾</span> تفاصيل دفعات المصروفات السابقة
                          </h4>
                          <div className="overflow-x-auto rounded-lg border border-slate-100">
                            <table className="w-full text-right border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] font-bold">
                                  <th className="py-2.5 px-3 text-right">التاريخ</th>
                                  <th className="py-2.5 px-3 text-center">المبلغ المدفوع</th>
                                  <th className="py-2.5 px-3 text-center">المصروفات المطلوبة</th>
                                  <th className="py-2.5 px-3 text-center">المتبقي</th>
                                  <th className="py-2.5 px-3 text-right">ملاحظات</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-700">
                                {studentPayments.map((record, index) => (
                                  <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-2.5 px-3 font-mono font-medium text-slate-500">{record.paymentDate}</td>
                                    <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-600">+{record.amountPaid} جنيه</td>
                                    <td className="py-2.5 px-3 text-center font-mono text-slate-500">{record.totalFees} جنيه</td>
                                    <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-600">{record.remainingBalance} جنيه</td>
                                    <td className="py-2.5 px-3 text-slate-500 italic max-w-xs truncate" title={record.notes}>{record.notes || 'لا توجد ملاحظات'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Grades Table & Timeline Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column: Grade Entries Table (Academic level) */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                          <span>📝</span> درجات الطالب في المواد والتقويمات الدراسية
                        </h3>
                        <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold">
                          {gradeEntries.filter(entry => entry.studentCode.toLowerCase().trim() === loggedInStudent.code.toLowerCase().trim()).length} تقييمات
                        </span>
                      </div>

                      {(() => {
                        const studentGrades = gradeEntries.filter(entry => entry.studentCode.toLowerCase().trim() === loggedInStudent.code.toLowerCase().trim());
                        
                        if (studentGrades.length === 0) {
                          return (
                            <div className="p-12 text-center text-slate-400">
                              <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                              <p className="text-xs font-bold">لا توجد درجات مسجلة لهذا الطالب في قاعدة البيانات بعد.</p>
                              <p className="text-[10px] mt-1 text-slate-400">سيظهر تقرير الدرجات والامتحانات بمجرد إضافة المعلم لدرجة جديدة لهذا الطالب.</p>
                            </div>
                          );
                        }

                        return (
                          <div className="overflow-x-auto">
                            <table className="w-full text-right border-collapse">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold">
                                  <th className="py-3 px-4 text-right">المادة</th>
                                  <th className="py-3 px-3 text-right">نوع التقويم / الاختبار</th>
                                  <th className="py-3 px-3 text-center">الدرجة المحققة</th>
                                  <th className="py-3 px-3 text-center">النسبة المئوية</th>
                                  <th className="py-3 px-4 text-center">تاريخ الاختبار</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                                {studentGrades.map((grade, index) => {
                                  const pct = Math.round((grade.score / grade.maxScore) * 100);
                                  let progressColor = 'bg-rose-500';
                                  let textColor = 'text-rose-600';
                                  if (pct >= 90) {
                                    progressColor = 'bg-emerald-500';
                                    textColor = 'text-emerald-600';
                                  } else if (pct >= 75) {
                                    progressColor = 'bg-blue-500';
                                    textColor = 'text-blue-600';
                                  } else if (pct >= 50) {
                                    progressColor = 'bg-amber-500';
                                    textColor = 'text-amber-600';
                                  }

                                  return (
                                    <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                                      <td className="py-3.5 px-4 font-bold text-slate-800">
                                        {grade.subject}
                                      </td>
                                      <td className="py-3.5 px-3 text-slate-600 font-medium">
                                        {grade.examName}
                                      </td>
                                      <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-800">
                                        <span className="text-slate-800">{grade.score}</span>
                                        <span className="text-slate-400 font-normal"> / {grade.maxScore}</span>
                                      </td>
                                      <td className="py-3.5 px-3 text-center">
                                        <div className="inline-flex flex-col items-center gap-1">
                                          <span className={`font-mono font-bold ${textColor}`}>{pct}%</span>
                                          <div className="w-16 bg-slate-100 h-1 rounded-full overflow-hidden">
                                            <div className={`h-full ${progressColor}`} style={{ width: `${pct}%` }}></div>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="py-3.5 px-4 text-center font-mono text-slate-500 text-[11px]">
                                        {grade.examDate}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Right Column: Attendance Logs & Filter */}
                  <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                      <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span>🗓️</span> فلترة وتفصيل سجل الغياب اليومي
                      </h3>

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500">من تاريخ</label>
                          <input
                            type="date"
                            value={parentFromDate}
                            onChange={(e) => setParentFromDate(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white text-slate-700 font-mono text-left"
                            dir="ltr"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500">إلى تاريخ</label>
                          <input
                            type="date"
                            value={parentToDate}
                            onChange={(e) => setParentToDate(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white text-slate-700 font-mono text-left"
                            dir="ltr"
                          />
                        </div>
                      </div>

                      {parentIsDateFiltered && (
                        <button
                          onClick={() => {
                            setParentFromDate('');
                            setParentToDate('');
                          }}
                          className="w-full py-1 text-center text-[10px] text-blue-600 bg-blue-50 border border-blue-100/50 rounded-lg font-bold hover:bg-blue-100/50 transition-colors cursor-pointer"
                        >
                          مسح عامل تصفية التاريخ
                        </button>
                      )}

                      <div className="border-t border-slate-100 pt-3">
                        <h4 className="text-[11px] font-bold text-slate-600 mb-3 flex items-center gap-1.5">
                          <span>🕒</span> الخط الزمني لآخر تسجيلات الحضور
                        </h4>

                        {!parentHasAnyLogs ? (
                          <p className="text-[10px] text-slate-400 italic py-6 text-center">لا توجد سجلات حضور مسجلة لهذا الطالب في المستند بعد.</p>
                        ) : parentFilteredLogs.length === 0 ? (
                          <p className="text-[10px] text-slate-400 italic py-6 text-center">لا توجد سجلات تطابق النطاق الزمني المحدد.</p>
                        ) : (
                          <div className="max-h-64 overflow-y-auto space-y-2 pr-1" style={{ direction: 'ltr' }}>
                            {parentFilteredLogs.map((log, index) => (
                              <div key={index} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px]" style={{ direction: 'rtl' }}>
                                <div className="text-right">
                                  <span className="block font-mono font-medium text-slate-700">{log.date}</span>
                                  <span className="block text-[9px] text-slate-400 mt-0.5">{getArabicDayOfWeek(log.date)}</span>
                                </div>
                                {log.status === 'حاضر' ? (
                                  <span className="text-emerald-700 font-bold bg-green-50 px-2 py-0.5 rounded-full border border-green-100 text-[9px]">
                                    حاضر ✅
                                  </span>
                                ) : (
                                  <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 text-[9px]">
                                    غائب ❌
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="max-w-md mx-auto my-12 bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center" dir="rtl">
                <p className="text-slate-500 text-xs font-bold">يرجى تسجيل الدخول لعرض تفاصيل الطالب.</p>
                <button
                  onClick={() => {
                    setLoginTab('parent');
                    setNeedsAuth(true);
                  }}
                  className="mt-4 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  الذهاب لشاشة تسجيل الدخول
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Add/Edit Modal (Tailwind custom rendering instead of unstyled Bootstrap inside React) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" dir="rtl">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setIsFormOpen(false)}></div>

          {/* Modal Content container */}
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-fade-in z-10">
              <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>✏️</span> {formMode === 'add' ? 'إضافة طالب جديد لقاعدة البيانات' : 'تعديل بيانات الطالب الفنية'}
                </h4>
                <button 
                  onClick={() => setIsFormOpen(false)}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-lg transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveStudent} className="p-5 space-y-3.5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">كود الطالب (معرف فريد) <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: STU-105"
                      value={formStudent.code || ''}
                      disabled={formMode === 'edit'}
                      onChange={(e) => setFormStudent({ ...formStudent, code: e.target.value.trim() })}
                      className="w-full px-3 py-2 bg-slate-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl text-xs outline-none text-slate-800 disabled:bg-slate-200 disabled:text-slate-400 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">اسم الطالب بالكامل <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="الاسم ثلاثي أو رباعي بالعربية"
                      value={formStudent.name || ''}
                      onChange={(e) => setFormStudent({ ...formStudent, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl text-xs outline-none text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">الصف الدراسي <span className="text-rose-500">*</span></label>
                    <select
                      required
                      value={formStudent.grade || ''}
                      onChange={(e) => setFormStudent({ ...formStudent, grade: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl text-xs outline-none text-slate-800 cursor-pointer"
                    >
                      <option value="" disabled>اختر الصف الدراسي...</option>
                      <option value="الصف الأول الإعدادي">الصف الأول الإعدادي</option>
                      <option value="الصف الثاني الإعدادي">الصف الثاني الإعدادي</option>
                      <option value="الصف الثالث الإعدادي">الصف الثالث الإعدادي</option>
                      <option value="الصف الأول الثانوي الأزهري">الصف الأول الثانوي الأزهري</option>
                      <option value="الصف الثاني الثانوي الأزهري">الصف الثاني الثانوي الأزهري</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">رقم الهاتف</label>
                    <input
                      type="tel"
                      placeholder="مثال: 0501234567"
                      value={formStudent.phone || ''}
                      onChange={(e) => setFormStudent({ ...formStudent, phone: e.target.value.trim() })}
                      className="w-full px-3 py-2 bg-slate-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl text-xs outline-none text-slate-800 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">عدد أيام الحضور الفعلي</label>
                    <input
                      type="number"
                      min="0"
                      value={formStudent.attendance || 0}
                      onChange={(e) => setFormStudent({ ...formStudent, attendance: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                      className="w-full px-3 py-2 bg-slate-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl text-xs outline-none text-slate-800 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">عدد أيام الغياب</label>
                    <input
                      type="number"
                      min="0"
                      value={formStudent.absence || 0}
                      onChange={(e) => setFormStudent({ ...formStudent, absence: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                      className="w-full px-3 py-2 bg-slate-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl text-xs outline-none text-slate-800 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">درجة الامتحان الشهري 1</label>
                    <input
                      type="text"
                      placeholder="درجة الامتحان (مثال: 95)"
                      value={formStudent.exam1 || ''}
                      onChange={(e) => setFormStudent({ ...formStudent, exam1: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl text-xs outline-none text-slate-800 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">درجة الامتحان الشهري 2</label>
                    <input
                      type="text"
                      placeholder="درجة الامتحان (مثال: 90)"
                      value={formStudent.exam2 || ''}
                      onChange={(e) => setFormStudent({ ...formStudent, exam2: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl text-xs outline-none text-slate-800 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">ملاحظات المعلم وتقييم السلوك</label>
                  <textarea
                    rows={2}
                    placeholder="اكتب أي ملاحظات فنية حول حضور الطالب أو أدائه الأكاديمي وسلوكه العام..."
                    value={formStudent.notes || ''}
                    onChange={(e) => setFormStudent({ ...formStudent, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl text-xs outline-none text-slate-800"
                  ></textarea>
                </div>

                <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer"
                  >
                    إلغاء وإغلاق
                  </button>
                  <button
                    type="submit"
                    disabled={isFormSaving}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
                  >
                    {isFormSaving ? 'جاري حفظ التغييرات...' : 'حفظ وتحديث المستند'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (User Confirmation for Destructive Operations - MANDATORY) */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto" dir="rtl">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setStudentToDelete(null)}></div>
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden p-5 animate-fade-in z-10 text-right">
              <div className="text-rose-600 bg-rose-50 w-10 h-10 rounded-xl flex items-center justify-center mb-3.5 border border-rose-100">
                <Trash2 className="w-5 h-5" />
              </div>
              
              <h4 className="text-sm font-bold text-slate-800">حذف الطالب نهائياً من قاعدة البيانات؟</h4>
              
              <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                هل أنت متأكد تماماً من رغبتك في حذف الطالب <strong>"{studentToDelete.name}"</strong> (كود: <code>{studentToDelete.code}</code>)؟ 
                سيتم حذف السطر الخاص به بالكامل من ورقة <strong>Google Sheets</strong> وإعادة ترتيب الأسطر التابعة له، ولا يمكن التراجع عن هذا الإجراء لاحقاً.
              </p>

              <div className="flex gap-2 justify-end mt-4">
                <button
                  onClick={() => setStudentToDelete(null)}
                  disabled={isDeleting}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer"
                >
                  إلغاء التراجع
                </button>
                <button
                  onClick={handleExecuteDelete}
                  disabled={isDeleting}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  {isDeleting ? 'جاري الحذف...' : 'نعم، حذف السجل'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collect Payment Modal */}
      {collectPaymentStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto" dir="rtl">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setCollectPaymentStudent(null)}></div>

          {/* Modal Content container */}
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-fade-in z-10 text-right">
              <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>💵</span> تحصيل المصروفات الدراسية
                </h4>
                <button 
                  onClick={() => setCollectPaymentStudent(null)}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-lg transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCollectPaymentSubmit} className="p-5 space-y-4">
                {/* Student info */}
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100/50 space-y-1">
                  <p className="text-[11px] font-bold text-slate-700">
                    الطالب: <span className="text-blue-700 font-black">{collectPaymentStudent.name}</span>
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    كود الطالب: #{collectPaymentStudent.code} | الصف: {collectPaymentStudent.grade}
                  </p>
                  {(() => {
                    const studentPayments = paymentRecords.filter(r => r.studentCode === collectPaymentStudent.code);
                    const paidAmt = studentPayments.reduce((sum, r) => sum + r.amountPaid, 0);
                    return (
                      <p className="text-[10px] text-emerald-600 font-bold">
                        المدفوع سابقاً: {paidAmt} ج.م
                      </p>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Total Fees */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">إجمالي المصروفات المطلوب <span className="text-rose-500">*</span></label>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder="مثال: 1000"
                      value={paymentTotalFees}
                      onChange={(e) => setPaymentTotalFees(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl text-xs outline-none text-slate-800 font-mono font-bold"
                    />
                  </div>

                  {/* Payment Amount */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">المبلغ المدفوع حالياً <span className="text-rose-500">*</span></label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="أدخل المبلغ المحصل"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl text-xs outline-none text-slate-800 font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Date Selection */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">تاريخ السداد <span className="text-rose-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl text-xs outline-none text-slate-800 font-mono text-left"
                    dir="ltr"
                  />
                </div>

                {/* Real-time Calculation Preview */}
                {(() => {
                  const studentPayments = paymentRecords.filter(r => r.studentCode === collectPaymentStudent.code);
                  const previousPaid = studentPayments.reduce((sum, r) => sum + r.amountPaid, 0);
                  const currPaid = Number(paymentAmount) || 0;
                  const totalFees = Number(paymentTotalFees) || 0;
                  const totalPaidNew = previousPaid + currPaid;
                  const remaining = totalFees - totalPaidNew;

                  return (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                      <div className="flex justify-between text-slate-500">
                        <span>إجمالي المدفوع (سابقاً + حالياً):</span>
                        <span className="font-bold font-mono text-slate-700">{totalPaidNew} ج.م</span>
                      </div>
                      <div className="flex justify-between text-rose-600 font-bold">
                        <span>المتبقي الجديد:</span>
                        <span className="font-mono">{remaining} ج.م</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Notes */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">ملاحظات السداد (اختياري)</label>
                  <textarea
                    rows={2}
                    placeholder="اكتب أي ملاحظات إضافية بخصوص دفعة اليوم..."
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl text-xs outline-none text-slate-800"
                  ></textarea>
                </div>

                <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setCollectPaymentStudent(null)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingPayment}
                    className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
                  >
                    {isSavingPayment ? 'جاري التحصيل...' : 'تأكيد وحفظ الدفعة'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full mt-12 py-8 bg-white border-t border-slate-100 text-center text-xs text-slate-500 font-sans">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center gap-1.5">
          <p className="font-bold text-slate-700">© 2026 منصة الأستاذ إسلام الشرقاوي</p>
          <p className="text-slate-400 text-[11px]">جميع الحقوق محفوظة</p>
        </div>
      </footer>
    </div>
  );
}
