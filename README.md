# Styrka

En personlig PWA för **styrka, kondition och rörlighet**. Du loggar set direkt i
gymmet, appen räknar fram var i 12-veckorsblocket du är, och all data ligger
lokalt i IndexedDB med manuell backup. Installeras på iPhone via Safari och
fungerar helt offline.

Athletic Performance Program (42 övningar och 8 rutiner) läses in automatiskt
vid första starten.

## Funktioner

- **Träna** — dagens pass väljs utifrån veckodagen enligt programmets schema. Ett tryck startar passet; varje set loggas med vikt, reps, tid eller meter plus valfri RIR. Passet sparas löpande i IndexedDB, så du kan låsa telefonen eller byta flik mitt i utan att tappa något. Passtid och vila sedan senaste avklarade set visas löpande.
- **Senast-värden** — varje övning visar vad du gjorde förra gången, och ett tomt set fylls i med förra gångens värden när du trycker ✓. Progressiv överbelastning utan att bläddra i historiken.
- **12-veckors progression** — appen räknar fram vecka, fas och belastningsmål (RIR 3 → RIR 1-2 → 3-5 reps) från startdagen. Under lätta veckor (4 och 8) erbjuds *Starta (lätt vecka)* som skalar ner arbetsseten cirka 45 %, precis som belastningsreglerna säger.
- **Rutiner** — skapa och ändra pass, ordna övningar, sätt set och reps per övning, kopiera en rutin som utgångspunkt. De åtta inbyggda rutinerna (Uppvärmning, Styrka A/B/C, Axelblock, Daglig rörlighet, Zon 2, Intervaller) kan ändras fritt.
- **Övningar** — hela biblioteket med sök och kategorifilter. Varje övning har utförande, nyckelpunkt, utrustning, mätsätt (vikt × reps / reps / tid / distans), om repsen gäller per sida, och egen anteckning. Övningar som rör axeln visar programmets axelregel i passet.
- **Instruktion och video** — varje övning har klickbara länkar till teknikklipp och skriftliga instruktioner, och i passet räcker ett tryck på ▶ vid övningens namn. Länkarna är sökningar på engelska söktermer (`exercise-links.js`) i stället för enskilda klipp, så de kan inte dö och funkar även för övningar du själv lagt in. Vill du ha ett bestämt klipp klistrar du in adressen i övningens fält *Länk till video eller instruktion* — då används den i stället.
- **Fritt pass** — starta utan rutin och lägg till övningar medan du kör.
- **Statistik** — pass och volym per vecka (senaste 8), tyngsta lyften med uppskattat 1RM, historik per övning, och full passhistorik.
- **Veckologg** — axel på morgonen (0-10), energi (1-5), sömn, bästa lyft och kommentar. Axelvärden över 3/10 markeras, enligt programmets gräns.
- **Program, kost och axel** — 12-veckorsplanen, veckoschemat, belastningsreglerna, idrottsanpassningen, kostupplägget med proteinräknare utifrån din kroppsvikt, tillskottstabellen, återhämtningsreglerna och axelns varningstecken finns i appen offline.
- **Backup** — exportera allt som tidsstämplad JSON (`styrka-ÅÅÅÅ-MM-DD.json`), importera med *Ersätt allt* eller *Slå ihop*. Diskret påminnelse när backupen är > 7 dagar gammal eller något ändrats sedan dess (aldrig mitt i ett pass).

## Köra lokalt

Ingen byggprocess, inga beroenden. Servera mappen över HTTP (krävs för service worker):

```sh
python3 -m http.server 8000
# öppna http://localhost:8000
```

## Installera på iPhone

Öppna sidan i **Safari** → dela-knappen → **Lägg till på hemskärmen**. Appen
startar sedan i helskärm och fungerar offline.

> **Tips:** appen ber om beständig lagring vid första starten. Exportera ändå en
> backup regelbundet — iOS Safari kan annars rensa lokal data.

## Deploya på GitHub Pages (gratis)

1. Skapa ett repo och pusha alla filer till `main`.
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch**, välj `main` / `/ (root)`.
3. Appen hamnar på `https://<användare>.github.io/<repo>/`. Alla sökvägar är relativa, så subpathen fungerar utan ändringar.

`.nojekyll` finns med så Pages servar filerna rakt av.

## Filer

| Fil | Ansvar |
|-----|--------|
| `index.html`, `styles.css` | UI-skal (mobile-first) |
| `app.js` | Navigering, datahämtning, uppstart |
| `db.js` | IndexedDB (övningar, rutiner, pass, veckologg, metadata) |
| `model.js` | Domänmodell: övning, rutin, pass, set, volym, 1RM |
| `program.js` | Veckoschema, 12-veckors progression, belastningsregler |
| `program-default.js` | Standardprogrammets 42 övningar och 8 rutiner |
| `reference.js` | Idrottsanpassning, kost, tillskott, återhämtning, axel |
| `load-program.js` | Idempotent inläsning av standardprogrammet |
| `exercise-links.js` | Söktermer och länkar till instruktion/video per övning |
| `stats.js` | Volym, rekord, historik per övning, veckosummor |
| `backup.js` | Export/import + backuppåminnelse |
| `ui.js` | Delade DOM-hjälpare (element, modal, toast, fält) |
| `view-train.js` | Träna: dagens pass, loggning av set, passdetaljer |
| `view-routines.js` | Rutiner: skapa, ändra, ordna, kopiera |
| `view-exercises.js` | Övningsbibliotek, övningsinfo, väljardialog |
| `view-stats.js` | Statistik och veckologg |
| `view-more.js` | Program, kost, idrott, axel, backup |
| `manifest.json`, `sw.js` | PWA: installerbar + offline |
| `icons/` | App-ikoner (regenereras med `node generate-icons.js`) |

Höj `CACHE_VERSION` i `sw.js` när du ändrar någon fil i app-skalet, annars
fortsätter en installerad app att servera den gamla versionen.

## Datamodell

Fyra stores i IndexedDB (`styrka-app`), plus `meta` för nyckel/värde
(`programStartDate`, `bodyWeight`, `lastExportAt`):

- `exercises` — namn, kategori, mätsätt, per sida, standardreps, utförande, nyckelpunkt, axelregel, egen länk (`videoUrl`)
- `routines` — namn, typ, beskrivning och en ordnad lista `items` (`exerciseId`, `sets`, `reps`)
- `sessions` — ett loggat pass: datum, programvecka, `entries` med `sets` (`weight`, `reps`, `seconds`, `meters`, `rir`, `done`). Ett pågående pass ligger kvar med `status: 'active'`
- `checkins` — veckologgen, en post per datum

Volym räknas som vikt × reps summerat, och ensidiga övningar räknas för båda
sidor (ett loggat set = ett set per sida).

## Backup-format

```json
{
  "version": 1,
  "exportedAt": "ISO-tid",
  "meta": { "programStartDate": "2026-08-10", "bodyWeight": 77 },
  "exercises": [], "routines": [], "sessions": [], "checkins": []
}
```

`version` finns från start så framtida formatändringar kan läsa in gamla backuper.

## Framtid: matprogram

Kostdelen är i dag referensmaterial (proteinmål, dagsmodell, tillskott). Ett
riktigt matprogram med loggning läggs till som en egen store (`meals` /
`foods`) plus en egen vy — `db.js`, `backup.js` och backup-formatet är byggda
för att växa med fler stores utan att gamla backuper slutar fungera.

---

Programmet är en generell träningsplan och inte medicinsk behandling. Anpassa
alltid efter dagsform, idrottsbelastning och professionell bedömning av axeln.
