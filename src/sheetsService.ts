import { Student, AttendanceLog, GradeEntry, UserCredential, PaymentRecord } from './types';

// Google Sheets API v4 endpoints wrapper

// Headers list in Arabic
export const SHEETS_HEADERS = [
  'كود الطالب',         // A
  'اسم الطالب',         // B
  'الصف',              // C
  'رقم الهاتف',        // D
  'الحضور',            // E
  'الغياب',            // F
  'نسبة الحضور',        // G
  'الامتحان الشهري 1',  // H
  'الامتحان الشهري 2',  // I
  'الملاحظات'          // J
];

const DEFAULT_SHEET_NAME = 'الطلاب';

/**
 * Creates a new Google Spreadsheet with headers and frozen top row
 */
export async function createSpreadsheet(accessToken: string): Promise<string> {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: 'نظام إدارة الطلاب - قاعدة البيانات'
      },
      sheets: [
        {
          properties: {
            title: DEFAULT_SHEET_NAME,
            gridProperties: {
              frozenRowCount: 1,
              columnCount: 10
            }
          }
        }
      ]
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'فشل إنشاء جدول البيانات');
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;

  // Now, populate the headers
  await populateHeaders(accessToken, spreadsheetId);
  // Add some sample data for a pleasant starting experience
  await addSampleData(accessToken, spreadsheetId);

  return spreadsheetId;
}

/**
 * Populates headers in the first row
 */
async function populateHeaders(accessToken: string, spreadsheetId: string): Promise<void> {
  const range = `'${DEFAULT_SHEET_NAME}'!A1:J1`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range: range,
      majorDimension: 'ROWS',
      values: [SHEETS_HEADERS]
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'فشل كتابة العناوين في جدول البيانات');
  }
}

/**
 * Inserts some starter sample students
 */
async function addSampleData(accessToken: string, spreadsheetId: string): Promise<void> {
  const range = `'${DEFAULT_SHEET_NAME}'!A2:J4`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

  const sampleStudents = [
    ['STU-101', 'أحمد محمد علي', 'الصف الأول الإعدادي', '0501234567', '18', '2', '90%', '95', '92', 'طالب متميز ومجتهد'],
    ['STU-102', 'فاطمة عمر خالد', 'الصف الثاني الإعدادي', '0507654321', '19', '1', '95%', '88', '94', 'تحتاج لمراجعة بسيطة في النحو'],
    ['STU-103', 'يوسف محمود حسن', 'الصف الأول الثانوي الأزهري', '0555112233', '15', '5', '75%', '70', '65', 'يحتاج لمزيد من المتابعة والالتزام بالحضور']
  ];

  await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range: range,
      majorDimension: 'ROWS',
      values: sampleStudents
    })
  });
}

/**
 * Checks if the spreadsheet is accessible and parses the title
 */
export async function getSpreadsheetTitle(accessToken: string, spreadsheetId: string): Promise<string> {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties/title`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error('لا يمكن الوصول لجدول البيانات هذا. يرجى التحقق من الرقم التعريفي للجدول وصلاحيات الوصول.');
  }

  const data = await response.json();
  return data.properties?.title || 'جدول بيانات بدون عنوان';
}

// Simple in-memory cache for sheet names to avoid excessive API requests
let cachedSheetNames: Record<string, string> = {};

/**
 * Dynamically resolves the best sheet name to use (either DEFAULT_SHEET_NAME if present, or the first sheet)
 */
export async function getActiveSheetName(accessToken: string, spreadsheetId: string): Promise<string> {
  if (cachedSheetNames[spreadsheetId]) {
    return cachedSheetNames[spreadsheetId];
  }

  try {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets/properties/title`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (response.ok) {
      const metadata = await response.json();
      const sheets = metadata.sheets || [];
      const hasDefault = sheets.some((s: any) => s.properties?.title === DEFAULT_SHEET_NAME);
      const name = hasDefault ? DEFAULT_SHEET_NAME : (sheets[0]?.properties?.title || DEFAULT_SHEET_NAME);
      cachedSheetNames[spreadsheetId] = name;
      return name;
    }
  } catch (error) {
    console.error('Error resolving sheet name:', error);
  }

  return DEFAULT_SHEET_NAME;
}

/**
 * Fetches all student records from the Google Sheet
 */
export async function fetchStudents(accessToken: string, spreadsheetId: string): Promise<Student[]> {
  const sheetName = await getActiveSheetName(accessToken, spreadsheetId);
  const range = `'${sheetName}'!A2:J1000`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`;

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error('فشل قراءة بيانات الطلاب من جدول البيانات. تأكد من صحة ورقة العمل.');
  }

  const data = await response.json();
  return parseSheetsValues(data.values || []);
}

/**
 * Parses raw sheets matrix to Student entities
 */
function parseSheetsValues(rows: string[][]): Student[] {
  return rows.map((row, index) => {
    const attendance = parseInt(row[4] || '0', 10) || 0;
    const absence = parseInt(row[5] || '0', 10) || 0;

    // Parse attendance percentage
    let percentage = 100;
    if (row[6]) {
      percentage = parseFloat(row[6].replace('%', '')) || 100;
    } else {
      const total = attendance + absence;
      percentage = total > 0 ? Math.round((attendance / total) * 100) : 100;
    }

    return {
      rowIndex: index, // Row 2 maps to 0
      code: row[0] || '',
      name: row[1] || '',
      grade: row[2] || '',
      phone: row[3] || '',
      attendance,
      absence,
      attendancePercentage: percentage,
      exam1: row[7] || '',
      exam2: row[8] || '',
      notes: row[9] || ''
    };
  });
}

/**
 * Appends a student record to the sheet
 */
export async function addStudent(accessToken: string, spreadsheetId: string, student: Student): Promise<void> {
  const sheetName = await getActiveSheetName(accessToken, spreadsheetId);
  const range = `'${sheetName}'!A2:J`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;

  const total = student.attendance + student.absence;
  const attendancePct = total > 0 ? `${Math.round((student.attendance / total) * 100)}%` : '100%';

  const rowData = [
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
  ];

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range: range,
      majorDimension: 'ROWS',
      values: [rowData]
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'فشل إضافة الطالب الجديد');
  }
}

/**
 * Updates an existing student record at a specific row
 */
export async function updateStudent(accessToken: string, spreadsheetId: string, student: Student): Promise<void> {
  if (student.rowIndex === undefined) {
    throw new Error('لا يمكن تحديث طالب بدون تحديد رقم الصف.');
  }

  // Row in Google Sheets is rowIndex + 2 (since rowIndex is 0-based index for student list which starts on row 2)
  const actualRow = student.rowIndex + 2;
  const sheetName = await getActiveSheetName(accessToken, spreadsheetId);
  const range = `'${sheetName}'!A${actualRow}:J${actualRow}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

  const total = student.attendance + student.absence;
  const attendancePct = total > 0 ? `${Math.round((student.attendance / total) * 100)}%` : '100%';

  const rowData = [
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
  ];

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range: range,
      majorDimension: 'ROWS',
      values: [rowData]
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'فشل تحديث بيانات الطالب');
  }
}

/**
 * Deletes a student row from the Google Sheet
 */
export async function deleteStudent(accessToken: string, spreadsheetId: string, rowIndex: number): Promise<void> {
  const sheetName = await getActiveSheetName(accessToken, spreadsheetId);

  // Retrieve spreadsheet metadata to get the sheetId of the active sheet
  const metadataResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title))`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!metadataResponse.ok) {
    throw new Error('فشل قراءة تفاصيل الملف لتحديد رقم الصفحة.');
  }

  const metadata = await metadataResponse.json();
  const targetSheet = metadata.sheets?.find((s: any) => s.properties?.title === sheetName) || metadata.sheets?.[0];
  const sheetId = targetSheet?.properties?.sheetId;

  if (sheetId === undefined) {
    throw new Error('لم يتم العثور على الصفحة المستهدفة في ملف جدول البيانات.');
  }

  // Row in Google Sheets is rowIndex + 2 (since rowIndex is 0-based for student records starting from Row 2)
  const actualRow = rowIndex + 2;
  const startRowIndex = actualRow - 1; // 0-based index of the row to start deleting
  const endRowIndex = actualRow;       // 0-based end index (exclusive)

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: startRowIndex,
              endIndex: endRowIndex
            }
          }
        }
      ]
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'فشل حذف سطر الطالب من جدول البيانات');
  }
}

/**
 * Ensures that the 'سجل الحضور' sheet exists and has headers
 */
export async function ensureAttendanceSheetExists(accessToken: string, spreadsheetId: string): Promise<void> {
  const metadataResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets/properties(title,sheetId)`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!metadataResponse.ok) {
    throw new Error('فشل التحقق من أوراق العمل المتوفرة.');
  }

  const metadata = await metadataResponse.json();
  const sheets = metadata.sheets || [];
  const hasAttendanceSheet = sheets.some((s: any) => s.properties?.title === 'سجل الحضور');

  if (!hasAttendanceSheet) {
    // Create 'سجل الحضور' sheet
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    const createResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: {
                title: 'سجل الحضور',
                gridProperties: {
                  frozenRowCount: 1,
                  columnCount: 5
                }
              }
            }
          }
        ]
      })
    });

    if (!createResponse.ok) {
      throw new Error('فشل إنشاء ورقة سجل الحضور.');
    }

    // Populate headers
    const headersRange = `'سجل الحضور'!A1:E1`;
    const headersUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(headersRange)}?valueInputOption=USER_ENTERED`;
    const headersResponse = await fetch(headersUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range: headersRange,
        majorDimension: 'ROWS',
        values: [['التاريخ', 'كود الطالب', 'اسم الطالب', 'الصف', 'الحالة']]
      })
    });

    if (!headersResponse.ok) {
      throw new Error('فشل تعيين عناوين ورقة سجل الحضور.');
    }
  }
}

/**
 * Ensures that the 'الدرجات' sheet exists and has headers
 */
export async function ensureGradesSheetExists(accessToken: string, spreadsheetId: string): Promise<void> {
  const metadataResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets/properties(title,sheetId)`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!metadataResponse.ok) {
    throw new Error('فشل التحقق من أوراق العمل المتوفرة.');
  }

  const metadata = await metadataResponse.json();
  const sheets = metadata.sheets || [];
  const hasGradesSheet = sheets.some((s: any) => s.properties?.title === 'الدرجات');

  if (!hasGradesSheet) {
    // Create 'الدرجات' sheet
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    const createResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: {
                title: 'الدرجات',
                gridProperties: {
                  frozenRowCount: 1,
                  columnCount: 7
                }
              }
            }
          }
        ]
      })
    });

    if (!createResponse.ok) {
      throw new Error('فشل إنشاء ورقة الدرجات.');
    }

    // Populate headers
    const headersRange = `'الدرجات'!A1:G1`;
    const headersUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(headersRange)}?valueInputOption=USER_ENTERED`;
    const headersResponse = await fetch(headersUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range: headersRange,
        majorDimension: 'ROWS',
        values: [['كود الطالب', 'اسم الطالب', 'المادة', 'اسم الاختبار', 'الدرجة', 'الدرجة النهائية', 'تاريخ الاختبار']]
      })
    });

    if (!headersResponse.ok) {
      throw new Error('فشل تعيين عناوين ورقة الدرجات.');
    }
  }
}

/**
 * Fetches all daily attendance logs from the Google Sheet
 */
export async function fetchAttendanceLogs(accessToken: string, spreadsheetId: string): Promise<AttendanceLog[]> {
  try {
    await ensureAttendanceSheetExists(accessToken, spreadsheetId);
  } catch (error) {
    console.error('Error ensuring attendance sheet exists:', error);
    return [];
  }

  const range = `'سجل الحضور'!A2:E2000`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`;

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  const rows = data.values || [];

  return rows.map((row: any, index: number) => ({
    rowIndex: index + 2, // Row 2 is the first data row
    date: row[0] || '',
    studentCode: row[1] || '',
    studentName: row[2] || '',
    grade: row[3] || '',
    status: (row[4] === 'غائب' ? 'غائب' : 'حاضر') as 'حاضر' | 'غائب'
  }));
}

/**
 * Appends a new attendance log or updates an existing one
 */
export async function saveAttendanceLog(
  accessToken: string,
  spreadsheetId: string,
  log: Omit<AttendanceLog, 'rowIndex'> & { rowIndex?: number }
): Promise<void> {
  try {
    await ensureAttendanceSheetExists(accessToken, spreadsheetId);
  } catch (error) {
    throw new Error('فشل التحقق من ورقة سجل الحضور: ' + (error as Error).message);
  }

  const values = [[log.date, log.studentCode, log.studentName, log.grade, log.status]];

  if (log.rowIndex && log.rowIndex > 1) {
    // Update existing row
    const range = `'سجل الحضور'!A${log.rowIndex}:E${log.rowIndex}`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range: range,
        majorDimension: 'ROWS',
        values: values
      })
    });

    if (!response.ok) {
      throw new Error('فشل تحديث سجل الحضور في جدول البيانات.');
    }
  } else {
    // Append new row
    const range = `'سجل الحضور'!A2:E`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range: range,
        majorDimension: 'ROWS',
        values: values
      })
    });

    if (!response.ok) {
      throw new Error('فشل إضافة سجل الحضور الجديد إلى جدول البيانات.');
    }
  }
}

/**
 * Appends a new grade entry to the 'الدرجات' sheet
 */
export async function saveGradeEntry(
  accessToken: string,
  spreadsheetId: string,
  entry: Omit<GradeEntry, 'rowIndex'>
): Promise<void> {
  try {
    await ensureGradesSheetExists(accessToken, spreadsheetId);
  } catch (error) {
    throw new Error('فشل التحقق من ورقة الدرجات: ' + (error as Error).message);
  }

  const values = [[
    entry.studentCode,
    entry.studentName,
    entry.subject,
    entry.examName,
    entry.score,
    entry.maxScore,
    entry.examDate
  ]];

  const range = `'الدرجات'!A2:G`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range: range,
      majorDimension: 'ROWS',
      values: values
    })
  });

  if (!response.ok) {
    throw new Error('فشل إضافة الدرجة الجديدة إلى جدول البيانات.');
  }
}

/**
 * Fetches all grades from the Google Sheet
 */
export async function fetchGradeEntries(accessToken: string, spreadsheetId: string): Promise<GradeEntry[]> {
  try {
    await ensureGradesSheetExists(accessToken, spreadsheetId);
  } catch (error) {
    console.error('Error ensuring grades sheet exists:', error);
    return [];
  }

  const range = `'الدرجات'!A2:G2000`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`;

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  const rows = data.values || [];

  return rows.map((row: any, index: number) => ({
    rowIndex: index + 2,
    studentCode: row[0] || '',
    studentName: row[1] || '',
    subject: row[2] || '',
    examName: row[3] || '',
    score: row[4] ? Number(row[4]) : 0,
    maxScore: row[5] ? Number(row[5]) : 0,
    examDate: row[6] || ''
  }));
}

/**
 * Ensures that the 'المستخدمون' sheet exists, has headers and at least one default Admin user
 */
export async function ensureUsersSheetExists(accessToken: string, spreadsheetId: string): Promise<void> {
  const metadataResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets/properties(title,sheetId)`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!metadataResponse.ok) {
    throw new Error('فشل التحقق من أوراق العمل المتوفرة.');
  }

  const metadata = await metadataResponse.json();
  const sheets = metadata.sheets || [];
  const hasUsersSheet = sheets.some((s: any) => s.properties?.title === 'المستخدمون');

  if (!hasUsersSheet) {
    // Create 'المستخدمون' sheet
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    const createResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: {
                title: 'المستخدمون',
                gridProperties: {
                  frozenRowCount: 1,
                  columnCount: 3
                }
              }
            }
          }
        ]
      })
    });

    if (!createResponse.ok) {
      throw new Error('فشل إنشاء ورقة المستخدمين.');
    }

    // Populate headers and add a default admin account
    const headersRange = `'المستخدمون'!A1:C2`;
    const headersUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(headersRange)}?valueInputOption=USER_ENTERED`;
    const headersResponse = await fetch(headersUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range: headersRange,
        majorDimension: 'ROWS',
        values: [
          ['اسم المستخدم', 'كلمة المرور', 'الصلاحية'],
          ['admin', 'admin', 'Admin']
        ]
      })
    });

    if (!headersResponse.ok) {
      throw new Error('فشل تعيين عناوين ورقة المستخدمين والحساب الافتراضي.');
    }
  }
}

/**
 * Fetches all user credentials from the 'المستخدمون' sheet
 */
export async function fetchUsers(accessToken: string, spreadsheetId: string): Promise<UserCredential[]> {
  try {
    await ensureUsersSheetExists(accessToken, spreadsheetId);
  } catch (error) {
    console.error('Error ensuring users sheet exists:', error);
    return [];
  }

  const range = `'المستخدمون'!A2:C1000`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`;

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  const rows = data.values || [];
  console.log('Users rows from Google Sheets:', rows);
  return rows.map((row: any) => ({
    username: row[0] || '',
    password: row[1] || '',
    role: row[2] || ''
  }));
}

/**
 * Ensures that the 'المصروفات' sheet exists and has headers
 */
export async function ensureExpensesSheetExists(accessToken: string, spreadsheetId: string): Promise<void> {
  const metadataResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets/properties(title,sheetId)`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!metadataResponse.ok) {
    throw new Error('فشل التحقق من أوراق العمل المتوفرة.');
  }

  const metadata = await metadataResponse.json();
  const sheets = metadata.sheets || [];
  const hasExpensesSheet = sheets.some((s: any) => s.properties?.title === 'المصروفات');

  if (!hasExpensesSheet) {
    // Create 'المصروفات' sheet
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    const createResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: {
                title: 'المصروفات',
                gridProperties: {
                  frozenRowCount: 1,
                  columnCount: 7
                }
              }
            }
          }
        ]
      })
    });

    if (!createResponse.ok) {
      throw new Error('فشل إنشاء ورقة المصروفات.');
    }

    // Populate headers
    const headersRange = `'المصروفات'!A1:G1`;
    const headersUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(headersRange)}?valueInputOption=USER_ENTERED`;
    const headersResponse = await fetch(headersUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range: headersRange,
        majorDimension: 'ROWS',
        values: [['كود الطالب', 'اسم الطالب', 'تاريخ السداد', 'المبلغ المدفوع', 'إجمالي المصروفات', 'المتبقي', 'ملاحظات']]
      })
    });

    if (!headersResponse.ok) {
      throw new Error('فشل تعيين عناوين ورقة المصروفات.');
    }
  }
}

/**
 * Fetches all payment records from the 'المصروفات' sheet
 */
export async function fetchPaymentRecords(accessToken: string, spreadsheetId: string): Promise<PaymentRecord[]> {
  try {
    await ensureExpensesSheetExists(accessToken, spreadsheetId);
  } catch (error) {
    console.error('Error ensuring expenses sheet exists:', error);
    return [];
  }

  const range = `'المصروفات'!A2:G5000`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`;

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  const rows = data.values || [];

  return rows.map((row: any, index: number) => ({
    rowIndex: index + 2,
    studentCode: row[0] || '',
    studentName: row[1] || '',
    paymentDate: row[2] || '',
    amountPaid: row[3] ? Number(row[3].toString().replace(/[^\d.-]/g, '')) || 0 : 0,
    totalFees: row[4] ? Number(row[4].toString().replace(/[^\d.-]/g, '')) || 0 : 0,
    remainingBalance: row[5] ? Number(row[5].toString().replace(/[^\d.-]/g, '')) || 0 : 0,
    notes: row[6] || ''
  }));
}

/**
 * Appends a new payment record to the 'المصروفات' sheet
 */
export async function savePaymentRecord(
  accessToken: string,
  spreadsheetId: string,
  record: Omit<PaymentRecord, 'rowIndex'>
): Promise<void> {
  try {
    await ensureExpensesSheetExists(accessToken, spreadsheetId);
  } catch (error) {
    throw new Error('فشل التحقق من ورقة المصروفات: ' + (error as Error).message);
  }

  const values = [[
    record.studentCode,
    record.studentName,
    record.paymentDate,
    record.amountPaid,
    record.totalFees,
    record.remainingBalance,
    record.notes
  ]];

  const range = `'المصروفات'!A2:G`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range: range,
      majorDimension: 'ROWS',
      values: values
    })
  });

  if (!response.ok) {
    throw new Error('فشل إضافة سجل الدفع الجديد إلى ورقة المصروفات.');
  }
}


