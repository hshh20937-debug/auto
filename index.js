const BASE = 'https://app.minegrey.com';
const EMAIL = process.env.GREY_EMAIL;
const PASSWORD = process.env.GREY_PASSWORD;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

function sendDiscord(msg) {
  if (!WEBHOOK_URL) return;
  fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: msg }),
  }).catch(() => {});
}

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error('Set GREY_EMAIL and GREY_PASSWORD env vars');
    process.exit(1);
  }

  const log = [];
  const add = (s) => { console.log(s); log.push(s); };

  // 1. Login
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: EMAIL, password: PASSWORD }),
  });
  if (!loginRes.ok) {
    const err = await loginRes.json().catch(() => ({}));
    add('Login failed: ' + JSON.stringify(err));
    sendDiscord('❌ Grey Auto-Claim gagal: Login failed\n' + JSON.stringify(err));
    process.exit(1);
  }
  const { token } = await loginRes.json();
  add('Login OK');

  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 2. Start mining
  const mineRes = await fetch(`${BASE}/api/mining`, {
    method: 'POST',
    headers: auth,
  });
  if (mineRes.ok) {
    const data = await mineRes.json();
    add('Mining: balance=' + data.balance + ' session=' + data.sessionBalance);
  } else {
    const err = await mineRes.json().catch(() => ({}));
    add('Mining result: ' + JSON.stringify(err));
  }

  // 3. Daily checkin
  let checkinReward = 0;
  const checkinRes = await fetch(`${BASE}/api/tasks/checkin`, {
    method: 'POST',
    headers: auth,
  });
  if (checkinRes.ok) {
    const data = await checkinRes.json();
    add('Checkin: reward=' + data.reward + ' streak=' + data.streak);
    checkinReward = data.reward || 0;
  } else {
    const err = await checkinRes.json().catch(() => ({}));
    add('Checkin: ' + (err.error || JSON.stringify(err)));
  }

  // 4. Get final balance
  const balRes = await fetch(`${BASE}/api/mining`, {
    method: 'GET',
    headers: auth,
  });
  let finalBalance = '?';
  if (balRes.ok) {
    const data = await balRes.json();
    finalBalance = data.balance;
  }

  add('Done. Balance: ' + finalBalance);

  // Webhook summary
  const lines = log.join('\n');
  console.log('---');
  sendDiscord(
    '✅ Grey Auto-Claim Selesai\n' +
    lines +
    '\nBalance: ' + finalBalance
  );
}

main().catch((e) => {
  console.error('Unhandled error:', e);
  process.exit(1);
});
