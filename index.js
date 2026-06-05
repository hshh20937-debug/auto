const BASE = 'https://app.minegrey.com';
const EMAIL = process.env.GREY_EMAIL;
const PASSWORD = process.env.GREY_PASSWORD;

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error('Set GREY_EMAIL and GREY_PASSWORD env vars');
    process.exit(1);
  }

  // 1. Login
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: EMAIL, password: PASSWORD }),
  });
  if (!loginRes.ok) {
    const err = await loginRes.json().catch(() => ({}));
    console.error('Login failed:', err);
    process.exit(1);
  }
  const { token } = await loginRes.json();
  console.log('Login OK');

  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 2. Start mining (tap every 24h)
  const mineRes = await fetch(`${BASE}/api/mining`, {
    method: 'POST',
    headers: auth,
  });
  if (mineRes.ok) {
    const data = await mineRes.json();
    console.log('Mining started:', JSON.stringify({ balance: data.balance, sessionBalance: data.sessionBalance }));
  } else {
    const err = await mineRes.json().catch(() => ({}));
    console.log('Mining result:', err);
  }

  // 3. Daily checkin
  const checkinRes = await fetch(`${BASE}/api/tasks/checkin`, {
    method: 'POST',
    headers: auth,
  });
  if (checkinRes.ok) {
    const data = await checkinRes.json();
    console.log('Checkin OK:', JSON.stringify({ reward: data.reward, streak: data.streak }));
  } else {
    const err = await checkinRes.json().catch(() => ({}));
    console.log('Checkin result:', err);
  }

  console.log('Done. Next run in 24h.');
}

main().catch((e) => {
  console.error('Unhandled error:', e);
  process.exit(1);
});
