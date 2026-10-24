# Project Architecture Rules

- All images (logo, login background, favicons) are real files in `src/assets/` / `public/` bundled via standard Vite imports (`import logo from "@/assets/barangay_sambulawan_logo.png"`). Why: the app is deployed outside Lovable (Vercel), and Lovable CDN asset pointers (`/__l5e/assets-v1/...` `.asset.json` imports) resolve only on Lovable hosting, breaking images on other hosts. Never re-introduce `.asset.json` imports for images.
