# SPEC: UI Component Enforcement — packages/ui + shadcn

**Status**: Active  
**Scope**: `apps/client`, `apps/admin`, `packages/ui`  
**Date**: 2026-04-10

---

## Objective

Enforce a single, consistent rule across all frontend pages in `apps/client` and `apps/admin`:

> **Every visual or interactive element that has a shadcn/ui equivalent must use the component exported from `packages/ui`. Plain HTML tags that duplicate what shadcn provides are forbidden in page and component files.**

This rule requires a **full migration** of all existing violations in `apps/client` and `apps/admin`. New code must comply from the start. Existing violations are tracked in [Current Violations](#current-violations) and must all be resolved as part of this migration.

---

## The Rule

### Allowed — structural / semantic HTML

Layout, semantic containers, and framework primitives do not need to be replaced. These are permitted anywhere:

```
<div>  <section>  <main>  <nav>  <header>  <footer>
<article>  <aside>  <ul>  <ol>  <li>  <figure>  <figcaption>
<time>  <address>  <details>  <summary>  <template>
<form>           ← semantic form wrapper (React Hook Form uses this)
```

Next.js `<Link href="…">` is also acceptable as-is. Raw `<a href="…">` is not — use `<Link>` from Next.js instead.

### Forbidden — shadcn equivalent exists

Any HTML tag in the list below must be replaced with the corresponding `packages/ui` component. Using the raw tag in a page, widget, component, or layout file is a violation.

| Raw HTML tag / pattern | Required replacement (from `packages/ui`) |
|---|---|
| `<button>` | `<Button>` |
| `<input type="text/email/password/search/number/…">` | `<Input>` |
| `<input type="otp">` / OTP field groups | `<InputOtp>` / `<InputOtpGroup>` / `<InputOtpSlot>` |
| `<textarea>` | `<Textarea>` |
| `<select>` / `<option>` | `<Select>` / `<SelectTrigger>` / `<SelectItem>` / … |
| `<input type="checkbox">` | `<Checkbox>` |
| `<input type="radio">` | `<RadioGroup>` / `<RadioGroupItem>` |
| `<input type="range">` | `<Slider>` |
| `<label>` | `<Label>` |
| `<a href="…">` (navigation links) | Next.js `<Link href="…">` — no `<Button>` wrapper required |
| `<a href="…">` styled as a button | `<Button variant="link" asChild><Link href="…">…</Link></Button>` |
| `<h1>`–`<h6>` used as UI headings | shadcn `<Typography>` (heading variants) |
| `<p>` used for body copy, captions, helper text | shadcn `<Typography>` (paragraph / muted variants) |
| `<span>` used to render a styled text atom | shadcn `<Typography>` (small / code variants) |
| Alert/error message rendered via `<div>` | `<Alert>` / `<AlertDescription>` |
| Divider / horizontal rule `<hr>` | `<Separator>` |
| Badge / pill rendered via `<span>/<div>` | `<Badge>` |
| Avatar rendered via `<img>` or `<div>` | `<Avatar>` / `<AvatarImage>` / `<AvatarFallback>` |
| Skeleton loader `<div>` | `<Skeleton>` |
| Loading spinner `<div>` | `<Spinner>` |
| Toast / notification via `<div>` | `<Sonner>` (via `toast()`) |
| Modal / overlay `<div>` | `<Dialog>` / `<AlertDialog>` |
| Side panel `<div>` | `<Sheet>` |
| Bottom/side drawer `<div>` | `<Drawer>` |
| Tabs / tab bar `<div>` | `<Tabs>` / `<TabsList>` / `<TabsTrigger>` / `<TabsContent>` |
| Accordion `<div>` expand/collapse | `<Accordion>` / `<AccordionItem>` / … |
| Dropdown/context menu `<div>` | `<DropdownMenu>` / `<ContextMenu>` |
| Tooltip `<div>/<span>` on hover | `<Tooltip>` |
| Popover `<div>` | `<Popover>` |
| Table `<table>/<thead>/<tbody>/<tr>/<td>` | `<Table>` / `<TableHeader>` / `<TableBody>` / `<TableRow>` / `<TableCell>` |
| Progress bar `<div>` | `<Progress>` |
| Command palette `<div>` | `<Command>` |
| Breadcrumbs `<nav>/<ol>/<li>/<a>` | `<Breadcrumb>` / `<BreadcrumbItem>` / `<BreadcrumbLink>` |
| Pagination `<div>/<button>` | `<Pagination>` |
| Toggle button `<button>` with on/off state | `<Toggle>` |
| Toggle group `<div>/<button>` | `<ToggleGroup>` |
| Calendar / date display `<div>` | `<Calendar>` |
| Scroll container `<div style="overflow">` | `<ScrollArea>` |
| Resizable panels `<div>` | `<Resizable>` |
| Carousel `<div>` | `<Carousel>` |
| Sidebar navigation `<aside>/<div>` | `<Sidebar>` (shadcn sidebar) |
| Collapsible section `<div>` | `<Collapsible>` |
| Hover card `<div>` | `<HoverCard>` |
| Menubar | `<Menubar>` |
| Aspect ratio wrapper `<div>` | `<AspectRatio>` |
| Keyboard shortcut display | `<Kbd>` |
| Empty state `<div>` | `<Empty>` |

---

## packages/ui responsibilities

`packages/ui` is the **single source of truth** for all atom and compound components.

### Rules for packages/ui

1. Every shadcn component needed by any app **must be added to `packages/ui` first** using the shadcn CLI before it is imported in an app:
   ```bash
   npx shadcn@latest add <component> --cwd packages/ui
   ```
2. Components are exported individually — **no barrel `index.ts`**. Each component lives at its own path:
   ```
   packages/ui/src/components/<component-name>/<ComponentName>.tsx
   ```
3. Components may be lightly wrapped (e.g., to merge default class names or add a `cn()` call) but must not re-implement the component from scratch.
4. When wrapping a shadcn component, accept and forward all original props via `...props` so the consumer retains full control.
5. Icons that are used across multiple components (e.g., `GoogleLogoIcon`) live in `packages/ui/src/icons/`.

### Adding a component not yet in packages/ui

1. Add via CLI: `npx shadcn@latest add <component> --cwd packages/ui`
2. Verify it renders and exports correctly from the package
3. Import in the app via `@repo/ui/components/<component-name>`

---

## apps/client and apps/admin responsibilities

- Import all atom and compound components **exclusively** from `@repo/ui/components/<name>`
- Never install shadcn components directly in an app (no `npx shadcn add` run from `apps/*`)
- Page and widget files may compose `@repo/ui` components freely with layout HTML (`<div>`, `<section>`, etc.)
- Forms must use React Hook Form with `<Form>`, `<FormField>`, `<FormItem>`, `<FormControl>`, `<FormLabel>`, `<FormMessage>` from `@repo/ui`

---

## Full list of shadcn components available

Canonical machine-readable reference: **https://ui.shadcn.com/llms.txt**

All 59 components available at [https://ui.shadcn.com](https://ui.shadcn.com) as of 2026-04-10:

**Form & Input**: Field, Button, Button Group, Input, Input Group, InputOTP, Textarea, Checkbox, Radio Group, Select, Native Select, Switch, Slider, Calendar, Date Picker, Combobox, Label

**Layout & Navigation**: Accordion, Breadcrumb, Navigation Menu, Sidebar, Tabs, Separator, Scroll Area, Resizable

**Overlays & Dialogs**: Dialog, Alert Dialog, Sheet, Drawer, Popover, Tooltip, Hover Card, Context Menu, Dropdown Menu, Menubar, Command

**Feedback & Status**: Alert, Toast, Sonner, Progress, Spinner, Skeleton, Badge, Empty

**Display & Media**: Avatar, Card, Table, Data Table, Chart, Carousel, Aspect Ratio, Typography, Item, Kbd

**Misc**: Collapsible, Toggle, Toggle Group, Pagination, Direction

---

## Current violations

Full migration tracked in `docs/plans/ui-component-enforcement-todo.md`.

### packages/ui — missing components (must be added before migration)

| Component | Required by |
|---|---|
| `Typography` | All `<h1>`–`<h3>`, `<p>`, styled `<span>` replacements |
| `Spinner` | `AdminLayout` loading state |
| `Avatar` | `AdminLayout` user avatar |

### apps/client

| File | Violations |
|---|---|
| `features/auth/ui/components/AuthHeader.tsx` | `<h1>` L20, `<p>` L24 |
| `features/auth/ui/components/AuthDivider.tsx` | styled `<span>` L19 |
| `features/auth/ui/components/CheckEmailStatus.tsx` | `<h3>` L34, `<p>` L37, `<p>` L49 |
| `features/auth/ui/components/PasswordInput.tsx` | `<p>` L90 |
| `features/auth/ui/components/StatusDisplay.tsx` | `<p>` L49 |
| `features/auth/ui/components/SignUpFormContent.tsx` | `<p>` L188 |
| `features/auth/ui/components/VerifyingStatus.tsx` | `<p>` L15 |
| `features/auth/ui/components/VerifySuccessStatus.tsx` | `<p>` L27 |
| `features/auth/ui/components/ResetPasswordFormContent.tsx` | `<p>` L36 |
| `features/auth/ui/components/ForgotPasswordFormContent.tsx` | `<p>` L31 |
| `features/auth/ui/components/VerifyErrorStatus.tsx` | `<h3>` L34, `<p>` L37 |
| `features/auth/ui/components/LoadingButton.tsx` | `<span>` L40 — verify if structural or styled |
| `features/auth/ui/layouts/AuthLayout.tsx` | `<p>` L28 (copyright) |
| `features/auth/ui/widgets/ForgotPasswordForm.tsx` | `<h3>` L85, `<p>` L88 |
| `features/auth/ui/widgets/LoginForm.tsx` | `<p>` L53 |
| `features/auth/ui/widgets/ResetPasswordForm.tsx` | `<p>` L73 |
| `features/auth/ui/widgets/OtpVerificationForm.tsx` | `<h3>` L63, `<p>` L66 |
| `features/auth/ui/widgets/SignUpForm.tsx` | `<p>` L76 |
| `app/page.tsx` | `<h1>` L7 |
| `app/global-error.tsx` | `<h1>` L20 |
| `app/examples/sentry-example-page/page.tsx` | `<h1>`, `<p>`, `<button>`, `<span>`, `<p>`, `<p>` |

### apps/admin

| File | Violations |
|---|---|
| `features/admin/ui/pages/AdminLoginPage.tsx` | `<h1>`, `<p>`, `<label>` ×2, `<input>` ×2, `<button>`, `<p>` ×2 (errors), `<a>`, error `<div>` — full form refactor required |
| `features/admin/ui/pages/AdminDashboardPage.tsx` | `<h1>` L19, `<p>` L22 |
| `features/admin/ui/layouts/AdminLayout.tsx` | `<h1>`, `<p>` ×3, `<a>` ×5, spinner `<div>`, avatar `<div>` |
| `app/global-error.tsx` | `<h1>` L20 |
| `app/examples/sentry-example-page/page.tsx` | `<h1>`, `<p>`, `<button>`, `<span>`, `<p>`, `<p>` |
| `app/examples/users/users-query.tsx` | `<p>` L17 |
| `app/examples/users/page.tsx` | `<p>` L18 |

---

## Enforcement

### Migration

All violations listed in [Current Violations](#current-violations) must be fully resolved. This is not a touch-based incremental fix — the entire list must be cleared before the migration is considered complete.

Order of operations for each violation:
1. Check whether the required `packages/ui` component exists — if not, add it via `npx shadcn@latest add <component> --cwd packages/ui` first.
2. Replace the raw HTML with the `@repo/ui` component.
3. Run `npx turbo typecheck` and `npx turbo lint` after each file.

### New code gate

All new pages, widgets, components, and layouts written after this spec is active must comply from the start. No new violations should be introduced.

### Code review gate

Pull requests that introduce new violations (raw forbidden HTML tags where a shadcn equivalent exists) must be rejected at review, regardless of the change's purpose.

### Linting (future)

A custom Biome/ESLint rule or `grep`-based CI check may be added to detect forbidden tags in `src/features/*/ui/**`. Until then, enforcement is manual at review.

---

## Decision log

| Decision | Reason |
|---|---|
| `<div>`, `<section>`, `<main>`, `<form>` etc. are allowed | They are layout/semantic primitives, not UI components. shadcn has no equivalent for these. `<form>` is the semantic wrapper React Hook Form renders around its fields. |
| Next.js `<Link>` is acceptable without a `<Button>` wrapper | `<Link>` is a framework routing primitive, not a raw `<a>`. Wrapping is only required when the link should be styled as a button. |
| Raw `<a>` is forbidden | Use Next.js `<Link>` for all in-app navigation to benefit from client-side routing and consistent behavior. |
| Apps must never run `shadcn add` directly | All components go through `packages/ui` to guarantee a single version and consistent theme tokens across both apps. |
| Typography component required for `<h1>`–`<h6>` and `<p>` | These are UI display elements, not structural HTML. shadcn's Typography provides a consistent type scale and theme tokens via CSS variables. |
| Missing components must be added to `packages/ui` before use | Prevents apps from diverging by installing different versions or configurations of the same component. |
| Full migration required (not touch-based) | The rule is straightforward and the violation surface is small enough to migrate completely rather than incrementally. |
