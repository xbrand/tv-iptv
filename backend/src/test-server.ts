// Simple test to check if Express routes are being registered
import express from 'express';

const app = express();
app.use(express.json());

app.get('/test', (req, res) => res.json({ ok: true }));
app.post('/api/devices/register', (req, res) => res.json({ received: true, body: req.body }));

app.listen(3002, () => console.log('Test server on 3002'));