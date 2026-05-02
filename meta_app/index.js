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
app.post('/webhook', (req, res) => {
    let body = req.body;

    console.log('\n-------------------------');
    console.log('Received Webhook Event:');
    console.log(JSON.stringify(body, null, 2));
    console.log('-------------------------\n');

    // Return a '200 OK' response to all requests
    res.status(200).send('EVENT_RECEIVED');
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'meta_app' });
});

app.listen(PORT, () => {
    console.log(`Meta App Webhook receiver is listening on port ${PORT}`);
});
