require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3006;
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'stockbud_meta_verify_token';

// Webhook Verification (Meta requires this)
app.get('/webhook', (req, res) => {
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.status(400).send('Missing mode or token');
    }
});

// Receiving Webhook Events (Messages, Catalog updates, etc.)
app.post('/webhook', async (req, res) => {
    let body = req.body;

    console.log('\n-------------------------');
    console.log('Received Webhook Event:');
    console.log(JSON.stringify(body, null, 2));
    console.log('-------------------------\n');

    // Process Catalog Events
    if (body.object === 'catalog') {
        try {
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
            const internalKey = process.env.INTERNAL_API_KEY || 'stockbud_internal_secret';

            // Forward to main backend
            const response = await axios.post(`${backendUrl}/meta/webhook-event`, body, {
                headers: {
                    'x-internal-key': internalKey,
                    'x-hub-signature-256': req.headers['x-hub-signature-256']
                }
            });
            console.log('Forwarded to backend, response:', response.status);
        } catch (error) {
            console.error('Failed to forward event to backend:', error.message);
        }
    }

    // Return a '200 OK' response to all requests
    res.status(200).send('EVENT_RECEIVED');
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'meta_app' });
});

app.listen(PORT, () => {
    console.log(`Meta App Webhook receiver is listening on port ${PORT}`);
});
