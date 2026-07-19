export interface Student {
  rowIndex?: number; // 0-based index in the Sheets values array (after headers, so actual row is rowIndex + 2)
  code: string;       // Column A
  name: string;       // Column B
  grade: string;      // Column C
  phone: string;      // Column D
  attendance: number; // Column E
  absence: number;    // Column F
  attendancePercentage: number; // Column G (calculated: attendance / (attendance + absence) * 100)
  exam1: number | string;  // Column H
  exam2: number | string;  // Column I
  notes: string;      // Column J
}

export interface SheetInfo {
  id: string;
  name: string;
}

export interface AttendanceLog {
  rowIndex?: number;   // 1-based row index in "سجل الحضور" sheet
  date: string;        // Column A (YYYY-MM-DD)
  studentCode: string; // Column B
  studentName: string; // Column C
  grade: string;       // Column D
  status: 'حاضر' | 'غائب'; // Column E
}

export interface GradeEntry {
  rowIndex?: number;
  studentCode: string;   // Column A
  studentName: string;   // Column B
  subject: string;       // Column C
  examName: string;      // Column D
  score: number;         // Column E
  maxScore: number;      // Column F
  examDate: string;      // Column G (YYYY-MM-DD)
}

export interface UserCredential {
  username: string;   // Column A
  password: string;   // Column B
  role: string;       // Column C
}

export interface PaymentRecord {
  rowIndex?: number;
  studentCode: string;      // Column A
  studentName: string;      // Column B
  paymentDate: string;      // Column C (YYYY-MM-DD)
  amountPaid: number;       // Column D
  totalFees: number;        // Column E
  remainingBalance: number;  // Column F
  notes: string;            // Column G
}


