# Testing and verification

## Automated tests

Run with Node 22.12+:

```bash
npm test
npm run test:render
npm run build
```

- `npm test`: native Node tests for currency calculations, fixed-point percentage rounding, validation, JSON backup schemas, storage handling and date helpers.
- `npm run test:render`: renders the actual React app through Vite's JSX transformer on the server and asserts the editor, sample warning, PDF action and privacy text exist.
- `npm run build`: checks that Vite compiles the production site.

**Verification:** The original project passed 18 dependency-free Node unit tests locally. After publishing the source to GitHub, the suite was expanded to 22 checks, and GitHub Actions successfully ran the unit tests, React server-render smoke test, and production build in Pull Request #1. Manual browser and print checks remain necessary.

## Manual browser checklist (after GitHub Pages is live)

- [ ] Open app on desktop and mobile; check no white screen or console errors.
- [ ] Default demo displays a visible `SAMPLE DOCUMENT` banner.
- [ ] Switch between quote and invoice: title and due/valid-until label update.
- [ ] Select USD, EUR, GBP and GEL; formatting changes, amounts do not undergo FX conversion.
- [ ] Change line price/quantity; totals update.
- [ ] Set 5% discount and 10% tax; subtotal, discount, tax and total agree with a manual calculation.
- [ ] Add and remove rows; cannot remove the last row.
- [ ] Negative prices, invalid quantities, blank required names and invalid dates prevent printing.
- [ ] Refresh page: valid draft persists in that browser.
- [ ] Export JSON, change a field, import JSON and confirm: previous details return.
- [ ] Import malformed JSON: existing draft is not replaced.
- [ ] Print and choose `Save as PDF` on desktop; confirm content fits on A4 and no form controls appear.
- [ ] Verify navigation, input labels, focus indication and screen-reader announcements.
- [ ] Verify no client data is transmitted to a backend (browser localStorage only).

## Known limitations

- Prints through the **browser print dialog** rather than a dedicated PDF-generation library. Users must choose `Save as PDF`.
- This does not generate official legally compliant invoice numbering, VAT reports or tax returns. Rates are manual.
- No user authentication, multi-device sync, cloud backups, payment collection or invoice-email delivery.
- Only basic automated verification; cross-browser print and formal accessibility testing remain manual.
- Browser drafts are stored in plain text and are not encrypted.