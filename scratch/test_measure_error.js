const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`[Console Error] ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    errors.push(`[Page Error] ${err.toString()}`);
  });

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    
    // Find measure button and click
    // The measure button has text "거리"
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const measureBtn = buttons.find(b => b.textContent && b.textContent.includes('거리'));
      if (measureBtn) measureBtn.click();
    });

    // Wait a bit
    await new Promise(r => setTimeout(r, 1000));

    // Click the map container (id="naver-map-container" or "map")
    await page.mouse.click(400, 400); // just click somewhere in the middle
    await new Promise(r => setTimeout(r, 500));
    
    // Click again for the 2nd point
    await page.mouse.click(450, 450);
    await new Promise(r => setTimeout(r, 1000));
    
  } catch (e) {
    console.error('Test script error:', e);
  } finally {
    await browser.close();
  }

  if (errors.length > 0) {
    console.log("Found errors:");
    errors.forEach(e => console.log(e));
  } else {
    console.log("No errors found!");
  }
})();
