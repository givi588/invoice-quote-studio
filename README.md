# Invoice & Quote Studio

A responsive, local-first **React + Vite** application for preparing quotes and invoices. It calculates item totals, discounts, and optional tax, and creates a print-ready document that can be saved as PDF with the browser's print dialog.

> **Portfolio project, not accounting software.** It does not create official tax-compliant invoices for any jurisdiction, accept payments, verify businesses, or transmit orders.

## Features

- Switch between **Quote / Estimate** and **Invoice** documents.
- Edit reference, dates, business and customer details, line items, notes, and terms.
- Choose **USD, EUR, GBP or GEL** (currency display only; no exchange conversion).
- Add and remove up to 40 rows; validate prices and quantities.
- Calculate money in **integer minor units** (cents/tetri), with percentage rates in basis points.
- Apply the discount before the entered tax rate; round to the nearest minor unit.
- View an instant, responsive document preview.
- Use **Print / Save as PDF** to open the browser's standard print dialog.
- Save drafts only in the current browser's **localStorage** and export/import JSON backups.
- Detect unreadable saved drafts and avoid silently overwriting them.
- Display a highly visible **SAMPLE** notice on the built-in demo document.
- Keyboard-operable form controls and a print-specific stylesheet.

## Run locally

Requirements: Node.js 22.12+ (or compatible Node 20.19+) and npm.

```bash
npm install
npm run dev
```

Vite prints the local URL for the development server. There is no backend or database.

## Tests and build

```bash
npm test
npm run test:render
npm run build
```

Unit tests cover integer price calculations, quantities, percentage rounding, invalid values, serialization shape, and storage failure. The React render smoke test checks that the application renders actual HTML on the server through Vite's JSX transform, preventing the empty-page failure common to missing JSX runtime imports. The workflow also creates the production build.

**Local verification note:** The project was assembled where internet access to the npm registry was restricted, so dependency-based React rendering and production build require GitHub Actions or an npm-enabled machine. Pure Node calculation tests can run without dependencies.

## GitHub Pages deployment

This app is configured for the repository **`givi588/invoice-quote-studio`**, giving the expected site URL:

`https://givi588.github.io/invoice-quote-studio/`

1. Create a new public repository called **`invoice-quote-studio`**.
2. Upload the source files, including the hidden `.github/workflows/deploy.yml` file.
3. Visit **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**.
4. The included workflow tests the app, builds it, and publishes `dist/` after a push to `main`.
5. Check the GitHub Actions result before considering the site published. Test the form, mobile layout, JSON backups, and print output manually after deployment.

If the repository is renamed, change `base` in `vite.config.js` to match the new name.

## Data safety

- Data is stored in **plain text in browser storage**, not encrypted. Do not enter confidential client data, bank details, passwords, card numbers, or sensitive personal information.
- Drafts are **per browser and origin**, not synchronized. Clearing site storage may erase them. Download JSON backups regularly.
- Importing a JSON backup requires confirmation and replaces the visible document. Invalid imports are rejected.
- When existing saved data cannot be parsed, the app blocks automatic saving until the user explicitly discards the unreadable draft. It does not automatically erase it.
- The starter example is fictional, marked **SAMPLE**, and not a request for payment.
- Taxes and invoice requirements vary by location. Enter rates only after checking applicable rules; this tool does not calculate tax obligations or guarantee legal validity.
- The **Save as PDF** option comes from the browser print dialog; there is no PDF-generation server.

## Structure

| Path | Purpose |
| --- | --- |
| `src/App.jsx` | React editor, preview, export and import |
| `src/styles.css` | Responsive UI and print layout |
| `src/lib/invoice.js` | Pure calculations, draft validation and formatting |
| `src/lib/storage.js` | Fail-safe localStorage read/write helpers |
| `tests/invoice.test.js` | Native Node business logic and storage tests |
| `scripts/render-smoke.mjs` | React server-render regression test |
| `.github/workflows/deploy.yml` | Tests, build and GitHub Pages deployment |

## Developer

[GitHub — givi588](https://github.com/givi588) · [Portfolio](https://givi588.github.io/givi-portfolio/)