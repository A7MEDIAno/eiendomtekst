// ===== FILE: pages/api/analyze-condition-report.js - TILSTANDSRAPPORT ANALYSE =====
import OpenAI from 'openai';
import formidable from 'formidable';
import fs from 'fs/promises';
import pdf from 'pdf-parse';
import os from 'os';
import path from 'path';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

// Parse tilstandsgrader
const CONDITION_GRADES = {
  'TG0': { text: 'Ingen avvik', color: 'green', description: 'Meget god stand' },
  'TG1': { text: 'Mindre avvik', color: 'yellow', description: 'Normal slitasje' },
  'TG2': { text: 'Vesentlige avvik', color: 'orange', description: 'Behov for tiltak' },
  'TG3': { text: 'Store avvik', color: 'red', description: 'Omfattende tiltak nødvendig' },
  'IU': { text: 'Ikke undersøkt', color: 'gray', description: 'Mangler vurdering' }
};

// Typiske komponenter i tilstandsrapport
const BUILDING_COMPONENTS = {
  'grunn_fundamentering': 'Grunn og fundamentering',
  'drenering': 'Drenering',
  'veggkonstruksjon': 'Yttervegger',
  'takkonstruksjon': 'Takkonstruksjon',
  'taktekking': 'Taktekking',
  'vinduer': 'Vinduer',
  'dorer': 'Dører',
  'bad': 'Våtrom/bad',
  'kjokken': 'Kjøkken',
  'varme': 'Oppvarming',
  'elektro': 'Elektrisk anlegg',
  'ror': 'Rør og sanitær',
  'ventilasjon': 'Ventilasjon'
};

// Analyser PDF-innhold
async function analyzePDFContent(pdfPath) {
  try {
    const dataBuffer = await fs.readFile(pdfPath);
    const pdfData = await pdf(dataBuffer);
    
    const text = pdfData.text;
    const findings = {
      buildingYear: null,
      renovations: [],
      conditionGrades: {},
      totalCost: null,
      criticalIssues: [],
      generalCondition: null,
      components: {}
    };

    // Finn byggeår
    const yearMatch = text.match(/[Bb]yggeår:?\s*(\d{4})/);
    if (yearMatch) {
      findings.buildingYear = parseInt(yearMatch[1]);
    }

    // Finn renoveringer
    const renovationPattern = /([Rr]enovert|[Oo]ppgradert|[Bb]yttet|[Nn]y[tt]?)\s+(\w+)\s+(\d{4})/g;
    let renovMatch;
    while ((renovMatch = renovationPattern.exec(text)) !== null) {
      findings.renovations.push({
        type: renovMatch[2],
        year: parseInt(renovMatch[3])
      });
    }

    // Finn tilstandsgrader
    Object.keys(BUILDING_COMPONENTS).forEach(component => {
      const pattern = new RegExp(`${BUILDING_COMPONENTS[component]}.*?TG\\s*(\\d|[0-3]|IU)`, 'i');
      const match = text.match(pattern);
      if (match) {
        const grade = match[1] === 'I' ? 'IU' : `TG${match[1]}`;
        findings.conditionGrades[component] = grade;
        findings.components[component] = {
          name: BUILDING_COMPONENTS[component],
          grade: grade,
          ...CONDITION_GRADES[grade]
        };
      }
    });

    // Finn estimerte kostnader
    const costPattern = /[Ee]stimert.*?kostnad.*?kr\.?\s*([\d\s]+)/;
    const costMatch = text.match(costPattern);
    if (costMatch) {
      findings.totalCost = parseInt(costMatch[1].replace(/\s/g, ''));
    }

    // Identifiser kritiske problemer (TG2 og TG3)
    Object.entries(findings.components).forEach(([key, component]) => {
      if (component.grade === 'TG2' || component.grade === 'TG3') {
        findings.criticalIssues.push({
          component: component.name,
          grade: component.grade,
          severity: component.grade === 'TG3' ? 'critical' : 'important'
        });
      }
    });

    // Vurder generell tilstand
    const grades = Object.values(findings.conditionGrades);
    const tg3Count = grades.filter(g => g === 'TG3').length;
    const tg2Count = grades.filter(g => g === 'TG2').length;
    const tg1Count = grades.filter(g => g === 'TG1').length;
    const tg0Count = grades.filter(g => g === 'TG0').length;

    if (tg3Count > 2 || (tg3Count > 0 && tg2Count > 3)) {
      findings.generalCondition = 'Betydelige oppgraderingsbehov';
    } else if (tg2Count > 3) {
      findings.generalCondition = 'Moderate oppgraderingsbehov';
    } else if (tg1Count > grades.length / 2) {
      findings.generalCondition = 'Normal slitasje for alderen';
    } else if (tg0Count > grades.length / 2) {
      findings.generalCondition = 'Meget god stand';
    } else {
      findings.generalCondition = 'Varierende tilstand';
    }

    return findings;
    
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Kunne ikke lese tilstandsrapport');
  }
}

// Generer tilpassede beskrivelser basert på tilstand
function generateConditionBasedDescriptions(findings, roomType) {
  const descriptions = {
    positive: [],
    neutral: [],
    needsWork: []
  };

  // Bad-spesifikke beskrivelser
  if (roomType === 'bad' && findings.components.bad) {
    const badGrade = findings.components.bad.grade;
    if (badGrade === 'TG0') {
      descriptions.positive.push('Badet holder meget høy standard');
      descriptions.positive.push('Våtrom uten anmerkninger i tilstandsrapport');
    } else if (badGrade === 'TG1') {
      descriptions.neutral.push('Bad med normal slitasje');
      descriptions.neutral.push('Våtrom i tilfredsstillende stand');
    } else if (badGrade === 'TG2' || badGrade === 'TG3') {
      descriptions.needsWork.push('Bad med oppgraderingsbehov');
      descriptions.needsWork.push('Våtrom krever tiltak');
    }
  }

  // Kjøkken-spesifikke beskrivelser
  if (roomType === 'kjøkken' && findings.components.kjokken) {
    const kjokkenGrade = findings.components.kjokken.grade;
    if (kjokkenGrade === 'TG0') {
      descriptions.positive.push('Kjøkkeninnredning i utmerket stand');
    } else if (kjokkenGrade === 'TG1') {
      descriptions.neutral.push('Kjøkken med forventet slitasje');
    }
  }

  // Generelle bygningsbeskrivelser
  if (roomType === 'fasade' || roomType === 'teknisk') {
    if (findings.generalCondition === 'Meget god stand') {
      descriptions.positive.push(`Bygning fra ${findings.buildingYear} i svært god stand`);
    } else {
      descriptions.neutral.push(`Byggeår ${findings.buildingYear} med ${findings.generalCondition.toLowerCase()}`);
    }
  }

  // Oppvarming
  if (roomType === 'stue' && findings.components.varme) {
    const varmeGrade = findings.components.varme.grade;
    if (varmeGrade === 'TG0' || varmeGrade === 'TG1') {
      descriptions.positive.push('Velfungerende oppvarmingssystem');
    }
  }

  // Vinduer
  if (findings.components.vinduer) {
    const vinduerGrade = findings.components.vinduer.grade;
    if (vinduerGrade === 'TG0') {
      descriptions.positive.push('Vinduer i meget god stand');
    } else if (vinduerGrade === 'TG2' || vinduerGrade === 'TG3') {
      descriptions.needsWork.push('Vinduer med utskiftingsbehov');
    }
  }

  return descriptions;
}

// Generer sammendrag for eiendomsmegler
async function generateConditionSummary(findings) {
  const prompt = `Basert på følgende tilstandsrapport-data, generer et profesjonelt sammendrag for eiendomsprospekt:

Byggeår: ${findings.buildingYear || 'Ukjent'}
Generell tilstand: ${findings.generalCondition}
Estimerte oppgraderingskostnader: ${findings.totalCost ? `kr ${findings.totalCost.toLocaleString('nb-NO')}` : 'Ikke spesifisert'}

Komponenter med tilstandsgrad:
${Object.entries(findings.components).map(([key, comp]) => 
  `- ${comp.name}: ${comp.grade} (${comp.text})`
).join('\n')}

Kritiske punkter:
${findings.criticalIssues.map(issue => 
  `- ${issue.component}: ${issue.severity === 'critical' ? 'Kritisk' : 'Viktig'} oppgraderingsbehov`
).join('\n')}

Renoveringer:
${findings.renovations.map(ren => 
  `- ${ren.type} (${ren.year})`
).join('\n')}

Skriv et balansert sammendrag på 3-4 setninger som:
1. Fremhever positive sider
2. Er ærlig om oppgraderingsbehov
3. Gir en helhetsvurdering
4. Passer i et eiendomsprospekt`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{
      role: "system",
      content: "Du er en erfaren eiendomsmegler som formulerer balanserte og ærlige beskrivelser basert på tilstandsrapporter."
    }, {
      role: "user",
      content: prompt
    }],
    max_tokens: 200,
    temperature: 0.7
  });

  return response.choices[0].message.content.trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse multipart form data
  const form = formidable({
    uploadDir: os.tmpdir(), // Bruker OS temp directory
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024 // 10MB
  });

  try {
    const [fields, files] = await form.parse(req);
    
    if (!files.report || !files.report[0]) {
      return res.status(400).json({ error: 'Mangler tilstandsrapport' });
    }

    const reportFile = files.report[0];
    
    // Analyser PDF
    const findings = await analyzePDFContent(reportFile.filepath);
    
    // Generer sammendrag
    const summary = await generateConditionSummary(findings);
    
    // Generer romspesifikke beskrivelsesforslag
    const roomDescriptions = {};
    const relevantRooms = ['bad', 'kjøkken', 'stue', 'fasade', 'teknisk'];
    
    relevantRooms.forEach(room => {
      roomDescriptions[room] = generateConditionBasedDescriptions(findings, room);
    });

    // Formater output
    const formattedInfo = `TILSTANDSRAPPORT SAMMENDRAG:
${summary}

BYGNINGSTEKNISK STATUS:
• Byggeår: ${findings.buildingYear || 'Ikke oppgitt'}
• Generell tilstand: ${findings.generalCondition}
${findings.totalCost ? `• Estimerte kostnader: kr ${findings.totalCost.toLocaleString('nb-NO')}` : ''}

TILSTANDSGRADER:
${Object.entries(findings.components).map(([key, comp]) => 
  `• ${comp.name}: ${comp.grade} - ${comp.text}`
).join('\n')}

${findings.criticalIssues.length > 0 ? `\nOPPMERKSOMHETSPUNKTER:
${findings.criticalIssues.map(issue => 
  `• ${issue.component} (${issue.severity === 'critical' ? 'Kritisk' : 'Viktig'})`
).join('\n')}` : ''}

${findings.renovations.length > 0 ? `\nUTFØRTE OPPGRADERINGER:
${findings.renovations.map(ren => 
  `• ${ren.type} (${ren.year})`
).join('\n')}` : ''}`;

    // Rydd opp - slett midlertidig fil
    await fs.unlink(reportFile.filepath);

    res.status(200).json({
      success: true,
      findings,
      summary,
      roomDescriptions,
      formattedInfo,
      recommendations: {
        marketing: findings.generalCondition === 'Meget god stand' 
          ? 'Fremhev den tekniske kvaliteten og lave vedlikeholdsbehov'
          : 'Vær åpen om tilstand, men fokuser på potensial og beliggenhet',
        pricing: findings.totalCost && findings.totalCost > 500000
          ? 'Vurder prisjustering for oppgraderingsbehov'
          : 'Teknisk standard støtter prisforventning',
        targetGroup: findings.criticalIssues.length > 2
          ? 'Oppussingsobjekt - målrett mot investorer eller handy kjøpere'
          : 'Bred målgruppe - innflyttingsklar standard'
      }
    });

  } catch (error) {
    console.error('Condition report error:', error);
    res.status(500).json({ 
      error: 'Kunne ikke analysere tilstandsrapport',
      details: error.message 
    });
  }
}

export const config = {
  api: {
    bodyParser: false, // Disable body parser for file upload
  },
};y