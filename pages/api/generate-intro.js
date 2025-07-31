// ===== FILE: pages/api/generate-intro.js - KOMPLETT =====
import OpenAI from 'openai';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

const INTRO_STYLES = {
  professional: {
    name: 'Profesjonell',
    prompt: `Skriv en profesjonell "Om boligen" tekst for prospekt. 
    Bruk bullet points for nøkkelinformasjon.
    Start med meglerfirma/megler hvis oppgitt.
    Fokuser på fakta og salgspoeng.
    Avslutt med "Velkommen til visning!" eller lignende.`
  },
  narrative: {
    name: 'Fortellende',
    prompt: `Skriv en engasjerende "Om boligen" tekst i fortellende stil.
    Beskriv beliggenhet, områdets kvaliteter og boligens beste egenskaper.
    Flytende tekst uten bullet points.
    Mal deg et bilde av hvordan det er å bo her.`
  },
  compact: {
    name: 'Kompakt',
    prompt: `Skriv en kort og konsis "Om boligen" tekst.
    Kun de viktigste punktene i bullet-format.
    Maks 5-7 punkter.
    Rett på sak.`
  }
};

// Analyser boliginfo for å foreslå målgruppe
function suggestTargetGroup(propertyInfo) {
  const info = propertyInfo.toLowerCase();
  
  // Sjekk pris for førstegangskjøpere
  const priceMatch = info.match(/prisantydning:?\s*([0-9\s]+)/);
  if (priceMatch) {
    const price = parseInt(priceMatch[1].replace(/\s/g, ''));
    if (price < 2500000) {
      return { group: 'firstTime', reason: 'Pris under 2,5 millioner' };
    }
  }
  
  // Sjekk for barnefamilier
  const bedroomMatch = info.match(/(\d+)\s*soverom/i);
  const bathroomMatch = info.match(/(\d+)\s*bad/i);
  if (bedroomMatch && parseInt(bedroomMatch[1]) >= 3) {
    return { group: 'family', reason: '3 eller flere soverom' };
  }
  if (bathroomMatch && parseInt(bathroomMatch[1]) >= 2) {
    return { group: 'family', reason: '2 eller flere bad' };
  }
  
  // Sjekk for seniorer
  if (info.includes('heis') || 
      info.includes('ett plan') || 
      info.includes('1 etasje') ||
      info.includes('lite vedlikehold') ||
      info.includes('borettslag') ||
      info.includes('sameie')) {
    return { group: 'senior', reason: 'Heis/ett plan/borettslag' };
  }
  
  // Sjekk for investorer
  if (info.includes('utleie') || 
      info.includes('hybel') || 
      info.includes('sokkel')) {
    return { group: 'investor', reason: 'Utleiemuligheter' };
  }
  
  return { group: 'standard', reason: 'Generell bolig' };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    propertyInfo, 
    address, 
    style = 'professional',
    meglerInfo // f.eks "Nordvik v/Daniel Høyer Oland"
  } = req.body;

  if (!propertyInfo) {
    return res.status(400).json({ error: 'Mangler boliginformasjon' });
  }

  try {
    // Foreslå målgruppe
    const targetGroupSuggestion = suggestTargetGroup(propertyInfo);
    
    // Hent stil-instruksjoner
    const styleInstructions = INTRO_STYLES[style]?.prompt || INTRO_STYLES.professional.prompt;
    
    // Generer introduksjon
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: `Du er en norsk eiendomsmegler som skriver "Om boligen" tekster for prospekt.
        
        FORMAT:
        **Om boligen**
        ${meglerInfo ? `**${meglerInfo} presenterer ${address}!**` : ''}
        
        ${styleInstructions}
        
        REGLER:
        - Skriv på norsk bokmål
        - Vær faktabasert men engasjerende
        - Fremhev de beste egenskapene
        - Unngå overdrivelser
        - Bruk info fra boligbeskrivelsen`
      }, {
        role: "user",
        content: `Adresse: ${address || 'Ukjent adresse'}
        
        Boliginformasjon:
        ${propertyInfo}
        
        Skriv en "${style}" introduksjonstekst.`
      }],
      max_tokens: 400,
      temperature: 0.7
    });

    const intro = response.choices[0].message.content.trim();

    res.status(200).json({ 
      intro,
      targetGroupSuggestion,
      style: INTRO_STYLES[style]?.name || 'Profesjonell'
    });

  } catch (error) {
    console.error('Generate intro error:', error);
    res.status(500).json({ error: 'Kunne ikke generere introduksjon' });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};