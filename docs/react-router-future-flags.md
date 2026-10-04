# React Router v7 Future Flags

Reference for the two warnings in a Vite + React Router v6 app:

```
⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in
`React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early.

⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is
changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early.
```

Both are opt-in. Nothing is broken today; they tell you what changes on the v7
upgrade. Adopt them early so the upgrade is mechanical.

Verified against **react-router-dom 6.30.6** by building a real router and reading
the warnings back out of the browser console.

## Which router are you using?

The flag location depends on the API, and this is the part most people get wrong.

| You wrote                           | Put `future` on                                                       |
| ----------------------------------- | --------------------------------------------------------------------- |
| `createBrowserRouter(routes, opts)` | the second argument: `createBrowserRouter(routes, { future: {...} })` |
| `<BrowserRouter future={...}>`      | the `<BrowserRouter>` element                                         |
| `<RouterProvider future={...}>`     | the `<RouterProvider>` element                                        |

If you use `createBrowserRouter`, put the flags on its options argument.

## Data router (`createBrowserRouter`)

Most Vite SPA setups use this form:

```tsx
// src/App.tsx (or wherever your router is created)
import { createBrowserRouter } from "react-router-dom";

const router = createBrowserRouter(routes, {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
});
```

Declarative `<BrowserRouter>` form:

```tsx
<BrowserRouter
  future={{
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  }}
>
  <App />
</BrowserRouter>
```

## `v7_startTransition` is special: it reads the _render_ future

The two flags in your log are **not** read the same way. From React Router's own
source (`logV6DeprecationWarnings`):

```js
if (renderFuture?.v7_startTransition === undefined) {
  /* warn */
}

if (
  renderFuture?.v7_relativeSplatPath === undefined &&
  (!routerFuture || routerFuture.v7_relativeSplatPath === undefined)
) {
  /* warn */
}
```

`v7_startTransition` is only read from the **render** future — the `future` prop on
the rendered element (`<RouterProvider>` / `<BrowserRouter>`). Setting it on
`createBrowserRouter` alone does **not** silence it. Both cases were reproduced:

| Configuration                      | `v7_startTransition` warning |
| ---------------------------------- | ---------------------------- |
| flag on `createBrowserRouter` only | **still warns**              |
| flag on `<RouterProvider>` only    | **silenced**                 |
| flag on both                       | silenced                     |

`v7_relativeSplatPath` is read from **either** the router future or the render
future, so setting it on `createBrowserRouter` is sufficient.

### So for a data router, set it on both

```tsx
const router = createBrowserRouter(routes, {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
});

createRoot(el).render(<RouterProvider router={router} future={{ v7_startTransition: true }} />);
```

Setting the full flag set on the router silences the four router-only
deprecations (`v7_fetcherPersist`, `v7_normalizeFormMethod`, `v7_partialHydration`,
`v7_skipActionErrorRevalidation`); only `v7_startTransition` additionally needs the
render-side prop. Passing the same flag in both places is harmless — the router
copy is simply ignored for this one.

Note the messages are emitted once per flag per page load (`warnOnce`), so seeing a
warning twice in a row usually means two router instances (for example React
StrictMode double-invoking module setup), not two distinct problems.

## The two flags in detail

### `v7_startTransition`

Router state updates move from `React.useState` to `React.useTransition`.

**You must change your code only if you call `React.lazy` inside a component.**
`React.lazy` is incompatible with `useTransition`, because it creates a promise
during render. Move the `lazy()` call to module scope:

```diff
+// module scope, outside the component
+const Settings = React.lazy(() => import("./routes/settings"));

 function Dashboard() {
-  const Tab = React.lazy(() => import("./tabs/tab"));
   ...
 }
```

If you do not use `React.lazy`, this flag is a no-op for your code.

### `v7_relativeSplatPath`

Relative resolution inside multi-segment splat routes like `dashboard/*` changes.
This flag has a real migration cost.

If you have `path="dashboard/*"` with relative `<Link to="...">` beneath it, split
the route:

```diff
 createBrowserRouter([
-  { path: "dashboard/*", element: <Dashboard /> },
+  { path: "dashboard", element: <Dashboard />, children: [{ path: "*", element: <Dashboard /> }] },
 ]);
```

Then add the extra `..` to relative links in that subtree:

```diff
-<Link to="/">Home</Link>
-<Link to="team">Team</Link>
+<Link to="../">Home</Link>
+<Link to="../team">Team</Link>
```

If you have no splat routes, this flag is free.

## Other v6 flags worth adopting

Not needed to silence the warnings above, but available if you want the full v7
behavior now. All of these are read from the **router** future only, so they go on
`createBrowserRouter` and nowhere else:

```tsx
const router = createBrowserRouter(routes, {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
});
```

Two of these have real code impact:

- **`v7_normalizeFormMethod`** uppercases `formMethod`. Change
  `navigation.formMethod === "post"` to `=== "POST"`.
- **`v7_partialHydration`** deprecates `fallbackElement` on `<RouterProvider>`;
  use a route-level `HydrateFallback` instead.

## Verifying

Restart the dev server with a hard reload. The warnings should be gone.

If `v7_startTransition` persists after setting it on `createBrowserRouter`, that is
expected: it also needs the `future` prop on `<RouterProvider>` or `<BrowserRouter>`
(see above). If a _router-only_ flag such as `v7_fetcherPersist` persists, check
that the router was created with the flag and that no second router instance is
being created somewhere in your app.
