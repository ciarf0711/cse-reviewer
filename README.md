# CSE Reviewer 2026 📘🇵🇭

An **offline Civil Service Exam (Professional level) reviewer** for **iPhone & iPad** — built as a
Progressive Web App (PWA). Add it to your Home Screen and it behaves like a real app: full-screen,
works without internet, saves your scores.

## What's inside
- **4,000 practice questions** across 4 subjects, each with the **correct answer + a worked explanation**:
  | Subject | Questions |
  |---|---|
  | 🔢 Numerical Ability | 1,000 |
  | 🧩 Analytical Ability | 1,000 |
  | 📖 Verbal (English & Filipino) | 1,000 |
  | 🇵🇭 General Information | 1,000 |
- **Practice mode** — instant feedback + explanation after each item.
- **Timed Exam mode** — ~50 sec/question, results at the end (mimics the real exam).
- **Mixed Mock Exam** — random questions from all subjects.
- **Review my wrong answers** — every item you miss is saved for focused re-study.
- **Score tracking** — best % per subject, 80% CSE passing line shown on results.

---

## 🌐 It's live online — no Mac/server needed

**App:** https://ciarf0711.github.io/cse-reviewer/
**Install page (with QR + APK):** https://ciarf0711.github.io/cse-reviewer/install.html

### 📱 iPhone / iPad
1. Open **https://ciarf0711.github.io/cse-reviewer/** in **Safari**.
2. Tap **Share** (□↑) → **Add to Home Screen** → **Add**.
3. A **CSE Reviewer** icon appears — opens full-screen, works **offline** after first load.

### 🤖 Android
- **App file:** download **CSE-Reviewer.apk** (in this repo / on the install page), tap it → Install.
- **Or one-tap:** open the link in Chrome → menu ⋮ → **Install app**.

> Day-to-day reviewing is 100% offline once installed. The live URL is just for first install
> and for sharing to other phones (scan the QR on the install page).

### (Optional) Run locally instead
```bash
cd ~/Downloads/Claude_Anything/cse-reviewer
python3 -m http.server 8000   # then open http://<your-mac-ip>:8000 on the phone
```

---

## Updating / adding questions
All questions live in plain JSON in `data/`:
```
data/numerical.json
data/verbal.json
data/analytical.json
data/general.json
```
Each item looks like:
```json
{
  "question": "What is 15% of 200?",
  "choices": ["25", "30", "35", "20"],
  "answer": 1,
  "explanation": "15% of 200 = (15/100) × 200 = 30.",
  "topic": "Percentage"
}
```
`answer` is the **0-based index** of the correct choice. Edit or append items, then on the device
delete the old Home-Screen icon and re-add it (or bump the cache name in `sw.js`) to refresh.

---

## File structure
```
cse-reviewer/
├── index.html        app entry
├── styles.css        PH-themed UI
├── app.js            quiz engine (timer, scoring, review, offline)
├── manifest.json     PWA metadata (name, icon, standalone)
├── sw.js             service worker (offline cache)
├── icons/            app icons (180/192/512)
└── data/             the 4 question banks (JSON)
```

## Notes
- **Passing mark:** the app flags 80% (the actual CSE general rating to pass).
- Numerical & Analytical answers are **computed programmatically**, so the math/logic is exact.
- General Information facts are based on the 1987 Constitution, RA 6713, and common CSE civics/laws.
  Always cross-check current laws before exam day, as statutes can be amended.
