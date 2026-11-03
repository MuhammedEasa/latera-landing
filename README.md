# Latera — luxury turnkey homes, Kerala (landing-page prototype)

A lead-generation landing page whose single goal is collecting **quote requests**.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static output in dist/ — deploy anywhere (Netlify, Vercel, S3, cPanel)
```

## Stack

- **Vite** — build and dev server. Ships static files, so no server runtime is needed.
- **Three.js** — the scroll-driven 3D build sequence (`src/js/scene.js`). It loads only when the section is near.
- **GSAP + ScrollTrigger** — pinned sections and scrubbed animation.
- **Lenis** — smooth scrolling.

## Where things live

| File | What |
|---|---|
| `index.html` | All content and copy |
| `src/css/style.css` | Design tokens (top of file) and all styles |
| `src/js/main.js` | Loader, nav, reveals, stacking cards, compare slider, testimonials, cursor |
| `src/js/hero.js` | Dusk / golden-hour / monsoon scene switcher and canvas rain |
| `src/js/scene.js` | Procedural 3D villa: survey → plinth → frame → laterite → roof → dusk handover |
| `src/js/process.js` | Pins the Method section and syncs the stage card with the 3D model |
| `src/js/kerala.js` / `kerala-paths.js` | Interactive 14-district map (Census 2011 boundaries) |
| `src/js/arc.js` | Curved 3D residences carousel |
| `src/js/estimator.js` | 4-step instant estimate, live cost sheet, validation, WhatsApp hand-off |

## Before going live

- **Connect the form.** In `estimator.js` → `submit()`, POST the `data` object to the CRM, Google Sheet or email endpoint. Today it only logs to the console.
- **Replace placeholders.** Brand name, phone `+91 98470 00000`, statistics, reviews, rates per sq ft and district figures are all sample content.
- **Media.** Videos come from Pexels and Pixabay; photos come from Unsplash. All are free licences. Swap in the client's own project footage when it's available.
