Capture pages to PDF

Quick steps

1. Install dev deps (puppeteer, minimist):

   npm install --save-dev puppeteer minimist

2. Start the frontend dev server:

   npm start

3. Run the capture (optionally provide login credentials):

   node tools/capture-pages.js --base http://localhost:4200 --out site-pages.pdf --loginEmail you@example.com --loginPassword yourpass

Or use the npm script (edit package.json if needed):

   npm run capture:pages

Notes

- The script captures a predefined set of routes taken from `src/app/app.routes.ts`.
- If protected pages require login, provide a valid account via --loginEmail/--loginPassword or environment variables CAPTURE_LOGIN_EMAIL and CAPTURE_LOGIN_PASSWORD.
- The script saves intermediate PNGs under tools/.captures and generates the final PDF at the path passed to --out.
- You can customize the `routes` array in `tools/capture-pages.js` if you want more or fewer pages.
