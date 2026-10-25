async (page) => {
  const check = (value, message) => { if (!value) throw new Error(message); };
  const base = 'http://localhost:4173';
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base);
  await page.waitForFunction(() => !document.querySelector('#browser-note').textContent.includes('正在检查'));
  check(await page.locator('#prepare').isDisabled(), 'initial flash button must be disabled');
  check(await page.locator('#connect').isHidden(), 'no serial access before verification');
  // Mock cancellation of the chooser. Never access a physical USB device in browser QA.
  await page.evaluate(() => {
    window.serialRequests = 0;
    Object.defineProperty(navigator, 'serial', { configurable: true, value: {
      requestPort: async () => { window.serialRequests++; throw new DOMException('Canceled', 'NotFoundError'); },
    }});
  });
  for (const id of ['papermono', 'papers3', 'waveshare-epaper-397']) {
    await page.locator(`input[value="${id}"]`).check();
    check(await page.locator('#prepare').isDisabled(), 'model change must require confirmation');
    await page.locator('#acknowledge').check();
    await page.locator('#prepare').click();
    await page.waitForFunction(() => !document.querySelector('#connect').hidden, null, { timeout: 30000 });
    check((await page.locator('#flash-status').textContent()).includes('SHA-256 校验通过'), `${id} integrity check`);
    check(await page.locator('#full-download').getAttribute('href') === `/firmware/${id}-full-install.bin`, 'model download mismatch');
    check(await page.evaluate(() => window.serialRequests) === 0, 'verification must not open a serial port');
  }
  await page.locator('#connect').click();
  await page.waitForFunction(() => document.querySelector('#flash-status').textContent.includes('已取消'));
  check(await page.evaluate(() => window.serialRequests) === 1, 'chooser must be called only by connect gesture');
  check(await page.locator('#connect').isEnabled(), 'cancel must allow retry');
  await page.locator('#acknowledge').uncheck();
  check(await page.locator('#connect').isHidden(), 'unconfirm must invalidate verified firmware');

  // Tamper with a full-sized download: SHA-256, not just size, must block it.
  await page.route('**/firmware/papermono-full-install.bin', async route => {
    const response = await route.fetch();
    const bytes = await response.body(); bytes[65537] ^= 1;
    await route.fulfill({ response, body: bytes });
  });
  await page.locator('input[value="papermono"]').check();
  await page.locator('#acknowledge').check();
  await page.locator('#prepare').click();
  await page.waitForFunction(() => document.querySelector('#flash-status').textContent.includes('校验失败'));
  check(await page.locator('#connect').isHidden(), 'corrupt image must not become flashable');
  await page.unroute('**/firmware/papermono-full-install.bin');

  // A slow old download must never arm flashing after the user switches models.
  let releaseDownload;
  let started;
  const waiting = new Promise(resolve => { started = resolve; });
  const hold = new Promise(resolve => { releaseDownload = resolve; });
  await page.route('**/firmware/papermono-full-install.bin', async route => {
    started(); await hold;
    try { await route.continue(); } catch { /* The fetch was aborted by selection. */ }
  });
  await page.locator('#prepare').click();
  await waiting;
  await page.locator('input[value="papers3"]').check();
  releaseDownload();
  await page.unroute('**/firmware/papermono-full-install.bin');
  check(await page.locator('#connect').isHidden(), 'stale download must not expose connect');
  check(await page.locator('#prepare').isDisabled(), 'new model must still require confirmation');
  check((await page.locator('#selected-name').textContent()).includes('PaperS3'), 'selection must stay current');

  await page.goto(base);
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `horizontal overflow at ${width}px`);
  }
  await page.locator('#apps').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => Array.from(document.images).every(image => image.complete && image.naturalWidth > 0));
  await page.screenshot({ path: 'output/playwright/desktop-verified.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'output/playwright/mobile-verified.png', fullPage: true });
  check(errors.length === 0, `uncaught page errors: ${errors.join(', ')}`);

  // Unsupported-browser fallback is still useful, and can never enable USB access.
  const context = await page.context().browser().newContext();
  try {
    await context.addInitScript(() => {
      delete Navigator.prototype.serial;
      if ('serial' in navigator) delete navigator.serial;
    });
    const unsupported = await context.newPage();
    await unsupported.goto(base);
    await unsupported.waitForFunction(() => document.querySelector('#browser-note').textContent.includes('不支持'));
    await unsupported.locator('input[value="papers3"]').check();
    check(await unsupported.locator('#acknowledge').isDisabled(), 'unsupported browser cannot confirm flashing');
    check(await unsupported.locator('#prepare').isDisabled(), 'unsupported browser cannot download-and-flash');
    check(await unsupported.locator('#download-details').isVisible(), 'unsupported browser needs manual download');
  } finally { await context.close(); }
  return 'PASS: 3 firmware downloads, confirmation/reset, canceled chooser, corrupt download, stale request, 5 widths, all icons, unsupported browser; no physical USB used.';
}
