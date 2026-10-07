// Element Selection
const noteText = document.getElementById("note-text");
const charCount = document.getElementById("char-count");
const wordCount = document.getElementById("word-count");
const clearBtn = document.getElementById("clear-btn");
const themeToggle = document.getElementById("theme-toggle");

// LocalStorage Keys
const DRAFT_KEY = "day4_note_draft";
const THEME_KEY = "day4_theme_preference";

// Helper: Calculate character and word count + update warnings
function updateCounts() {
  const text = noteText.value;
  const numChars = text.length;

  // Calculate words: split by whitespace and filter out empty strings
  const wordsArray = text.trim().split(/\s+/).filter((word) => word.length > 0);
  const numWords = wordsArray.length;

  // Update text outputs
  charCount.textContent = `${numChars} / 200 characters`;
  wordCount.textContent = `${numWords} ${numWords === 1 ? "word" : "words"}`;

  // Manage warning / over classes
  charCount.classList.remove("warning", "over");
  if (numChars > 200) {
    charCount.classList.add("over");
  } else if (numChars > 180) {
    charCount.classList.add("warning");
  }
}

// Action: Clear text, counters, and draft
function clearAll() {
  noteText.value = "";
  localStorage.removeItem(DRAFT_KEY);
  updateCounts();
}

// Theme Toggle Functionality
function applyTheme(isDark) {
  if (isDark) {
    document.body.classList.add("dark");
    themeToggle.textContent = "Light mode";
  } else {
    document.body.classList.remove("dark");
    themeToggle.textContent = "Dark mode";
  }
}

// Initial Loading Logic
function init() {
  // Restore saved draft
  const savedDraft = localStorage.getItem(DRAFT_KEY);
  if (savedDraft !== null) {
    noteText.value = savedDraft;
  }

  // Restore saved theme preference
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === "dark") {
    applyTheme(true);
  } else {
    applyTheme(false);
  }

  // Initial calculation
  updateCounts();
}

// --- Event Listeners ---

// On typing / input
noteText.addEventListener("input", () => {
  updateCounts();
  localStorage.setItem(DRAFT_KEY, noteText.value);
});

// Pressing Escape inside the textarea
noteText.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    clearAll();
  }
});

// Click Clear button
clearBtn.addEventListener("click", () => {
  clearAll();
});

// Click Theme Toggle button
themeToggle.addEventListener("click", () => {
  const isCurrentlyDark = document.body.classList.contains("dark");
  const newDarkState = !isCurrentlyDark;
  
  applyTheme(newDarkState);
  localStorage.setItem(THEME_KEY, newDarkState ? "dark" : "light");
});

// Run Initialization on Page Load
init();