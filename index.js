const express = require('express');
const admin = require('firebase-admin');
const nanoid = require('nanoid').nanoid;

const app = express();
app.use(express.json());

// Lee las credenciales de la variable de entorno de Vercel
const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Página principal del acortador (con el formulario)
app.get('/shorten', (req, res) => {
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Acortador de URL Privado</title>
        <style>
            body {
                font-family: sans-serif;
                background-color: #aebfd4;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
            }
            .container {
                background: white;
                padding: 40px 30px;
                border-radius: 12px;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                text-align: center;
                width: 90%;
                max-width: 500px;
            }
            h1 {
                color: #333;
                margin-bottom: 25px;
            }
            #url-form {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            input[type="url"] {
                padding: 12px;
                border: 1px solid #ddd;
                border-radius: 8px;
                width: 100%;
                box-sizing: border-box;
            }
            button {
                padding: 12px 20px;
                border: none;
                border-radius: 8px;
                background-color: #007bff;
                color: white;
                cursor: pointer;
            }
            #resultado, #error-message {
                margin-top: 20px;
                padding: 15px;
                border-radius: 8px;
                background-color: #e9ecef;
                border: 1px dashed #ccc;
            }
            #short-url {
                word-break: break-all;
                display: block;
                font-weight: bold;
                color: #0056b3;
                text-decoration: none;
                margin-top: 5px;
            }
            .hidden {
                display: none;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Acortador de URL Privado</h1>
            <form id="url-form">
                <input type="url" id="long-url" placeholder="Pega tu URL larga aquí" required>
                <button type="submit">Acortar URL</button>
            </form>
            <div id="resultado" class="hidden"></div>
            <div id="error-message" class="hidden" style="color: red;"></div>
        </div>

        <script>
            document.getElementById('url-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const longUrl = document.getElementById('long-url').value;
                const resultadoDiv = document.getElementById('resultado');
                const errorDiv = document.getElementById('error-message');

                resultadoDiv.classList.add('hidden');
                errorDiv.classList.add('hidden');
                
                try {
                    const response = await fetch('/api/shorten', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ longUrl })
                    });

                    const data = await response.json();

                    if (response.ok) {
                        resultadoDiv.innerHTML = \`
                            <p>URL corta:</p>
                            <a href="\${data.shortUrl}" id="short-url" target="_blank">\${data.shortUrl}</a>
                        \`;
                        resultadoDiv.classList.remove('hidden');
                    } else {
                        errorDiv.innerHTML = 'Error: ' + (data.error || 'Ocurrió un error en el servidor.');
                        errorDiv.classList.remove('hidden');
                    }
                } catch (error) {
                    errorDiv.innerHTML = 'Ocurrió un error. Inténtalo de nuevo.';
                    errorDiv.classList.remove('hidden');
                }
            });
        </script>
    </body>
    </html>
    `;
    res.send(htmlContent);
});

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

// Vercel y Express
const isVercel = process.env.VERCEL_ENV === 'production';
if (isVercel) {
    module.exports = app;
} else {
    app.listen(3000, () => {
        console.log('Servidor Express funcionando en http://localhost:3000');
    });
}
