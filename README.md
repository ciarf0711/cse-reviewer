# CSE Reviewer 2026 📘🇵🇭

An **offline Civil Service Exam (Professional level) reviewer** for **iPhone & iPad** — built as a
Progressive Web App (PWA). Add it to your Home Screen and it behaves like a real app: full-screen,
works without internet, saves your scores.

## What's inside
- **3,730 practice questions** across 4 subjects, each with the **correct answer + a worked explanation**:
  | Subject | Questions |
  |---|---|
  | 🔢 Numerical Ability | 1,000 |
  | 🧩 Analytical Ability | 1,000 |
  | 📖 Verbal (English & Filipino) | 827 |
  | 🇵🇭 General Information | 903 |
- **Practice mode** — instant feedback + explanation after each item.
- **Timed Exam mode** — ~50 sec/question, results at the end (mimics the real exam).
- **Mixed Mock Exam** — random questions from all subjects.
- **Review my wrong answers** — every item you miss is saved for focused re-study.
- **Score tracking** — best % per subject, 80% CSE passing line shown on results.

---

## How to put it on your iPhone / iPad

You need to serve the folder over your Mac's local network once so Safari on the phone can open it.
After you "Add to Home Screen," it works **fully offline** — no Mac needed afterward.

### Step 1 — Start a local server on your Mac
Open Terminal and run:
```bash
cd ~/Downloads/Claude_Anything/cse-reviewer
python3 -m http.server 8000
```
Leave that Terminal window open. Find your Mac's IP address:
```bash
ipconfig getifaddr en0     # Wi-Fi  (try en1 if blank)
```
Say it returns `192.168.1.50`.

### Step 2 — Open it in Safari on the iPhone/iPad
Make sure the phone is on the **same Wi-Fi** as the Mac, then open Safari and go to:
```
http://192.168.1.50:8000
```
(Use your own IP from Step 1.)

### Step 3 — Add to Home Screen
1. Tap the **Share** button (□↑) at the bottom of Safari.
2. Scroll down → **Add to Home Screen**.
3. Tap **Add**.

A **CSE Reviewer** icon appears on your Home Screen. Tap it → it opens full-screen, no Safari bar.
The first time it loads, it caches everything, so after that it **works with Wi-Fi off / Mac off**.

> You only need the Mac + server for the *initial* install (and whenever you want to update the
> questions). Day-to-day reviewing is 100% offline on the device.

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
