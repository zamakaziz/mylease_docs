const { chromium } = require('/tmp/node_modules/playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const artifactDir = '/home/c864/.gemini/antigravity-ide/brain/87c70c29-1aa2-4039-8d03-303640b1c51d';
  const page = await browser.newPage();

  try {
    console.log('Logging in Sender Test...');
    await page.goto('http://192.168.112.2:3000/login', { waitUntil: 'networkidle' });
    const inputs = await page.locator('.form-control').all();
    await inputs[0].fill('sender.test@myleaseaudit.com');
    await inputs[1].fill('Password123!');
    await page.locator('.button-section button, button.el-button').first().click();
    await page.waitForTimeout(4000);

    console.log('Navigating to Audit 800...');
    await page.goto('http://192.168.112.2:3000/auditing?tab=documents&id=800', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    console.log('Opening Discussions drawer...');
    await page.locator('i.el-icon-chat-dot-square, .el-icon-chat-dot-square').first().click();
    await page.waitForTimeout(2000);

    console.log('Opening Mention Team Member popover...');
    const mentionUserIcon = page.locator('.el-icon-user').first();
    if (await mentionUserIcon.isVisible()) {
      await mentionUserIcon.click();
      await page.waitForTimeout(1000);
    }

    const screenshotPath = path.join(artifactDir, 'assigned_users_mention_list.png');
    await page.screenshot({ path: screenshotPath });
    console.log('Captured screenshot:', screenshotPath);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
})();
