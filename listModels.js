const fetch = require('node-fetch');
const GROQ_API_KEY = 'YOUR_GROQ_API_KEY';

async function listModels() {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` }
    });
    const data = await response.json();
    console.log(data.data.map(m => m.id).join('\n'));
  } catch (err) {
    console.error(err);
  }
}
listModels();
