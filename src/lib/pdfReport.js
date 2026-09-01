import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * Gera um PDF de relatório de ocorrências (semanal geral ou individual).
 * @param {Object} params
 * @param {string} params.schoolName
 * @param {string} params.periodStart - "DD/MM/YYYY"
 * @param {string} params.periodEnd - "DD/MM/YYYY"
 * @param {Array} params.incidents - array de incidents com joins
 * @param {string} params.reportType - "general" (default) ou "individual"
 * @returns {Promise<Uint8Array>} bytes do PDF
 */
export async function generateWeeklyReportPDF({ schoolName, periodStart, periodEnd, incidents, reportType = 'general' }) {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const PAGE_W = 595; // A4 width pt
  const PAGE_H = 842; // A4 height pt
  const MARGIN = 50;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  // Cores
  const BLACK = rgb(0, 0, 0);
  const DARK = rgb(0.1, 0.1, 0.1);
  const GRAY = rgb(0.4, 0.4, 0.4);
  const WINE = rgb(0.608, 0.11, 0.149);
  const LIGHT_GRAY = rgb(0.92, 0.92, 0.92);

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  // ---- helpers ----
  const newPage = () => {
    page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };

  const checkPageBreak = (needed = 60) => {
    if (y < MARGIN + needed) newPage();
  };

  const drawText = (text, x, fontSize, font, color = BLACK, maxWidth = null) => {
    const sanitized = (text || '').replace(/[\r\n]+/g, ' ').trim();
    if (!sanitized) return;

    if (maxWidth) {
      // Quebra texto longo em linhas
      const words = sanitized.split(' ');
      let line = '';
      for (const word of words) {
        const test = line ? line + ' ' + word : word;
        const testWidth = font.widthOfTextAtSize(test, fontSize);
        if (testWidth > maxWidth && line) {
          checkPageBreak(fontSize + 4);
          page.drawText(line, { x, y, size: fontSize, font, color });
          y -= fontSize + 4;
          line = word;
        } else {
          line = test;
        }
      }
      if (line) {
        checkPageBreak(fontSize + 4);
        page.drawText(line, { x, y, size: fontSize, font, color });
        y -= fontSize + 4;
      }
    } else {
      checkPageBreak(fontSize + 4);
      page.drawText(sanitized, { x, y, size: fontSize, font, color });
      y -= fontSize + 4;
    }
  };

  const drawLine = (color = LIGHT_GRAY, thickness = 1) => {
    checkPageBreak(10);
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness, color });
    y -= 8;
  };

  const drawRect = (height = 24) => {
    checkPageBreak(height + 10);
    page.drawRectangle({ x: MARGIN, y: y - height + 16, width: CONTENT_W, height, color: rgb(0.97, 0.93, 0.93) });
  };

  // ---- Agrupar incidents por aluno ----
  const byStudent = {};
  for (const inc of incidents) {
    const sid = inc.student_id;
    if (!byStudent[sid]) byStudent[sid] = { student: inc.students, incidents: [] };
    byStudent[sid].incidents.push(inc);
  }

  const totalStudents = Object.keys(byStudent).length;
  const totalIncidents = incidents.length;

  // ================================================================
  // CABEÇALHO
  // ================================================================
  if (reportType === 'individual') {
    drawText('RELATÓRIO INDIVIDUAL DE OCORRÊNCIAS', MARGIN, 16, fontBold, WINE);
    y -= 4;
    drawLine(WINE, 2);
    y -= 2;
    
    // Pegar infos do primeiro/único aluno
    const firstStudent = Object.values(byStudent)[0]?.student || {};
    const firstIncs = Object.values(byStudent)[0]?.incidents || [];
    const name = firstStudent?.name || 'Aluno';
    const ra = firstStudent?.enrollment || '—';
    const turma = firstStudent?.class_students?.[0]?.classes?.name || firstIncs[0]?.class_name || '—';

    drawText(`Aluno: ${name.toUpperCase()}`, MARGIN, 11, fontBold, DARK);
    drawText(`RA: ${ra}`, MARGIN, 11, fontReg, DARK);
    drawText(`Turma: ${turma.toUpperCase()}`, MARGIN, 11, fontReg, DARK);
    drawText(`Idade registrada nas ocorrências: conforme cada registro`, MARGIN, 11, fontReg, DARK);
    y -= 4;
    drawText(`Período: ${periodStart} até ${periodEnd}`, MARGIN, 11, fontReg, DARK);
    drawText(`Total de ocorrências: ${totalIncidents}`, MARGIN, 11, fontReg, DARK);
    
  } else {
    drawText('RELATÓRIO SEMANAL DE OCORRÊNCIAS', MARGIN, 16, fontBold, WINE);
    y -= 4;
    drawLine(WINE, 2);
    y -= 2;
    drawText(`Escola: ${schoolName}`, MARGIN, 11, fontBold, DARK);
    drawText(`Período: ${periodStart} até ${periodEnd}`, MARGIN, 11, fontReg, DARK);
    drawText(`Total de alunos envolvidos: ${totalStudents}`, MARGIN, 11, fontReg, DARK);
    drawText(`Total de ocorrências: ${totalIncidents}`, MARGIN, 11, fontReg, DARK);
  }
  
  y -= 10;
  drawLine();

  // ================================================================
  // BLOCO POR ALUNO
  // ================================================================
  for (const sid of Object.keys(byStudent)) {
    const { student, incidents: incs } = byStudent[sid];
    const name = student?.name || 'Aluno';
    const ra = student?.enrollment || '—';
    const turma = student?.class_students?.[0]?.classes?.name || incs[0]?.class_name || '—';
    const guardian = student?.guardian_name || '—';

    checkPageBreak(120);

    // Faixa colorida com nome do aluno
    drawRect(22);
    const nameText = `ALUNO: ${name.toUpperCase()}`;
    page.drawText(nameText, { x: MARGIN + 6, y: y - 2, size: 11, font: fontBold, color: WINE });
    y -= 22;

    if (reportType === 'general') {
      drawText(`RA: ${ra}`, MARGIN, 10, fontReg, DARK);
      drawText(`TURMA: ${turma.toUpperCase()}`, MARGIN, 10, fontReg, DARK);
      drawText(`RESPONSÁVEL: ${guardian.toUpperCase()}`, MARGIN, 10, fontReg, DARK);
      y -= 6;
    }

    // Cada ocorrência do aluno
    for (const inc of incs) {
      checkPageBreak(130);
      const dateStr = inc.incident_date_only
        ? new Date(inc.incident_date_only + 'T12:00:00').toLocaleDateString('pt-BR')
        : inc.incident_date
          ? new Date(inc.incident_date).toLocaleDateString('pt-BR')
          : '—';
      const timeStr = inc.incident_time || '—';
      const subjectStr = (inc.subject || '—').toUpperCase();
      const teacherStr = (inc.teacher_name || inc.profiles?.name || '—').toUpperCase();

      // Tipos de ocorrência
      const labels = (inc.incident_types_list || []).map(t => t.label);
      const outrosDesc = inc.outros_description;

      // Mensagem salva
      const msgSalva = inc.communications?.[0]?.message || null;

      if (reportType === 'general') {
        page.drawText('OCORRÊNCIA', { x: MARGIN, y, size: 9, font: fontBold, color: GRAY });
        y -= 14;
        drawText(`Data: ${dateStr}   Horário: ${timeStr}   Disciplina: ${subjectStr}   Professor(a): ${teacherStr}`, MARGIN, 9, fontReg, DARK, CONTENT_W);
        y -= 2;
        drawText('Ocorrências:', MARGIN, 9, fontBold, DARK);
        drawText(labels.join(', ') || outrosDesc || '—', MARGIN + 10, 9, fontReg, DARK, CONTENT_W - 10);
        if (outrosDesc && labels.length > 0 && !labels.some(l => l.toLowerCase() === 'outros')) {
          drawText(`Obs: ${outrosDesc}`, MARGIN + 10, 9, fontReg, GRAY, CONTENT_W - 10);
        }
      } else {
        // Formato pedido pelo prompt para relatório individual
        drawText(`Data: ${dateStr}`, MARGIN, 10, fontReg, DARK);
        drawText(`Horário: ${timeStr}`, MARGIN, 10, fontReg, DARK);
        drawText(`Disciplina: ${subjectStr}`, MARGIN, 10, fontReg, DARK);
        drawText(`Professor(a): ${teacherStr}`, MARGIN, 10, fontReg, DARK);
        y -= 4;
        
        drawText('Ocorrências:', MARGIN, 10, fontBold, DARK);
        labels.forEach(l => {
          drawText(l, MARGIN, 10, fontReg, DARK, CONTENT_W);
        });
        if (outrosDesc) {
          drawText(`(Outros): ${outrosDesc}`, MARGIN, 10, fontReg, DARK, CONTENT_W);
        }
      }
      y -= 4;

      if (msgSalva) {
        drawText(reportType === 'general' ? 'Mensagem ao responsável:' : 'Mensagem:', MARGIN, 9, fontBold, DARK);
        y -= 2;
        const linhas = msgSalva.split('\n');
        if (linhas.length > 0) {
          if (reportType === 'general') {
            drawText(`"${linhas[0]}`, MARGIN + 6, 9, fontReg, DARK, CONTENT_W - 12);
            for (let i = 1; i < linhas.length; i++) {
              if (linhas[i].trim()) drawText(linhas[i], MARGIN + 6, 9, fontReg, DARK, CONTENT_W - 12);
            }
          } else {
            drawText(`[ ${linhas[0]}`, MARGIN, 9, fontReg, DARK, CONTENT_W);
            for (let i = 1; i < linhas.length; i++) {
              if (linhas[i].trim()) drawText(linhas[i], MARGIN, 9, fontReg, DARK, CONTENT_W);
            }
            drawText(`]`, MARGIN, 9, fontReg, DARK, CONTENT_W);
          }
        }
        y -= 2;
      }

      y -= 10;
      drawLine();
    }

    if (reportType === 'general') {
      // Espaço de assinatura apenas no relatório geral (conforme original) ou no individual também? 
      // O prompt não menciona remover a assinatura no individual, mas simplificou a saída. Vamos manter no geral.
      checkPageBreak(90);
      y -= 4;
      drawText('DECLARAÇÃO DO RESPONSÁVEL:', MARGIN, 9, fontBold, DARK);
      drawText('"Declaro estar ciente das ocorrências e orientações apresentadas."', MARGIN + 6, 9, fontReg, DARK, CONTENT_W - 12);
      y -= 10;
      drawText('Assinatura do responsável:', MARGIN, 9, fontReg, DARK);
      y -= 4;
      page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + 260, y }, thickness: 0.8, color: BLACK });
      y -= 14;
      drawText('Nome do responsável:', MARGIN, 9, fontReg, DARK);
      y -= 4;
      page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + 260, y }, thickness: 0.8, color: BLACK });
      y -= 14;
      drawText('Data:  ____ / ____ / ______', MARGIN, 9, fontReg, DARK);
      y -= 12;
      drawLine();
      y -= 6;
    }
  }

  // ---- Rodapé na última página ----
  page.drawText(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, {
    x: MARGIN, y: MARGIN - 10, size: 8, font: fontReg, color: GRAY
  });
  page.drawText('Themis Class — Gestão Escolar de Ocorrências', {
    x: PAGE_W - MARGIN - 200, y: MARGIN - 10, size: 8, font: fontReg, color: GRAY
  });

  return await pdfDoc.save();
}
