import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import type { MedicalReportRow } from './types';

type ToastVariant = 'success' | 'error' | 'info';

export function buildSimplePdfBase64(input: { title: string; lines: string[] }) {
  const sanitize = (s: string) => {
    const raw = String(s ?? '');
    const ascii = raw
      .split('')
      .map((ch) => {
        const code = ch.charCodeAt(0);
        if (code === 9 || code === 10 || code === 13) return ' ';
        if (code < 32 || code > 126) return '?';
        return ch;
      })
      .join('');
    return ascii.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  };

  const wrap = (s: string, maxLen: number) => {
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
  };

  const lines = [input.title, '', ...input.lines]
    .flatMap((l) => wrap(l, 90))
    .map((l) => sanitize(l));

  const fontSize = 12;
  const leading = 14;
  const startX = 72;
  const startY = 760;

  const contentStream =
    `BT\n/F1 ${fontSize} Tf\n${leading} TL\n${startX} ${startY} Td\n` +
    lines.map((l) => `(${l}) Tj\nT*\n`).join('') +
    `ET\n`;

  const objects: Array<string> = [];
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  objects.push(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
  );
  objects.push('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');
  objects.push(`5 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`);

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
}) {
  try {
    const { report, language, getLocalYyyyMmDd, showToast } = input;

    const rid = String(report.report_id ?? report.appointment_id ?? report.clinic_id ?? 'report');
    const created = String(report.created_at || '').slice(0, 10) || getLocalYyyyMmDd();
    const filename = `healhub_medical_report_${rid}_${created}.pdf`;

    const doctor = report.doctor_name ? `Dr. ${String(report.doctor_name)}` : 'Unknown';
    const specialization = report.specialization ? String(report.specialization) : '';
    const link = report.appointment_id
      ? `Appointment #${String(report.appointment_id)}`
      : report.clinic_id
        ? `Clinic #${String(report.clinic_id)}`
        : '';

    const lines = [
      `Date: ${created}`,
      `Doctor: ${doctor}${specialization ? ` (${specialization})` : ''}`,
      link ? `Link: ${link}` : '',
      '',
      `Diagnosis: ${String(report.diagnosis || '')}`,
      '',
      `Prescription: ${String(report.prescription || '')}`,
      report.notes ? `Notes: ${String(report.notes)}` : '',
    ].filter(Boolean);

    const pdfBase64 = buildSimplePdfBase64({ title: 'HealHub Medical Report', lines });
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
