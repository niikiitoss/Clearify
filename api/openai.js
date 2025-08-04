// Serverless function for OpenAI API calls
// This keeps the OpenAI API key secure on the server

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { text, persona } = req.body;

        // Validate input
        if (!text || !persona) {
            return res.status(400).json({ error: 'Text and persona are required' });
        }

        // Check text length (security measure)
        if (text.length > 5000) {
            return res.status(400).json({ error: 'Text too long' });
        }

        // Get OpenAI API key from environment variables (server-side only)
        const openaiApiKey = process.env.OPENAI_API_KEY;
        
        if (!openaiApiKey) {
            console.error('OPENAI_API_KEY not configured');
            return res.status(500).json({ error: 'OpenAI API not configured' });
        }

        // Create the prompt
        const prompt = `Rewrite this for someone who is ${persona}:\n\n${text}`;

        // Call OpenAI API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiApiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'Rewrite text for different audiences. Be concise and clear.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 1000,
                temperature: 0.5,
                stream: false // Disable streaming for serverless function
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('OpenAI API error:', errorData);
            
            if (response.status === 401) {
                return res.status(500).json({ error: 'OpenAI API key invalid' });
            } else if (response.status === 429) {
                return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
            } else {
                return res.status(500).json({ error: 'OpenAI API error' });
            }
        }

        const data = await response.json();
        const result = data.choices?.[0]?.message?.content;

        if (!result) {
            return res.status(500).json({ error: 'No response from OpenAI' });
        }

        // Return the result
        res.status(200).json({ result });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
