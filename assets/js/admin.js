let pdfs = [];
const API_URL = 'http://localhost:3000/api/pdfs';

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
});

function checkAdminAuth() {
    if (localStorage.getItem('adminAuthenticated') === 'true') {
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
        const response = await fetch('assets/config/auth.json');
        if (!response.ok) throw new Error("Le fichier de configuration 'auth.json' est manquant.");
        const config = await response.json();
        const storedHash = config.hash;
        const msgUint8 = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const enteredHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
        if (enteredHash === storedHash) {
            localStorage.setItem('adminAuthenticated', 'true');
            showAdminInterface();
        } else {
            alert('Mot de passe incorrect');
        }
    } catch (error) {
        console.error("Erreur d'authentification:", error);
        alert(error.message);
    }
}

function handleAdminLogout() {
    localStorage.removeItem('adminAuthenticated');
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
        showNotification('Impossible de charger la liste des PDFs. Assurez-vous que le serveur backend est bien lancé (node server.js).', 'error');
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
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newPdfsArray),
        });

        if (!response.ok) {
            throw new Error('Le serveur a retourné une erreur.');
        }

        const result = await response.json();
        showNotification(result.message, 'success');
        pdfs = newPdfsArray;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        showNotification('Erreur lors de la sauvegarde. Vérifiez la console et l\'état du serveur.', 'error');
    }
}

function deletePDF(index) {
    if (confirm(`Êtes-vous sûr de vouloir supprimer "${pdfs[index].nom_du_fichier}" ? Cette action est temporaire jusqu\'à la sauvegarde.`)) {
        pdfs.splice(index, 1);
        displayEditablePDFs();
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