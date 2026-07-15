const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const app = express();
const PORT = 3000;

// --- Chemins ---
const documentsDir = path.join(__dirname, 'assets', 'documents');
const pdfsFilePath = path.join(documentsDir, 'liste-pdfs.json');
const authConfigPath = path.join(__dirname, 'assets', 'config', 'auth.json');
const secretConfigPath = path.join(__dirname, 'assets', 'config', 'server-secret.json');

// --- Configuration multer (upload de fichiers) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, documentsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.originalname.replace(ext, '') + '-' + uniqueSuffix + ext);
    }
});

function fileFilter(req, file, cb) {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Seuls les fichiers PDF sont acceptés.'), false);
    }
}

const upload = multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB max

// --- Chargement ou génération du secret JWT ---
let JWT_SECRET;
try {
    const secretConfig = JSON.parse(fs.readFileSync(secretConfigPath, 'utf8'));
    JWT_SECRET = secretConfig.secret;
} catch {
    JWT_SECRET = crypto.randomBytes(64).toString('hex');
    fs.writeFileSync(secretConfigPath, JSON.stringify({ secret: JWT_SECRET }, null, 2));
    console.log('Nouveau secret JWT généré et sauvegardé.');
}

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- Middleware JWT ---
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token manquant.' });
    jwt.verify(token, JWT_SECRET, (err) => {
        if (err) return res.status(403).json({ error: 'Token invalide ou expiré.' });
        next();
    });
}

// --- Login (publique) ---
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Mot de passe requis.' });

    try {
        const config = JSON.parse(fs.readFileSync(authConfigPath, 'utf8'));
        const storedHash = config.hash;
        const enteredHash = crypto.createHash('sha256').update(password).digest('hex');

        if (enteredHash !== storedHash) {
            return res.status(401).json({ error: 'Mot de passe incorrect.' });
        }

        const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token });
    } catch (err) {
        console.error('Erreur de lecture de auth.json:', err);
        res.status(500).json({ error: 'Erreur de configuration du serveur.' });
    }
});

// --- GET /api/pdfs (publique) ---
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

// --- POST /api/pdfs (protégé par JWT) ---
app.post('/api/pdfs', authenticateToken, (req, res) => {
    const updatedPdfs = req.body;
    if (!updatedPdfs) {
        return res.status(400).json({ error: 'Aucune donnée reçue.' });
    }
    fs.writeFile(pdfsFilePath, JSON.stringify(updatedPdfs, null, 2), 'utf8', (err) => {
        if (err) {
            console.error('Erreur d\'écriture du fichier:', err);
            return res.status(500).json({ error: 'Erreur lors de la sauvegarde.' });
        }
        res.json({ message: 'Fichier sauvegardé avec succès.' });
    });
});

// --- POST /api/upload (protégé par JWT) ---
app.post('/api/upload', authenticateToken, (req, res) => {
    upload.single('pdf')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'Le fichier dépasse la limite de 50MB.' });
            }
            return res.status(400).json({ error: err.message });
        }
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier sélectionné.' });
        }
        res.json({
            message: 'Fichier uploadé avec succès.',
            filename: req.file.filename
        });
    });
});

app.listen(PORT, () => {
    console.log(`Serveur backend démarré sur http://localhost:${PORT}`);
});
