import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  await prisma.analysisLog.deleteMany();
  await prisma.userExample.deleteMany();
  await prisma.locationCache.deleteMany();
  await prisma.roomExample.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.feature.deleteMany();
  await prisma.colorCombination.deleteMany();
  await prisma.seasonalPhrase.deleteMany();
  await prisma.qualityPhrase.deleteMany();

  // Create tags
  const tags = await Promise.all([
    prisma.tag.create({ data: { name: 'moderne' } }),
    prisma.tag.create({ data: { name: 'klassisk' } }),
    prisma.tag.create({ data: { name: 'renovert' } }),
    prisma.tag.create({ data: { name: 'original' } }),
    prisma.tag.create({ data: { name: 'lyst' } }),
    prisma.tag.create({ data: { name: 'romslig' } }),
    prisma.tag.create({ data: { name: 'praktisk' } }),
    prisma.tag.create({ data: { name: 'koselig' } })
  ]);

  // Create features
  const features = await Promise.all([
    prisma.feature.create({ data: { name: 'gulvvarme', category: 'comfort' } }),
    prisma.feature.create({ data: { name: 'balkong', category: 'outdoor' } }),
    prisma.feature.create({ data: { name: 'peis', category: 'comfort' } }),
    prisma.feature.create({ data: { name: 'garderobe', category: 'storage' } }),
    prisma.feature.create({ data: { name: 'downlights', category: 'technical' } }),
    prisma.feature.create({ data: { name: 'parkett', category: 'material' } }),
    prisma.feature.create({ data: { name: 'fliser', category: 'material' } }),
    prisma.feature.create({ data: { name: 'laminat', category: 'material' } })
  ]);


  // Room examples - organized by room type
  const roomExamples = {
    stue: [
      // Standard målgruppe (20+ eksempler)
      { description: "Stue med eikeparkett og hvite vegger. Store vinduer mot syd gir godt lysinnslipp.", targetGroup: "standard" },
      { description: "Gjennomgående stue med grå laminat og beige vegger. Åpen løsning mot kjøkken skaper god flyt.", targetGroup: "standard" },
      { description: "Parkettlagt stue med grålakkerte vegger. Plass til både sofagruppe og spisebord.", targetGroup: "standard" },
      { description: "Romslig stue med hvitlasert furugulv. Store vinduer i to himmelretninger.", targetGroup: "standard" },
      { description: "Stue med mørk eikeparkett og hvite vegger. Skyvedør ut til balkong.", targetGroup: "standard" },
      { description: "Kompakt stue med grå vinylgulv. Effektiv planløsning med smart plassutnyttelse.", targetGroup: "standard" },
      { description: "Luftig stue med bøkeparkett og lyse vegger. Takhøyde på 2,7 meter.", targetGroup: "standard" },
      { description: "Stue i vinkel med askeparkett. Hvite vegger og synlige bjelker i taket.", targetGroup: "standard" },
      { description: "Moderne stue med betongaktig vinylgulv. Grå og hvite toner skaper ro.", targetGroup: "standard" },
      { description: "Klassisk stue med stavparkett i eik. Rosett i tak og originale listverk.", targetGroup: "standard" },
      { description: "Stue med hvitpigmentert eikegulv. Fondvegg i dempet blågrønn farge.", targetGroup: "standard" },
      { description: "Praktisk stue med grått laminatgulv. Integrerte hyller langs en vegg.", targetGroup: "standard" },
      { description: "Stue med mørkbeiset tregulv og kremhvite vegger. Peis som naturlig samlingspunkt.", targetGroup: "standard" },
      { description: "Lys stue med hvit furuplank på gulv. Vegger i lys grå med moderne finish.", targetGroup: "standard" },
      { description: "Stue med varmebehandlet askeparkett. Store vindusflater og utgang til hage.", targetGroup: "standard" },
      { description: "Todelt stue med ulikt gulvbelegg. Fliser ved inngang, parkett i oppholdsone.", targetGroup: "standard" },
      { description: "Stue med korkgulv og miljøvennlig profil. Naturlige fargetoner throughout.", targetGroup: "standard" },
      { description: "Moderne stue med polert betong. Industriell stil med eksponerte installasjoner.", targetGroup: "standard" },
      { description: "Stue med terrakottafargede fliser. Mediteransk preg og varme toner.", targetGroup: "standard" },
      { description: "Åpen stue med gjennomgående eikegulv. Definerte soner for ulike funksjoner.", targetGroup: "standard" },
      
      // Familie målgruppe
      { description: "Familievennlig stue med slitesterkt laminat. Romslig med god plass til lek.", targetGroup: "family" },
      { description: "Stor stue med robust vinylgulv. Åpen løsning gir oversikt og trygghet.", targetGroup: "family" },
      { description: "Stue med gulvvarme under laminat. Barnevennlig med avrundede hjørner.", targetGroup: "family" },
      { description: "Praktisk stue med grå fliser. Tåler høy aktivitet og enkel å holde ren.", targetGroup: "family" },
      { description: "Romslig stue med ekstra god takhøyde. Plass til både voksne og barns aktiviteter.", targetGroup: "family" },
      
      // Førstegangskjøper målgruppe
      { description: "Lettstelt stue med moderne laminat. Nymalt og innflyttingsklar standard.", targetGroup: "firstTime" },
      { description: "Stue med nylagt vinylgulv. Minimalt vedlikeholdsbehov og gode lysforhold.", targetGroup: "firstTime" },
      { description: "Enkel stue med lyst laminatgulv. Nøytrale farger gir rom for egen stil.", targetGroup: "firstTime" },
      { description: "Kompakt stue med effektiv planløsning. Vedlikeholdsfritt og praktisk.", targetGroup: "firstTime" },
      { description: "Stue med nyere gulvbelegg. God standard uten oppgraderingsbehov.", targetGroup: "firstTime" },
      
      // Investor målgruppe
      { description: "Stue med originalt parkettgulv. Potensial for verdiøkning ved oppgradering.", targetGroup: "investor" },
      { description: "Funksjonell stue med standard laminat. Egnet for utleie uten endringer.", targetGroup: "investor" },
      { description: "Stue med slitasje på gulv. Oppgraderingsmuligheter for økt leieinntekt.", targetGroup: "investor" },
      { description: "Nøytral stue med grått gulvbelegg. Appellerer til bred leietakergruppe.", targetGroup: "investor" },
      { description: "Stue med potensial for planendring. Mulighet for ekstra soverom.", targetGroup: "investor" },
      
      // Senior målgruppe
      { description: "Tilgjengelig stue uten terskler. Sklisikkert vinylgulv og god belysning.", targetGroup: "senior" },
      { description: "Stue med varmekomfort fra gulvvarme. Enkelt å manøvrere med rullator.", targetGroup: "senior" },
      { description: "Oversiktlig stue på ett plan. Korte avstander og logisk planløsning.", targetGroup: "senior" },
      { description: "Stue med ekstra bred passasje. Godt egnet for bevegelseshjelpemidler.", targetGroup: "senior" },
      { description: "Lettstelt stue med laminatgulv. Store vinduer gir godt naturlig lys.", targetGroup: "senior" }
    ],

    kjøkken: [
      // Standard målgruppe (20+ eksempler)
      { description: "Hvit kjøkkeninnredning med laminat benkeplate i grå stein-imitasjon. Fliser i hvit blank utførelse over benk.", targetGroup: "standard" },
      { description: "Kjøkken med sorte fronter og benkeplate i bambus. Integrerte hvitevarer følger med.", targetGroup: "standard" },
      { description: "Eldre kjøkken med bøkefronter og laminat benkeplate. Grå fliser på gulv.", targetGroup: "standard" },
      { description: "Moderne kjøkken med høyglans hvite fronter. Benkeplate i grå kvarts-kompositt.", targetGroup: "standard" },
      { description: "Kjøkken i grå eik med laminat benkeplate. Praktisk øy for ekstra arbeidsplass.", targetGroup: "standard" },
      { description: "Klassisk hvitt kjøkken med profilerte fronter. Benkeplate i mørk laminat.", targetGroup: "standard" },
      { description: "Kjøkken med fronter i oljet eik. Steinimitasjon på benkeplate og integrerte apparater.", targetGroup: "standard" },
      { description: "Kompakt kjøkken med lyse fronter. Effektiv L-løsning med god benkeplass.", targetGroup: "standard" },
      { description: "Kjøkken med kombinasjon av åpne hyller og lukkede skap. Industriell stil.", targetGroup: "standard" },
      { description: "Tidsriktig kjøkken med mørkeblå fronter. Benkeplate i hvit marmor-look.", targetGroup: "standard" },
      { description: "Kjøkken med fronter i hvitbeiset ask. Naturlig preg og varme toner.", targetGroup: "standard" },
      { description: "Minimalistisk kjøkken med griffløse fronter. Integrerte hvitevarer for ren design.", targetGroup: "standard" },
      { description: "Kjøkken med tosidige overskap. Maksimal oppbevaringsplass på liten flate.", targetGroup: "standard" },
      { description: "Retro-inspirert kjøkken med pastellgrønne fronter. Moderne funksjoner i nostalgisk drakt.", targetGroup: "standard" },
      { description: "Kjøkken med kontrasterende farger. Hvite overskap og antrasittgrå underskap.", targetGroup: "standard" },
      { description: "Praktisk kjøkken med uttrekkbare skuffer. Soft-close på alle fronter.", targetGroup: "standard" },
      { description: "Kjøkken med naturstein benkeplate. Holdbart og eksklusivt uttrykk.", targetGroup: "standard" },
      { description: "Landlig kjøkken med kremhvite fronter. Dekorative håndtak og klassisk stil.", targetGroup: "standard" },
      { description: "Kjøkken med høyskap for optimal lagring. Innebygd kjøleskap og fryser.", targetGroup: "standard" },
      { description: "Moderne kjøkken med LED-belysning under overskap. Stemningsfullt og funksjonelt.", targetGroup: "standard" },
      
      // Familie målgruppe
      { description: "Familievennlig kjøkken med slitesterke fronter. Avrundede kanter og barnesikring.", targetGroup: "family" },
      { description: "Stort kjøkken med kjøkkenøy. Plass til hele familien rundt matlagingen.", targetGroup: "family" },
      { description: "Kjøkken med ekstra brede skuffer. Praktisk oppbevaring for familiens behov.", targetGroup: "family" },
      { description: "Robust kjøkken med laminat som tåler søl. Mye skapplass og god arbeidsplass.", targetGroup: "family" },
      { description: "Kjøkken med integrert spiseplass. Praktisk for hurtige familiemåltider.", targetGroup: "family" },
      
      // Førstegangskjøper målgruppe
      { description: "Enkelt vedlikeholdt kjøkken i god stand. Ikke behov for oppgradering.", targetGroup: "firstTime" },
      { description: "Kjøkken med nyere hvitevarer inkludert. Klar til bruk uten investeringer.", targetGroup: "firstTime" },
      { description: "Kompakt men funksjonelt kjøkken. Smart planlagt for små flater.", targetGroup: "firstTime" },
      { description: "Nymalt kjøkken med friskt uttrykk. Godt vedlikeholdt og innflyttingsklart.", targetGroup: "firstTime" },
      { description: "Kjøkken med standard god kvalitet. Tidløs design som holder seg.", targetGroup: "firstTime" },
      
      // Investor målgruppe
      { description: "Funksjonelt kjøkken egnet for utleie. Nøytrale farger og solid standard.", targetGroup: "investor" },
      { description: "Kjøkken med oppgraderingspotensial. Mulighet for verdiøkning med moderate grep.", targetGroup: "investor" },
      { description: "Slitesterkt kjøkken ideelt for leietakere. Lite vedlikeholdsbehov.", targetGroup: "investor" },
      { description: "Standard kjøkken med alle nødvendige funksjoner. Klar for utleiemarkedet.", targetGroup: "investor" },
      { description: "Kjøkken med potensial for åpen løsning. Kan øke attraktivitet og leiepris.", targetGroup: "investor" },
      
      // Senior målgruppe
      { description: "Seniorvennlig kjøkken med nedsenkbar benkeplate. Tilpasset rullestolbrukere.", targetGroup: "senior" },
      { description: "Kjøkken med god arbeidshøyde. Skuffer fremfor skap for enkel tilgang.", targetGroup: "senior" },
      { description: "Oversiktlig kjøkken med logisk plassering. Kort vei mellom vask og komfyr.", targetGroup: "senior" },
      { description: "Kjøkken med ekstra god belysning. Kontrastfarger for bedre synlighet.", targetGroup: "senior" },
      { description: "Tilgjengelig kjøkken uten høye overskap. Alt innen rekkevidde.", targetGroup: "senior" }
    ],

    bad: [
      // Standard målgruppe (20+ eksempler)
      { description: "Bad med grå fliser på gulv og hvite vegger. Dusjhjørne med klart glass.", targetGroup: "standard" },
      { description: "Flislagt bad i beige toner med gulvvarme. Servant i hvit keramikk.", targetGroup: "standard" },
      { description: "Bad med antrasittgrå gulvfliser og hvit våtromstapet. Opplegg for vaskemaskin.", targetGroup: "standard" },
      { description: "Moderne bad med store fliser i grå skifer-look. Vegghengt toalett.", targetGroup: "standard" },
      { description: "Bad med hvite subway-fliser på vegg. Sort dusjgarnityr for kontrast.", targetGroup: "standard" },
      { description: "Kompakt bad med dusjnisje. Grå fliser og glass-vegger.", targetGroup: "standard" },
      { description: "Bad med lyse fliser og mosaikk-detaljer. Innfliset dusjkar.", targetGroup: "standard" },
      { description: "Renovert bad med våtromstapet. Moderne servant med skuffer.", targetGroup: "standard" },
      { description: "Bad med badekar og dusjløsning. Fliser i dempede jordtoner.", targetGroup: "standard" },
      { description: "Minimalistisk bad med betonggrå fliser. Innebygd speilskap.", targetGroup: "standard" },
      { description: "Bad med naturstein-look på gulv. Hvite vegger for lyst inntrykk.", targetGroup: "standard" },
      { description: "Funksjonelt bad med god oppbevaring. Høyskap og servantskap.", targetGroup: "standard" },
      { description: "Bad med sorte detaljer mot hvite flater. Moderne og tidløst.", targetGroup: "standard" },
      { description: "Romslig bad med dobbel servant. Plass til morgenstunden for to.", targetGroup: "standard" },
      { description: "Bad med kombinert vask/toalett-rom. Praktisk planløsning.", targetGroup: "standard" },
      { description: "Nyere bad med elektrisk gulvvarme. Termostat for komfort.", targetGroup: "standard" },
      { description: "Bad med walk-in dusj. Terskelløst og moderne.", targetGroup: "standard" },
      { description: "Klassisk bad med hvite fliser. Tidløs design som holder.", targetGroup: "standard" },
      { description: "Bad med vindu for naturlig ventilasjon. Lyst og luftig rom.", targetGroup: "standard" },
      { description: "Eksklusivt bad med marmor-detaljer. Luksuriøs finish.", targetGroup: "standard" },
      
      // Familie målgruppe
      { description: "Familievennlig bad med badekar. Perfekt for barnebadet.", targetGroup: "family" },
      { description: "Romslig bad med god gulvplass. Plass til flere samtidig.", targetGroup: "family" },
      { description: "Bad med ekstra oppbevaringsløsninger. Orden i familiens baderomsartikler.", targetGroup: "family" },
      { description: "Slitesterkt bad med kvalitetsfliser. Tåler familiens daglige bruk.", targetGroup: "family" },
      { description: "Bad med både dusj og badekar. Fleksibelt for alle familiemedlemmer.", targetGroup: "family" },
      
      // Førstegangskjøper målgruppe
      { description: "Velholdt bad uten oppgraderingsbehov. Moderne og innflyttingsklart.", targetGroup: "firstTime" },
      { description: "Bad renovert i 2018. Ingen kostnader å forvente.", targetGroup: "firstTime" },
      { description: "Enkelt bad med god standard. Funksjonelt og pent.", targetGroup: "firstTime" },
      { description: "Kompakt bad med smart innredning. Maksimal funksjon på liten flate.", targetGroup: "firstTime" },
      { description: "Bad med nye fliser og våtromstapet. Godt utført arbeid.", targetGroup: "firstTime" },
      
      // Investor målgruppe
      { description: "Standard bad egnet for utleie. Nøytral design med bred appell.", targetGroup: "investor" },
      { description: "Bad med potensial for oppgradering. Kan øke leieverdi betydelig.", targetGroup: "investor" },
      { description: "Funksjonelt bad med slitesterk innredning. Lite vedlikehold.", targetGroup: "investor" },
      { description: "Bad med separat dusjrom. Attraktivt for leietakere.", targetGroup: "investor" },
      { description: "Enkelt bad som dekker basisbehov. Robust for utleiemarkedet.", targetGroup: "investor" },
      
      // Senior målgruppe
      { description: "Tilrettelagt bad med dusjstol. Sklisikre fliser og støttehåndtak.", targetGroup: "senior" },
      { description: "Bad med terskelløs dusj. Enkel adkomst og trygg bruk.", targetGroup: "senior" },
      { description: "Romslig bad med plass til hjelpemidler. Høy toalettstol.", targetGroup: "senior" },
      { description: "Bad med ekstra belysning. God kontrast og synlighet.", targetGroup: "senior" },
      { description: "Seniorvennlig bad med gulvvarme. Komfortabel temperatur.", targetGroup: "senior" }
    ],

    soverom: [
      // Standard målgruppe (20+ eksempler)
      { description: "Soverom med bøkeparkett og hvite vegger. Skyvedørsgarderobe i hvitt.", targetGroup: "standard" },
      { description: "Rom med grått laminatgulv og lyseblå vegg som fondvegg. To vinduer.", targetGroup: "standard" },
      { description: "Soverom med beige teppe og gipsvegger i lys grå. God takhøyde.", targetGroup: "standard" },
      { description: "Hovedsoverom med eikeparkett. Walk-in garderobe og utgang til balkong.", targetGroup: "standard" },
      { description: "Romslig soverom med plass til dobbeltseng og nattbord. Hvite vegger.", targetGroup: "standard" },
      { description: "Soverom med original stavparkett. Høyt under taket og fredelig beliggenhet.", targetGroup: "standard" },
      { description: "Kompakt soverom med smart oppbevaring. Innebygde hyller.", targetGroup: "standard" },
      { description: "Soverom mot bakgård. Stille og rolig med morgensol.", targetGroup: "standard" },
      { description: "Lyst soverom med store vinduer. Hvitmalte vegger og parkettgulv.", targetGroup: "standard" },
      { description: "Soverom med plass til kontorhjørne. Fleksibel bruk av rommet.", targetGroup: "standard" },
      { description: "Moderne soverom med downlights. Grå vegger og hvitt tak.", targetGroup: "standard" },
      { description: "Soverom med fransk balkong. Charmerende detalj og ekstra lys.", targetGroup: "standard" },
      { description: "Gjesterom med nøytrale farger. Plass til enkeltseng eller gjesteseng.", targetGroup: "standard" },
      { description: "Soverom under skråtak. Koselig atmosfære med synlige bjelker.", targetGroup: "standard" },
      { description: "Rom med garderobeplass langs en vegg. Praktisk oppbevaringsløsning.", targetGroup: "standard" },
      { description: "Soverom med mørke vegger for god søvn. Kontrasterende hvitt tak.", targetGroup: "standard" },
      { description: "Luftig soverom med høyt under taket. Føles større enn kvadratmeterne.", targetGroup: "standard" },
      { description: "Soverom med utgang til terrasse. Privat uteplass.", targetGroup: "standard" },
      { description: "Enkelt soverom med god standard. Vedlikeholdt og rent.", targetGroup: "standard" },
      { description: "Soverom med plass til barneseng. Familievennlig størrelse.", targetGroup: "standard" },
      
      // Familie målgruppe
      { description: "Barnerom med plass til køyeseng. Lekekrok under vinduet.", targetGroup: "family" },
      { description: "Romslig soverom for foreldre. Plass til barneseng ved siden av.", targetGroup: "family" },
      { description: "Soverom med robuste overflater. Tåler barns lek og aktivitet.", targetGroup: "family" },
      { description: "Rom med god oppbevaring for leker. Orden i barnerommet.", targetGroup: "family" },
      { description: "Soverom som kan deles med skillevegg. Fleksibelt for søsken.", targetGroup: "family" },
      
      // Førstegangskjøper målgruppe
      { description: "Nymalt soverom klart for innflytting. Moderne farger.", targetGroup: "firstTime" },
      { description: "Soverom med nyere gulvbelegg. Ingen oppussing nødvendig.", targetGroup: "firstTime" },
      { description: "Enkelt vedlikeholdt soverom. God standard for førstegangskjøper.", targetGroup: "firstTime" },
      { description: "Kompakt men funksjonelt soverom. Smart for små leiligheter.", targetGroup: "firstTime" },
      { description: "Soverom med ferdig garderobe. Praktisk og kostnadsbesparende.", targetGroup: "firstTime" },
      
      // Investor målgruppe
      { description: "Soverom med potensial for utleie. Egen inngang mulig.", targetGroup: "investor" },
      { description: "Nøytralt soverom som passer alle. Bred markedsappell.", targetGroup: "investor" },
      { description: "Rom som kan fungere som hybel. Mulighet for ekstra inntekt.", targetGroup: "investor" },
      { description: "Standard soverom uten oppussingsbehov. Klart for utleie.", targetGroup: "investor" },
      { description: "Soverom med mulighet for kitchenette. Hybelpotensial.", targetGroup: "investor" },
      
      // Senior målgruppe
      { description: "Soverom på hovedplan. Slipper trapper til daglig.", targetGroup: "senior" },
      { description: "Romslig soverom med plass til hjelpemidler. Bred dør.", targetGroup: "senior" },
      { description: "Soverom nær bad. Kort vei på natten.", targetGroup: "senior" },
      { description: "Lyst soverom med gode lysforhold. Viktig for seniorer.", targetGroup: "senior" },
      { description: "Soverom med sklisikkert gulv. Trygg ferdsel.", targetGroup: "senior" }
    ],

    gang: [
      // Standard målgruppe (15+ eksempler)
      { description: "Entré med grå fliser og hvitmalte vegger. Garderobeskap i eik.", targetGroup: "standard" },
      { description: "Gang med eikeparkett og beige vegger. Integrert garderobeløsning.", targetGroup: "standard" },
      { description: "Inngangsparti med antrasitt skiferfliser. Hvite vegger og downlights.", targetGroup: "standard" },
      { description: "Romslig entré med plass til sittebenk. Praktisk for av- og påkledning.", targetGroup: "standard" },
      { description: "Gang med hvite fliser og speil for romfølelse. Knagger langs vegg.", targetGroup: "standard" },
      { description: "Entré med varmekabler i gulv. Behagelig temperatur året rundt.", targetGroup: "standard" },
      { description: "Kompakt gang med smart oppbevaring. Høyskap utnytter takhøyden.", targetGroup: "standard" },
      { description: "Gang med naturstein på gulv. Eksklusivt førsteinntrykk.", targetGroup: "standard" },
      { description: "Lys entré med vindu. Naturlig lys velkommer gjester.", targetGroup: "standard" },
      { description: "Gang med åpen garderobe. Lett tilgang til yttertøy.", targetGroup: "standard" },
      { description: "Entré med skittentøysinnkast. Praktisk løsning for familier.", targetGroup: "standard" },
      { description: "Gang med nisje for nøkler og post. Organisert inngangsparti.", targetGroup: "standard" },
      { description: "Bred gang som gir luftig førsteinntrykk. Plass til møbler.", targetGroup: "standard" },
      { description: "Entré med fliser i retromønster. Karakteristisk detalj.", targetGroup: "standard" },
      { description: "Gang med garderobe bak skyvedører. Ryddig løsning.", targetGroup: "standard" },
      
      // Familie målgruppe
      { description: "Familievennlig entré med plass til barnevogn. Robuste overflater.", targetGroup: "family" },
      { description: "Gang med ekstra mange knagger. Plass til hele familiens yttertøy.", targetGroup: "family" },
      { description: "Romslig entré med oppbevaringsbenk. Praktisk for barnefamilier.", targetGroup: "family" },
      { description: "Gang med sklisikre fliser. Trygt for løpende barn.", targetGroup: "family" },
      { description: "Entré med god plass til sko og støvler. Orden i familiens fottøy.", targetGroup: "family" }
    ],

    terrasse: [
      // Standard målgruppe (15+ eksempler)
      { description: "Terrasse med terrassebord i brun impregnert furu. Levegg i hvit.", targetGroup: "standard" },
      { description: "Markterrasse med grå betongheller. Bed for beplantning langs kant.", targetGroup: "standard" },
      { description: "Overbygget terrasse med komposittgulv i grå. Takoverbygg i hvitmalt tre.", targetGroup: "standard" },
      { description: "Solrik terrasse vendt mot vest. Kveldssol til langt på kveld.", targetGroup: "standard" },
      { description: "Terrasse med utekjøkken. Grill og vask bygget inn.", targetGroup: "standard" },
      { description: "Stor terrasse på to plan. Soneseparering for ulike aktiviteter.", targetGroup: "standard" },
      { description: "Terrasse med glassvegger som vindskjerm. Forlenget utesesong.", targetGroup: "standard" },
      { description: "Steinbelagt terrasse med varmekabler. Snøfri hele vinteren.", targetGroup: "standard" },
      { description: "Terrasse med integrert blomsterkasser. Grønn oase.", targetGroup: "standard" },
      { description: "Delvis overbygget terrasse. Sol og skygge etter behov.", targetGroup: "standard" },
      { description: "Terrasse med nedsenket spa-område. Luksuriøs uteplass.", targetGroup: "standard" },
      { description: "Kompakt terrasse med effektiv utnyttelse. Plass til spisebord.", targetGroup: "standard" },
      { description: "Terrasse med pergola og klatreplanter. Naturlig le.", targetGroup: "standard" },
      { description: "Flisbelagt terrasse med moderne design. Vedlikeholdsfritt.", targetGroup: "standard" },
      { description: "Terrasse anlagt i flere nivåer. Spennende romfølelse.", targetGroup: "standard" }
    ],

    hage: [
      // Standard målgruppe (15+ eksempler)
      { description: "Opparbeidet hage med grønn plen. Hekk i eiendomsgrense.", targetGroup: "standard" },
      { description: "Skjermet hage med frukttrær. Gruset gangsti til inngang.", targetGroup: "standard" },
      { description: "Solrik tomt med etablert beplantning. Flaggstangplate i betong.", targetGroup: "standard" },
      { description: "Hage med automatisk vanningsanlegg. Grønn plen hele sommeren.", targetGroup: "standard" },
      { description: "Naturtomt med berg i dagen. Lite vedlikehold og mye karakter.", targetGroup: "standard" },
      { description: "Hage med kjøkkenhage-område. Raised beds for grønnsaker.", targetGroup: "standard" },
      { description: "Parklignende hage med store trær. Skygge på varme dager.", targetGroup: "standard" },
      { description: "Hage med lekeområde. Sandkasse og huskestativ.", targetGroup: "standard" },
      { description: "Formell hage med hekker og grusganger. Klassisk stil.", targetGroup: "standard" },
      { description: "Hage med dam og vannspeil. Rolig atmosfære.", targetGroup: "standard" },
      { description: "Vedlikeholdsfri hage med steinsetting. Moderne og praktisk.", targetGroup: "standard" },
      { description: "Hage med flere terrasser. Ulike soner for opphold.", targetGroup: "standard" },
      { description: "Villahage med roser og stauder. Blomstring hele sesongen.", targetGroup: "standard" },
      { description: "Hage med utebod for hageredskap. Praktisk oppbevaring.", targetGroup: "standard" },
      { description: "Solrik sørhage med lang sesong. Perfekt for hageentusiaster.", targetGroup: "standard" }
    ]
  };

  // Create room examples with relations
  for (const [roomType, examples] of Object.entries(roomExamples)) {
    for (const example of examples) {
      // Determine which features to connect based on description
      const connectedFeatures = [];
      if (example.description.includes('gulvvarme')) connectedFeatures.push('gulvvarme');
      if (example.description.includes('balkong')) connectedFeatures.push('balkong');
      if (example.description.includes('peis')) connectedFeatures.push('peis');
      if (example.description.includes('garderobe')) connectedFeatures.push('garderobe');
      if (example.description.includes('downlights')) connectedFeatures.push('downlights');
      
      // Determine tags based on description
      const connectedTags = [];
      if (example.description.includes('moderne') || example.description.includes('Modern')) connectedTags.push('moderne');
      if (example.description.includes('klassisk') || example.description.includes('Klassisk')) connectedTags.push('klassisk');
      if (example.description.includes('renovert') || example.description.includes('Renovert')) connectedTags.push('renovert');
      if (example.description.includes('romslig') || example.description.includes('Romslig')) connectedTags.push('romslig');
      
      await prisma.roomExample.create({
        data: {
          roomType,
          description: example.description,
          targetGroup: example.targetGroup,
          tags: {
            connect: connectedTags.map(t => ({ name: t }))
          },
          features: {
            connect: connectedFeatures.map(f => ({ name: f }))
          }
        }
      });
    }
  }

  // Color combinations
  const colorCombinations = [
    { roomType: 'stue', floorColor: 'eikeparkett', wallColor: 'hvit', description: 'Klassisk og tidløs kombinasjon' },
    { roomType: 'stue', floorColor: 'grå laminat', wallColor: 'beige', description: 'Moderne og varm atmosfære' },
    { roomType: 'kjøkken', floorColor: 'grå fliser', wallColor: 'hvit', description: 'Rent og moderne uttrykk' },
    { roomType: 'bad', floorColor: 'antrasittgrå fliser', wallColor: 'hvit', description: 'Elegant kontrast' },
    { roomType: 'soverom', floorColor: 'bøkeparkett', wallColor: 'lys grå', description: 'Rolig og harmonisk' }
  ];

  for (const combo of colorCombinations) {
    await prisma.colorCombination.create({ data: combo });
  }

  // Seasonal phrases
  const seasonalPhrases = [
    // Summer
    { season: 'summer', roomType: 'terrasse', phrase: 'Nyt lange sommerkvelder med kveldssol', context: 'outdoor' },
    { season: 'summer', roomType: 'hage', phrase: 'Frodig og grønn oase midt i sommeren', context: 'outdoor' },
    { season: 'summer', roomType: 'stue', phrase: 'Svalt inneklima med gjennomtrekk', context: 'indoor' },
    
    // Winter
    { season: 'winter', roomType: 'stue', phrase: 'Varm og koselig med peis', context: 'indoor' },
    { season: 'winter', roomType: 'gang', phrase: 'Gulvvarme smelter snø og is', context: 'indoor' },
    { season: 'winter', roomType: 'parkering', phrase: 'Garasje holder bilen varm og isfri', context: 'outdoor' },
    
    // Spring
    { season: 'spring', roomType: 'hage', phrase: 'Hagen våkner til liv med vårblomster', context: 'outdoor' },
    { season: 'spring', roomType: 'balkong', phrase: 'Perfekt for morgensol og vårluft', context: 'outdoor' },
    
    // Autumn
    { season: 'autumn', roomType: 'stue', phrase: 'Koselige kvelder med høstfarger utenfor', context: 'indoor' },
    { season: 'autumn', roomType: 'terrasse', phrase: 'Nyt høstsolen i le for vinden', context: 'outdoor' }
  ];

  for (const phrase of seasonalPhrases) {
    await prisma.seasonalPhrase.create({ data: phrase });
  }

  // Quality phrases
  const qualityPhrases = [
    { phrase: 'god standard', category: 'good', context: 'general' },
    { phrase: 'pent vedlikeholdt', category: 'good', context: 'condition' },
    { phrase: 'moderne', category: 'good', context: 'style' },
    { phrase: 'praktisk', category: 'neutral', context: 'function' },
    { phrase: 'funksjonell', category: 'neutral', context: 'function' },
    { phrase: 'oppgraderingspotensial', category: 'potential', context: 'investment' },
    { phrase: 'original standard', category: 'potential', context: 'condition' }
  ];

  for (const phrase of qualityPhrases) {
    await prisma.qualityPhrase.create({ data: phrase });
  }

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });