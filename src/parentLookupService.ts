import crypto from 'crypto';

export interface StudentLookupResult {
  success: boolean;
  error?: string;
  student?: {
    code: string;
    name: string;
    grade: string;
    phone: string;
    attendance: number;
    absence: number;
    attendancePercentage: number;
    exam1: string;
    exam2: string;
    notes: string;
  };
  attendanceLogs?: Array<{
    date: string;
    studentCode: string;
    studentName: string;
    grade: string;
    status: 'حاضر' | 'غائب';
  }>;
  gradeEntries?: Array<{
    studentCode: string;
    studentName: string;
    subject: string;
    examName: string;
    score: number;
    maxScore: number;
    examDate: string;
  }>;
  paymentRecords?: Array<{
    studentCode: string;
    studentName: string;
    paymentDate: string;
    amountPaid: number;
    totalFees: number;
    remainingBalance: number;
    notes: string;
  }>;
}

/**
 * Normalizes numbers and strings (converts Arabic digits to English, removes special formatting)
 */
export function normalizeString(str: string): string {
  if (!str) return '';
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let normalized = str.trim();
  for (let i = 0; i < 10; i++) {
    normalized = normalized.replace(new RegExp(arabicDigits[i], 'g'), i.toString());
  }
  return normalized;
}

/**
 * Normalizes phone numbers for fuzzy matching (removes country codes, dashes, spaces, leading zeros)
 */
export function normalizePhone(phone: string): string {
  const norm = normalizeString(phone).replace(/\D/g, ''); // keep digits only
  // If phone starts with Egypt country code 20, remove it
  if (norm.startsWith('20') && norm.length > 10) {
    return norm.substring(2);
  }
  // Strip leading zero for comparison
  return norm.replace(/^0+/, '');
}

/**
 * Clean and format email address from env vars
 */
export function cleanEmail(emailStr: string): string {
  if (!emailStr) return '';
  let email = emailStr.trim();
  if ((email.startsWith('"') && email.endsWith('"')) || (email.startsWith("'") && email.endsWith("'"))) {
    email = email.slice(1, -1);
  }
  return email;
}

/**
 * Safely format Google Private Key string for OpenSSL 3.0 / Node crypto compatibility
 */
export function formatPrivateKey(keyStr: string): string {
  if (!keyStr) return '';
  let key = keyStr.trim();

  // 1. If user pasted JSON object string
  if (key.startsWith('{')) {
    try {
      const parsed = JSON.parse(key);
      if (parsed.private_key) key = parsed.private_key;
    } catch (e) {
      // Continue
    }
  }

  // 2. Remove wrapping quotes (double or single)
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }

  // 3. Replace escaped newlines
  key = key.replace(/\\n/g, '\n');

  // 4. Extract PEM components if present
  const headerMatch = key.match(/-----BEGIN [A-Z ]+-----/);
  const footerMatch = key.match(/-----END [A-Z ]+-----/);

  if (headerMatch && footerMatch) {
    const header = headerMatch[0];
    const footer = footerMatch[0];
    const bodyStartIndex = key.indexOf(header) + header.length;
    const bodyEndIndex = key.indexOf(footer);
    const rawBody = key.substring(bodyStartIndex, bodyEndIndex).replace(/\s+/g, '');
    const chunkedBody = rawBody.match(/.{1,64}/g) || [rawBody];
    return `${header}\n${chunkedBody.join('\n')}\n${footer}`;
  }

  // 5. If headers are missing, wrap raw base64
  if (!key.includes('-----BEGIN')) {
    const rawBody = key.replace(/\s+/g, '');
    const chunkedBody = rawBody.match(/.{1,64}/g) || [rawBody];
    return `-----BEGIN PRIVATE KEY-----\n${chunkedBody.join('\n')}\n${footerMatch ? footerMatch[0] : '-----END PRIVATE KEY-----'}`;
  }

  return key;
}

/**
 * Obtains an access token using Google Service Account credentials (JWT)
 */
async function getServiceAccountAccessToken(clientEmail: string, privateKeyStr: string): Promise<string> {
  const email = cleanEmail(clientEmail);
  const cleanPrivateKey = formatPrivateKey(privateKeyStr);

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Claim = Buffer.from(JSON.stringify(claimSet)).toString('base64url');
  const signatureInput = `${base64Header}.${base64Claim}`;

  let signature: string;
  try {
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signatureInput);
    signature = signer.sign(cleanPrivateKey, 'base64url');
  } catch (signErr: any) {
    console.error('Crypto Sign Error:', signErr);
    throw new Error('صيغة المفتاح الخاص (GOOGLE_PRIVATE_KEY) غير صحيحة. يرجى التأكد من نقل مفتاح Service Account بشكل كامل وصحيح.');
  }

  const jwt = `${signatureInput}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`فشل المصادقة مع حساب الخدمة (Service Account): ${errText}`);
  }

  const data = await res.json();
  return data.access_token;
}

/**
 * Obtains an access token using Google OAuth Refresh Token
 */
async function getAccessTokenFromRefreshToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`فشل تجديد رمز الوصول (Refresh Token): ${errText}`);
  }

  const data = await res.json();
  return data.access_token;
}

/**
 * Fetches sheet titles in the spreadsheet
 */
async function getSpreadsheetSheetTitles(spreadsheetId: string, teacherToken?: string): Promise<string[]> {
  try {
    let accessToken: string | null = null;
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const apiKey = process.env.GOOGLE_API_KEY;

    if (serviceAccountEmail && privateKey) {
      accessToken = await getServiceAccountAccessToken(serviceAccountEmail, privateKey);
    } else if (refreshToken && clientId && clientSecret) {
      accessToken = await getAccessTokenFromRefreshToken(clientId, clientSecret, refreshToken);
    } else if (teacherToken) {
      accessToken = teacherToken;
    }

    let url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
    const headers: Record<string, string> = {};

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    } else if (apiKey) {
      url += `&key=${apiKey}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      console.warn('Failed to fetch spreadsheet titles:', await response.text());
      return [];
    }

    const data = await response.json();
    const titles = (data.sheets || []).map((s: any) => s?.properties?.title).filter(Boolean);
    console.log('Discovered Spreadsheet Titles:', titles);
    return titles;
  } catch (err) {
    console.warn('Error fetching spreadsheet titles:', err);
    return [];
  }
}

/**
 * Fetches sheet data using either Service Account, Refresh Token, API Key, or Bearer token
 */
async function fetchSheetValues(spreadsheetId: string, range: string, teacherToken?: string): Promise<any[][]> {
  let accessToken: string | null = null;
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const apiKey = process.env.GOOGLE_API_KEY;

  if (serviceAccountEmail && privateKey) {
    accessToken = await getServiceAccountAccessToken(serviceAccountEmail, privateKey);
  } else if (refreshToken && clientId && clientSecret) {
    accessToken = await getAccessTokenFromRefreshToken(clientId, clientSecret, refreshToken);
  } else if (teacherToken) {
    accessToken = teacherToken;
  }

  let url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`;
  const headers: Record<string, string> = {};

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  } else if (apiKey) {
    url += `&key=${apiKey}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 401 || response.status === 403) {
      throw new Error('فشل الوصول إلى Google Sheets: لا توجد صلاحيات كافية لقرائة جدول البيانات.');
    }
    if (response.status === 404) {
      throw new Error('فشل الوصول إلى Google Sheets: معرف جدول البيانات (Spreadsheet ID) غير صحيح أو غير موجود.');
    }
    throw new Error(`خطأ أثناء قراءة البيانات من Google Sheets (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.values || [];
}

/**
 * Core function for processing student lookup for Parent Portal
 */
export async function processParentLookup(
  rawStudentCode: string,
  rawParentPhone: string,
  providedSpreadsheetId?: string,
  teacherToken?: string
): Promise<StudentLookupResult> {
  const studentCode = normalizeString(rawStudentCode);
  const parentPhone = normalizePhone(rawParentPhone);

  if (!studentCode || !parentPhone) {
    return {
      success: false,
      error: 'يرجى إدخال كود الطالب ورقم الهاتف بشكل صحيح.',
    };
  }

  const spreadsheetId =
    providedSpreadsheetId ||
    process.env.GOOGLE_SPREADSHEET_ID ||
    process.env.VITE_SPREADSHEET_ID ||
    '';

  if (!spreadsheetId) {
    return {
      success: false,
      error: 'لم يتم إعداد معرف جدول البيانات (Spreadsheet ID) في الخادم.',
    };
  }

  try {
    const sheetTitles = await getSpreadsheetSheetTitles(spreadsheetId, teacherToken);

    // Dynamic candidate matching for student data sheet
    const studentCandidateNames = [
      ...sheetTitles.filter((t) => /طلاب|بيانات|student/i.test(t)),
      ...sheetTitles,
      'بيانات الطلاب',
      'الطلاب',
      'Sheet1',
      'Students',
    ];

    let studentRows: any[][] = [];
    const triedNames = new Set<string>();

    for (const sheetName of studentCandidateNames) {
      if (triedNames.has(sheetName)) continue;
      triedNames.add(sheetName);
      try {
        const rows = await fetchSheetValues(spreadsheetId, `'${sheetName}'!A2:J1000`, teacherToken);
        if (rows && rows.length > 0) {
          studentRows = rows;
          break;
        }
      } catch (err) {
        continue;
      }
    }

    if (studentRows.length === 0) {
      // Try fallback to range A2:J1000 without sheet name
      try {
        studentRows = await fetchSheetValues(spreadsheetId, `A2:J1000`, teacherToken);
      } catch (err: any) {
        console.warn('Fallback sheet fetch error:', err);
      }
    }

    if (studentRows.length === 0) {
      return {
        success: false,
        error: 'لم يتم العثور على ورقة بيانات الطلاب في جدول البيانات المحدد.',
      };
    }

    // Find matching student
    let matchedRow: any[] | null = null;
    for (const row of studentRows) {
      const rowCode = normalizeString(row[0] || '');
      const rowPhone = normalizePhone(row[3] || '');

      const isCodeMatch = rowCode.toLowerCase() === studentCode.toLowerCase();
      const isPhoneMatch =
        rowPhone.length >= 7 &&
        parentPhone.length >= 7 &&
        (rowPhone.endsWith(parentPhone) || parentPhone.endsWith(rowPhone) || rowPhone === parentPhone);

      if (isCodeMatch && isPhoneMatch) {
        matchedRow = row;
        break;
      }
    }

    if (!matchedRow) {
      return {
        success: false,
        error: 'كود الطالب أو رقم الهاتف غير صحيح. يرجى التأكد من المدخلات والمحاولة مجدداً.',
      };
    }

    // Parse matched student
    const attendanceCount = parseInt(matchedRow[4] || '0', 10) || 0;
    const absenceCount = parseInt(matchedRow[5] || '0', 10) || 0;
    let attendancePercentage = 100;
    if (matchedRow[6]) {
      attendancePercentage = parseFloat(matchedRow[6].toString().replace('%', '')) || 100;
    } else {
      const total = attendanceCount + absenceCount;
      attendancePercentage = total > 0 ? Math.round((attendanceCount / total) * 100) : 100;
    }

    const studentObj = {
      code: matchedRow[0] || '',
      name: matchedRow[1] || '',
      grade: matchedRow[2] || '',
      phone: matchedRow[3] || '',
      attendance: attendanceCount,
      absence: absenceCount,
      attendancePercentage,
      exam1: matchedRow[7] || '',
      exam2: matchedRow[8] || '',
      notes: matchedRow[9] || '',
    };

    // Find sheet titles for related logs
    const attendanceSheetName = sheetTitles.find((t) => /حضور|سجل|attendance/i.test(t)) || 'سجل الحضور';
    const gradesSheetName = sheetTitles.find((t) => /درجات|اختبار|امتحان|grades|exam/i.test(t)) || 'الدرجات';
    const paymentsSheetName = sheetTitles.find((t) => /مصروفات|مدفوعات|مالية|payment/i.test(t)) || 'المصروفات';

    // Fetch related attendance logs
    let attendanceLogs: Array<any> = [];
    try {
      const logRows = await fetchSheetValues(spreadsheetId, `'${attendanceSheetName}'!A2:E2000`, teacherToken);
      attendanceLogs = logRows
        .filter((row) => normalizeString(row[1] || '').toLowerCase() === studentCode.toLowerCase())
        .map((row) => ({
          date: row[0] || '',
          studentCode: row[1] || '',
          studentName: row[2] || '',
          grade: row[3] || '',
          status: (row[4] === 'غائب' ? 'غائب' : 'حاضر') as 'حاضر' | 'غائب',
        }));
    } catch (err) {
      console.warn('Attendance logs fetch warning:', err);
    }

    // Fetch related grades
    let gradeEntries: Array<any> = [];
    try {
      const gradeRows = await fetchSheetValues(spreadsheetId, `'${gradesSheetName}'!A2:G2000`, teacherToken);
      gradeEntries = gradeRows
        .filter((row) => normalizeString(row[0] || '').toLowerCase() === studentCode.toLowerCase())
        .map((row) => ({
          studentCode: row[0] || '',
          studentName: row[1] || '',
          subject: row[2] || '',
          examName: row[3] || '',
          score: row[4] ? Number(row[4]) : 0,
          maxScore: row[5] ? Number(row[5]) : 0,
          examDate: row[6] || '',
        }));
    } catch (err) {
      console.warn('Grades fetch warning:', err);
    }

    // Fetch related payment records
    let paymentRecords: Array<any> = [];
    try {
      const paymentRows = await fetchSheetValues(spreadsheetId, `'${paymentsSheetName}'!A2:G5000`, teacherToken);
      paymentRecords = paymentRows
        .filter((row) => normalizeString(row[0] || '').toLowerCase() === studentCode.toLowerCase())
        .map((row) => ({
          studentCode: row[0] || '',
          studentName: row[1] || '',
          paymentDate: row[2] || '',
          amountPaid: row[3] ? Number(row[3].toString().replace(/[^\d.-]/g, '')) || 0 : 0,
          totalFees: row[4] ? Number(row[4].toString().replace(/[^\d.-]/g, '')) || 0 : 0,
          remainingBalance: row[5] ? Number(row[5].toString().replace(/[^\d.-]/g, '')) || 0 : 0,
          notes: row[6] || '',
        }));
    } catch (err) {
      console.warn('Payment records fetch warning:', err);
    }

    return {
      success: true,
      student: studentObj,
      attendanceLogs,
      gradeEntries,
      paymentRecords,
    };
  } catch (err: any) {
    console.error('Parent Lookup Backend Error:', err);
    return {
      success: false,
      error: err.message || 'حدث خطأ أثناء الاتصال بقاعدة البيانات. يرجى المحاولة لاحقاً.',
    };
  }
}
