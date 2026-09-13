import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 }
  });
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(3000); // Wait for Clerk to load
  await page.screenshot({ path: 'screenshot.png' });
  await browser.close();
})();
