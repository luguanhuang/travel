const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const baseUrl = 'https://travel-mwhha2bzr-guanhuanglus-projects.vercel.app';
const outDir = path.join(process.cwd(), 'tmp-playwright-signup');
fs.mkdirSync(outDir, { recursive: true });
const screenshotPath = path.join(outDir, 'signup-result.png');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const logs = [];
  const reqfails = [];
  const responses = [];

  page.on('console', (msg) =>
    logs.push({ type: msg.type(), text: msg.text() })
  );
  page.on('pageerror', (err) =>
    logs.push({ type: 'pageerror', text: err.message })
  );
  page.on('requestfailed', (req) =>
    reqfails.push({
      url: req.url(),
      method: req.method(),
      error: req.failure()?.errorText || 'unknown',
    })
  );
  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('/api/auth/') || url.includes('/api/config/')) {
      let body = '';
      try {
        body = await res.text();
      } catch {}
      responses.push({ url, status: res.status(), body: body.slice(0, 500) });
    }
  });

  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 60000 });
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.getByText(/create account/i).last().click();
  await page.locator('#signup-name').fill('Codex Playwright');
  const email = `pw-${Date.now()}@example.com`;
  await page.locator('#signup-email').fill(email);
  await page.locator('#signup-password').fill('Passw0rd!234');
  await page.getByRole('button', { name: /^create account$/i }).click();
  await page.waitForTimeout(6000);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const toasts = await page
    .locator('[data-sonner-toast]')
    .allInnerTexts()
    .catch(() => []);
  const bodyText = await page.locator('body').innerText();

  console.log(
    JSON.stringify(
      {
        finalUrl: page.url(),
        email,
        toasts,
        bodySnippet: bodyText.slice(0, 1500),
        logs,
        requestFailures: reqfails,
        responses,
        screenshotPath,
      },
      null,
      2
    )
  );

  await browser.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
