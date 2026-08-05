export default async function handler(req, res) {

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, message, 'h-captcha-response': captcha } = req.body;

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

    const data = await response.json();

    if (data.success) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(400).json({ error: data.message });
    }

  } catch (err) {
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}