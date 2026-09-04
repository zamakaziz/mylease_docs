const { chromium } = require('/tmp/node_modules/playwright');
const path = require('path');

(async () => {
  console.log('Launching browser for CONCURRENT dual-account test...');
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const artifactDir = '/home/c864/.gemini/antigravity-ide/brain/87c70c29-1aa2-4039-8d03-303640b1c51d';

  try {
    // Context 1: Sender Test
    console.log('Context 1: Opening Sender session...');
    const ctxSender = await browser.newContext();
    const pageSender = await ctxSender.newPage();
    pageSender.on('console', msg => console.log('[SENDER LOG]', msg.type(), msg.text()));

    // Context 2: Receiver Test (CONCURRENT, ISOLATED INCOGNITO CONTEXT)
    console.log('Context 2: Opening Receiver session concurrently...');
    const ctxReceiver = await browser.newContext();
    const pageReceiver = await ctxReceiver.newPage();
    pageReceiver.on('console', msg => console.log('[RECEIVER LOG]', msg.type(), msg.text()));

    // 1. Log in Sender
    console.log('Logging in Sender...');
    await pageSender.goto('http://192.168.112.2:3000/login', { waitUntil: 'networkidle' });
    const inputs1 = await pageSender.locator('.form-control').all();
    await inputs1[0].fill('sender.test@myleaseaudit.com');
    await inputs1[1].fill('Password123!');
    await pageSender.keyboard.press('Enter');
    await pageSender.waitForTimeout(3000);

    // 2. Log in Receiver
    console.log('Logging in Receiver...');
    await pageReceiver.goto('http://192.168.112.2:3000/login', { waitUntil: 'networkidle' });
    const inputs2 = await pageReceiver.locator('.form-control').all();
    await inputs2[0].fill('receiver.test@myleaseaudit.com');
    await inputs2[1].fill('Password123!');
    await pageReceiver.keyboard.press('Enter');
    await pageReceiver.waitForTimeout(3000);

    // 3. Sender navigates to Audit 800 discussion
    console.log('Sender navigating to Audit 800...');
    await pageSender.goto('http://192.168.112.2:3000/auditing?tab=documents&id=800', { waitUntil: 'networkidle' });
    await pageSender.waitForTimeout(3000);

    // Open discussion panel on Audit 800 for Sender
    const drawerBtn = pageSender.locator('.el-icon-chat-dot-square, button:has-text("Discussion"), [class*="discussion"]').first();
    await drawerBtn.click();
    await pageSender.waitForTimeout(2000);

    // 4. Receiver navigates to /audits and WAITS
    console.log('Receiver navigating to /audits and keeping window open...');
    await pageReceiver.goto('http://192.168.112.2:3000/audits', { waitUntil: 'networkidle' });
    await pageReceiver.waitForTimeout(3000);

    await pageReceiver.screenshot({ path: path.join(artifactDir, 'concurrent_receiver_1_before.png') });
    console.log('Captured Receiver BEFORE screenshot.');

    // 5. CONCURRENT ACTION: Sender posts message while Receiver window is OPEN & LISTENING
    console.log('Sender typing and sending message to Receiver...');
    const textarea = pageSender.locator('textarea, div[contenteditable="true"]').first();
    await textarea.click();
    await textarea.fill('@[Receiver Test](925) Live concurrent real-time notification popup test!');
    await pageSender.waitForTimeout(500);

    const sendBtn = pageSender.locator('button:has-text("Send Message"), button:has-text("Send")').first();
    await sendBtn.click();
    console.log('Sender clicked Send!');

    // 6. IMMEDIATELY check Receiver window for the popup notification toast
    console.log('Waiting for live notification popup in Receiver window...');
    let notificationToastFound = false;
    try {
      await pageReceiver.waitForSelector('.el-notification, .el-message, .toast-notification, .el-notification__group', { timeout: 8000 });
      notificationToastFound = true;
      console.log('>>> SUCCESS: Live .el-notification toast appeared in Receiver window! <<<');
    } catch (e) {
      console.log('Selector timeout. Taking screenshot of Receiver window...');
    }

    await pageReceiver.waitForTimeout(2000);
    const receiverAfterPath = path.join(artifactDir, 'concurrent_receiver_2_after.png');
    await pageReceiver.screenshot({ path: receiverAfterPath });
    console.log('Captured Receiver AFTER screenshot:', receiverAfterPath);

    const senderAfterPath = path.join(artifactDir, 'concurrent_sender_after.png');
    await pageSender.screenshot({ path: senderAfterPath });
    console.log('Captured Sender AFTER screenshot:', senderAfterPath);

  } catch (err) {
    console.error('Execution Error:', err);
  } finally {
    await browser.close();
    console.log('Test finished.');
  }
})();
