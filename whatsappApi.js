const axios = require('axios');

const API_DOMAIN = process.env.WA_API_DOMAIN;           // e.g. api.wapost.click
const API_VERSION = process.env.WA_API_VERSION || 'v19.0';
const PHONE_NUMBER_ID = process.env.WA_PHONE_NUMBER_ID; // e.g. 1169772826209550
const API_KEY = process.env.WA_API_KEY;                 // your auth token/key from the provider

async function sendWhatsAppMessage(to, body, contextMessageId = null) {
  const url = `https://${API_DOMAIN}/api/meta/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to,
    type: 'text',
    text: { body },
  };

  if (contextMessageId) {
    payload.context = { message_id: contextMessageId };
  }

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
    });
    return response.data;
  } catch (err) {
    console.error('Failed to send WhatsApp message:', err.response?.data || err.message);
    throw err;
  }
}

module.exports = { sendWhatsAppMessage };
