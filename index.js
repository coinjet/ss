const express = require('express');
const admin = require('firebase-admin');
const nanoid = require('nanoid').nanoid;
const path = require('path');

const app = express();
app.use(express.json());

// Lee las credenciales de la variable de entorno de Vercel
const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Servir archivos estáticos desde la carpeta 'public'
// Esto permite que index.html, shorten.html y style.css sean accesibles
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint de la API (para procesar el acortamiento)
app.post('/api/shorten', async (req, res) => {
    const { longUrl } = req.body;
    if (!longUrl || !longUrl.startsWith('http')) {
        return res.status(400).json({ error: 'URL inválida.' });
    }
    
    try {
        const shortId = nanoid(7);
        await db.collection('urls').doc(shortId).set({
            longUrl: longUrl
        });

        const shortUrl = `${req.protocol}://${req.get('host')}/go/${shortId}`;
        res.status(200).json({ shortUrl });
    } catch (error) {
        console.error('Error al acortar la URL:', error);
        res.status(500).json({ error: 'Ocurrió un error en el servidor.' });
    }
});

// Endpoint para redirigir desde la URL corta
app.get('/go/:shortId', async (req, res) => {
    const { shortId } = req.params;

    try {
        const doc = await db.collection('urls').doc(shortId).get();
        if (!doc.exists) {
            return res.status(404).send('URL no encontrada');
        }

        const { longUrl } = doc.data();
        res.redirect(301, longUrl);
    } catch (error) {
        console.error('Error al redirigir:', error);
        res.status(500).send('Ocurrió un error en el servidor.');
    }
});

module.exports = app;
