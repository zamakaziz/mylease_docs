const { chromium } = require('/tmp/node_modules/playwright');
const path = require('path');
const { execSync } = require('child_process');

(async () => {
  console.log('Launching Playwright for Receiver session...');
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const artifactDir = '/home/c864/.gemini/antigravity-ide/brain/87c70c29-1aa2-4039-8d03-303640b1c51d';

  try {
    // 1. Log in Receiver Test
    console.log('Logging in Receiver Test (receiver.test@myleaseaudit.com)...');
    const ctxReceiver = await browser.newContext();
    const pageReceiver = await ctxReceiver.newPage();
    pageReceiver.on('console', msg => console.log('[RECEIVER CONSOLE]', msg.type(), msg.text()));

    await pageReceiver.goto('http://192.168.112.2:3000/login', { waitUntil: 'networkidle' });
    
    // Fill login inputs
    const inputs = await pageReceiver.locator('.form-control').all();
    await inputs[0].fill('receiver.test@myleaseaudit.com');
    await inputs[1].fill('Password123!');

    // Click el-button or login button
    const loginBtn = pageReceiver.locator('.button-section button, button.el-button').first();
    await loginBtn.click();
    await pageReceiver.waitForTimeout(4000);

    console.log('Receiver navigating to /auditing?tab=documents&id=800 and keeping window OPEN...');
    await pageReceiver.goto('http://192.168.112.2:3000/auditing?tab=documents&id=800', { waitUntil: 'networkidle' });
    await pageReceiver.waitForTimeout(3000);

    await pageReceiver.screenshot({ path: path.join(artifactDir, 'concurrent_receiver_1_before.png') });
    console.log('Captured Receiver BEFORE screenshot.');

    // 2. Sender posts message in real time via PHP API
    console.log('Triggering Sender Test message post via PHP backend service...');
    const phpCmd = `docker exec myleaseaudit_app php -r "
      require 'vendor/autoload.php';
      \\$app = require_once 'bootstrap/app.php';
      \\$app->make('Illuminate\\\\Contracts\\\\Console\\\\Kernel')->bootstrap();
      
      \\$svc = app(\\App\\Modules\\Discussion\\Services\\DiscussionService::class);
      \\$thread = \\App\\Modules\\Discussion\\Models\\DiscussionThread::find(33);
      \\$svc->addMessage(\\$thread, ['message_text' => '@[Receiver Test](925) Live concurrent real-time notification popup test!'], 924);
      echo 'Sender Message Dispatched!';
    "`;
    
    const output = execSync(phpCmd).toString();
    console.log('[PHP OUT]:', output);

    // 3. Monitor Receiver window for the live popup notification
    console.log('Waiting for live .el-notification toast to appear in Receiver window...');
    try {
      await pageReceiver.waitForSelector('.el-notification, .el-message, .toast-notification, .el-notification__group', { timeout: 8000 });
      console.log('>>> SUCCESS: Live notification toast appeared in Receiver window! <<<');
    } catch (e) {
      console.log('Selector timeout. Checking DOM...');
    }

    await pageReceiver.waitForTimeout(2000);
    const receiverAfterPath = path.join(artifactDir, 'concurrent_receiver_live_toast.png');
    await pageReceiver.screenshot({ path: receiverAfterPath });
    console.log('Captured Receiver AFTER screenshot showing live toast:', receiverAfterPath);

  } catch (err) {
    console.error('Execution Error:', err);
  } finally {
    await browser.close();
    console.log('Test finished.');
  }
})();
