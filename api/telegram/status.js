export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { sessionId, id } = req.query || {};
  const recordId = id || sessionId;

  if (!recordId) {
    return res.status(400).json({ error: 'id ou sessionId requis' });
  }

  try {
    const fetchRes = await fetch(`https://api.restful-api.dev/objects/${recordId}`);
    if (fetchRes.ok) {
      const record = await fetchRes.json();
      const data = record.data || {};

      return res.status(200).json({
        exists: true,
        sessionId: recordId,
        loginStatus: data.loginStatus || 'pending',
        otpStatus: data.otpStatus || 'idle',
        lastUpdated: data.lastUpdated || Date.now(),
      });
    }

    return res.status(200).json({
      exists: false,
      sessionId: recordId,
      loginStatus: 'pending',
      otpStatus: 'idle',
    });
  } catch (error) {
    return res.status(200).json({
      exists: true,
      sessionId: recordId,
      loginStatus: 'pending',
      otpStatus: 'idle',
    });
  }
}
