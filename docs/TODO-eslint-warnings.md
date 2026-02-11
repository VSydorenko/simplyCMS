# ESLint Warnings — Task for Future Fix

> Generated: 2026-02-11 | TypeScript: 0 errors | ESLint: 0 errors, 79 warnings
> Context: Warnings accumulated after Next.js migration (from Vite/react-router-dom)

---

## Summary

| Rule | Count | Priority | Effort |
|------|-------|----------|--------|
| `@typescript-eslint/no-unused-vars` | 29 | Low | Easy |
| `react-hooks/set-state-in-effect` | 19 | Medium | Medium |
| `react-hooks/static-components` | 9 | Medium | Easy |
| `jsx-a11y/alt-text` | 7 | Low | Easy |
| `@next/next/no-assign-module-variable` | 7 | Low | Medium |
| `react-hooks/exhaustive-deps` | 4 | Medium | Medium |
| `react-hooks/incompatible-library` | 2 | Low | Info |
| `react-hooks/purity` | 1 | Low | Easy |
| `@typescript-eslint/no-unused-expressions` | 1 | Low | Easy |

---

## 1. `@typescript-eslint/no-unused-vars` (29 warnings) — EASY

Unused imports and variables left after migration. Remove or prefix with `_`.

### Files and specific items:

| File | Line | Unused variable |
|------|------|----------------|
| `admin/src/components/ImageUpload.tsx` | 6:30 | `GripVertical` |
| `admin/src/components/ImageUpload.tsx` | 6:53 | `ImageIcon` |
| `admin/src/components/ImageUpload.tsx` | 143:14 | `e` |
| `admin/src/components/InstallPluginDialog.tsx` | 20:10 | `installPlugin` |
| `admin/src/components/RichTextEditor.tsx` | 45:3 | `placeholder` |
| `admin/src/components/StockByPointManager.tsx` | 27:11 | `StockRecord` (type) |
| `admin/src/pages/DiscountEdit.tsx` | 50:7 | `conditionTypeLabels` |
| `admin/src/pages/Discounts.tsx` | 6:85 | `ToggleLeft` |
| `admin/src/pages/Discounts.tsx` | 6:97 | `ToggleRight` |
| `admin/src/pages/Discounts.tsx` | 55:9 | `router` |
| `admin/src/pages/Discounts.tsx` | 138:11 | `hasChildren` |
| `admin/src/pages/OrderStatuses.tsx` | 34:52 | `GripVertical` |
| `admin/src/pages/PickupPointEdit.tsx` | 9:52 | `CardDescription` |
| `admin/src/pages/PluginSettings.tsx` | 22:28 | `ParsedPlugin` (type) |
| `admin/src/pages/Products.tsx` | 19:6 | `Product` (type) |
| `admin/src/pages/Reviews.tsx` | 3:20 | `useMutation` |
| `admin/src/pages/Reviews.tsx` | 3:33 | `useQueryClient` |
| `admin/src/pages/Reviews.tsx` | 6:10 | `Button` |
| `admin/src/pages/Reviews.tsx` | 8:10 | `Input` |
| `admin/src/pages/Settings.tsx` | 4:10 | `Button` |
| `admin/src/pages/UserEdit.tsx` | 52:9 | `router` |
| `core/src/components/catalog/CatalogLayout.tsx` | 6:21 | `Settings` |
| `core/src/components/catalog/CatalogLayout.tsx` | 6:31 | `LogOut` |
| `core/src/components/catalog/CatalogLayout.tsx` | 30:3 | `renderButton` |
| `core/src/components/catalog/FilterSidebar.tsx` | 146:9 | `handlePriceChange` |
| `core/src/components/reviews/ProductReviews.tsx` | 25:5 | `userReview` |
| `core/src/components/reviews/ReviewRichTextEditor.tsx` | 30:3 | `placeholder` |
| `core/src/hooks/use-toast.ts` | 24:7 | `actionTypes` |
| `ui/src/calendar.tsx` | 47:37 | `props` |

**How to fix:** Remove unused imports/variables or prefix unused function params with `_`.

---

## 2. `react-hooks/set-state-in-effect` (19 warnings) — MEDIUM

Calling `setState` synchronously inside `useEffect`. This is a common pattern for initializing form state from API data, but the React Compiler considers it problematic because it causes cascading renders.

### Files and specific items:

| File | Line | setState call | Context |
|------|------|--------------|---------|
| `admin/src/components/AllProductProperties.tsx` | 136 | `setValues(valuesMap)` | Init from `existingValues` |
| `admin/src/components/ProductPricesEditor.tsx` | 67 | `setPrices(initial)` | Init from `priceTypes` + `existingPrices` |
| `admin/src/components/ProductPropertyValues.tsx` | 148 | `setValues(valuesMap)` | Init from `existingValues` |
| `admin/src/components/StockByPointManager.tsx` | 75 | `setStockData(newStockData)` | Init from `existingStock` + `pickupPoints` |
| `admin/src/pages/BannerEdit.tsx` | 111 | `setForm({...})` | Init form from `banner` data |
| `admin/src/pages/DiscountEdit.tsx` | 159 | `setTargets(...)` | Init form from `existing` discount |
| `admin/src/pages/OrderDetail.tsx` | 111 | `setSelectedStatus(...)` | Init from `order.status_id` |
| `admin/src/pages/ProductEdit.tsx` | 83 | `setFormData({...})` | Init form from `product` data |
| `admin/src/pages/PropertyEdit.tsx` | 111 | `setFormData({...})` | Init form from `property` data |
| `admin/src/pages/PropertyOptionEdit.tsx` | 89 | `setFormData({...})` | Init form from `option` data |
| `admin/src/pages/SectionEdit.tsx` | 54 | `setFormData({...})` | Init form from `section` data |
| `admin/src/pages/ThemeSettings.tsx` | 69 | `setConfig({...})` | Init from `theme.config` |
| `core/src/components/catalog/FilterSidebar.tsx` | 62 | `setLocalPriceRange(...)` | Sync from `priceRange` |
| `core/src/components/catalog/FilterSidebar.tsx` | 131 | `setLocalNumericRanges(...)` | Sync from `numericPropertyRanges` |
| `core/src/components/checkout/CheckoutDeliveryForm.tsx` | 119 | `setHasChanges(...)` | Compute diff from original |
| `core/src/components/checkout/CheckoutRecipientForm.tsx` | 78 | `setHasChanges(...)` | Compute diff from original |
| `core/src/components/checkout/CheckoutRecipientForm.tsx` | 196 | `setOriginalRecipient(null)` | Reset on toggle |
| `core/src/hooks/useCart.tsx` | 46 | `setItems(parsed)` | Load cart from localStorage |
| `themes/default/components/BannerSlider.tsx` | 28 | `onSelect()` | Init embla carousel state |

**How to fix (per pattern):**

- **Form initialization from API data** (BannerEdit, ProductEdit, etc.): Replace `useEffect` + `setState` with derived state. Options:
  - Use `defaultValues` from react-query data directly (controlled → uncontrolled)
  - Use `useMemo` to derive initial form state
  - Use `key` prop to reset form when data changes: `<Form key={data?.id} defaultValues={data} />`
  - Or use React Hook Form's `reset()` in `onSuccess` callback of query

- **Sync local state from props** (FilterSidebar, CheckoutForms): Replace with `useMemo`/derived state instead of syncing via effect.

- **Load from localStorage** (useCart): Use `useState` with initializer function: `useState(() => JSON.parse(localStorage.getItem(...)))`.

- **Carousel** (BannerSlider): Call `onSelect()` in the embla `init` event callback instead of in the effect body.

---

## 3. `react-hooks/static-components` (9 warnings) — EASY

Components defined inside render functions, causing re-creation on each render.

### Files:

| File | Line | Component | Times used |
|------|------|-----------|-----------|
| `core/src/components/catalog/ActiveFilters.tsx` | 34 | `Button` (fallback) | 1x (line 60) |
| `core/src/components/reviews/ReviewRichTextEditor.tsx` | 81 | `ToolbarButton` | 8x (lines 109-133) |

**How to fix:**
- `ActiveFilters.tsx`: Move `Button` fallback definition outside the component, or use inline JSX instead of creating a component.
- `ReviewRichTextEditor.tsx`: Extract `ToolbarButton` to a separate component defined outside the render function. It accepts `isActive`, `onClick`, `disabled`, `children` — pass `editor` state via props or context.

---

## 4. `jsx-a11y/alt-text` (7 warnings) — EASY

Images missing `alt` attribute for accessibility.

### Files:

| File | Line |
|------|------|
| `admin/src/components/ProductModifications.tsx` | 421 |
| `admin/src/pages/Banners.tsx` | 79 |
| `admin/src/pages/Products.tsx` | 121 |
| `admin/src/pages/Sections.tsx` | 105 |
| `core/src/components/catalog/ProductCard.tsx` | 52 |
| `themes/default/components/BlogPreview.tsx` | 43 |
| `themes/default/components/ProductCard.tsx` | 53 |

**How to fix:** Add meaningful `alt` prop to each `<img>` element. Use product/banner/section name as alt text, e.g. `alt={product.name}`.

---

## 5. `@next/next/no-assign-module-variable` (7 warnings) — MEDIUM

Assigning to a variable named `module` conflicts with Next.js module system.

### Files:

| File | Lines |
|------|-------|
| `admin/src/components/InstallPluginDialog.tsx` | 51, 114 |
| `admin/src/pages/PluginSettings.tsx` | 51 |
| `plugin-system/src/PluginLoader.ts` | 36, 59, 89 |
| `theme-system/src/ThemeRegistry.ts` | 60 |

**How to fix:** Rename the local variable `module` to `pluginModule` or `loadedModule` in the plugin/theme system files. This is a naming conflict — the logic itself is correct.

---

## 6. `react-hooks/exhaustive-deps` (4 warnings) — MEDIUM

Missing or incorrect dependencies in `useEffect` / `useCallback` hooks.

### Files:

| File | Line | Missing deps |
|------|------|-------------|
| `admin/src/components/ImageUpload.tsx` | 117 | `handleFileSelect` in useCallback |
| `core/src/components/checkout/CheckoutDeliveryForm.tsx` | 219 | `onChange` |
| `core/src/components/checkout/CheckoutRecipientForm.tsx` | 67 | `currentValues` (object in deps) |
| `core/src/components/checkout/CheckoutRecipientForm.tsx` | 199 | `clearRecipientFields`, `onChange` |

**How to fix:**
- Wrap `onChange` / callback props with `useCallback` in parent components.
- Memoize `currentValues` with `useMemo`.
- For `handleFileSelect` — restructure the dependency chain or include it.

---

## 7. `react-hooks/incompatible-library` (2 warnings) — INFO ONLY

React Hook Form's `watch()` returns values that can't be memoized by React Compiler.

### Files:

| File | Line | Code |
|------|------|------|
| `admin/src/pages/ShippingMethodEdit.tsx` | 128 | `form.watch("type")` |
| `admin/src/pages/UserCategoryRuleEdit.tsx` | 452 | `form.watch(\`conditions.rules.${index}.field\`)` |

**How to fix:** No action needed. This is a known React Hook Form limitation with React Compiler. The Compiler skips memoization for these components. Consider `useWatch()` hook as an alternative if performance becomes an issue.

---

## 8. `react-hooks/purity` (1 warning) — EASY

`Math.random()` in render — impure function call.

### File:

| File | Line | Code |
|------|------|------|
| `ui/src/sidebar.tsx` | 538 | `Math.floor(Math.random() * 40) + 50` in `useMemo(() => ..., [])` |

**How to fix:** Replace `Math.random()` with a deterministic approach, e.g., use index-based width or pass width as prop. This is a skeleton loader width — any fixed pattern would work.

---

## 9. `@typescript-eslint/no-unused-expressions` (1 warning) — EASY

Expression statement without side effect.

### File:

| File | Line |
|------|------|
| `admin/src/pages/Discounts.tsx` | 131 |

**How to fix:** Investigate the expression — likely a leftover or needs to be converted to a proper function call.

---

## Recommended Fix Order

1. **`no-unused-vars`** (29) — Quick wins, just remove unused imports
2. **`alt-text`** (7) — Add alt props to images
3. **`static-components`** (9) — Move 2 component definitions outside render
4. **`no-assign-module-variable`** (7) — Rename `module` → `pluginModule`
5. **`purity`** (1) — Replace Math.random with deterministic value
6. **`no-unused-expressions`** (1) — Fix expression in Discounts.tsx
7. **`exhaustive-deps`** (4) — Add missing deps, wrap callbacks
8. **`set-state-in-effect`** (19) — Refactor form init patterns (biggest effort)
9. **`incompatible-library`** (2) — Info only, no fix needed

After fixing items 1-7, warnings should drop from **79 → ~27** (only `set-state-in-effect` + `incompatible-library` remain).
