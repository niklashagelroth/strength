// reference.js — Programmets textdelar: idrottsanpassning, kost, tillskott,
// återhämtning och axelvarningar. Ren data, renderas som paneler i Program-vyn.

export const SPORT_NOTES = [
  {
    title: 'Windsurfing',
    text: 'Ingen tung styrka dagen före en lovande vinddag. Windsurfing ersätter kondition och ofta pass C. Prioritera höftstyrka, dragstyrka, grepp och antirotation.',
  },
  {
    title: 'Tennis',
    text: 'Behåll Copenhagen plank, lateral lunge, vadpress, rotationskast och axelblocket. Undvik tung överkroppspress dagen före match eller hård servevolym.',
  },
  {
    title: 'Skidåkning',
    text: 'Sex till åtta veckor före skidresa: lägg till wall sit 3 × 45-60 sekunder efter två pass per vecka och prioritera split squats, step-ups och kontrollerade landningar.',
  },
  {
    title: 'Fridykning',
    text: 'Träna aldrig maximal apné i vatten ensam. Undvik hyperventilation och gör inte tung styrketräning omedelbart före ett krävande fridykningspass.',
  },
  {
    title: 'MTB och bergslöpning',
    text: 'Använd främst som zon 2. Ett hårdare intervallpass var 7-10:e dag räcker när tennis och andra idrotter redan ger intensitet.',
  },
  {
    title: 'Konditionsdos',
    text: 'Ett zon 2-pass på 40-60 minuter per vecka. Du ska kunna tala i hela meningar. Vid behov: 6 × 2 minuter hårt med 2 minuter lugnt mellan, högst var 7-10:e dag.',
  },
];

export const NUTRITION = {
  intro: 'Börja viktstabilt eller med ett mycket litet energiöverskott. Målet är att bygga styrka och muskler utan onödig vikt som försämrar uthållighet och brädkänsla.',
  sections: [
    {
      title: 'Protein',
      text: 'Sikta på 1,6-2,0 g/kg kroppsvikt per dag. Vid cirka 77 kg motsvarar det ungefär 125-155 g per dag, fördelat över 3-5 måltider med cirka 25-40 g åt gången.',
    },
    {
      title: 'Kolhydrater',
      text: 'Prioritera ris, potatis, havre, pasta, bröd, frukt och baljväxter runt tennis, windsurfing, skidåkning och intervaller. Kolhydrater är bränsle för kvalitet.',
    },
    {
      title: 'Fett och mikronäring',
      text: 'Ät fisk 2-3 gånger per vecka, olivolja, nötter, mejeriprodukter eller berikade alternativ samt mycket grönsaker och frukt.',
    },
    {
      title: 'Före träning',
      text: 'Normal måltid 2-3 timmar före. Vid behov en mindre kolhydratkälla närmare passet, till exempel banan eller smörgås.',
    },
    {
      title: 'Efter träning',
      text: 'Ät en vanlig måltid med 25-40 g protein och kolhydrater inom några timmar. Snabb shake behövs endast när mat dröjer.',
    },
  ],
  day: [
    ['Frukost', 'Kvarg/grekisk yoghurt, havre, bär och ägg'],
    ['Lunch', 'Stor portion grönsaker, 35-45 g protein och potatis/ris'],
    ['Mellanmål', 'Proteinshake eller yoghurt + frukt'],
    ['Middag', 'Fisk, kött, fågel eller baljväxter + kolhydrater'],
    ['Kväll vid behov', 'Kvarg, keso eller smörgås med proteinrikt pålägg'],
  ],
  // Räknare i appen: gram protein per dag utifrån kroppsvikt.
  proteinPerKg: [1.6, 2.0],
};

export const SUPPLEMENTS = [
  ['Kreatinmonohydrat', 'Ja', '3-5 g dagligen', 'Tidpunkt spelar liten roll. Ingen laddningsfas krävs.'],
  ['Proteinpulver', 'Vid behov', '25-35 g per portion', 'Ett praktiskt livsmedel, inte bättre än vanlig proteinrik mat.'],
  ['D-vitamin', 'Individuellt', 'Efter kost/blodprov', 'Undvik höga doser utan medicinsk anledning.'],
  ['Omega-3', 'Om lite fet fisk', 'Enligt produkt', 'Inte nödvändigt om du regelbundet äter fet fisk.'],
  ['Koffein', 'Selektivt', '1-2 mg/kg till att börja med', 'Undvik sent på dagen; sömn är viktigare.'],
  ['BCAA / testoboosters', 'Nej', '-', 'Ger normalt inget mervärde vid tillräckligt proteinintag.'],
];

export const SUPPLEMENT_CAVEAT =
  'Vid njursjukdom, läkemedelsbehandling eller andra medicinska tillstånd ska kreatin och andra tillskott diskuteras med vårdgivare.';

export const RECOVERY = [
  '7,5-9 timmars sömn när det är möjligt.',
  'Minst en verkligt lugn dag per vecka.',
  'Högst två till tre hårda dagar i följd.',
  'Minska volymen med cirka en tredjedel i 4-7 dagar om energi, träningslust och prestation samtidigt försämras.',
];

export const SHOULDER = {
  intro: 'Boka en fysioterapeut eller idrottsläkare eftersom problemen har varat i cirka åtta månader. Sök snabbare vid:',
  redFlags: [
    'Plötslig eller tydligt ökande kraftförlust.',
    'Känselbortfall, uttalad svaghet eller smärta som strålar från nacken.',
    'Trauma, instabilitetskänsla eller oförmåga att lyfta armen.',
    'Tilltagande nattlig smärta, svår vilovärk, feber eller allmän sjukdomskänsla.',
  ],
  avoidTitle: 'Övningar att undvika tills vidare om de provocerar',
  avoid: [
    'Tunga dips.',
    'Press bakom nacken.',
    'Upright rows med smalt grepp.',
    'Tung bänkpress med armbågarna långt ut.',
    'Tunga eller utmattande pressar över huvudet.',
    'Upprepade tester av rörelser som tydligt klämmer eller gör ont.',
  ],
  rule: 'Håll dig inom ett kontrollerat, tolererat rörelseomfång. Byt eller minska övningen om smärtan ökar under passet eller nästa dag.',
};

export const DISCLAIMER =
  'Programmet är en generell träningsplan och inte medicinsk behandling. Anpassa alltid efter dagsform, idrottsbelastning och professionell bedömning av axeln.';
