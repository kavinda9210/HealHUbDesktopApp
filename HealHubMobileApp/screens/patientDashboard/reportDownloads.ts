import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import type { MedicalReportRow } from './types';

type ToastVariant = 'success' | 'error' | 'info';

type ReportSection = {
  title: string;
  value: string;
  emphasize?: boolean;
};

function escapePdfText(s: string) {
  return String(s ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function sanitizeAscii(s: string) {
  const raw = String(s ?? '');
  return raw
    .split('')
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code === 9 || code === 10 || code === 13) return ' ';
      if (code < 32 || code > 126) return '?';
      return ch;
    })
    .join('');
}

function wrapText(s: string, maxLen: number) {
  const out: string[] = [];
  let text = String(s ?? '').trim();
  while (text.length > maxLen) {
    let cut = text.lastIndexOf(' ', maxLen);
    if (cut < Math.floor(maxLen * 0.6)) cut = maxLen;
    out.push(text.slice(0, cut).trim());
    text = text.slice(cut).trim();
  }
  if (text) out.push(text);
  return out;
}

export function buildSimplePdfBase64(input: {
  title: string;
  subtitle?: string;
  lines: string[];
  sections?: ReportSection[];
  brandDetails?: string[];
  summary?: string[];
  patientName?: string;
  nextClinicDate?: string;
}) {
  const sanitize = (s: string) => {
    const raw = String(s ?? '');
    return escapePdfText(sanitizeAscii(raw));
  };

  const sections = input.sections || [];
  const brandDetails = input.brandDetails || ['HealHub Medical Reports', 'Patient care record'];
  const bodyLines = [input.title, input.subtitle || '', ...input.lines].flatMap((l) => wrapText(l, 82));

  const contentLines: string[] = [];
  contentLines.push('q');
  contentLines.push('0.98 1 0.99 rg');
  contentLines.push('0 0 612 792 re f');
  contentLines.push('Q');

  // Header band
  contentLines.push('q');
  contentLines.push('0.18 0.55 0.35 rg');
  contentLines.push('0 690 612 102 re f');
  contentLines.push('Q');
  contentLines.push('BT');
  contentLines.push('/F2 24 Tf');
  contentLines.push('1 1 1 rg');
  contentLines.push('70 744 Td');
  contentLines.push(`(${sanitize('HealHub')}) Tj`);
  contentLines.push('ET');
  contentLines.push('BT');
  contentLines.push('/F3 11 Tf');
  contentLines.push('1 1 1 rg');
  contentLines.push('70 725 Td');
  contentLines.push(`(${sanitize(brandDetails[0])}) Tj`);
  contentLines.push('ET');
  contentLines.push('BT');
  contentLines.push('/F1 10 Tf');
  contentLines.push('1 1 1 rg');
  contentLines.push('70 710 Td');
  contentLines.push(`(${sanitize(brandDetails[1])}) Tj`);
  contentLines.push('ET');

  // Logo mark
  contentLines.push('q');
  contentLines.push('q');
  contentLines.push('0.18 0.55 0.35 rg');
  contentLines.push('490 714 50 50 re f');
  contentLines.push('Q');
  contentLines.push('q');
  contentLines.push('1 1 1 rg');
  contentLines.push('503 727 24 24 re f');
  contentLines.push('510 719 8 8 re f');
  contentLines.push('510 751 8 8 re f');
  contentLines.push('500 729 8 8 re f');
  contentLines.push('516 729 8 8 re f');
  contentLines.push('500 743 8 8 re f');
  contentLines.push('516 743 8 8 re f');
  contentLines.push('Q');
  contentLines.push('BT');
  contentLines.push('/F2 13 Tf');
  contentLines.push('1 1 1 rg');
  contentLines.push('504 733 Td');
  contentLines.push('(+) Tj');
  contentLines.push('ET');

  // Main title / subtitle
  contentLines.push('BT');
  contentLines.push('/F2 18 Tf');
  contentLines.push('0.09 0.12 0.2 rg');
  contentLines.push('70 660 Td');
  contentLines.push(`(${sanitize(input.title)}) Tj`);
  contentLines.push('ET');
  if (input.subtitle) {
    contentLines.push('BT');
    contentLines.push('/F1 10 Tf');
    contentLines.push('0.35 0.41 0.47 rg');
    contentLines.push('70 646 Td');
    contentLines.push(`(${sanitize(input.subtitle)}) Tj`);
    contentLines.push('ET');
  }

  // Report summary card
  contentLines.push('q');
  contentLines.push('1 1 1 rg');
  contentLines.push('62 520 488 110 re f');
  contentLines.push('Q');
  contentLines.push('q');
  contentLines.push('0.86 0.9 0.88 rg');
  contentLines.push('62 520 488 110 re S');
  contentLines.push('Q');
  contentLines.push('BT');
  contentLines.push('/F3 11 Tf');
  contentLines.push('0.18 0.55 0.35 rg');
  contentLines.push('78 606 Td');
  contentLines.push('(Report Summary) Tj');
  contentLines.push('ET');

  const summaryItems = (input.summary || []).filter(Boolean);
  if (input.patientName) summaryItems.unshift(`Patient: ${input.patientName}`);
  if (input.nextClinicDate) summaryItems.unshift(`Next clinic date: ${input.nextClinicDate}`);

  let summaryY = 586;
  for (const item of summaryItems.slice(0, 3)) {
    contentLines.push('BT');
    contentLines.push('/F1 10 Tf');
    contentLines.push('0.09 0.12 0.2 rg');
    contentLines.push(`78 ${summaryY} Td`);
    contentLines.push(`(${sanitize(item)}) Tj`);
    contentLines.push('ET');
    summaryY -= 18;
  }

  // Body sections
  let y = 490;
  const renderSection = (title: string, value: string, emphasize = false) => {
    const wrappedValue = wrapText(value || '-', emphasize ? 72 : 82);
    contentLines.push('BT');
    contentLines.push('/F3 11 Tf');
    contentLines.push('0.18 0.55 0.35 rg');
    contentLines.push(`70 ${y} Td`);
    contentLines.push(`(${sanitize(title)}) Tj`);
    contentLines.push('ET');
    let localY = y - 15;
    for (const line of wrappedValue) {
      contentLines.push('BT');
      contentLines.push(`/F${emphasize ? '2' : '1'} ${emphasize ? 12 : 10} Tf`);
      contentLines.push('0.09 0.12 0.2 rg');
      contentLines.push(`70 ${localY} Td`);
      contentLines.push(`(${sanitize(line)}) Tj`);
      contentLines.push('ET');
      localY -= emphasize ? 16 : 14;
    }
    contentLines.push('q');
    contentLines.push('0.9 0.92 0.91 rg');
    contentLines.push(`70 ${localY + 4} 472 1 re f`);
    contentLines.push('Q');
    y = localY - 14;
  };

  for (const section of sections) {
    renderSection(section.title, section.value, !!section.emphasize);
    if (y < 140) break;
  }

  if (sections.length === 0) {
    for (const line of bodyLines.slice(4)) {
      if (y < 140) break;
      contentLines.push('BT');
      contentLines.push('/F1 10 Tf');
      contentLines.push('0.09 0.12 0.2 rg');
      contentLines.push(`70 ${y} Td`);
      contentLines.push(`(${sanitize(line)}) Tj`);
      contentLines.push('ET');
      y -= 14;
    }
  }

  // Footer
  contentLines.push('q');
  contentLines.push('0.18 0.55 0.35 rg');
  contentLines.push('62 76 488 1 re f');
  contentLines.push('Q');
  contentLines.push('BT');
  contentLines.push('/F1 9 Tf');
  contentLines.push('0.35 0.41 0.47 rg');
  contentLines.push('70 56 Td');
  contentLines.push('(c) HealHub. Generated from your medical records. Tj');
  contentLines.push('ET');

  const contentStream = `${contentLines.join('\n')}\n`;

  const objects: Array<string> = [];
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  objects.push(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> >> /Contents 7 0 R >>\nendobj\n',
  );
  objects.push('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n');
  objects.push('6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>\nendobj\n');
  objects.push(`7 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`);

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  const btoaFn = (globalThis as any)?.btoa as undefined | ((s: string) => string);
  const BufferCtor = (globalThis as any)?.Buffer as any;
  if (BufferCtor && typeof BufferCtor.from === 'function') {
    return BufferCtor.from(pdf, 'binary').toString('base64');
  }
  if (typeof btoaFn === 'function') {
    return btoaFn(pdf);
  }

  let binary = '';
  for (let i = 0; i < pdf.length; i++) binary += String.fromCharCode(pdf.charCodeAt(i) & 0xff);
  try {
    const btoaAny = (globalThis as any)?.btoa as any;
    return typeof btoaAny === 'function' ? String(btoaAny(binary)) : '';
  } catch {
    return '';
  }
}

export async function downloadReportAsTextAsync(input: {
  report: MedicalReportRow;
  language: string;
  getLocalYyyyMmDd: () => string;
  showToast: (variant: ToastVariant, message: string) => void;
}) {
  try {
    const { report, language, getLocalYyyyMmDd, showToast } = input;

    const rid = String(report.report_id ?? report.appointment_id ?? report.clinic_id ?? 'report');
    const created = String(report.created_at || '').slice(0, 10) || getLocalYyyyMmDd();
    const filename = `healhub_medical_report_${rid}_${created}.txt`;

    const content = [
      'HealHub Medical Report',
      `Date: ${created}`,
      `Doctor: ${report.doctor_name || 'Unknown'}`,
      report.specialization ? `Specialization: ${report.specialization}` : '',
      '',
      `Diagnosis: ${report.diagnosis || ''}`,
      '',
      `Prescription: ${report.prescription || ''}`,
      report.notes ? `\nNotes: ${report.notes}` : '',
      '',
    ]
      .filter(Boolean)
      .join('\n');

    if (Platform.OS === 'android' && (FileSystem as any).StorageAccessFramework) {
      try {
        const SAF = (FileSystem as any).StorageAccessFramework;
        const perm = await SAF.requestDirectoryPermissionsAsync();
        if (!perm || perm.granted !== true || !perm.directoryUri) {
          showToast(
            'info',
            language === 'sinhala' ? 'බාගත කිරීම අවලංගු කළා.' : language === 'tamil' ? 'பதிவிறக்கம் ரத்து செய்யப்பட்டது.' : 'Download cancelled.',
          );
          return;
        }

        const nameNoExt = filename.replace(/\.txt$/i, '');
        const safUri = await SAF.createFileAsync(perm.directoryUri, nameNoExt, 'text/plain');
        await SAF.writeAsStringAsync(safUri, content, { encoding: FileSystem.EncodingType?.UTF8 ?? 'utf8' });

        showToast('success', language === 'sinhala' ? 'වාර්තාව බාගත කළා.' : language === 'tamil' ? 'அறிக்கை பதிவிறக்கப்பட்டது.' : 'Report downloaded.');
        return;
      } catch (e) {
        console.log('SAF download failed:', e);
      }
    }

    showToast(
      'info',
      language === 'sinhala'
        ? 'බාගත කිරීම සඳහා Android device එකක් භාවිතා කරන්න.'
        : language === 'tamil'
          ? 'பதிவிறக்க Android சாதனம் தேவை.'
          : 'Download is available on Android.',
    );
  } catch (e) {
    console.log('downloadReportAsTextAsync failed:', e);
    input.showToast(
      'error',
      input.language === 'sinhala'
        ? 'වාර්තාව බාගත කළ නොහැක. Dev build එකක් භාවිතා කරන්න.'
        : input.language === 'tamil'
          ? 'அறிக்கையை பதிவிறக்க முடியவில்லை. Dev build பயன்படுத்தவும்.'
          : 'Unable to download report. Use a development build.',
    );
  }
}

export async function downloadReportAsPdfAsync(input: {
  report: MedicalReportRow;
  language: string;
  getLocalYyyyMmDd: () => string;
  showToast: (variant: ToastVariant, message: string) => void;
  patientName?: string;
  nextClinicDate?: string;
}) {
  try {
    const { report, language, getLocalYyyyMmDd, showToast, patientName, nextClinicDate } = input;

    const rid = String(report.report_id ?? report.appointment_id ?? report.clinic_id ?? 'report');
    const created = String(report.created_at || '').slice(0, 10) || getLocalYyyyMmDd();
    const filename = `healhub_medical_report_${rid}_${created}.pdf`;

    const doctor = report.doctor_name ? `Dr. ${String(report.doctor_name)}` : 'Unknown';
    const specialization = report.specialization ? String(report.specialization) : '';
    const fallbackClinicLabel = report.appointment_id
      ? `Appointment #${String(report.appointment_id)}`
      : report.clinic_id
        ? `Clinic #${String(report.clinic_id)}`
        : '';

    const lines = [
      `Date: ${created}`,
      `Doctor: ${doctor}${specialization ? ` (${specialization})` : ''}`,
      '',
      `Diagnosis: ${String(report.diagnosis || '')}`,
      '',
      `Prescription: ${String(report.prescription || '')}`,
      report.notes ? `Notes: ${String(report.notes)}` : '',
    ].filter(Boolean);

    const pdfBase64 = buildSimplePdfBase64({
      title: 'Medical Report',
      subtitle: 'HealHub Patient Record',
      lines,
      summary: [
        `Date: ${created}`,
        `Doctor: ${doctor}${specialization ? ` (${specialization})` : ''}`,
        nextClinicDate ? `Next clinic date: ${nextClinicDate}` : fallbackClinicLabel ? `Visit: ${fallbackClinicLabel}` : `Report ID: ${rid}`,
      ],
      patientName: patientName || String((report as any)?.patient_name || (report as any)?.patientName || ''),
      nextClinicDate: nextClinicDate || String((report as any)?.next_clinic_date || ''),
      brandDetails: ['Professional medical summary', `Report ID: ${rid}`],
      sections: [
        { title: 'Patient', value: String((report as any)?.patient_name || (report as any)?.patientName || 'Patient') },
        { title: 'Date', value: created },
        { title: 'Doctor', value: `${doctor}${specialization ? ` (${specialization})` : ''}`, emphasize: true },
        ...(nextClinicDate ? [{ title: 'Next clinic date', value: nextClinicDate }] : fallbackClinicLabel ? [{ title: 'Visit', value: fallbackClinicLabel }] : []),
        { title: 'Diagnosis', value: String(report.diagnosis || 'No diagnosis provided') },
        { title: 'Prescription', value: String(report.prescription || 'No prescription provided') },
        ...(report.notes ? [{ title: 'Notes', value: String(report.notes) }] : []),
      ],
    });
    if (!pdfBase64) {
      showToast('error', 'Unable to generate PDF.');
      return;
    }

    if (Platform.OS === 'android' && (FileSystem as any).StorageAccessFramework) {
      const SAF = (FileSystem as any).StorageAccessFramework;
      const perm = await SAF.requestDirectoryPermissionsAsync();
      if (!perm || perm.granted !== true || !perm.directoryUri) {
        showToast(
          'info',
          language === 'sinhala' ? 'බාගත කිරීම අවලංගු කළා.' : language === 'tamil' ? 'பதிவிறக்கம் ரத்து செய்யப்பட்டது.' : 'Download cancelled.',
        );
        return;
      }

      const nameNoExt = filename.replace(/\.pdf$/i, '');
      const safUri = await SAF.createFileAsync(perm.directoryUri, nameNoExt, 'application/pdf');
      await SAF.writeAsStringAsync(safUri, pdfBase64, { encoding: FileSystem.EncodingType.Base64 });

      showToast('success', language === 'sinhala' ? 'PDF වාර්තාව බාගත කළා.' : language === 'tamil' ? 'PDF அறிக்கை பதிவிறக்கப்பட்டது.' : 'PDF downloaded.');
      return;
    }

    showToast(
      'info',
      language === 'sinhala'
        ? 'PDF බාගත කිරීම Android device එකකට සීමා කර ඇත.'
        : language === 'tamil'
          ? 'PDF பதிவிறக்கம் Android சாதனத்திற்கு மட்டும்.'
          : 'PDF download is available on Android.',
    );
  } catch (e) {
    console.log('downloadReportAsPdfAsync failed:', e);
    input.showToast('error', 'Unable to download PDF.');
  }
}
