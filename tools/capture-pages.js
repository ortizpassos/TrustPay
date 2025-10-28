/*
 * capture-pages.js
 * Usage:
 *   node tools/capture-pages.js --base http://localhost:4200 --out screenshots.pdf --login-email user@example.com --login-password secret
 *
 * This script uses puppeteer to capture screenshots of configured routes and produce a combined PDF.
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const minimist = require('minimist');

const args = minimist(process.argv.slice(2), {
  string: ['base', 'out', 'loginEmail', 'loginPassword'],
  alias: { b: 'base', o: 'out' },
  default: { base: 'http://localhost:4200', out: 'pages.pdf' }
});

const base = args.base;
const out = args.out;
const loginEmail = args.loginEmail || process.env.CAPTURE_LOGIN_EMAIL;
const loginPassword = args.loginPassword || process.env.CAPTURE_LOGIN_PASSWORD;

// Routes to capture (match app.routes.ts)
const routes = [
  '/',
  '/auth',
  '/dashboard',
  '/novo-pagamento',
  '/relatorios',
  '/transacoes',
  '/carteira',
  '/configuracoes',
  '/desenvolvedor',
  '/minha-conta',
  '/integrate'
];

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Set viewport for consistent captures
  await page.setViewport({ width: 1280, height: 900 });

  // Helper to navigate and wait
  async function gotoRoute(route) {
    const url = new URL(route, base).toString();
    console.log('Navigating to', url);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    // Wait a bit for any animations/content
    await page.waitForTimeout(700);
  }

  // If login credentials are provided, perform UI login on /auth
  if (loginEmail && loginPassword) {
    console.log('Attempting UI login with provided credentials...');
    await gotoRoute('/auth');

    // Fill inputs - selectors based on login.html
    await page.type('input[name="email"]', loginEmail, { delay: 30 }).catch(() => {});
    await page.type('input[name="password"]', loginPassword, { delay: 30 }).catch(() => {});

    // Click login button
    const loginBtn = await page.$('.btn-login');
    if (loginBtn) {
      await loginBtn.click();
      // Aguarda navegação para rota protegida
      try {
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
      } catch (e) {
        console.warn('Navegação após login não detectada:', e.message);
      }
      // Aguarda dashboard ou rota protegida
      if (!page.url().includes('/dashboard')) {
        console.warn('Login não redirecionou para dashboard, verifique credenciais ou fluxo de login. URL atual:', page.url());
      }
      console.log('Login submitted');
    } else {
      console.log('Login button not found; skipping UI login');
    }
  } else {
    console.log('No login credentials provided; protected routes may redirect to /auth');
  }

  // Create temporary directory for screenshots
  const tmpDir = path.join(__dirname, '.captures');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const imagePaths = [];
  for (const r of routes) {
    try {
      await gotoRoute(r);
      // Accept cookie dialogs or close modals if present
      // (Optional customization)

      const filename = r === '/' ? 'home' : r.replace(/\//g, '-').replace(/^-+|-+$/g, '') || 'root';
      const imagePath = path.join(tmpDir, `${filename}.png`);
      await page.screenshot({ path: imagePath, fullPage: true });
      imagePaths.push(imagePath);
      console.log('Saved', imagePath);
    } catch (err) {
      console.warn('Failed to capture', r, err.message);
    }
  }

  // Combine into a single PDF (using headless browser printing)
  // We'll create an HTML that includes all images and print it to PDF
  const htmlParts = imagePaths.map(p => `<div style="page-break-after: always;margin:0;padding:0;"><img src="file://${p.replace(/\\/g, '/') }" style="width:100%;height:auto;display:block;" /></div>`);
  const docHtml = `<!doctype html><html><head><meta charset="utf-8"><title>Capturas</title></head><body style="margin:0;padding:0;">${htmlParts.join('\n')}</body></html>`;
  const docPath = path.join(tmpDir, 'combined.html');
  fs.writeFileSync(docPath, docHtml);

  const pdfPage = await browser.newPage();
  await pdfPage.goto(`file://${docPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle2' });
  await pdfPage.pdf({ path: out, format: 'A4', printBackground: true });

  console.log('PDF generated at', out);

  await browser.close();
  process.exit(0);
})();
