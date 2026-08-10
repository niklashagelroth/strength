// program-default.js — Standardprogrammet (Athletic Performance Program).
// Alla övningar och rutiner från programmet, med stabila id:n (ex-* / rt-*) så
// inläsningen är idempotent: befintliga poster och din historik rörs aldrig.
//
// metric: weight_reps | reps | time | distance
// perSide: true → repsen gäller per sida (ett loggat set = båda sidor)
// shoulderRule: true → visa axelregeln i appen

export const DEFAULT_EXERCISES = [
  // ---------------------------------------------------------------- Uppvärmning
  {
    id: 'ex-9090-hip', name: '90/90 höftrotation', category: 'rorlighet',
    metric: 'reps', perSide: true, defaultSets: 1, defaultReps: '6-10',
    howTo: 'Sitt med båda knäna böjda cirka 90 grader. Växla långsamt sida utan att lyfta fötterna.',
    keyPoint: 'Håll bröstet högt och låt rörelsen komma från höfterna.',
    shoulderRule: true,
  },
  {
    id: 'ex-adductor-rockback', name: 'Adductor rock-back', category: 'rorlighet',
    metric: 'reps', perSide: true, defaultSets: 1, defaultReps: '8',
    howTo: 'Stå på alla fyra och sträck ut ena benet åt sidan. Skjut höften bakåt tills det stramar på insida lår.',
    keyPoint: 'Ryggen neutral; undvik att rotera bäckenet.',
  },
  {
    id: 'ex-tspine-rotation', name: 'Bröstryggsrotation på alla fyra', category: 'rorlighet',
    metric: 'reps', perSide: true, defaultSets: 1, defaultReps: '6-8',
    howTo: 'Placera ena handen bakom huvudet. Rotera armbågen nedåt och sedan upp mot taket.',
    keyPoint: 'Håll höfterna stilla och följ armbågen med blicken.',
    shoulderRule: true,
  },
  {
    id: 'ex-scapular-pushup', name: 'Scapular push-up', category: 'prehab',
    metric: 'reps', perSide: false, defaultSets: 1, defaultReps: '10-15',
    howTo: 'Stå i hög planka med raka armar. Låt bröstkorgen sjunka lätt mellan skulderbladen och pressa sedan golvet bort.',
    keyPoint: 'Armbågarna förblir raka; rörelsen sker i skulderbladen.',
    shoulderRule: true,
  },
  {
    id: 'ex-band-external-rot', name: 'Gummibandsrotation utåt', category: 'prehab',
    metric: 'reps', perSide: true, defaultSets: 1, defaultReps: '12-15',
    howTo: 'Håll armbågen intill sidan i 90 grader. Rotera underarmen utåt mot bandet.',
    keyPoint: 'Undvik att vrida bålen eller lyfta axeln.',
    equipment: 'Gummiband',
    shoulderRule: true,
  },

  // ------------------------------------------------------------------- Styrka A
  {
    id: 'ex-trapbar-deadlift', name: 'Trap-bar-marklyft', category: 'styrka',
    metric: 'weight_reps', perSide: false, defaultSets: 4, defaultReps: '4-6',
    howTo: 'Stå mitt i trap-baren, spänn bålen och pressa golvet bort tills du står upprätt.',
    keyPoint: 'Håll ryggen neutral och vikten nära kroppens mitt. Stoppa innan tekniken försämras.',
    equipment: 'Trap bar',
  },
  {
    id: 'ex-bulgarian-split-squat', name: 'Bulgarian split squat', category: 'styrka',
    metric: 'weight_reps', perSide: true, defaultSets: 3, defaultReps: '6-8',
    howTo: 'Placera bakre foten på bänk. Sänk bakre knät kontrollerat och pressa upp genom främre foten.',
    keyPoint: 'Främre knät följer tårnas riktning; håll bäckenet rakt.',
    equipment: 'Hantlar, bänk',
  },
  {
    id: 'ex-chest-supported-row', name: 'Bröststödd hantelrodd', category: 'styrka',
    metric: 'weight_reps', perSide: false, defaultSets: 4, defaultReps: '6-10',
    howTo: 'Ligg med bröstet mot en lutande bänk. Dra hantlarna mot nedersta revbenen och sänk kontrollerat.',
    keyPoint: 'Dra skulderbladen bakåt utan att rycka eller översträcka nacken.',
    equipment: 'Hantlar, lutande bänk',
  },
  {
    id: 'ex-single-leg-rdl', name: 'Enbens rumänska marklyft', category: 'styrka',
    metric: 'weight_reps', perSide: true, defaultSets: 3, defaultReps: '8',
    howTo: 'Stå på ett ben, skjut höften bakåt och för det fria benet bakåt. Res dig genom att spänna säte och baksida lår.',
    keyPoint: 'Håll höfterna parallella med golvet och ryggen lång.',
    equipment: 'Hantel eller kettlebell',
  },
  {
    id: 'ex-half-kneel-cable-row', name: 'Halvknästående kabelrodd', category: 'styrka',
    metric: 'weight_reps', perSide: true, defaultSets: 3, defaultReps: '10',
    howTo: 'Knästående med ena foten fram. Dra handtaget mot sidan av kroppen med stabil bål.',
    keyPoint: 'Undvik rotation och håll axeln låg.',
    equipment: 'Kabelmaskin',
  },
  {
    id: 'ex-copenhagen-plank', name: 'Copenhagen plank', category: 'bal',
    metric: 'time', perSide: true, defaultSets: 3, defaultReps: '20-30',
    howTo: 'Placera övre benet på bänk och lyft kroppen i sidoplanka. Börja med knät på bänken.',
    keyPoint: 'Håll kroppen rak och pressa höften framåt.',
    equipment: 'Bänk',
  },
  {
    id: 'ex-farmers-carry', name: "Farmer's carry", category: 'styrka',
    metric: 'distance', perSide: false, defaultSets: 4, defaultReps: '25-40',
    howTo: 'Gå med en tung vikt i varje hand, stolt bröst och korta kontrollerade steg.',
    keyPoint: 'Luta inte åt sidan och låt inte axlarna dras fram.',
    equipment: 'Hantlar eller kettlebells',
  },
  {
    id: 'ex-standing-calf-raise', name: 'Stående vadpress', category: 'styrka',
    metric: 'weight_reps', perSide: false, defaultSets: 3, defaultReps: '10-15',
    howTo: 'Pressa upp på tå, pausa högst upp och sänk långsamt till full stretch.',
    keyPoint: 'Håll trycket över stortån och undvik att rulla ut på fotens utsida.',
    shoulderRule: true,
  },

  // ------------------------------------------------------------------- Styrka B
  {
    id: 'ex-box-jump', name: 'Box jump / broad jump', category: 'explosivt',
    metric: 'reps', perSide: false, defaultSets: 4, defaultReps: '3',
    howTo: 'Starta i atletisk position, gör en snabb höftfällning och hoppa explosivt. Landa mjukt.',
    keyPoint: 'Landa med knän i linje med fötterna. Avsluta när hopphöjden minskar.',
    equipment: 'Låda',
  },
  {
    id: 'ex-lateral-med-ball-throw', name: 'Medicinbollskast i sidled', category: 'explosivt',
    metric: 'reps', perSide: true, defaultSets: 4, defaultReps: '4',
    howTo: 'Stå sidledes mot vägg. Ladda genom höft och bål och kasta bollen explosivt.',
    keyPoint: 'Rotera genom fot, höft och bröstrygg - inte enbart axeln.',
    equipment: 'Medicinboll',
  },
  {
    id: 'ex-front-squat', name: 'Front squat', category: 'styrka',
    metric: 'weight_reps', perSide: false, defaultSets: 4, defaultReps: '4-6',
    howTo: 'Håll stången framför axlarna. Sätt dig mellan höfterna och res dig med upprätt bröst.',
    keyPoint: 'Knäna följer tårna; behåll buktryck genom hela repetitionen.',
    equipment: 'Skivstång',
  },
  {
    id: 'ex-landmine-press', name: 'Halvknästående landmine press', category: 'styrka',
    metric: 'weight_reps', perSide: true, defaultSets: 3, defaultReps: '6-10',
    howTo: 'Pressa stångänden snett framåt och uppåt från halvknästående position.',
    keyPoint: 'Låt skulderbladet rotera naturligt. Stoppa om axelsmärtan ökar.',
    equipment: 'Landmine / skivstång',
    shoulderRule: true,
  },
  {
    id: 'ex-neutral-pulldown', name: 'Neutralt latsdrag / pull-up', category: 'styrka',
    metric: 'weight_reps', perSide: false, defaultSets: 3, defaultReps: '6-10',
    howTo: 'Dra armbågarna ned mot sidorna och för bröstet mot handtaget eller stången.',
    keyPoint: 'Undvik att dra bakom nacken eller rycka från bottenläget.',
    equipment: 'Latsdrag eller räck',
  },
  {
    id: 'ex-lateral-lunge', name: 'Lateral lunge', category: 'styrka',
    metric: 'weight_reps', perSide: true, defaultSets: 3, defaultReps: '8',
    howTo: 'Ta ett brett steg åt sidan, skjut höften bakåt och håll motsatt ben rakt. Pressa tillbaka.',
    keyPoint: 'Håll hela arbetsfoten i golvet och knät i tårnas riktning.',
  },
  {
    id: 'ex-pallof-press', name: 'Pallof press', category: 'bal',
    metric: 'weight_reps', perSide: true, defaultSets: 3, defaultReps: '10',
    howTo: 'Stå sidledes mot kabeln. Pressa handtaget rakt fram utan att kroppen roterar.',
    keyPoint: 'Spänn säte och bål; håll revbenen nere.',
    equipment: 'Kabelmaskin eller band',
    shoulderRule: true,
  },
  {
    id: 'ex-suitcase-carry', name: 'Suitcase carry', category: 'bal',
    metric: 'distance', perSide: true, defaultSets: 3, defaultReps: '30',
    howTo: 'Gå med en tung vikt i ena handen och håll kroppen helt upprätt.',
    keyPoint: 'Motstå sidoböjning och håll stegen jämna.',
    equipment: 'Hantel eller kettlebell',
  },
  {
    id: 'ex-tibialis-raise', name: 'Tibialis raises', category: 'prehab',
    metric: 'reps', perSide: false, defaultSets: 3, defaultReps: '15-20',
    howTo: 'Luta ryggen mot en vägg med hälarna i golvet. Lyft framfoten så högt som möjligt.',
    keyPoint: 'Rör bara fotleden och sänk långsamt.',
  },

  // ------------------------------------------------------------------- Styrka C
  {
    id: 'ex-hip-thrust', name: 'Hip thrust', category: 'styrka',
    metric: 'weight_reps', perSide: false, defaultSets: 3, defaultReps: '6-10',
    howTo: 'Placera övre ryggen mot bänk och fötterna stadigt. Pressa höften upp tills kroppen är rak.',
    keyPoint: 'Avsluta med sätet, inte genom att översträcka ländryggen.',
    equipment: 'Skivstång, bänk',
  },
  {
    id: 'ex-step-up', name: 'Step-up', category: 'styrka',
    metric: 'weight_reps', perSide: true, defaultSets: 3, defaultReps: '8',
    howTo: 'Placera hela foten på en låda. Pressa dig upp genom arbetsbenet och sänk kontrollerat.',
    keyPoint: 'Undvik att skjuta ifrån kraftigt med det bakre benet.',
    equipment: 'Låda, hantlar',
  },
  {
    id: 'ex-incline-db-press', name: 'Lutande hantelpress, neutralt grepp', category: 'styrka',
    metric: 'weight_reps', perSide: false, defaultSets: 3, defaultReps: '8-12',
    howTo: 'Pressa hantlarna upp från lätt lutande bänk med handflatorna mot varandra.',
    keyPoint: 'Håll armbågarna något närmare kroppen. Byt övning vid tydlig axelsmärta.',
    equipment: 'Hantlar, lutande bänk',
    shoulderRule: true,
  },
  {
    id: 'ex-single-arm-cable-row', name: 'Enarms kabelrodd', category: 'styrka',
    metric: 'weight_reps', perSide: true, defaultSets: 3, defaultReps: '8-12',
    howTo: 'Dra handtaget mot höften och låt skulderbladet glida fram kontrollerat i botten.',
    keyPoint: 'Håll bålen stilla och axeln långt från örat.',
    equipment: 'Kabelmaskin',
  },
  {
    id: 'ex-leg-curl', name: 'Lårcurl', category: 'styrka',
    metric: 'weight_reps', perSide: false, defaultSets: 3, defaultReps: '10-15',
    howTo: 'Böj knäna och dra hälarna mot sätet. Sänk vikten långsamt.',
    keyPoint: 'Håll bäckenet stabilt och undvik att svanka.',
    equipment: 'Lårcurlmaskin',
  },
  {
    id: 'ex-cable-reverse-fly', name: 'Cable reverse fly', category: 'prehab',
    metric: 'weight_reps', perSide: false, defaultSets: 3, defaultReps: '12-15',
    howTo: 'Med lätta vikter, för armarna utåt och bakåt tills de är i linje med kroppen.',
    keyPoint: 'Håll axlarna låga och använd kontrollerad rörelse.',
    equipment: 'Kabelmaskin',
  },
  {
    id: 'ex-serratus-wall-slide', name: 'Serratus wall slide', category: 'prehab',
    metric: 'reps', perSide: false, defaultSets: 3, defaultReps: '8-12',
    howTo: 'Pressa underarmarna lätt mot väggen och glid uppåt medan skulderbladen roterar.',
    keyPoint: 'Undvik att axeln åker upp mot örat eller att ländryggen svankar.',
    shoulderRule: true,
  },
  {
    id: 'ex-dead-bug', name: 'Dead bug med utandning', category: 'bal',
    metric: 'reps', perSide: true, defaultSets: 3, defaultReps: '6-8',
    howTo: 'Ligg på rygg med höft och knä i 90 grader. Sänk motsatt arm och ben under lång utandning.',
    keyPoint: 'Behåll ländryggen lätt mot golvet.',
  },

  // ------------------------------------------------------------------ Axelblock
  {
    id: 'ex-isometric-ext-rot', name: 'Isometrisk utåtrotation', category: 'prehab',
    metric: 'time', perSide: true, defaultSets: 4, defaultReps: '30-40',
    howTo: 'Pressa handryggen lätt utåt mot vägg eller band utan att armen rör sig.',
    keyPoint: 'Armbågen intill sidan. Kraften ska kännas stabil, inte skarp.',
    shoulderRule: true,
  },
  {
    id: 'ex-scaption', name: 'Scaption med lätta hantlar', category: 'prehab',
    metric: 'weight_reps', perSide: false, defaultSets: 3, defaultReps: '10-15',
    howTo: 'Lyft armarna cirka 30 grader framför kroppens sida, tummar uppåt.',
    keyPoint: 'Lyft endast inom tolererat område och utan att rycka.',
    equipment: 'Lätta hantlar',
    shoulderRule: true,
  },
  {
    id: 'ex-y-raise', name: 'Bröststödd Y-raise', category: 'prehab',
    metric: 'weight_reps', perSide: false, defaultSets: 3, defaultReps: '10-12',
    howTo: 'Ligg mot lutande bänk och lyft raka armar snett framåt till ett Y.',
    keyPoint: 'Mycket lätt vikt; håll skulderbladen kontrollerade.',
    equipment: 'Lätta hantlar, lutande bänk',
    shoulderRule: true,
  },
  {
    id: 'ex-pushup-plus', name: 'Push-up plus', category: 'prehab',
    metric: 'reps', perSide: false, defaultSets: 3, defaultReps: '8-15',
    howTo: 'Gör en armhävning mot lämplig höjd och avsluta med att pressa skulderbladen isär.',
    keyPoint: 'Håll kroppen rak och undvik att sjunka mellan axlarna.',
    shoulderRule: true,
  },
  {
    id: 'ex-bottom-up-carry', name: 'Bottom-up kettlebell carry', category: 'prehab',
    metric: 'distance', perSide: true, defaultSets: 3, defaultReps: '20',
    howTo: 'Håll en lätt kettlebell upp och ned med armbågen böjd. Gå långsamt.',
    keyPoint: 'Handleden neutral och axeln stabil. Avbryt vid osäkerhet eller smärta.',
    equipment: 'Kettlebell',
    shoulderRule: true,
  },

  // ------------------------------------------------------------ Daglig rörlighet
  {
    id: 'ex-ankle-wall', name: 'Fotled mot vägg', category: 'rorlighet',
    metric: 'time', perSide: true, defaultSets: 1, defaultReps: '60',
    howTo: 'Stå med foten i golvet och för knät fram mot väggen utan att hälen lyfter.',
    keyPoint: 'Knät följer andra tån; flytta foten för rätt intensitet.',
  },
  {
    id: 'ex-couch-stretch', name: 'Couch stretch', category: 'rorlighet',
    metric: 'time', perSide: true, defaultSets: 1, defaultReps: '60',
    howTo: 'Placera bakre knät nära vägg och foten upp mot väggen. Spänn sätet och res bålen.',
    keyPoint: 'Undvik överdriven svank; minska avståndet vid för stark stretch.',
  },
  {
    id: 'ex-adductor-stretch', name: 'Adduktorstretch', category: 'rorlighet',
    metric: 'time', perSide: true, defaultSets: 1, defaultReps: '45-60',
    howTo: 'Stå brett eller på knä och för höften bakåt mot ena sidan.',
    keyPoint: 'Håll ryggen lång och undvik att pressa in i smärta.',
  },
  {
    id: 'ex-lat-stretch-bench', name: 'Latstretch med händer på bänk', category: 'rorlighet',
    metric: 'time', perSide: false, defaultSets: 1, defaultReps: '45',
    howTo: 'Placera händerna på bänk och skjut höfterna bakåt medan bröstet sjunker.',
    keyPoint: 'Behåll lätt bukspänning. Avbryt om axeln klämmer.',
    shoulderRule: true,
  },

  // ------------------------------------------------------------------- Kondition
  {
    id: 'ex-zone2', name: 'Zon 2 (löpning / MTB / rodd)', category: 'kondition',
    metric: 'time', perSide: false, defaultSets: 1, defaultReps: '2400-3600',
    howTo: 'Lugnt jämnt tempo i 40-60 minuter. Du ska kunna tala i hela meningar hela vägen.',
    keyPoint: 'Ett pass per vecka räcker som bas. Håll dig verkligen i zonen - lugnt är poängen.',
  },
  {
    id: 'ex-intervals-2min', name: 'Intervaller 6 × 2 min', category: 'kondition',
    metric: 'time', perSide: false, defaultSets: 6, defaultReps: '120',
    howTo: 'Två minuter hårt med två minuter lugnt mellan. Sex omgångar.',
    keyPoint: 'Högst var 7-10:e dag, och bara när tennis och andra idrotter inte redan gett intensiteten.',
  },
  {
    id: 'ex-wall-sit', name: 'Wall sit', category: 'kondition',
    metric: 'time', perSide: false, defaultSets: 3, defaultReps: '45-60',
    howTo: 'Sitt med ryggen mot vägg, knäna cirka 90 grader, och håll positionen.',
    keyPoint: 'Skidförberedelse: läggs till efter två pass per vecka 6-8 veckor före skidresa.',
  },
];

export const DEFAULT_ROUTINES = [
  {
    id: 'rt-warmup', name: 'Uppvärmning', type: 'rorlighet',
    description: '8-10 minuter före varje styrkepass. Lägg därefter till två successivt tyngre uppvärmningsset av dagens första huvudövning.',
    items: [
      { exerciseId: 'ex-9090-hip', sets: 1, reps: '6-10' },
      { exerciseId: 'ex-adductor-rockback', sets: 1, reps: '8' },
      { exerciseId: 'ex-tspine-rotation', sets: 1, reps: '6-8' },
      { exerciseId: 'ex-scapular-pushup', sets: 1, reps: '10-15' },
      { exerciseId: 'ex-band-external-rot', sets: 1, reps: '12-15' },
    ],
  },
  {
    id: 'rt-a', name: 'Styrka A - ben, höft och dragstyrka', type: 'styrka',
    description: 'Bygger grundstyrkan och den ensidiga kontroll som behövs för skidåkning, tennis och windsurfing.',
    items: [
      { exerciseId: 'ex-trapbar-deadlift', sets: 4, reps: '4-6' },
      { exerciseId: 'ex-bulgarian-split-squat', sets: 3, reps: '6-8' },
      { exerciseId: 'ex-chest-supported-row', sets: 4, reps: '6-10' },
      { exerciseId: 'ex-single-leg-rdl', sets: 3, reps: '8' },
      { exerciseId: 'ex-half-kneel-cable-row', sets: 3, reps: '10' },
      { exerciseId: 'ex-copenhagen-plank', sets: 3, reps: '20-30' },
      { exerciseId: 'ex-farmers-carry', sets: 4, reps: '25-40' },
      { exerciseId: 'ex-standing-calf-raise', sets: 3, reps: '10-15' },
    ],
  },
  {
    id: 'rt-b', name: 'Styrka B - explosivitet och helkropp', type: 'styrka',
    description: 'Hopp och kast görs först när du är fräsch. Därefter följer tung men kontrollerad styrka.',
    items: [
      { exerciseId: 'ex-box-jump', sets: 4, reps: '3' },
      { exerciseId: 'ex-lateral-med-ball-throw', sets: 4, reps: '4' },
      { exerciseId: 'ex-front-squat', sets: 4, reps: '4-6' },
      { exerciseId: 'ex-landmine-press', sets: 3, reps: '6-10' },
      { exerciseId: 'ex-neutral-pulldown', sets: 3, reps: '6-10' },
      { exerciseId: 'ex-lateral-lunge', sets: 3, reps: '8' },
      { exerciseId: 'ex-pallof-press', sets: 3, reps: '10' },
      { exerciseId: 'ex-suitcase-carry', sets: 3, reps: '30' },
      { exerciseId: 'ex-tibialis-raise', sets: 3, reps: '15-20' },
    ],
  },
  {
    id: 'rt-c', name: 'Styrka C - funktionell hypertrofi', type: 'styrka',
    description: 'Första passet att ta bort när idrottsbelastningen är hög. Pressövningen är villkorad av axelns respons.',
    items: [
      { exerciseId: 'ex-hip-thrust', sets: 3, reps: '6-10' },
      { exerciseId: 'ex-step-up', sets: 3, reps: '8' },
      { exerciseId: 'ex-incline-db-press', sets: 3, reps: '8-12' },
      { exerciseId: 'ex-single-arm-cable-row', sets: 3, reps: '8-12' },
      { exerciseId: 'ex-leg-curl', sets: 3, reps: '10-15' },
      { exerciseId: 'ex-cable-reverse-fly', sets: 3, reps: '12-15' },
      { exerciseId: 'ex-serratus-wall-slide', sets: 3, reps: '8-12' },
      { exerciseId: 'ex-dead-bug', sets: 3, reps: '6-8' },
    ],
  },
  {
    id: 'rt-shoulder', name: 'Axelblock', type: 'prehab',
    description: '15 minuter, 4-6 dagar per vecka. Bygger gradvis kapacitet i rotatorkuff, serratus och skulderbladskontroll. Det är inte en individuell diagnos.',
    items: [
      { exerciseId: 'ex-isometric-ext-rot', sets: 4, reps: '30-40' },
      { exerciseId: 'ex-scaption', sets: 3, reps: '10-15' },
      { exerciseId: 'ex-y-raise', sets: 3, reps: '10-12' },
      { exerciseId: 'ex-pushup-plus', sets: 3, reps: '8-15' },
      { exerciseId: 'ex-bottom-up-carry', sets: 3, reps: '20' },
    ],
  },
  {
    id: 'rt-mobility', name: 'Daglig rörlighet', type: 'rorlighet',
    description: 'Cirka 10 minuter. Ska kännas lugn och kontrollerad. Undvik aggressiv stretching av den smärtande axeln.',
    items: [
      { exerciseId: 'ex-ankle-wall', sets: 1, reps: '60' },
      { exerciseId: 'ex-couch-stretch', sets: 1, reps: '60' },
      { exerciseId: 'ex-adductor-stretch', sets: 1, reps: '45-60' },
      { exerciseId: 'ex-lat-stretch-bench', sets: 1, reps: '45' },
    ],
  },
  {
    id: 'rt-zone2', name: 'Zon 2', type: 'kondition',
    description: '40-60 minuter lugnt, ett pass per vecka. Du ska kunna tala i hela meningar.',
    items: [
      { exerciseId: 'ex-zone2', sets: 1, reps: '2400-3600' },
    ],
  },
  {
    id: 'rt-intervals', name: 'Intervaller 6 × 2 min', type: 'kondition',
    description: 'Vid behov, högst var 7-10:e dag: 6 × 2 minuter hårt med 2 minuter lugnt mellan.',
    items: [
      { exerciseId: 'ex-intervals-2min', sets: 6, reps: '120' },
    ],
  },
];

export const PROGRAM_NAME = 'Athletic Performance Program';
