const fetch = require('node-fetch');

const GROQ_API_KEY = 'YOUR_GROQ_API_KEY';

async function testGroq() {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [{ role: 'user', content: 'Hi' }]
      })
    });
    
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Fetch failed", err);
  }
}

testGroq();
