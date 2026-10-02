// Notes Toolkit - Day 3 assignment

let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

const VALID_CATEGORIES = ["personal", "work", "study"];

// 1. Notes whose text contains the word (case-insensitive)
function searchNotes(word) {
  const search = word.toLowerCase();
  return notes.filter((note) => note.text.toLowerCase().includes(search));
}

// 2. The note with the most characters, or null if there are none
function longestNote() {
  if (notes.length === 0) return null;
  let longest = notes[0];
  for (const note of notes) {
    if (note.text.length > longest.text.length) {
      longest = note;
    }
  }
  return longest;
}

// 3. Count notes per category
function countByCategory() {
  const counts = {};
  for (const note of notes) {
    if (counts[note.category] === undefined) {
      counts[note.category] = 0;
    }
    counts[note.category]++;
  }
  return counts;
}

// 4. A one-sentence summary
function getSummary() {
  const counts = countByCategory();
  const total = notes.length;
  const word = total === 1 ? "note" : "notes";
  const parts = VALID_CATEGORIES.map((c) => `${counts[c] || 0} ${c}`);
  return `${total} ${word}: ${parts.join(", ")}.`;
}

// 5. Is there already a note with the same text (ignoring case and extra spaces)?
function isDuplicate(text) {
  const cleaned = text.trim().toLowerCase();
  return notes.some((note) => note.text.trim().toLowerCase() === cleaned);
}

// 6. Add a note if it passes every check; returns true/false and logs the reason
function addNote(text, category) {
  const cleaned = text.trim();
  if (cleaned.length < 1 || cleaned.length > 200) {
    console.log("❌ Rejected: text must be 1-200 characters.");
    return false;
  }
  if (isDuplicate(cleaned)) {
    console.log("❌ Rejected: that note already exists.");
    return false;
  }
  if (!VALID_CATEGORIES.includes(category)) {
    console.log("❌ Rejected: category must be personal, work or study.");
    return false;
  }
  const nextId = notes.length > 0 ? Math.max(...notes.map((n) => n.id)) + 1 : 1;
  notes.push({ id: nextId, text: cleaned, category });
  console.log(`✅ Added: "${cleaned}" (${category})`);
  return true;
}

// ---------------- Tests ----------------

// searchNotes
console.log(searchNotes("JAVASCRIPT")); // [ { id: 4, text: "Revise JavaScript arrays", category: "study" } ]
console.log(searchNotes("xyz"));        // [] (edge case: no results)

// longestNote
console.log(longestNote()); // { id: 3, text: "Email the project report to Grace", category: "work" }
const savedNotes = notes;
notes = [];
console.log(longestNote()); // null (edge case: empty array)
notes = savedNotes;

// countByCategory
console.log(countByCategory()); // { personal: 2, study: 2, work: 1 }
notes = [];
console.log(countByCategory()); // {} (edge case: empty array)
notes = savedNotes;

// getSummary
console.log(getSummary()); // "5 notes: 2 personal, 1 work, 2 study."
notes = [{ id: 1, text: "Only one", category: "work" }];
console.log(getSummary()); // "1 note: 0 personal, 1 work, 0 study." (edge case: singular)
notes = savedNotes;

// isDuplicate
console.log(isDuplicate("  call MUM  ")); // true (ignores case and extra spaces)
console.log(isDuplicate("Call dad"));     // false

// addNote
console.log(addNote("Pay school fees", "personal")); // ✅ Added... then true
console.log(addNote("pay SCHOOL fees ", "work"));    // ❌ duplicate, then false
console.log(addNote("   ", "study"));                // ❌ 1-200 characters, then false
console.log(addNote("x".repeat(201), "study"));      // ❌ 1-200 characters, then false
console.log(addNote("Read a book", "hobby"));        // ❌ invalid category, then false
console.log(getSummary()); // "6 notes: 3 personal, 1 work, 2 study."