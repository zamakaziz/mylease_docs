const { chromium } = require('/tmp/node_modules/playwright');
const path = require('path');
const { execSync } = require('child_process');

(async () => {
  console.log('Launching Playwright interactive notification test...');
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const artifactDir = '/home/c864/.gemini/antigravity-ide/brain/87c70c29-1aa2-4039-8d03-303640b1c51d';

  try {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    page.on('console', msg => console.log('[RECEIVER CONSOLE]', msg.type(), msg.text()));

    // 1. Log in Receiver Test
    console.log('1. Logging in Receiver Test...');
    await page.goto('http://192.168.112.2:3000/login', { waitUntil: 'networkidle' });
    const inputs = await page.locator('.form-control').all();
    await inputs[0].fill('receiver.test@myleaseaudit.com');
    await inputs[1].fill('Password123!');
    await page.locator('.button-section button, button.el-button').first().click();
    await page.waitForTimeout(4000);

    // 2. Navigate to /audits (different page)
    console.log('2. Navigating to /audits page...');
    await page.goto('http://192.168.112.2:3000/audits', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // 3. Trigger live notification from Sender Test via PHP
    console.log('3. Triggering live mention notification from Sender Test via PHP...');
    const phpCmd = `docker exec myleaseaudit_app php -r "
      require 'vendor/autoload.php';
      \\$app = require_once 'bootstrap/app.php';
      \\$app->make('Illuminate\\\\Contracts\\\\Console\\\\Kernel')->bootstrap();
      
      \\$svc = app(\\App\\Modules\\Discussion\\Services\\DiscussionService::class);
      \\$thread = \\App\\Modules\\Discussion\\Models\\DiscussionThread::find(33);
      \\$svc->addMessage(\\$thread, ['message_text' => '@[Receiver Test](925) Interactive notification click test!'], 924);
      echo 'Sender Message Dispatched!';
    "`;
    execSync(phpCmd);

    // 4. Wait for toast notification popup to appear
    console.log('4. Waiting for live toast notification popup...');
    await page.waitForSelector('.el-notification, .toast-notification', { timeout: 8000 });
    console.log('Toast notification appeared! Clicking toast notification...');

    // 5. Click the toast notification popup!
    const toast = page.locator('.el-notification, .toast-notification').first();
    await toast.click();

    // 6. Verify page navigated to Audit 800 AND discussion drawer opened!
    console.log('Waiting for navigation to Audit 800 and discussion drawer opening...');
    await page.waitForTimeout(4000);

    const drawerVisible = await page.locator('.discussion-drawer, .el-drawer').first().isVisible();
    console.log(`Discussion Drawer visible after toast click: ${drawerVisible}`);

    const screenshotPath = path.join(artifactDir, 'notification_toast_clicked_drawer_opened.png');
    await page.screenshot({ path: screenshotPath });
    console.log('Captured screenshot of opened discussion drawer after toast click:', screenshotPath);

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await browser.close();
  }
})();
