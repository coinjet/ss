const express = require('express');
const admin = require('firebase-admin');
const nanoid = require('nanoid');

const app = express();
app.use(express.json());

const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

app.post('/api/shorten', async (req, res) => {
    const { longUrl } = req.body;
    if (!longUrl || !longUrl.startsWith('http')) {
        return res.status(400).json({ error: 'URL inválida. Debe empezar con http o https.' });
    }

    try {
        const shortId = nanoid(7);
        await db.collection('urls').doc(shortId).set({ longUrl });
        const shortUrl = `${req.protocol}://${req.get('host')}/go/${shortId}`;
        res.json({ shortUrl });
    } catch (error) {
        console.error('Error al acortar:', error);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});

app.get('/go/:shortId', async (req, res) => {
    try {
        const doc = await db.collection('urls').doc(req.params.shortId).get();
        if (!doc.exists) {
            return res.status(404).send('URL no encontrada.');
        }
        res.redirect(301, doc.data().longUrl);
    } catch (error) {
        console.error('Error al redirigir:', error);
        res.status(500).send('Error en el servidor.');
    }
});

module.exports = app;