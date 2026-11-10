# TypeScript in a real React project — complete walkthrough

This walkthrough follows the real files in **Invoice & Quote Studio**. The migration is intentionally focused on type safety, not on redesigning the UI or changing draft data.

## 1. Static types

JavaScript accepts `let amount = 50; amount = "fifty";`. TypeScript can reject that reassignment before the code runs:

```ts
let amount: number = 50;
// amount = 'fifty'; // Type error
const clientName: string = 'Example Client';
const isDemo: boolean = true;
```

The annotations are checked by the compiler. Types are **erased** when the application is built: TypeScript alone does not validate data received from a file or an API.

## 2. Interfaces describe data shapes

Read `src/lib/invoice.ts`. Three interfaces model the app:

```ts
interface PartyDetails {
  name: string;
  email: string;
  address: string;
}
interface LineItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
}
interface InvoiceDraft {
  version: 1;
  type: 'quote' | 'invoice';
  currency: Currency;
  from: PartyDetails;
  to: PartyDetails;
  items: LineItem[];
  // More fields in the real file.
}
```

A property's type matters even when its value changes. The quantity and price inputs are `string` because HTML form values are strings. The app converts and validates them before calculating with numbers.

## 3. Union types constrain allowed values

```ts
export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'GEL'] as const;
export type Currency = typeof SUPPORTED_CURRENCIES[number];
export type DocumentType = 'quote' | 'invoice';
```

A `Currency` value cannot be an arbitrary string at compile time. The app also checks a selected currency at runtime with `isCurrency(value)`.

## 4. Typed functions and results

```ts
function rateOf(amount: number, basis: number): number {
  return Number((BigInt(amount) * BigInt(basis) + 5000n) / 10000n);
}

export function calculateTotals(doc: InvoiceDraft): Totals {
  // See src/lib/invoice.ts for the implementation.
}
```

The calculation keeps amounts in integer minor units (cents/tetri). It does not switch to floating-point currency arithmetic.

## 5. Why `unknown` and runtime checks both matter

The JSON backup import is an **untrusted input**. It is not safe to do `JSON.parse(...) as InvoiceDraft` and assume the contents are valid. `as` is not validation.

The actual app uses:

```ts
export function normalizeDraft(data: unknown): InvoiceDraft {
  // Inspect the version, allowed document type, currency,
  // required strings, item IDs, and other fields.
  // Return a safe InvoiceDraft or throw.
}
```

This is the boundary between untrusted external data and strongly typed application state. Existing v1 JSON files are still supported.

## 6. Generic React state updates

See `src/App.tsx`:

```tsx
type SimpleField =
  | 'type' | 'currency' | 'reference' | 'issuedOn'
  | 'dueOn' | 'discount' | 'tax' | 'notes' | 'terms';

const update = <K extends SimpleField>(
  key: K,
  value: InvoiceDraft[K],
) => setDraft(current => ({ ...current, [key]: value }));
```

`K` is a generic type parameter. `InvoiceDraft[K]` ties the value's type to the chosen field. When you call `update('type', 'quote')`, it is valid. Passing an unrelated value for `type` is not.

## 7. Browser persistence and schema compatibility

See `src/lib/storage.ts`:

```ts
type StorageAdapter = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
```

`Pick` chooses the exact methods required by the storage functions. This makes the code work with both browser `localStorage` and a small in-memory test double.

This migration preserves:
- The `invoice-quote-studio-v1` storage key.
- The saved document `version: 1` JSON shape.
- JSON export and import behavior.
- The unreadable-draft protection.
- All currency and percentage calculations.
- Browser printing / Save as PDF.

**Do not change the storage key or backup schema casually:** doing so can make previously saved browser drafts appear missing.

## 8. TypeScript is not a backend

The app remains local-first, with no server or database. Converting JavaScript files into TypeScript does not create authentication, synced storage, or legally compliant invoices.

A future optional full-stack project could add authenticated accounts and a separate data store, but that would need a deliberate migration and privacy review.

## 9. Run the entire project and checks

```bash
npm install
npm run typecheck
npm test
npm run test:render
npm run build
npm run dev
```

- `typecheck` finds incorrect types without emitting JavaScript.
- `test` runs the original money and storage regression tests through the `tsx` runner.
- `test:render` renders the React app via Vite to catch blank-page regressions.
- `build` generates the deployable site in `dist/`.

You can also run all four checks with `npm run check`.

## 10. Review checklist

1. Compare `src/App.tsx` against its earlier `src/App.jsx` version.
2. Find a real usage of every interface (`PartyDetails`, `LineItem`, `InvoiceDraft`).
3. Follow a form value from the `Field` component through `updateItem` into `calculateTotals`.
4. Follow imported JSON through `normalizeDraft` before it reaches React state.
5. Confirm that saved drafts still use the original key and schema.
6. Only then consider adding new user-facing features.

**Principle:** TypeScript prevents many developer mistakes, but it does not replace validation, tests, manual browser checks or secure product design.
