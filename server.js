const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Augmenter la limite pour le corps de la requête

// Chemin vers le fichier JSON
const pdfsFilePath = path.join(__dirname, 'assets', 'documents', 'liste-pdfs.json');

// Endpoint pour récupérer la liste des PDFs
app.get('/api/pdfs', (req, res) => {
    fs.readFile(pdfsFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Erreur de lecture du fichier:', err);
            return res.status(500).send('Erreur lors de la lecture du fichier des PDFs.');
        }
        res.setHeader('Content-Type', 'application/json');
        res.send(data);
    });
});

// Endpoint pour sauvegarder la liste des PDFs
app.post('/api/pdfs', (req, res) => {
    const updatedPdfs = req.body;

    if (!updatedPdfs) {
        return res.status(400).send('Aucune donnée reçue.');
    }

    fs.writeFile(pdfsFilePath, JSON.stringify(updatedPdfs, null, 2), 'utf8', (err) => {
        if (err) {
            console.error('Erreur d\'écriture du fichier:', err);
            return res.status(500).send('Erreur lors de la sauvegarde du fichier des PDFs.');
        }
        res.send({ message: 'Fichier sauvegardé avec succès.' });
    });
});

app.listen(PORT, () => {
    console.log(`Serveur backend démarré sur http://localhost:${PORT}`);
});
