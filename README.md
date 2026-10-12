# SCADA Engineering Verification & Commissioning Assistant

A Progressive Web App (PWA) for SCADA, instrumentation & control and commissioning engineers. It helps verify that a SCADA system matches its approved design before handover, organises test evidence and produces commissioning reports.

> **This is a verification and documentation assistant, not a safety controller.** It never sends commands to PLCs, RTUs, SCADA servers or any equipment, never scans networks, and never approves safety-critical items automatically. Approved project specifications are the source of truth; every approval is a named human sign-off. A fully ticked checklist or a passed test list does **not** by itself mean a system is safe or compliant.

Plain HTML/CSS/JavaScript. No build step, no backend, no API key, no third-party libraries, no paid service.

## Features

| Module | What it does |
|---|---|
| **Dashboard** | Annunciator-style status panel, charts and an attention list, all calculated from stored data: I/O verified/failed/untested, tag discrepancies, FAT/SAT completion, alarm/trip status, open/critical/overdue defects, overdue checklist items, evidence completion, outstanding approvals. |
| **I/O Verification** | DI/DO/AI/AO records with tag, description, equipment, units, range, raw span, SCADA-configured scaling, expected vs actual, tolerance, status (Pass/Fail/Not tested/N/A), date, engineer, evidence and comments. Flags missing tags, duplicate tags, invalid ranges, scaling mismatches, out-of-range values, "Pass but values differ". CSV import (with invalid-row report), CSV export, scaling calculator. |
| **Tag Database Checker** | Import approved tag list and SCADA export (CSV, flexible headers). Reports missing, unexpected and duplicate tags, description, data-type, units and range mismatches, tag-name case differences. Filters, search, CSV discrepancy export. |
| **Alarm & Trip Tests** | Test cases built from approved requirements (requirement reference, limit, priority, acknowledgement/reset behaviour, expected trip response), configurable steps, observed results, evidence, engineer and approval. A **Pass cannot be recorded without a requirement reference**, completed steps, observed result, engineer and date; **approval needs evidence**; editing an approved test revokes the approval. |
| **Communication Diagnostics** | Manual log of comms problems (device, IP, protocol, symptoms, timestamps, errors, cause, steps, resolution), searchable troubleshooting knowledge base (editable), safe read-only diagnostic checklists. Manual observations and browser-collected snapshots are labelled differently. **No network scanning or device connection is performed.** |
| **FAT / SAT** | Test plans, reusable templates, step-by-step execution with expected/actual per step, witness, evidence, human approval, summary report of progress/outstanding/failed tests. |
| **Commissioning Checklist** | The ten commissioning areas, assignee, due date, status, comments, evidence, overdue tracking, starter items (generic task outlines to be tailored). |
| **Defects & Punch List** | Severity, category, assignee, root cause, corrective action, retest, closure approval, photo attachments, status history; critical and overdue items highlighted. Closing requires a passed retest and a named approver. |
| **Evidence & Reports** | Evidence register, printable report, **PDF download** (generated in the browser), CSV and **Excel (.xlsx)** export, filters by project/equipment/status/date, cover page, signature block. Reports are labelled **DRAFT** and list pending approvals until nothing remains open. |
| **Projects & Favorites** | Multiple projects with customer, facility, system description, ID, revision and dates; star favorites; project selector filters every page; per-project export (JSON / Excel). |
| **Data Management** | JSON backup & validated restore (merge or replace), sample-data reset/removal, full change history with CSV export, storage status, erase-all with typed confirmation. |

Demonstration data for a **fictional** water treatment plant is loaded on first run. Every sample record carries a visible **SAMPLE** badge; remove it under *Data Management* before recording genuine project work.

## Using the app

1. Open the app, enter your name (top right) — it is stored in this browser and written into the change history.
2. Create a project (*Projects → New project*) or explore the sample projects. Use the selector at the top to focus on one project.
3. Import your approved I/O list and tag lists (CSV templates are downloadable inside each import dialog), or enter records manually.
4. Record tests; attach evidence references (and photos on defects); have authorised people approve tests and defect closures.
5. Generate the report under *Evidence & Reports*.

CSV tips: UTF-8 CSV with a header row; comma, semicolon or tab delimited; quoted fields supported. Header names are matched flexibly (for tags: `tag`, `tag name`, `name`, `point`; `description`; `data_type`; `units`; `range_low`; `range_high`).

## Data storage, backup and restore

* All data lives in **IndexedDB inside your browser profile**. Nothing is uploaded anywhere.
* Clearing site data, using a private window, or switching browser/profile means the data is not there. **Download a JSON backup regularly** (*Data Management → Download full backup*). Backups include records, photos and change history.
* Restore validates the file first and shows its contents; *Merge* adds/overwrites by record ID, *Replace* erases everything first (typed confirmation required).
* Data is not shared between devices. Move it with a JSON backup.

## Offline use and limitations

* After the first successful load, a service worker caches the whole app; it then works offline (create, edit, review, import/export, report generation).
* The first visit needs a network connection; after that it does not.
* **No third-party libraries are used**, so there are no CDN offline limitations. PDF and XLSX files are generated by code included in the app.
* Storage is per browser. Browsers may evict data of sites that are not installed or marked persistent; installing the app and keeping backups mitigates this.
* Photos are resized (max 1280 px) and stored locally; very large numbers of photos increase storage use.
* Updating: when you deploy a new version, **change `VERSION` in `service-worker.js`** so browsers fetch the new files. Open pages show a "Reload to update" message.
* iOS/Safari: use *Share → Add to Home Screen* to install; Safari may clear storage for sites unused for several weeks — keep backups.
* The PDF report uses built-in Helvetica; characters outside Latin-1 (e.g. Ω) are replaced (Ω → "ohm", others → "?").

## Deploying to GitHub Pages (step by step)

1. Sign in at <https://github.com> and click **New repository**. Choose a name (e.g. `scada-evc`), keep it **Public** (free GitHub Pages requires public repos unless you have a paid plan), and click **Create repository**.
2. Extract this ZIP on your computer. You should see `index.html`, `manifest.json`, `service-worker.js`, `css/`, `js/`, `icons/` and this `README.md` directly in the extracted folder.
3. In the new repository click **uploading an existing file** (or *Add file → Upload files*). Drag **the contents** of the extracted folder (all files and the `css`, `js`, `icons` folders) into the browser window — `index.html` must be at the **top level** of the repository, not inside an extra folder.
4. Scroll down, write a commit message such as "Add SCADA EVC app" and click **Commit changes**.
5. Open **Settings → Pages**. Under *Build and deployment* choose **Source: Deploy from a branch**, **Branch: `main`**, **Folder: `/ (root)`**, then **Save**.
6. Wait 1–2 minutes. The site appears at `https://<your-user-name>.github.io/<repository-name>/`. Open it, and use your browser's *Install* option (address-bar icon or menu) to install it as an app.
7. To update later: upload the changed files again (same names overwrite), and bump `VERSION` in `service-worker.js`.

Command-line alternative:

```bash
cd extracted-folder
git init -b main
git add .
git commit -m "Add SCADA EVC app"
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```

All asset paths are relative, so the app works from a repository sub-path such as `/<repo>/`. There is no build step and no configuration. To try it locally, serve the folder with any static server (for example `python3 -m http.server`) and open `http://localhost:8000/` — service workers and install require `http://localhost` or HTTPS, not `file://`.

## Project layout

```
index.html            application shell
manifest.json         PWA manifest
service-worker.js     offline cache (bump VERSION on every release)
css/styles.css        dark industrial theme, responsive + print styles
js/                   application code (no dependencies)
icons/                PWA icons (192, 512, maskable, Apple touch, favicon)
```

## Safety and engineering rules built into the app

* No control commands, no network scanning, no connection to industrial equipment.
* Expected values, alarm limits and trip settings are **never supplied by the app** — they are entered from approved documents. Built-in templates contain placeholders such as "[Per approved specification]".
* A Pass for alarm/trip tests is blocked without requirement reference, completed steps, observed result, engineer and date; approvals are blocked without evidence and require a named approver and role.
* Approvals are revoked automatically if the approved record changes.
* Sample records are marked SAMPLE everywhere, including reports; reports with sample data carry an explicit warning.
* Creations, edits, deletions, imports and sign-offs are time-stamped with the engineer name in the change history.

## Verification status

The following were exercised with automated end-to-end tests (Playwright / Chromium, served from a sub-directory to mimic GitHub Pages) during development: navigation of all modules; I/O validation, flags, comparison, CSV import/export; tag comparison counts and CSV report; alarm/trip rules and approval/revocation; comms records, knowledge base and checklists; FAT/SAT creation, execution, approval and summary; checklist and defect workflows including photo attachment and closure rules; dashboard figures compared with an independent recount of IndexedDB; global search; report preview, PDF (structure checked with qpdf/pypdf/pdftotext), CSV and XLSX (opened with openpyxl); JSON backup, rejection of invalid backups, erase and restore; sample-data removal/reset; persistence after reload; service-worker registration, offline reload and offline record creation; manifest and installability checks reported by Chromium; mobile/tablet layout without horizontal page scroll; axe-core WCAG 2 A/AA checks.

**Not tested:** other browsers (Firefox, Safari, Edge, mobile browsers on real devices), real GitHub Pages hosting, the actual install prompt flow on a device, opening the XLSX in Microsoft Excel itself, printing on a physical printer, and very large datasets (thousands of records). Treat those as to be confirmed in your environment.
