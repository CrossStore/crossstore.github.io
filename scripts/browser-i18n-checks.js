async (page) => {
  const check = (value, message) => { if (!value) throw new Error(message); };
  const base = 'http://localhost:4173';
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const english = async () => {
    const text = await page.locator('body').innerText();
    check(!/[\u3400-\u9fff]/.test(text.replaceAll('中文','')), 'untranslated visible Chinese in English page');
    const attrs = await page.locator('[aria-label],img[alt]').evaluateAll(nodes => nodes.map(n => (n.getAttribute('aria-label') || '') + ' ' + (n.getAttribute('alt') || '')).join(' '));
    check(!/[\u3400-\u9fff]/.test(attrs), 'untranslated accessibility labels');
  };
  await page.goto(base);
  await page.evaluate(() => localStorage.removeItem('crossstore-language'));
  await page.goto(base + '/#apps');
  await page.locator('.header-utilities [data-locale-link]').click();
  await page.waitForURL('**/en/#apps');
  await page.waitForFunction(() => document.querySelectorAll('.app-card').length === 8);
  check(await page.locator('html').getAttribute('lang') === 'en', 'English document locale');
  check((await page.title()).includes('Reading'), 'English page title');
  await english();
  await page.locator('[data-book-topic="literature"]').click();
  check((await page.locator('#book-shelf').innerText()).includes('The Old Man and the Sea'), 'translated book titles');
  await page.locator('[data-book-topic="scifi"]').click();
  await page.locator('#toggle-apps').click();
  await english();
  await page.locator('#toggle-apps').click();
  await page.locator('[data-capability="lora"]').click();
  await page.locator('[data-app-device="papers3"]').click();
  check(await page.locator('#empty-results').isVisible(), 'English capability empty state');
  await english();
  await page.locator('#reset-app-filters').click();
  await page.locator('.permission-filter summary').click();
  await page.locator('#permission-options input').first().uncheck();
  check((await page.locator('#permission-summary').innerText()).includes('11 of 12'), 'translated permission count');
  await english();
  await page.locator('#permission-options input').first().check();
  await page.locator('.permission-filter summary').click();
  await page.locator('[data-app-device="papermono"]').click();
  await page.locator('#menu-choice').selectOption('bookstore');
  await page.locator('#add-menu').click();
  check((await page.locator('#menu-status').innerText()).includes('Added Bookshop'), 'translated menu feedback');
  for (let i=0;i<4;i++) await page.getByRole('button',{name:'Move Bookshop up',exact:true}).click();
  check(await page.locator('#menu-preview>span').first().innerText() === 'Bookshop', 'English menu ordering');
  await page.locator('#reset-menu').click();
  await english();
  // Browser checks never call a real serial port.
  await page.evaluate(() => {
    window.serialRequests = 0;
    Object.defineProperty(navigator,'serial',{configurable:true,value:{requestPort:async()=>{window.serialRequests++;throw new DOMException('Canceled','NotFoundError');}}});
  });
  await page.locator('[data-brand-filter="M5STACK"]').click();
  await page.locator('input[value="papers3"]').check();
  await page.locator('#download-details summary').click();
  await page.locator('.connection-help summary').click();
  await english();
  const issue = new URL(await page.locator('#report-issue').getAttribute('href'));
  check(!/[\u3400-\u9fff]/.test(issue.searchParams.get('body')), 'English issue body');
  await page.locator('#acknowledge').check();
  await page.locator('#prepare').click();
  await page.waitForFunction(()=>!document.querySelector('#connect').hidden);
  check((await page.locator('#flash-status').innerText()).includes('SHA-256 verified'), 'English verification success');
  check(await page.evaluate(()=>window.serialRequests)===0,'verification must not request USB');
  await page.locator('#connect').click();
  await page.waitForFunction(()=>document.querySelector('#flash-status').textContent.includes('canceled'));
  await english();
  await page.locator('#acknowledge').uncheck();
  await page.locator('#acknowledge').check();
  await page.route('**/firmware/papers3-full-install.bin', async route => {
    const response=await route.fetch();const bytes=await response.body();bytes[65537]^=1;
    await route.fulfill({response,body:bytes});
  });
  await page.locator('#prepare').click();
  await page.waitForFunction(()=>document.querySelector('#flash-status').textContent.includes('checksum verification failed'));
  check(await page.locator('#connect').isHidden(),'English corrupt download must remain blocked');
  await english();
  await page.unroute('**/firmware/papers3-full-install.bin');
  await page.route('**/firmware/papers3-full-install.bin', route=>route.fulfill({status:503,body:'Unavailable'}));
  await page.locator('#prepare').click();
  await page.waitForFunction(()=>document.querySelector('#flash-status').textContent.includes('HTTP 503'));
  await page.unroute('**/firmware/papers3-full-install.bin');
  await english();
  for (const width of [320,390,768,1024,1440]) {
    await page.setViewportSize({width,height:900});
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`English expanded layout overflow at ${width}`);
  }
  await page.locator('[data-brand-filter="METALIO"]').click();
  await english();
  for (const details of await page.locator('.faq-grid details').all()) await details.locator('summary').click();
  await english();
  await page.goto(base+'/');
  await page.waitForURL('**/en/');
  check(await page.evaluate(()=>localStorage.getItem('crossstore-language'))==='en','remember explicit English selection');
  await page.goto(base+'/credits.html');
  await page.waitForURL('**/en/credits.html');
  await english();
  await page.locator('[data-locale-link="zh"]').click();
  await page.waitForURL('**/credits.html');
  check(!page.url().includes('/en/'),'credits Chinese switch path');
  check(await page.evaluate(()=>localStorage.getItem('crossstore-language'))==='zh','remember Chinese preference');
  await page.goto(base+'/en/');
  await page.locator('#bookstore').scrollIntoViewIfNeeded();
  await page.evaluate(()=>document.fonts.ready);
  await page.setViewportSize({width:1440,height:1000});
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await page.screenshot({path:'output/playwright/silver-english-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'output/playwright/silver-english-mobile.png',fullPage:true});
  await page.goto(base+'/');
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:'output/playwright/silver-chinese-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:1000});
  await page.screenshot({path:'output/playwright/silver-chinese-desktop.png',fullPage:true});
  check(errors.length===0,`page errors: ${errors}`);

  const browser=page.context().browser();
  const noStorage=await browser.newContext();
  try {
    await noStorage.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new Error('blocked')};Storage.prototype.setItem=()=>{throw new Error('blocked')};delete Navigator.prototype.serial;});
    const p=await noStorage.newPage();await p.goto(base+'/en/');
    await p.waitForFunction(()=>document.querySelector('#browser-note').textContent.includes('does not support'));
    await p.locator('[data-brand-filter="M5STACK"]').click();await p.locator('input[value="papers3"]').check();
    check(await p.locator('#prepare').isDisabled(),'English unsupported browser blocked');
    check(await p.locator('#download-details').isVisible(),'English manual downloads available');
    await p.locator('.header-utilities [data-locale-link]').click();
    await p.waitForURL(base+'/');
    check(await p.locator('html').getAttribute('lang')==='zh-CN','language switching with blocked storage');
  } finally {await noStorage.close();}
  const noJs=await browser.newContext({javaScriptEnabled:false});
  try {
    const p=await noJs.newPage();await p.goto(base+'/en/');
    check((await p.locator('h1').innerText()).includes('Reading'),'English static heading without JS');
    check(await p.locator('noscript').first().isVisible(),'English no-JS fallback');
  } finally {await noJs.close();}
  return 'PASS: English static/dynamic/a11y copy, books, filters, menu, issue links, hash success/failure and HTTP failure, mock USB cancellation, five expanded widths, language preference + hash + credits routing, blocked storage, unsupported browser, no-JS fallback; no physical USB used.';
}
