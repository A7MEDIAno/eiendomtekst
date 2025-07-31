// ===== FILE: lib/exampleDatabase.js - OPPDATERT =====

// Kompakt database med gode, korte eksempler med spesifikke farger
export const ROOM_EXAMPLES = {
  stue: [
    "Stue med eikeparkett og hvite vegger. Store vinduer mot syd gir godt lysinnslipp.",
    "Gjennomgående stue med grå laminat og beige vegger. Åpen løsning mot kjøkken skaper god flyt.",
    "Parkettlagt stue med grålakkerte vegger. Plass til både sofagruppe og spisebord.",
  ],
  kjøkken: [
    "Hvit kjøkkeninnredning med laminat benkeplate i grå stein-imitasjon. Fliser i hvit blank utførelse over benk.",
    "Kjøkken med sorte fronter og benkeplate i bambus. Integrerte hvitevarer følger med.",
    "Eldre kjøkken med bøkefronter og laminat benkeplate. Grå fliser på gulv.",
  ],
  bad: [
    "Bad med grå fliser på gulv og hvite vegger. Dusjhjørne med klart glass.",
    "Flislagt bad i beige toner med gulvvarme. Servant i hvit keramikk.",
    "Bad med antrasittgrå gulvfliser og hvit våtromstapet. Opplegg for vaskemaskin.",
  ],
  soverom: [
    "Soverom med bøkeparkett og hvite vegger. Skyvedørsgarderobe i hvitt.",
    "Rom med grått laminatgulv og lyseblå vegg som fondvegg. To vinduer.",
    "Soverom med beige teppe og gipsvegger i lys grå. God takhøyde.",
  ],
  gang: [
    "Entré med grå fliser og hvitmalte vegger. Garderobeskap i eik.",
    "Gang med eikeparkett og beige vegger. Integrert garderobeløsning.",
    "Inngangsparti med antrasitt skiferfliser. Hvite vegger og downlights.",
  ],
  wc: [
    "Gjestetoalett med grå fliser og hvite vegger. Vegghengt servant.",
    "WC med hvite fliser på gulv og beige veggfliser. Servant med underskap.",
    "Toalett med grå vinylgulv og hvitmalte vegger. Kompakt løsning.",
  ],
  vaskerom: [
    "Vaskerom med grå fliser og hvite vegger. Opplegg for vaskemaskin og tørketrommel.",
    "Rom med vinylgulv i grå betongimitasjon. Hvit innredning med vaskekum.",
    "Praktisk vaskerom med beige fliser. Skap i hvitt for oppbevaring.",
  ],
  spisestue: [
    "Spisestue med eikeparkett og hvite vegger. Stor vindusflate mot hage.",
    "Rom med grå laminat og beige vegger. God plass til langbord.",
    "Separat spisestue med hvitlasert furugulv. Grålakkerte vegger.",
  ],
  hjemmekontor: [
    "Kontor med grått laminatgulv og hvite vegger. Vindu med god arbeidslys.",
    "Rom egnet som hjemmekontor med eikeparkett. Beige vegger og rolig beliggenhet.",
    "Arbeidsrom med grå teppeflis og hvitmalte vegger. God plass til skrivebord.",
  ],
  balkong: [
    "Balkong med terrassebord i grå kompositt. Rekkverk i glass og aluminium.",
    "Innglasset balkong med fliser i beige. Skyvedører i glass.",
    "Vestvendt balkong med betongdekke. Sort rekkverk i metall.",
  ],
  terrasse: [
    "Terrasse med terrassebord i brun impregnert furu. Levegg i hvit.",
    "Markterrasse med grå betongheller. Bed for beplantning langs kant.",
    "Overbygget terrasse med komposittgulv i grå. Takoverbygg i hvitmalt tre.",
  ],
  hage: [
    "Opparbeidet hage med grønn plen. Hekk i eiendomsgrense.",
    "Skjermet hage med frukttrær. Gruset gangsti til inngang.",
    "Solrik tomt med etablert beplantning. Flaggstangplate i betong.",
  ],
  utsikt: [
    "Utsikt over grøntområder og bebyggelse. Gode solforhold ettermiddag.",
    "Panoramautsikt mot fjorden. Kveldssol fra vest.",
    "Åpen utsikt mot øst. Ingen sjenerende innsyn fra naboer.",
  ],
  fasade: [
    "Bygning i rød tegl med saltak. Hvite vinduskarmer og grå takstein.",
    "Fasade i grå eternittplater. Betongsokkel og flatt tak.",
    "Trehus med hvit kledning. Grå skifertak og sort pipe.",
  ],
  fellesarealer: [
    "Oppgradert trappeoppgang med grå fliser. Hvite vegger og LED-belysning.",
    "Fellesareal med sykkelparkering. Betonggulv og metallstativ.",
    "Grøntområde med lekeplass. Sandkasse og husker i tre.",
  ],
  parkering: [
    "Asfaltert parkeringsplass. Oppmerket plass nummer 12.",
    "Garasje i betong med hvit portåpner. Strømuttak for motorvarmer.",
    "Carport i grålakkert metall. Plass til én bil.",
  ],
  bod: [
    "Bod i kjeller med betonggulv. Hvitmalte vegger og hengelås.",
    "Sportsbod med tregulv. Panel i furu på vegger.",
    "Kjellerbod på 5 kvm. Grå betonggulv og nettingvegger.",
  ],
  planløsning: [
    "Effektiv planløsning med gjennomgangsmuligheter. Soverom samlet i rolig del.",
    "Åpen løsning mellom kjøkken og stue. Bad sentralt plassert.",
    "Tradisjonell planløsning med separate rom. Gang gir adkomst til alle rom.",
  ],
  annet: [
    "Rom med fleksibel bruk. Grått laminatgulv og hvite vegger.",
    "Ekstra rom egnet som kontor eller gjesterom. Vindu mot bakgård.",
    "Praktisk rom ved entré. Kan fungere som garderobe eller bod.",
    "Loftstue med skråtak. Synlige bjelker i hvitmalt tre.",
    "Kjellerstue med grå fliser. Hvite vegger og downlights."
  ]
};

// Korte kvalitetsfraser som kan legges til
export const QUALITY_PHRASES = {
  good: ["god standard", "pent vedlikeholdt", "moderne", "praktisk", "oppgradert"],
  neutral: ["funksjonell", "tidløs", "klassisk", "standard"],
  potential: ["oppgraderingspotensial", "muligheter", "original standard", "oppussingsobjekt"]
};

// Overganger for bedre flyt (bruk sparsomt)
export const TRANSITIONS = [
  "I tillegg", "Videre", "Her finner du", "Rommet har"
];