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
      headers: { 'Content-Type': 'application/json' },
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

    // If Web3Forms itself returns a non-2xx, response.json() can still
    // succeed (it usually replies with JSON either way), but guard
    // against a non-JSON body (e.g. a gateway error page) so the
    // function doesn't throw an unhelpful parse error.
    let data;
    try {
      data = await response.json();
    } catch (parseErr) {
      console.error('Web3Forms returned non-JSON:', parseErr);
      return res.status(502).json({ error: 'Unexpected response from email provider. Please try again.' });
    }

    if (data.success) {
      return res.status(200).json({ success: true });
    } else {
      console.error('Web3Forms rejected the submission:', data);
      return res.status(400).json({ error: data.message || 'Submission was rejected by the email provider.' });
    }

  } catch (err) {
    console.error('Contact handler error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}
