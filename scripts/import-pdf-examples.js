// ===== FILE: scripts/import-pdf-examples.js - IMPORTER PDF EKSEMPLER =====
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Eksempler fra PDF organisert etter romtype
const pdfExamples = {
  stue: [
    "I stuen er det store vindusposter som underbygger en god følelse av plass og sørger for rikelig med dagslys inn.",
    "Her lar stuen seg enkelt innrede med en hyggelig sofasone med tilhørende møblement og en spisesone i tilknytning til kjøkkenet.",
    "Romslig stue/spisestue med vedovn fra 2022.",
    "Det er også varmepumpe i stuen og utgang til veranda.",
    "Store vindusflater sørger for et godt lysinnslipp.",
    "Innbydende stue og kjøkken i åpen løsning.",
    "Fra stuen er det utgang til trivelig balkong.",
    "Åpen stue/kjøkken løsning.",
    "Stuen er lys og romslig med gode møbleringsmuligheter.",
    "Det er god plass til flere sittegrupper.",
    "Fra stuen er det utgang til innglasset balkong.",
    "Meget innbydende med vedovn og varmepumpe.",
    "Romslig med god plass til spisegruppe.",
    "Fra leilighetens oppholdsrom blir man bergtatt av den vakre utsikten mot elven.",
    "Stuen har en lekker, integrert gasspeis med enkel varmeregulering.",
    "Det er flotte lys- og utsiktsforhold via store panoramavinduer.",
    "Her får man følelsen av lune og hyggelige rom med god atmosfære, malt i vakre, tidsriktige farger.",
    "Stuen har en meget god romløsning, med naturlig sone for sofagruppe og øvrige sittegrupper.",
    "De store vindusflatene gir fantastisk lysinslipp til boligens oppholdsrom.",
    "Boligen har gjennomgående flott fiskebensparkett på gulv i oppholdsrom, slette vegger, spesialbygget listverk og rosetter i himling.",
    "Stuen er innredet med flott kakkelovn og murt peis som sørger for en hyggelig stemning og god oppvarming til boligens hovedetasje.",
    "Innvendig er det lagt stor vekt på moderne løsninger i en perfekt kombinasjon med originale særpreg som kjennetegner tidsepoken fra tidlig 1900 tallet.",
    "Fra stuen er det utgang til vestvendt veranda med god plass til flere sittegrupper.",
    "Denne lekre og innholdsrike familieboligen fremstår som særdeles innbydende og gjennomført, med gode romløsninger over to etasjer.",
    "I boligens hovedetasje er det en lun og innbydende stue samt spisestue og kjøkken.",
    "I stuen og spisestuen er det god plass til sofagruppe og stort langbord.",
    "Fra stuen er det utgang til østvendt balkong med god plass til sittegruppe.",
    "Stuen har gode lysforhold gjennom store vindusflater.",
    "Stuen er innredet med peisovn og åpen peis som gir god oppvarming.",
    "Rommet har god plass til sofagruppe, spisesgruppe og øvrig møblement.",
    "Stuen er luftig og romslig med store vinduer i front.",
    "Stuen og spisestuen i boligens hovedetasje er et nydelig og luftig allrom hvor man har god plass til sofagruppe og spisestue."
  ],
  
  kjøkken: [
    "Flott innredning med rikelig av lagringsplass i over- og underskap.",
    "Tidløs kjøkkeninnredning fra Systemkjøkken.",
    "Romslig kjøkken med lyse, profilerte fronter.",
    "Det er meget god oppbevaringsplass på dette kjøkkenet.",
    "Kjøkken fra 2015 med kjøkkenøy.",
    "Kjøkkenet ligger i åpen løsning mot stuen.",
    "Kjøkkenet er meget delikat med moderne innredning og benkeplate av stein.",
    "Det er integrerte hvitevarer som stekeovn, mikrobølgeovn, kjøl-/fryseskap og platetopp.",
    "Kjøkkenet har stilren og moderne innredning med spesiallaget fronter og benkeplater i stein fra Sigvartsen Steinindustrier.",
    "Kjøkkenet ligger i delvis åpen løsning mot spisestuen.",
    "Det er svært god oppbevaringsplass i skuffer og skap samt rikelig med arbeidsplass på benkeflater.",
    "Praktisk kjøkkenøy med oppbevaringsplass og ekstra arbeidsplass.",
    "Det er lagt stor vekt på eksklusive hvitevarer.",
    "Kjøkkenet har stilren og moderne innredning, med slette hvite fronter og sorte detaljer.",
    "Det er meget god oppbevaringsplass i praktiske skuffeseksjoner, underskap og høyskap.",
    "Kjøkkenet har god arbeidsplass på benkeplater av stein, og fremstår som et svært hyggelig og sosialt allrom.",
    "Det er integrerte hvitevarer som oppvaskmaskin, platetopp, stekeovn og mikrobølgeovn.",
    "Kjøkkenet har tidløs innredning, med profilerte fronter og delvis glassfronter på overskap.",
    "Det er meget god oppbevaringsplass i innredning og rikelig med arbeidsplass på laminert benkeplate.",
    "Nyere kjøkken (2017) med tidløse slette fronter med grepskant."
  ],
  
  gang: [
    "Fra inngangspartiet/gang kan du stige rett ut på terrassen!",
    "Velkommen inn!",
    "Velkommen inn i trivelig entrè!",
    "Hyggelig entrè med god plass til oppbevaring av sko og yttertøy.",
    "Innbydende entrè med god plass til oppbevaring av sko og yttertøy.",
    "Fra hyggelig inngangsparti kommer man inn til romslig flislagt entré med inngang til toalettrom/vaskerom. Det er videre adkomst til stue, spisestue og kjøkken.",
    "Innbydende entré med adkomst fra overbygd inngangsparti - oppbevaringsplass i garderobeskap."
  ],
  
  bad: [
    "Baderommet i 1.etasje har flisbelagt gulv og vegger. Rommet er utstyrt med servant, skap, dusjkabinett og toalett.",
    "Pent baderom med gulvvarme.",
    "Det er høyskap ved vaskemaskin for praktisk oppbevaringsplass.",
    "Pent baderom renovert av borettslaget i 2019.",
    "Pent, flislagt baderom med varmekabler i gulv.",
    "Baderommet ble vesentlig oppgradert i 2023.",
    "Pent flislagt bad fra Telerør i 2016/17.",
    "Romslig, flislagt baderom med varmekabler.",
    "Stilren spesialbygget baderominnreding med to servanter og god oppbevaringsplass i skuffer.",
    "Baderommet i hovedetasjen har delvis fliser på vegger og gulv, med varmekabler.",
    "Baderommet har dusjnisje med dobbel dusjgarnityr på vegg og glassdør.",
    "Bad i 2. etasje har pene Carerra marmorfliser, med varmekabler i gulv.",
    "Spesialbygget baderomsinnredning med overliggende servant i marmor. Heldekkende speil på vegg.",
    "Baderommet har dusjhjørne med glassvegger laget av glassmester.",
    "I boligens hovedetasje er det baderom og separat toalettrom/vaskerom.",
    "Baderommet er meget delikat og innbydende, med tidsriktige store fliser på vegger og gulv, med varmekabler.",
    "Rommet er innredet med dusjhjørne med innfellbare glassvegger og vegghengt dusjgarnityr.",
    "Baderommet har stilren baderomsinnredning med heldekkende dobbel servant og god oppbevaringsplass i dype skuffer.",
    "Baderommet har våtromsplater på vegger og flis på gulv.",
    "Nydelig utsikt fra flere soner i denne stuen.",
    "Baderommet har fliser med varmekabler i gulv, det er forøvrig gulvvarme i hele sokkeletasjen."
  ],
  
  soverom: [
    "Innbydende hovedsoverom.",
    "Soverom med garderobeskap.",
    "Det er parkettgulv på begge soverom og i oppholdsrom.",
    "Soverom av god størrelse med praktisk, integrert skyvedørsgarderobe.",
    "Hovedsoverom med romslig, integrert garderobe.",
    "Hovedsoverom har god plass til dobbeltseng og er innredet med plassbygget garderobeskap.",
    "Master bedroom har god plass til dobbeltseng og er innredet med stor og praktisk garderobe."
  ],
  
  terrasse: [
    "Den store og nydelig terrassen er i ny i 2025 og lar seg innrede med flere sittegrupper.",
    "Her kan du nyte svært gode solforhold på sommerstid, med ettermiddag og kveldsol.",
    "Terrassen oppleves som lun og usjenert.",
    "Nordvest vendt terrasse.",
    "Romslig med god plass til møblement.",
    "Veranda fra 2024 med markise.",
    "Terrassen strekker seg rundt leiligheten mot nord og vest med nydelige sol- og utsiktsforhold.",
    "Utenfor stuen, mot vest, er det en hyggelig veranda med videre nedgang til hageområde.",
    "Her kan solen nytes fra tidlig morgen til sen kveld.",
    "Fra stuen er det utgang til balkong mot øst og flott, delvis overbygget veranda mot syd.",
    "Her sitter man skjermet for innsyn og kan nyte herlige solforhold."
  ],
  
  balkong: [
    "Fra balkongen har man utsikt over nærområdet.",
    "Spotter, stikkontakter og persienner på balkong.",
    "Vestvendt, solrik balkong med en magisk utsikt over Skienselva.",
    "Her ligger man høyt og fritt til, uten direkte innsyn."
  ],
  
  annet: [
    "Leiligheten er oppmalt i lyse og delikate farger.",
    "Pent nyslipt parkettgulv.",
    "Moderne og sentrumsnær leilighet oppført i 2019!",
    "Det følger med en praktisk, utvendig bod.",
    "TV og internett inkludert i felleskostnadene.",
    "Boligens hovedetasje er pent og gjennomført oppgradert i 2022/2023, med blant annet nye overflater, renovert baderom, vaskerom og kjøkken.",
    "Opplegg for vaskemaskin og tørketrommel. Fra vaskerommet er det egen utgang.",
    "Det er 4 soverom av god størrelse i boligens hovedetasje.",
    "Varmepumpe sørger for god og energieffektiv oppvarming av denne leiligheten.",
    "Boligen er utstyrt med et ildsted som sørger for god oppvarming på vinterhalvåret.",
    "Vaskerom fra 2022.",
    "Boligen holder en gjennomgående høy standard på innredninger og materialvalg, med blant annet to nye baderom, kjøkken og overflater i perioden 2022-2025.",
    "Det er gode oppbevaringsmuligheter i bodrom i underetasjen.",
    "Både varmepumpe og vedovn sørger for god oppvarming av denne etasjen."
  ],
  
  parkering: [
    "Det er flere biloppstillingsplasser på sørsiden av boligen.",
    "Parkeringsplass i carport medfølger.",
    "Det medfølger parkeringsplass i garasje med egen el-bil lader og tilhørende sportsbod."
  ],
  
  fasade: [
    "Romslig 2-roms leilighet med en attraktiv beliggenhet på Bøle i Skien.",
    "Leiligheten ligger i 2. etasje med enkel adkomst fra bakkeplan.",
    "Denne lekre familieboligen er vesentlig oppgradert i 2022/2023, både utvendig og innvendig.",
    "Denne nydelige sveitservillaen fremstår som særdeles innbydende og gjennomført, med tidstypisk arkitektur og praktiske romløsninger i alle etasjer."
  ],
  
  hage: [
    "Tomten er pent opparbeidet med gressplen og hyggelig lekeplass.",
    "Tomten er pent opparbeidet med plen samt praktfull og parkmessig anlagt med blomsterbed, prydbusker, frukt- og prydtrær.",
    "Denne flotte tomten har god plass til aktiviteter og fremstår som særdeles barnevennlig.",
    "Det er gode parkeringsmuligheter i gårdsplass.",
    "Eiendommen har en usjenert tomt med fin sommerstue.",
    "Meget solrik tomt.",
    "Usjenerte forhold på høy og fri beliggenhet.",
    "Stor tomt opparbeidet over to nivåer med gruset gårdsplass mot vest og hageområde mot øst."
  ],
  
  utsikt: [
    "Utsikt fra balkongen.",
    "Nydelig utsikt fra balkongen.",
    "Nydelig utsikt i fredelige omgivelser."
  ],
  
  wc: [
    "Toalettrom med gulvstående toalett og servantinnredning."
  ],
  
  // Beliggenhet - kategoriserer som 'annet' siden det ikke er romtype
  beliggenhet: [
    "Tilbaketrukken og landlig beliggenhet.",
    "Det er kort gangavstand til Skien sentrum med alle byens fasiliteter.",
    "Leiligheten ligger på ytterste rekke mot Skienselva.",
    "Her har man matbutikk og offentlig kommunikasjon i umiddelbar nærhet.",
    "Kiwi Bøle ligger kun et steinkast unna.",
    "Denne flotte leiligheten har en fantastisk beliggenhet ved vannkanten, på ytterste rekke på Borgestadholmen!",
    "Borgestadholmen er omkranset av vann med en magisk strandpromenade rundt hele øya.",
    "Sentralt beliggende mellom Skien og Porsgrunn, er det kort vei til nødvendige fasiliteter.",
    "Eiendommen har en sjeldent flott og særdeles attraktiv beliggenhet på pynten i Tomtegata."
  ]
};

// Mapper for å konvertere til riktige romtyper
const roomTypeMapping = {
  'beliggenhet': 'annet', // Beliggenhet er ikke en romtype, så vi kategoriserer som 'annet'
  'uteplass': 'hage',
  'teknisk': 'annet'
};

async function importPdfExamples() {
  console.log('🌱 Starter import av PDF-eksempler...');

  try {
    // Tell eksisterende eksempler
    const existingCount = await prisma.roomExample.count();
    console.log(`📊 Eksisterende eksempler i database: ${existingCount}`);

    let importedCount = 0;

    // Gå gjennom alle romtyper
    for (const [roomType, examples] of Object.entries(pdfExamples)) {
      // Map romtype hvis nødvendig
      const mappedRoomType = roomTypeMapping[roomType] || roomType;
      
      console.log(`\n📁 Importerer ${examples.length} eksempler for: ${mappedRoomType}`);

      // Importer hvert eksempel
      for (const description of examples) {
        try {
          // Sjekk om eksemplet allerede finnes (unngå duplikater)
          const existing = await prisma.roomExample.findFirst({
            where: {
              description: description.trim(),
              roomType: mappedRoomType
            }
          });

          if (!existing) {
            // Bestem målgruppe basert på innhold
            let targetGroup = 'standard';
            const lowerDesc = description.toLowerCase();
            
            if (lowerDesc.includes('familie') || lowerDesc.includes('barnevennlig')) {
              targetGroup = 'family';
            } else if (lowerDesc.includes('oppgradert') || lowerDesc.includes('renovert')) {
              targetGroup = 'firstTime';
            } else if (lowerDesc.includes('utleie')) {
              targetGroup = 'investor';
            }

            // Bestem kvalitet
            let quality = 'neutral';
            if (lowerDesc.includes('meget') || lowerDesc.includes('nydelig') || lowerDesc.includes('flott')) {
              quality = 'good';
            } else if (lowerDesc.includes('oppgrader')) {
              quality = 'potential';
            }

            // Opprett eksempel
            await prisma.roomExample.create({
              data: {
                roomType: mappedRoomType,
                description: description.trim(),
                targetGroup,
                quality,
                // Legg til relevante tags
                tags: {
                  connectOrCreate: [
                    ...(lowerDesc.includes('moderne') ? [{ where: { name: 'moderne' }, create: { name: 'moderne' } }] : []),
                    ...(lowerDesc.includes('klassisk') ? [{ where: { name: 'klassisk' }, create: { name: 'klassisk' } }] : []),
                    ...(lowerDesc.includes('renovert') ? [{ where: { name: 'renovert' }, create: { name: 'renovert' } }] : []),
                    ...(lowerDesc.includes('romslig') ? [{ where: { name: 'romslig' }, create: { name: 'romslig' } }] : []),
                    ...(lowerDesc.includes('lys') ? [{ where: { name: 'lyst' }, create: { name: 'lyst' } }] : [])
                  ]
                },
                // Legg til features
                features: {
                  connectOrCreate: [
                    ...(lowerDesc.includes('gulvvarme') ? [{ where: { name: 'gulvvarme' }, create: { name: 'gulvvarme', category: 'comfort' } }] : []),
                    ...(lowerDesc.includes('varmepumpe') ? [{ where: { name: 'varmepumpe' }, create: { name: 'varmepumpe', category: 'comfort' } }] : []),
                    ...(lowerDesc.includes('balkong') ? [{ where: { name: 'balkong' }, create: { name: 'balkong', category: 'outdoor' } }] : []),
                    ...(lowerDesc.includes('peis') ? [{ where: { name: 'peis' }, create: { name: 'peis', category: 'comfort' } }] : []),
                    ...(lowerDesc.includes('garderobe') ? [{ where: { name: 'garderobe' }, create: { name: 'garderobe', category: 'storage' } }] : [])
                  ]
                }
              }
            });

            importedCount++;
            process.stdout.write(`✓`);
          } else {
            process.stdout.write(`•`);
          }
        } catch (error) {
          console.error(`\n❌ Feil ved import av eksempel: ${error.message}`);
        }
      }
    }

    // Sluttstatistikk
    const newTotal = await prisma.roomExample.count();
    console.log(`\n\n✅ Import fullført!`);
    console.log(`📊 Importerte ${importedCount} nye eksempler`);
    console.log(`📊 Totalt antall eksempler nå: ${newTotal}`);

    // Vis fordeling per romtype
    const distribution = await prisma.roomExample.groupBy({
      by: ['roomType'],
      _count: true,
      orderBy: { _count: { roomType: 'desc' } }
    });

    console.log('\n📈 Fordeling per romtype:');
    distribution.forEach(item => {
      console.log(`   ${item.roomType}: ${item._count}`);
    });

  } catch (error) {
    console.error('❌ Import feilet:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Kjør import
importPdfExamples();