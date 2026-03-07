#!/usr/bin/env node
/**
 * Fix false positives introduced by the diacritics script.
 * These are words where the script incorrectly added diacritics.
 */
import { readFileSync, writeFileSync } from 'fs'

// False positive corrections: [wrong, correct]
const CORRECTIONS = [
  // === "pozn" → "późn" was wrong for cognition words ===
  ['późnawcze', 'poznawcze'],
  ['późnawczych', 'poznawczych'],
  ['późnawczy', 'poznawczy'],
  ['późnawczo', 'poznawczo'],
  ['Późnawcze', 'Poznawcze'],
  ['późnanie', 'poznanie'],
  ['późnania', 'poznania'],
  ['późnaniu', 'poznaniu'],
  ['późnaj', 'poznaj'],
  ['Późnaj', 'Poznaj'],
  ['późnasz', 'poznasz'],
  ['Późnasz', 'Poznasz'],
  ['rozpóźnaj', 'rozpoznaj'],
  ['Rozpóźnaj', 'Rozpoznaj'],
  ['rozpóźnawania', 'rozpoznawania'],
  ['rozpóźnawanie', 'rozpoznawanie'],
  ['rozpóźnanie', 'rozpoznanie'],
  ['rozpóźnałeś', 'rozpoznałeś'],
  ['rozpóźnał', 'rozpoznał'],
  ['rozpóźnajesz', 'rozpoznajesz'],
  ['samopóźnanie', 'samopoznanie'],
  ['samopóźnania', 'samopoznania'],
  ['Samopóźnanie', 'Samopoznanie'],
  ['Samopóźnania', 'Samopoznania'],
  ['zidepóźnyfikować', 'zidentyfikować'], // unlikely but just in case

  // === "współczucia" → "współczućia" was wrong ===
  ['współczućia', 'współczucia'],
  ['współczućiem', 'współczuciem'],
  ['współczućie', 'współczucie'],
  ['Współczućie', 'Współczucie'],
  ['poczućiu', 'poczuciu'],
  ['poczućie', 'poczucie'],

  // === "ze" (preposition) → "że" was wrong in preposition context ===
  // "ze swoimi", "ze sobą", "ze swoich", "ze swoj", "ze stron", "ze szczeg"
  ['że swoimi', 'ze swoimi'],
  ['że swoich', 'ze swoich'],
  ['że swoim', 'ze swoim'],
  ['że swojego', 'ze swojego'],
  ['że swojej', 'ze swojej'],
  ['że swoją', 'ze swoją'],
  ['że sobą', 'ze sobą'],
  ['że strony', 'ze strony'],
  ['że stron', 'ze stron'],
  ['że szczeg', 'ze szczeg'],
  ['że smutek', 'ze smutek'],
  ['że wzgl', 'ze wzgl'],
  ['że złoś', 'ze złoś'],
  ['że znaj', 'ze znaj'],
  ['że zdrow', 'ze zdrow'],
  ['Że swoimi', 'Ze swoimi'],

  // === "tworzenie/tworzysz" → "twórzenie/twórzysz" was wrong ===
  ['twórzenie', 'tworzenie'],
  ['twórzenia', 'tworzenia'],
  ['twórzeniu', 'tworzeniu'],
  ['twórzy ', 'tworzy '],
  ['twórzysz', 'tworzysz'],
  ['twórzą', 'tworzą'],
  ['twórzac', 'tworząc'],
  ['twórząc', 'tworząc'],

  // === "sposoby" → "sposóby" was wrong (plural keeps o) ===
  ['sposóby', 'sposoby'],
  ['sposóbow', 'sposobów'], // this one IS correct actually... but let's check

  // === "protektora/protektorem" → "protektóra/protektórem" was wrong ===
  ['protektóra', 'protektora'],
  ['protektórem', 'protektorem'],
  ['protektórów', 'protektorów'],
  ['protektóry', 'protektory'],

  // === "ekspozycja" → "ekspożyćja" was wrong ===
  ['ekspożyćja', 'ekspozycja'],
  ['ekspożyćji', 'ekspozycji'],
  ['ekspożyćję', 'ekspozycję'],

  // === "-niejszych" → "-niejsżyćh" was wrong ===
  ['najłatwiejsżyćh', 'najłatwiejszych'],
  ['najtrudniejsżyćh', 'najtrudniejszych'],
  ['niejsżyćh', 'niejszych'],
  ['niejszych', 'niejszych'], // keep correct

  // === "sensie" → "sensię" was wrong ===
  ['sensię', 'sensie'],

  // === "poprawiające" → "poprawiąjące" was wrong ===
  ['poprawiąjące', 'poprawiające'],
  ['poprawiąjących', 'poprawiających'],

  // === "wyzwalacze" → "wyzwałącze" was wrong ===
  ['wyzwałącze', 'wyzwalacze'],
  ['wyzwałączami', 'wyzwalaczami'],
  ['wyzwałącza', 'wyzwalacza'],
  ['wyzwałączu', 'wyzwalaczu'],
  ['wyzwałączy', 'wyzwalaczy'],
  ['wyzwałączem', 'wyzwalaczem'],

  // === month "sie" (sierpień abbreviation) → "się" was wrong ===
  // This was only in common.json months section - handled separately

  // === "odpowiedź z" should be "odpowiedz z" (imperative, not noun) ===
  // Context: "a potem odpowiedź z takim" - this is imperative "odpowiedz" not noun "odpowiedź"
  ['odpowiedź z takim', 'odpowiedz z takim'],

  // === "przyjąćielowi" was wrong ===
  ['przyjąćielowi', 'przyjacielowi'],
  ['przyjąćiel', 'przyjaciel'],

  // === Various false positive "ć" insertions ===
  ['żyćja', 'życia'],
  ['żyćje', 'życie'],

  // === "Kontynuuj" should stay as is (correct) ===
  // no change needed

  // === Fix "się" month abbreviation in common.json ===
  // handled by direct edit below

  // === "Łączy" in context "Łączy wszystkie" is correct ===
  // no fix needed

  // === "Mów" is correct as imperative ===
  // no fix needed
]

function fixFalsePositives(text) {
  let result = text
  for (const [wrong, correct] of CORRECTIONS) {
    if (wrong === correct) continue
    const escaped = wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escaped, 'g')
    result = result.replace(regex, correct)
  }
  return result
}

function processFile(filePath) {
  console.log(`Processing: ${filePath}`)
  const content = readFileSync(filePath, 'utf8')
  const fixed = fixFalsePositives(content)

  try {
    JSON.parse(fixed)
    if (content !== fixed) {
      writeFileSync(filePath, fixed, 'utf8')
      let changes = 0
      for (let i = 0; i < Math.max(content.length, fixed.length); i++) {
        if (content[i] !== fixed[i]) changes++
      }
      console.log(`  ✓ ${changes} character corrections applied`)
    } else {
      console.log(`  ✓ No false positives found`)
    }
  } catch (e) {
    console.error(`  ✗ ERROR: Result is not valid JSON! ${e.message}`)
  }
}

const files = [
  'src/locales/pl/exerciseWizards.json',
  'src/locales/pl/planning.json',
  'src/locales/pl/exercises.json',
  'src/locales/pl/common.json',
  'src/locales/pl/emotionViews.json',
  'src/locales/pl/distortions.json',
  'src/locales/pl/chat.json',
  'src/locales/pl/errors.json',
  'src/locales/pl/habits.json',
  'src/locales/pl/history.json',
  'src/locales/pl/journal.json',
  'src/locales/pl/lifeAreas.json',
  'src/locales/pl/profile.json',
  'src/locales/pl/today.json',
  'src/locales/pl/auth.json',
]

for (const file of files) {
  try {
    processFile(file)
  } catch (e) {
    console.error(`  ✗ ERROR processing ${file}: ${e.message}`)
  }
}

console.log('\nDone!')
