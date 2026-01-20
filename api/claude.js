export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Modelo más económico pero muy bueno
        messages: req.body.messages,
        max_tokens: 2000,
        temperature: 0.7
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Error en la API de OpenAI');
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ error: error.message });
  }
}
