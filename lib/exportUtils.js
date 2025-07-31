// lib/exportUtils.js - KOMPLETT VERSJON
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } from 'docx';

// Helper function for date formatting
const getCurrentDate = () => {
  return new Date().toLocaleDateString('nb-NO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Export to Word format
export async function exportToWord(data) {
  const paragraphs = [];
  
  // Title
  paragraphs.push(
    new Paragraph({
      text: 'Eiendomsbeskrivelser',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    })
  );
  
  // Address
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: data.address || 'Ukjent adresse',
          bold: true,
          size: 28
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    })
  );
  
  // Date
  paragraphs.push(
    new Paragraph({
      text: `Generert: ${getCurrentDate()}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    })
  );
  
  // Property intro (Om boligen)
  if (data.propertyIntro) {
    paragraphs.push(
      new Paragraph({
        text: 'Om boligen',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      })
    );
    
    paragraphs.push(
      new Paragraph({
        text: data.propertyIntro,
        spacing: { after: 400 }
      })
    );
  }
  
  // Property info
  if (data.propertyInfo) {
    paragraphs.push(
      new Paragraph({
        text: 'Boliginformasjon',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      })
    );
    
    // Split property info by newlines to preserve formatting
    const infoLines = data.propertyInfo.split('\n');
    infoLines.forEach(line => {
      if (line.trim()) {
        paragraphs.push(
          new Paragraph({
            text: line,
            spacing: { after: 100 }
          })
        );
      }
    });
    
    paragraphs.push(
      new Paragraph({
        text: '',
        spacing: { after: 400 }
      })
    );
  }
  
  // Condition report summary
  if (data.conditionReport) {
    paragraphs.push(
      new Paragraph({
        text: 'Tilstandsrapport',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      })
    );
    
    const report = data.conditionReport;
    paragraphs.push(
      new Paragraph({
        text: `Byggeår: ${report.findings.buildingYear || 'Ukjent'}`,
        spacing: { after: 100 }
      })
    );
    
    paragraphs.push(
      new Paragraph({
        text: `Tilstand: ${report.findings.generalCondition}`,
        spacing: { after: 100 }
      })
    );
    
    if (report.findings.totalCost) {
      paragraphs.push(
        new Paragraph({
          text: `Estimerte kostnader: kr ${report.findings.totalCost.toLocaleString('nb-NO')}`,
          spacing: { after: 400 }
        })
      );
    }
  }
  
  // Image descriptions
  paragraphs.push(
    new Paragraph({
      text: 'Bildebeskrivelser',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 }
    })
  );
  
  data.results.forEach((result, index) => {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${result.imageTypeNorwegian} (Bilde ${index + 1}):`,
            bold: true
          })
        ],
        spacing: { before: 200, after: 100 }
      })
    );
    
    paragraphs.push(
      new Paragraph({
        text: result.description,
        spacing: { after: 200 }
      })
    );
  });
  
  // Footer
  paragraphs.push(
    new Paragraph({
      text: '',
      spacing: { before: 800 }
    })
  );
  
  paragraphs.push(
    new Paragraph({
      text: '─────────────────────────────────────',
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    })
  );
  
  paragraphs.push(
    new Paragraph({
      text: 'Generert med A7 Generate Pro',
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 }
    })
  );
  
  paragraphs.push(
    new Paragraph({
      text: '© ' + new Date().getFullYear() + ' A7 Generate - AI-drevne eiendomsbeskrivelser',
      alignment: AlignmentType.CENTER
    })
  );
  
  // Create document
  const doc = new Document({
    sections: [{
      properties: {},
      children: paragraphs
    }]
  });
  
  // Generate blob
  const blob = await Packer.toBlob(doc);
  return blob;
}

// Export to PDF format
export async function exportToPDF(data) {
  // Dynamisk import for å unngå SSR-problemer
  const { default: jsPDF } = await import('jspdf');
  
  const doc = new jsPDF();
  let yPosition = 20;
  const lineHeight = 7;
  const pageHeight = 280;
  const pageWidth = 190;
  const marginLeft = 20;
  const contentWidth = 170;
  
  // Helper function for text wrapping
  const addWrappedText = (text, x, y, maxWidth) => {
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line) => {
      if (y > pageHeight) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, x, y);
      y += lineHeight;
    });
    return y;
  };
  
  // Title
  doc.setFontSize(24);
  doc.text('Eiendomsbeskrivelser', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;
  
  // Address
  doc.setFontSize(16);
  doc.text(data.address || 'Ukjent adresse', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;
  
  // Date
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generert: ${getCurrentDate()}`, pageWidth / 2, yPosition, { align: 'center' });
  doc.setTextColor(0);
  yPosition += 20;
  
  // Property intro
  if (data.propertyIntro) {
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Om boligen', marginLeft, yPosition);
    doc.setFont(undefined, 'normal');
    yPosition += 10;
    
    doc.setFontSize(11);
    yPosition = addWrappedText(data.propertyIntro, marginLeft, yPosition, contentWidth);
    yPosition += 10;
  }
  
  // Property info
  if (data.propertyInfo) {
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Boliginformasjon', marginLeft, yPosition);
    doc.setFont(undefined, 'normal');
    yPosition += 10;
    
    doc.setFontSize(11);
    const infoLines = data.propertyInfo.split('\n');
    infoLines.forEach(line => {
      if (line.trim()) {
        yPosition = addWrappedText(line, marginLeft, yPosition, contentWidth);
        yPosition += 2;
      }
    });
    yPosition += 10;
  }
  
  // Condition report
  if (data.conditionReport) {
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Tilstandsrapport', marginLeft, yPosition);
    doc.setFont(undefined, 'normal');
    yPosition += 10;
    
    doc.setFontSize(11);
    const report = data.conditionReport;
    doc.text(`Byggeår: ${report.findings.buildingYear || 'Ukjent'}`, marginLeft, yPosition);
    yPosition += lineHeight;
    
    doc.text(`Tilstand: ${report.findings.generalCondition}`, marginLeft, yPosition);
    yPosition += lineHeight;
    
    if (report.findings.totalCost) {
      doc.text(`Estimerte kostnader: kr ${report.findings.totalCost.toLocaleString('nb-NO')}`, marginLeft, yPosition);
      yPosition += lineHeight;
    }
    yPosition += 10;
  }
  
  // Image descriptions
  if (yPosition > pageHeight - 40) {
    doc.addPage();
    yPosition = 20;
  }
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Bildebeskrivelser', marginLeft, yPosition);
  doc.setFont(undefined, 'normal');
  yPosition += 10;
  
  data.results.forEach((result, index) => {
    if (yPosition > pageHeight - 30) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`${result.imageTypeNorwegian} (Bilde ${index + 1})`, marginLeft, yPosition);
    doc.setFont(undefined, 'normal');
    yPosition += 7;
    
    doc.setFontSize(11);
    yPosition = addWrappedText(result.description, marginLeft, yPosition, contentWidth);
    yPosition += 8;
  });
  
  // Add page numbers and footer
  const pageCount = doc.internal.getNumberOfPages();
  doc.setFontSize(8);
  doc.setTextColor(100);
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Page number
    doc.text(
      `Side ${i} av ${pageCount}`,
      pageWidth / 2,
      290,
      { align: 'center' }
    );
    // Footer
    doc.text(
      'A7 Generate Pro - AI-drevne eiendomsbeskrivelser',
      pageWidth / 2,
      295,
      { align: 'center' }
    );
  }
  
  return doc.output('blob');
}

// Helper function to download file
export function downloadFile(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// Export to text format
export function exportToText(data) {
  let fullText = '';
  
  // Header
  fullText += 'EIENDOMSBESKRIVELSER\n';
  fullText += `${data.address || 'Ukjent adresse'}\n`;
  fullText += `Generert: ${getCurrentDate()}\n`;
  fullText += '═'.repeat(60) + '\n\n';
  
  // Property intro
  if (data.propertyIntro) {
    fullText += 'OM BOLIGEN\n';
    fullText += '─'.repeat(40) + '\n';
    fullText += data.propertyIntro + '\n\n';
  }
  
  // Property info
  if (data.propertyInfo) {
    fullText += 'BOLIGINFORMASJON\n';
    fullText += '─'.repeat(40) + '\n';
    fullText += data.propertyInfo + '\n\n';
  }
  
  // Condition report
  if (data.conditionReport) {
    fullText += 'TILSTANDSRAPPORT\n';
    fullText += '─'.repeat(40) + '\n';
    fullText += `Byggeår: ${data.conditionReport.findings.buildingYear || 'Ukjent'}\n`;
    fullText += `Tilstand: ${data.conditionReport.findings.generalCondition}\n`;
    if (data.conditionReport.findings.totalCost) {
      fullText += `Estimerte kostnader: kr ${data.conditionReport.findings.totalCost.toLocaleString('nb-NO')}\n`;
    }
    fullText += '\n';
  }
  
  // Image descriptions
  fullText += 'BILDEBESKRIVELSER\n';
  fullText += '─'.repeat(40) + '\n\n';
  
  data.results.forEach((result, index) => {
    fullText += `${result.imageTypeNorwegian} (Bilde ${index + 1}):\n`;
    fullText += result.description + '\n\n';
  });
  
  // Footer
  fullText += '\n' + '═'.repeat(60) + '\n';
  fullText += 'Generert med A7 Generate Pro\n';
  fullText += `© ${new Date().getFullYear()} A7 Generate - AI-drevne eiendomsbeskrivelser\n`;
  
  return fullText;
}

// Export to JSON format
export function exportToJSON(data) {
  const exportData = {
    metadata: {
      generatedAt: new Date().toISOString(),
      generatedBy: 'A7 Generate Pro',
      version: '1.0'
    },
    property: {
      address: data.address || 'Ukjent adresse',
      intro: data.propertyIntro || null,
      info: data.propertyInfo || null,
      conditionReport: data.conditionReport || null
    },
    descriptions: data.results.map((result, index) => ({
      index: index + 1,
      roomType: result.imageType,
      roomTypeNorwegian: result.imageTypeNorwegian,
      description: result.description,
      imageUrl: result.imageUrl
    }))
  };
  
  return JSON.stringify(exportData, null, 2);
}