let pdfs = [];
const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api/pdfs`;
const AUTH_TOKEN_KEY = 'adminToken';

document.addEventListener('DOMContentLoaded', function() {
    checkAdminAuth();
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', handleAdminLogin);
    }
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleAdminLogout);
    }
    const saveChangesBtn = document.getElementById('saveChangesBtn');
    if (saveChangesBtn) {
        saveChangesBtn.addEventListener('click', saveChanges);
    }
    const addPdfBtn = document.getElementById('addPdfBtn');
    if (addPdfBtn) {
        addPdfBtn.addEventListener('click', handleAddPdf);
    }
});

function getToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

function checkAdminAuth() {
    if (getToken()) {
        showAdminInterface();
    } else {
        showLoginForm();
    }
}

function showLoginForm() {
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('adminInterface').style.display = 'none';
}

async function showAdminInterface() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('adminInterface').style.display = 'block';
    await loadExistingPDFs();
}

async function handleAdminLogin() {
    const password = document.getElementById('adminPassword').value;
    try {
        const response = await fetch(`${BASE_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Mot de passe incorrect');
        }
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        showAdminInterface();
    } catch (error) {
        console.error("Erreur d'authentification:", error);
        alert(error.message);
    }
}

function handleAdminLogout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    showLoginForm();
}

async function loadExistingPDFs() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error('Erreur du serveur lors du chargement des PDFs.');
        }
        pdfs = await response.json();
        displayEditablePDFs();
    } catch (error) {
        console.error('Erreur lors du chargement des PDFs:', error);
        showNotification('Impossible de charger la liste des PDFs.', 'error');
    }
}

function displayEditablePDFs() {
    const container = document.getElementById('existingPDFs');
    container.innerHTML = '';

    if (!pdfs || pdfs.length === 0) {
        container.innerHTML = '<p>Aucun PDF dans la liste.</p>';
        document.getElementById('saveChangesBtn').style.display = 'none';
        return;
    }

    pdfs.forEach((pdf, index) => {
        const item = document.createElement('div');
        item.className = 'pdf-item';
        item.dataset.index = index;

        item.innerHTML = `
            <div class="form-group">
                <label>Titre:</label>
                <input type="text" class="pdf-title-input" value="${escapeHTML(pdf.titre)}">
            </div>
            <div class="form-group">
                <label>Description:</label>
                <textarea class="pdf-description-input">${escapeHTML(pdf.description)}</textarea>
            </div>
            <div class="form-group">
                <label>Nom du fichier (non modifiable):</label>
                <input type="text" class="pdf-filename-input" value="${escapeHTML(pdf.nom_du_fichier)}" readonly>
            </div>
            <div class="pdf-actions">
                <button class="btn btn-secondary" onclick="deletePDF(${index})">Supprimer</button>
            </div>
        `;
        container.appendChild(item);
    });

    document.getElementById('saveChangesBtn').style.display = 'block';
}

async function saveChanges() {
    showNotification('Sauvegarde en cours...', 'info');
    const newPdfsArray = [];
    const items = document.querySelectorAll('.pdf-item');

    items.forEach(item => {
        const title = item.querySelector('.pdf-title-input').value;
        const description = item.querySelector('.pdf-description-input').value;
        const fileName = item.querySelector('.pdf-filename-input').value;
        newPdfsArray.push({ titre: title, description: description, nom_du_fichier: fileName });
    });

    try {
        const token = getToken();
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(newPdfsArray),
        });

        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem(AUTH_TOKEN_KEY);
            showLoginForm();
            throw new Error('Session expirée. Veuillez vous reconnecter.');
        }

        if (!response.ok) {
            throw new Error('Le serveur a retourné une erreur.');
        }

        const result = await response.json();
        showNotification(result.message, 'success');
        pdfs = newPdfsArray;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        showNotification(error.message, 'error');
    }
}

function deletePDF(index) {
    if (confirm(`Êtes-vous sûr de vouloir supprimer "${pdfs[index].nom_du_fichier}" ?`)) {
        pdfs.splice(index, 1);
        displayEditablePDFs();
    }
}

async function handleAddPdf() {
    const fileInput = document.getElementById('newPdfFile');
    const titleInput = document.getElementById('newPdfTitle');
    const descriptionInput = document.getElementById('newPdfDescription');

    const file = fileInput.files[0];
    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();

    if (!file) {
        showNotification('Veuillez sélectionner un fichier PDF.', 'error');
        return;
    }
    if (!title) {
        showNotification('Veuillez entrer un titre.', 'error');
        return;
    }

    showNotification('Upload en cours...', 'info');

    try {
        const token = getToken();

        const formData = new FormData();
        formData.append('pdf', file);

        const uploadRes = await fetch(`${BASE_URL}/api/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (uploadRes.status === 401 || uploadRes.status === 403) {
            localStorage.removeItem(AUTH_TOKEN_KEY);
            showLoginForm();
            throw new Error('Session expirée. Veuillez vous reconnecter.');
        }

        if (!uploadRes.ok) {
            const err = await uploadRes.json();
            throw new Error(err.error || 'Erreur lors de l\'upload.');
        }

        const uploadData = await uploadRes.json();

        pdfs.push({
            titre: title,
            description: description || 'Aucune description disponible.',
            nom_du_fichier: uploadData.filename
        });

        await savePdfsToServer();
        displayEditablePDFs();

        fileInput.value = '';
        titleInput.value = '';
        descriptionInput.value = '';

        showNotification('PDF ajouté avec succès.', 'success');
    } catch (error) {
        console.error('Erreur lors de l\'ajout du PDF:', error);
        showNotification(error.message, 'error');
    }
}

async function savePdfsToServer() {
    const token = getToken();
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(pdfs)
    });
    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        showLoginForm();
        throw new Error('Session expirée.');
    }
    if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde.');
    }
}

function showNotification(message, type) {
    const statusElement = document.getElementById('notificationMessage');
    if (!statusElement) return;
    statusElement.textContent = message;
    statusElement.className = `upload-status ${type}`;
    statusElement.style.display = 'block';

    setTimeout(() => {
        statusElement.style.display = 'none';
    }, 5000);
}

function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"]/g, function(match) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[match];
    });
}