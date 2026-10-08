const fetch = require('node-fetch');
const GROQ_API_KEY = 'YOUR_GROQ_API_KEY';

async function testGroqToolCall() {
  const payload = {
    model: 'openai/gpt-oss-120b',
    messages: [
      { role: 'user', content: 'Which card should I use for a 50000 travel purchase?' },
      { 
        role: 'assistant', 
        content: null, 
        tool_calls: [
          {
            id: 'call_123',
            type: 'function',
            function: {
              name: 'calculate_best_card_for_spend',
              arguments: '{"amount":50000,"category":"Travel"}'
            }
          }
        ]
      },
      {
        role: 'tool',
        tool_call_id: 'call_123',
        name: 'calculate_best_card_for_spend',
        content: '{"bestCard":"HDFC Infinia"}'
      }
    ]
  };

  try {
    console.log("Sending payload...");
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
       console.log("Response not OK:", response.status, response.statusText);
       console.log(await response.text());
       return;
    }

    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Fetch failed", err);
  }
}
testGroqToolCall();
