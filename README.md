# BUP UCAM

BUP UCAM First Gen is a lightweight browser extension for the BUP UCAM portal. It adds quick controls for evaluation forms and helps students estimate in-course totals and final exam marks needed for each grade.

## Features

- Select one evaluation rating across all visible evaluation questions.
- Read posted exam mark summary rows from the UCAM portal.
- Estimate in-course totals from class tests, mid term, project or assignment work, and attendance.
- Add temporary manual marks for pending components.
- Show final exam marks needed for each grade.

## Install Locally

1. Download or clone this repository.
2. Open Chrome or Edge and go to `chrome://extensions`.
3. Turn on `Developer mode`.
4. Choose `Load unpacked`.
5. Select this project folder.
6. Open a matching BUP portal page under `bup.edu.bd`.

## Project Structure

- `manifest.json`: Chrome extension manifest.
- `content.js`: Starts the registered BUP UCAM features.
- `scripts/core.js`: Shared configuration, state, and utilities.
- `scripts/evaluation-quick-select.js`: Evaluation form quick-select feature.
- `scripts/exam-planner.js`: Exam mark parsing, in-course total, and final requirement planning.
- `styles.css`: Styles for injected BUP UCAM UI.

## Notes

The grade and mark calculations are estimates based on the visible UCAM page data and the configured scale. Always double-check results against the official course teacher or department scheme.
