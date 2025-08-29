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

// Ruta pública de bienvenida (para los curiosos)
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Acortador de URL Privado</title>
            <style>
                body {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                    background-color: #aebfd4;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                }
                .container {
                    background: #ffffff;
                    padding: 40px 30px;
                    border-radius: 12px;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                    text-align: center;
                    width: 90%;
                    max-width: 500px;
                }
                h1 { color: #333; margin-bottom: 15px; font-size: 1.8em; }
                p { color: #555; line-height: 1.6; }
                a { color: #007bff; text-decoration: none; font-weight: bold; }
                a:hover { text-decoration: underline; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Gracias por visitar nuestro acortador de URL</h1>
                <p>Este es un servicio personal y privado. Si estás interesado en obtener tu propio acortador, no dudes en contactarnos.</p>
                <p><a href="mailto:infoacortame@gmail.com">Pide informes aquí</a></p>
            </div>
        </body>
        </html>
    `);
});

// Ruta privada de acortamiento (solo para ti)
app.get('/shorten', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Acortador de URL Privado</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                    background-color: #aebfd4;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                }
                .container {
                    background: #ffffff;
                    padding: 40px 30px;
                    border-radius: 12px;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                    text-align: center;
                    width: 90%;
                    max-width: 500px;
                }
                h1 { color: #333; margin-bottom: 25px; font-size: 1.8em; }
                #url-form { display: flex; flex-direction: column; gap: 15px; }
                input[type="url"] { padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 1em; width: 100%; box-sizing: border-box; }
                button { padding: 12px 20px; border: none; border-radius: 8px; background-color: #007bff; color: white; font-size: 1em; cursor: pointer; transition: background-color 0.3s ease; }
                button:hover { background-color: #0056b3; }
                #result, #error-message { margin-top: 20px; padding: 15px; border-radius: 8px; background-color: #e9ecef; border: 1px dashed #ccc; }
                #result.hidden, #error-message.hidden { display: none; }
                #short-url { word-break: break-all; display: block; font-weight: bold; color: #0056b3; text-decoration: none; margin-top: 5px; }
                #copy-btn { margin-top: 10px; background-color: #28a745; }
                #copy-btn:hover { background-color: #218838; }
                p { margin: 0 0 5px 0; color: #555; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Acorta tus URLs al instante</h1>
                <form id="url-form">
                    <input type="url" id="long-url" placeholder="Pega tu URL larga aquí" required>
                    <button type="submit">Acortar</button>
                </form>
                <div id="result" class="hidden">
                    <p>Tu URL corta es:</p>
                    <a id="short-url" href="#" target="_blank"></a>
                    <button id="copy-btn">Copiar</button>
                </div>
                <div id="error-message" class="hidden">
                    <p>Por favor, ingresa una URL válida.</p>
                </div>
            </div>
            <script>
                const urlForm = document.getElementById('url-form');
                const longUrlInput = document.getElementById('long-url');
                const resultDiv = document.getElementById('result');
                const shortUrlLink = document.getElementById('short-url');
                const copyBtn = document.getElementById('copy-btn');
                const errorMessageDiv = document.getElementById('error-message');

                urlForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const longUrl = longUrlInput.value;

                    try {
                        const response = await fetch('/api/shorten', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ longUrl }),
                        });

                        const data = await response.json();

                        if (response.ok) {
                            shortUrlLink.href = data.shortUrl;
                            shortUrlLink.textContent = data.shortUrl;
                            resultDiv.classList.remove('hidden');
                            errorMessageDiv.classList.add('hidden');
                        } else {
                            errorMessageDiv.textContent = data.error || 'Algo salió mal. Inténtalo de nuevo.';
                            errorMessageDiv.classList.remove('hidden');
                            resultDiv.classList.add('hidden');
                        }
                    } catch (error) {
                        errorMessageDiv.textContent = 'Ocurrió un error. Verifica tu conexión.';
                        errorMessageDiv.classList.remove('hidden');
                        resultDiv.classList.add('hidden');
                    }
                });

                copyBtn.addEventListener('click', () => {
                    navigator.clipboard.writeText(shortUrlLink.href).then(() => {
                        copyBtn.textContent = '¡Copiado!';
                        setTimeout(() => { copyBtn.textContent = 'Copiar'; }, 2000);
                    }).catch(err => {
                        console.error('Error al copiar el texto:', err);
                        alert('No se pudo copiar el texto. Inténtalo manualmente.');
                    });
                });
            </script>
        </body>
        </html>
    `);
});

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

