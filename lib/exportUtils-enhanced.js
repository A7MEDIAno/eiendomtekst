// lib/exportUtils-enhanced.js - FORBEDRET EKSPORT MED ALLE DATA
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';

// Helper function for date formatting
const getCurrentDate = () => {
  return new Date().toLocaleDateString('nb-NO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Enhanced export to Word format with all analyses
export async function exportToWord(data) {
  const sections = [];
  
  // Title page
  sections.push({
    properties: {},
    children: [
      new Paragraph({
        text: 'EIENDOMSRAPPORT',
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: data.address || 'Ukjent adresse',
            bold: true,
            size: 36
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      }),
      new Paragraph({
        text: `Generert: ${getCurrentDate()}`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 }
      })
    ]
  });

  // Main content
  const mainContent = [];

  // Executive summary hvis vi har markedsdata
  if (data.marketData?.analysis) {
    mainContent.push(
      new Paragraph({
        text: 'SAMMENDRAG',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      })
    );

    const summaryTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph('Boligtype')],
              width: { size: 30, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph(data.propertyType?.typeName || 'Ikke identifisert')],
              width: { size: 70, type: WidthType.PERCENTAGE }
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph('Gjennomsnittlig m²-pris')],
            }),
            new TableCell({
              children: [new Paragraph(`${data.marketData.analysis.avgPricePerSqm?.toLocaleString('nb-NO')} kr`)],
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph('Prisvekst siste år')],
            }),
            new TableCell({
              children: [new Paragraph(`${data.marketData.analysis.priceGrowthPercent}%`)],
            })
          ]
        })
      ]
    });

    mainContent.push(summaryTable);
    mainContent.push(new Paragraph({ text: '', spacing: { after: 400 } }));
  }

  // Property intro (Om boligen)
  if (data.propertyIntro) {
    mainContent.push(
      new Paragraph({
        text: 'OM BOLIGEN',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      }),
      new Paragraph({
        text: data.propertyIntro,
        spacing: { after: 400 }
      })
    );
  }

  // Property info
  if (data.propertyInfo) {
    mainContent.push(
      new Paragraph({
        text: 'BOLIGINFORMASJON',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      })
    );
    
    const infoLines = data.propertyInfo.split('\n');
    infoLines.forEach(line => {
      if (line.trim()) {
        mainContent.push(
          new Paragraph({
            text: line,
            spacing: { after: 100 }
          })
        );
      }
    });
    
    mainContent.push(new Paragraph({ text: '', spacing: { after: 400 } }));
  }

  // Condition report summary
  if (data.conditionReport?.findings) {
    mainContent.push(
      new Paragraph({
        text: 'TILSTANDSRAPPORT',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      })
    );

    const report = data.conditionReport.findings;
    mainContent.push(
      new Paragraph({
        text: `Byggeår: ${report.buildingYear || 'Ukjent'}`,
        spacing: { after: 100 }
      }),
      new Paragraph({
        text: `Generell tilstand: ${report.generalCondition}`,
        spacing: { after: 100 }
      })
    );
    
    if (report.totalCost) {
      mainContent.push(
        new Paragraph({
          text: `Estimerte oppgraderingskostnader: kr ${report.totalCost.toLocaleString('nb-NO')}`,
          spacing: { after: 100 }
        })
      );
    }

    // Tilstandsgrader
    if (report.components && Object.keys(report.components).length > 0) {
      mainContent.push(
        new Paragraph({
          text: 'Tilstandsgrader:',
          bold: true,
          spacing: { before: 200, after: 100 }
        })
      );

      Object.entries(report.components).forEach(([key, comp]) => {
        mainContent.push(
          new Paragraph({
            text: `• ${comp.name}: ${comp.grade} - ${comp.text}`,
            spacing: { after: 50 }
          })
        );
      });
    }

    mainContent.push(new Paragraph({ text: '', spacing: { after: 400 } }));
  }

  // Market analysis
  if (data.marketData) {
    mainContent.push(
      new Paragraph({
        text: 'MARKEDSANALYSE',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      })
    );

    if (data.marketData.recommendations) {
      data.marketData.recommendations.forEach(rec => {
        mainContent.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${rec.title}: `,
                bold: true
              }),
              new TextRun({
                text: rec.description
              })
            ],
            spacing: { after: 100 }
          })
        );
      });
    }

    mainContent.push(new Paragraph({ text: '', spacing: { after: 400 } }));
  }

  // Location info
  if (data.locationInfo) {
    mainContent.push(
      new Paragraph({
        text: 'OMRÅDEBESKRIVELSE',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      })
    );

    if (data.locationInfo.areaDescription) {
      mainContent.push(
        new Paragraph({
          text: data.locationInfo.areaDescription,
          spacing: { after: 200 }
        })
      );
    }

    if (data.locationInfo.generatedInfo) {
      const infoLines = data.locationInfo.generatedInfo.split('\n');
      infoLines.forEach(line => {
        if (line.trim() && !line.includes('BELIGGENHET')) {
          mainContent.push(
            new Paragraph({
              text: line,
              spacing: { after: 50 }
            })
          );
        }
      });
    }

    mainContent.push(new Paragraph({ text: '', spacing: { after: 400 } }));
  }

  // Competitor analysis
  if (data.competitorAnalysis?.advantages) {
    mainContent.push(
      new Paragraph({
        text: 'KONKURRANSEFORTRINN',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      })
    );

    data.competitorAnalysis.advantages.forEach(adv => {
      mainContent.push(
        new Paragraph({
          text: `• ${adv.feature} (${adv.rarity})`,
          spacing: { after: 100 }
        })
      );
    });

    if (data.competitorAnalysis.pricingStrategy) {
      mainContent.push(
        new Paragraph({
          text: `\nPrisstrategi: ${data.competitorAnalysis.pricingStrategy}`,
          spacing: { after: 200 }
        })
      );
    }

    mainContent.push(new Paragraph({ text: '', spacing: { after: 400 } }));
  }

  // Image descriptions
  mainContent.push(
    new Paragraph({
      text: 'BILDEBESKRIVELSER',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 }
    })
  );

  const imageTypeTranslations = {
    'stue': 'Stue',
    'kjøkken': 'Kjøkken',
    'bad': 'Bad',
    'soverom': 'Soverom',
    'gang': 'Gang/Entré',
    'wc': 'WC',
    'vaskerom': 'Vaskerom',
    'spisestue': 'Spisestue',
    'hjemmekontor': 'Hjemmekontor',
    'balkong': 'Balkong',
    'terrasse': 'Terrasse',
    'hage': 'Hage',
    'utsikt': 'Utsikt',
    'fasade': 'Fasade',
    'fellesarealer': 'Fellesarealer',
    'parkering': 'Parkering',
    'bod': 'Bod/Kjeller',
    'planløsning': 'Planløsning',
    'annet': 'Annet'
  };

  data.results.forEach((result, index) => {
    mainContent.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${imageTypeTranslations[result.imageType] || result.imageType} (Bilde ${index + 1}):`,
            bold: true
          })
        ],
        spacing: { before: 200, after: 100 }
      }),
      new Paragraph({
        text: result.description,
        spacing: { after: 200 }
      })
    );
  });

  // Add main content to section
  sections.push({
    properties: {},
    children: mainContent
  });

  // Create document
  const doc = new Document({
    sections: sections,
    creator: 'A7 Generate Pro',
    title: `Eiendomsrapport - ${data.address}`,
    description: 'AI-generert eiendomsrapport'
  });
  
  // Generate blob
  const blob = await Packer.toBlob(doc);
  return blob;
}

// Enhanced export to PDF format
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
  
  // Helper functions
  const checkNewPage = (neededSpace = 30) => {
    if (yPosition + neededSpace > pageHeight) {
      doc.addPage();
      yPosition = 20;
      return true;
    }
    return false;
  };

  const addWrappedText = (text, x, y, maxWidth, fontSize = 11) => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line) => {
      if (y > pageHeight - 10) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, x, y);
      y += lineHeight;
    });
    return y;
  };

  const addSection = (title, content, titleSize = 14) => {
    checkNewPage(40);
    
    // Section title
    doc.setFontSize(titleSize);
    doc.setFont(undefined, 'bold');
    doc.text(title, marginLeft, yPosition);
    doc.setFont(undefined, 'normal');
    yPosition += 10;
    
    // Section content
    if (typeof content === 'string') {
      yPosition = addWrappedText(content, marginLeft, yPosition, contentWidth);
    } else if (Array.isArray(content)) {
      content.forEach(item => {
        checkNewPage(20);
        if (typeof item === 'string') {
          yPosition = addWrappedText(item, marginLeft, yPosition, contentWidth);
        } else if (item.label && item.value) {
          doc.setFont(undefined, 'bold');
          doc.text(`${item.label}: `, marginLeft, yPosition);
          const labelWidth = doc.getTextWidth(`${item.label}: `);
          doc.setFont(undefined, 'normal');
          doc.text(item.value, marginLeft + labelWidth, yPosition);
          yPosition += lineHeight;
        }
      });
    }
    
    yPosition += 10; // Space after section
  };

  // Title page
  doc.setFontSize(24);
  doc.text('EIENDOMSRAPPORT', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;
  
  doc.setFontSize(18);
  doc.text(data.address || 'Ukjent adresse', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generert: ${getCurrentDate()}`, pageWidth / 2, yPosition, { align: 'center' });
  doc.setTextColor(0);
  yPosition += 30;

  // Executive summary
  if (data.marketData?.analysis || data.propertyType) {
    addSection('SAMMENDRAG', [
      data.propertyType && { label: 'Boligtype', value: data.propertyType.typeName },
      data.marketData?.analysis && { label: 'Snitt m²-pris', value: `${data.marketData.analysis.avgPricePerSqm?.toLocaleString('nb-NO')} kr` },
      data.marketData?.analysis && { label: 'Prisvekst', value: `${data.marketData.analysis.priceGrowthPercent}%` }
    ].filter(Boolean));
  }

  // Property intro
  if (data.propertyIntro) {
    addSection('OM BOLIGEN', data.propertyIntro);
  }

  // Property info
  if (data.propertyInfo) {
    addSection('BOLIGINFORMASJON', data.propertyInfo.split('\n').filter(line => line.trim()));
  }

  // Condition report
  if (data.conditionReport?.findings) {
    const report = data.conditionReport.findings;
    addSection('TILSTANDSRAPPORT', [
      { label: 'Byggeår', value: report.buildingYear || 'Ukjent' },
      { label: 'Tilstand', value: report.generalCondition },
      report.totalCost && { label: 'Kostnader', value: `kr ${report.totalCost.toLocaleString('nb-NO')}` }
    ].filter(Boolean));
  }

  // Market analysis
  if (data.marketData?.recommendations) {
    const content = data.marketData.recommendations.map(rec => 
      `${rec.title}: ${rec.description}`
    );
    addSection('MARKEDSANALYSE', content);
  }

  // Location info
  if (data.locationInfo?.areaDescription) {
    addSection('OMRÅDEBESKRIVELSE', data.locationInfo.areaDescription);
  }

  // Competitor advantages
  if (data.competitorAnalysis?.advantages && data.competitorAnalysis.advantages.length > 0) {
    const content = data.competitorAnalysis.advantages.map(adv => 
      `• ${adv.feature} (${adv.rarity})`
    );
    addSection('KONKURRANSEFORTRINN', content);
  }

  // Image descriptions
  doc.addPage(); // Start on new page
  yPosition = 20;
  addSection('BILDEBESKRIVELSER', []);
  
  data.results.forEach((result, index) => {
    checkNewPage(30);
    
    const imageTypeTranslations = {
      'stue': 'Stue',
      'kjøkken': 'Kjøkken',
      'bad': 'Bad',
      'soverom': 'Soverom',
      'gang': 'Gang/Entré',
      'wc': 'WC',
      'vaskerom': 'Vaskerom',
      'spisestue': 'Spisestue',
      'hjemmekontor': 'Hjemmekontor',
      'balkong': 'Balkong',
      'terrasse': 'Terrasse',
      'hage': 'Hage',
      'utsikt': 'Utsikt',
      'fasade': 'Fasade',
      'fellesarealer': 'Fellesarealer',
      'parkering': 'Parkering',
      'bod': 'Bod/Kjeller',
      'planløsning': 'Planløsning',
      'annet': 'Annet'
    };
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`${imageTypeTranslations[result.imageType] || result.imageType} (Bilde ${index + 1})`, marginLeft, yPosition);
    doc.setFont(undefined, 'normal');
    yPosition += 7;
    
    yPosition = addWrappedText(result.description, marginLeft, yPosition, contentWidth);
    yPosition += 5;
  });

  // Add page numbers and footer
  const pageCount = doc.internal.getNumberOfPages();
  doc.setFontSize(8);
  doc.setTextColor(100);
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Side ${i} av ${pageCount}`,
      pageWidth / 2,
      290,
      { align: 'center' }
    );
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