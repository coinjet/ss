const admin = require('firebase-admin');
const nanoid = require('nanoid').nanoid;

// Lee las credenciales de la variable de entorno de Vercel
const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = require('express')();

app.use(require('cors')({ origin: true }));
app.use(require('body-parser').json());

// Endpoint para acortar URLs
app.post('/api/shorten', async (req, res) => {
    const { longUrl } = req.body;
    if (!longUrl || !longUrl.startsWith('http')) {
        return res.status(400).json({ error: 'URL inválida.' });
    }

    try {
        const docRef = db.collection('urls').doc();
        const shortId = nanoid(7);
        await docRef.set({
            longUrl: longUrl,
            shortId: shortId
        });

        const shortUrl = `${req.headers.host}/go/${shortId}`;
        res.status(200).json({ shortUrl });
    } catch (error) {
        console.error('Error al acortar la URL:', error);
        res.status(500).json({ error: 'Ocurrió un error en el servidor.' });
    }
});

// Endpoint para redireccionar
app.get('/go/:shortId', async (req, res) => {
    const { shortId } = req.params;

    try {
        const snapshot = await db.collection('urls').where('shortId', '==', shortId).limit(1).get();
        if (snapshot.empty) {
            return res.status(404).send('URL no encontrada');
        }

        const doc = snapshot.docs[0];
        const { longUrl } = doc.data();
        res.redirect(301, longUrl);
    } catch (error) {
        console.error('Error al redirigir:', error);
        res.status(500).send('Ocurrió un error en el servidor.');
    }
});

exports.app = require('firebase-functions').https.onRequest(app);
