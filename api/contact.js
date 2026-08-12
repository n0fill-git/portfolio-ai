export default async function handler(req, res) {

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Catch a missing/misconfigured env var immediately with a clear
  // message, instead of letting it fail obscurely inside the
  // Web3Forms call below.
  if (!process.env.WEB3FORMS_KEY) {
    console.error('WEB3FORMS_KEY is not set in the environment.');
    return res.status(500).json({ error: 'Server is not configured correctly (missing access key).' });
  }

  const { name, email, message, 'h-captcha-response': captcha } = req.body || {};

  // Basic server-side validation
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Web3Forms can fall back to an HTML response for some error
        // paths unless it's explicitly told the caller wants JSON.
        'Accept': 'application/json',
        // Server-to-server calls from a serverless function have no
        // browser Origin/Referer by default. Some anti-spam/WAF layers
        // treat that as suspicious and respond with an HTML challenge
        // page instead of JSON — which looks exactly like this bug.
        // Setting these explicitly avoids that.
        'Origin': 'https://n0fill.vercel.app',
        'Referer': 'https://n0fill.vercel.app/'
      },
      body: JSON.stringify({
        access_key: process.env.WEB3FORMS_KEY,  // ← key from env, never exposed
        name,
        email,
        message,
        'h-captcha-response': captcha,
        subject:   'Portfolio Contact — Mohammadnofil Shaikh',
        from_name: 'Portfolio Website'
      })
    });

    // Read as text first so a non-JSON reply (HTML error page, empty
    // body, etc.) doesn't just throw an opaque parse error — we can
    // log exactly what came back and report the real HTTP status.
    const raw = await response.text();

    let data;
    try {
      data = JSON.parse(raw);
    } catch (parseErr) {
      console.error(
        'Web3Forms returned non-JSON. status=%d body=%s',
        response.status,
        raw.slice(0, 500)
      );
      return res.status(502).json({
        error: `Email provider returned an unexpected response (HTTP ${response.status}). ` +
               `Check the Vercel function logs for the full body, or verify your Web3Forms access key.`
      });
    }

    if (data.success) {
      return res.status(200).json({ success: true });
    } else {
      console.error('Web3Forms rejected the submission:', data);
      return res.status(400).json({ error: data.message || 'Submission was rejected by the email provider.' });
    }

  } catch (err) {
    console.error('Contact handler error:', err);
    return res.status(500).json({ error: `Server error: ${err.message || 'please try again.'}` });
  }
}
