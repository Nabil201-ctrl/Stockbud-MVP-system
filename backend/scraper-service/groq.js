const axios = require('axios');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'groq/compound-mini';

async function groqJson(prompt, { apiKey, model } = {}) {
    if (!apiKey) {
        throw new Error('GROQ_API_KEY is not configured');
    }

    const response = await axios.post(
        GROQ_API_URL,
        {
            model: model || process.env.GROQ_MODEL || DEFAULT_MODEL,
            messages: [
                {
                    role: 'system',
                    content: 'You are a JSON extraction assistant. Always respond with valid JSON only.'
                },
                { role: 'user', content: prompt }
            ],
            temperature: 0,
            response_format: { type: 'json_object' }
        },
        {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 60000
        }
    );

    const text = response.data?.choices?.[0]?.message?.content || '{}';
    return JSON.parse(text);
}

module.exports = { groqJson };
