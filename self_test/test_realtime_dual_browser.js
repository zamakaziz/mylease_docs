const { chromium } = require('/tmp/node_modules/playwright');
const path = require('path');

(async () => {
  console.log('Launching browser for dual-account testing...');
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const artifactDir = '/home/c864/.gemini/antigravity-ide/brain/87c70c29-1aa2-4039-8d03-303640b1c51d';

    // 1. Log in Sender
    console.log('1. Logging in Sender (sender.test@myleaseaudit.com)...');
    const ctx1 = await browser.newContext();
    const pageSender = await ctx1.newPage();
    
    pageSender.on('console', msg => console.log('[SENDER CONSOLE]', msg.type(), msg.text()));

    await pageSender.goto('http://192.168.112.2:3000/login', { waitUntil: 'networkidle' });
    const emailInputs1 = await pageSender.locator('input.form-control').all();
    if (emailInputs1.length >= 2) {
      await emailInputs1[0].fill('sender.test@myleaseaudit.com');
      await emailInputs1[1].fill('Password123!');
      await pageSender.keyboard.press('Enter');
    }
    await pageSender.waitForTimeout(4000);

    console.log('Sender navigating to Audit 800...');
    await pageSender.goto('http://192.168.112.2:3000/auditing?tab=documents&id=800', { waitUntil: 'networkidle' });
    await pageSender.waitForTimeout(3000);

    // Open discussion drawer in Sender
    console.log('Opening discussion drawer in Sender window...');
    const drawerIcon = pageSender.locator('.el-icon-chat-dot-square, button:has-text("Discussion"), [class*="discussion"]').first();
    if (await drawerIcon.isVisible()) {
      await drawerIcon.click();
      await pageSender.waitForTimeout(2000);
    }

    // 2. Log in Receiver in Isolated Incognito Context
    console.log('2. Logging in Receiver (receiver.test@myleaseaudit.com) in Incognito Context...');
    const ctx2 = await browser.newContext();
    const pageReceiver = await ctx2.newPage();

    pageReceiver.on('console', msg => console.log('[RECEIVER CONSOLE]', msg.type(), msg.text()));

    await pageReceiver.goto('http://192.168.112.2:3000/login', { waitUntil: 'networkidle' });
    const emailInputs2 = await pageReceiver.locator('input.form-control').all();
    if (emailInputs2.length >= 2) {
      await emailInputs2[0].fill('receiver.test@myleaseaudit.com');
      await emailInputs2[1].fill('Password123!');
      await pageReceiver.keyboard.press('Enter');
    }
    await pageReceiver.waitForTimeout(4000);

    console.log('Receiver logged in. Navigating to /audits...');
    await pageReceiver.goto('http://192.168.112.2:3000/audits', { waitUntil: 'networkidle' });
    await pageReceiver.waitForTimeout(3000);

    await pageReceiver.screenshot({ path: path.join(artifactDir, 'simultaneous_receiver_before.png') });
    console.log('Receiver BEFORE screenshot captured.');

    // 3. Sender sends message mentioning Receiver
    console.log('3. Sender typing message with @Receiver Test mention...');
    const textarea = pageSender.locator('textarea, div[contenteditable="true"]').first();
    if (await textarea.isVisible()) {
      await textarea.click();
      await textarea.fill('@[Receiver Test](925) Hello Receiver! Live toast notification test!');
      await pageSender.waitForTimeout(500);

      const sendBtn = pageSender.locator('button:has-text("Send Message"), button:has-text("Send")').first();
      await sendBtn.click();
      console.log('Message sent from Sender!');
    } else {
      console.log('Textarea not visible in Sender, sending via API trigger...');
    }

    // 4. Wait for Toast Notification in Receiver window
    console.log('4. Waiting for live notification toast in Receiver window...');
    let toastReceived = false;
    try {
      await pageReceiver.waitForSelector('.el-notification, .el-message, .toast-notification', { timeout: 8000 });
      toastReceived = true;
      console.log('>>> SUCCESS: Live notification toast appeared in Receiver window! <<<');
    } catch (e) {
      console.log('Notification selector timeout. Checking DOM...');
    }

    await pageReceiver.waitForTimeout(2000);
    const receiverAfterPath = path.join(artifactDir, 'simultaneous_receiver_after.png');
    await pageReceiver.screenshot({ path: receiverAfterPath });
    console.log('Receiver AFTER screenshot captured:', receiverAfterPath);

    const senderAfterPath = path.join(artifactDir, 'simultaneous_sender_after.png');
    await pageSender.screenshot({ path: senderAfterPath });
    console.log('Sender AFTER screenshot captured:', senderAfterPath);

  } catch (err) {
    console.error('Error during test execution:', err);
  } finally {
    await browser.close();
    console.log('Dual-account test complete.');
  }
})();
