// Gestion de l'interface d'administration
document.addEventListener('DOMContentLoaded', function() {
    // Vérifier si l'utilisateur est déjà connecté
    checkAdminAuth();
    
    // Gestion de la connexion
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', handleAdminLogin);
    }
    
    // Gestion de la déconnexion
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleAdminLogout);
    }
    
    // Gestion du téléversement de PDF
    const uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', handlePDFUpload);
    }
    
    // Gestion de la réinitialisation du formulaire
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetForm);
    }
    
    // Charger la liste des PDFs existants
    loadExistingPDFs();
});

// Vérifier l'authentification admin
function checkAdminAuth() {
    const isAuthenticated = localStorage.getItem('adminAuthenticated') === 'true';
    
    if (isAuthenticated) {
        showAdminInterface();
    } else {
        showLoginForm();
    }
}

// Afficher le formulaire de connexion
function showLoginForm() {
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('adminInterface').style.display = 'none';
}

// Afficher l'interface d'administration
function showAdminInterface() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('adminInterface').style.display = 'block';
}

// Gérer la connexion admin
async function handleAdminLogin() {
    const password = document.getElementById('adminPassword').value;
    const storedHash = '482c18697d33589606d1920cdf05bd6c4ac85489dd78907ae390f0427516cb17';

    // Fonction pour hasher le mot de passe entré par l'utilisateur
    async function digestMessage(message) {
      const msgUint8 = new TextEncoder().encode(message);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    }

    const enteredHash = await digestMessage(password);

    if (enteredHash === storedHash) {
        localStorage.setItem('adminAuthenticated', 'true');
        showAdminInterface();
    } else {
        alert('Mot de passe incorrect');
    }
}

// Gérer la déconnexion admin
function handleAdminLogout() {
    localStorage.removeItem('adminAuthenticated');
    showLoginForm();
}

// Charger les PDFs existants
async function loadExistingPDFs() {
    try {
        const response = await fetch('pdfs/liste-pdfs.json');
        const pdfs = await response.json();
        displayExistingPDFs(pdfs);
    } catch (error) {
        console.error('Erreur lors du chargement des PDFs existants:', error);
    }
}

// Afficher les PDFs existants
function displayExistingPDFs(pdfs) {
    const existingPDFs = document.getElementById('existingPDFs');
    existingPDFs.innerHTML = '';
    
    pdfs.forEach((pdf, index) => {
        const pdfItem = document.createElement('div');
        pdfItem.className = 'pdf-item';
        pdfItem.innerHTML = `
            <div>
                <strong>${pdf.title}</strong>
                <p>${pdf.description}</p>
                <small>Fichier: ${pdf.file}</small>
            </div>
            <div class="pdf-actions">
                <button class="btn btn-secondary" onclick="editPDF(${index})">Modifier</button>
                <button class="btn btn-secondary" onclick="deletePDF(${index})">Supprimer</button>
            </div>
        `;
        existingPDFs.appendChild(pdfItem);
    });
}

// Gérer le téléversement de PDF
async function handlePDFUpload() {
    const title = document.getElementById('pdfTitle').value;
    const description = document.getElementById('pdfDescription').value;
    const fileInput = document.getElementById('pdfFile');
    const file = fileInput.files[0];
    
    if (!title || !description || !file) {
        showUploadStatus('Veuillez remplir tous les champs', 'error');
        return;
    }
    
    try {
        // Simuler le téléversement (à adapter avec votre logique GitHub Pages)
        showUploadStatus('Téléversement en cours...', '');
        
        // Dans un environnement réel, vous utiliseriez l'API GitHub ou une autre solution
        // pour pousser le fichier vers votre dépôt
        await simulateGitHubUpload(file, title, description);
        
        showUploadStatus('PDF téléversé avec succès!', 'success');
        resetForm();
        
        // Recharger la liste des PDFs
        loadExistingPDFs();
        
        // Mettre à jour la liste des PDFs sur le site principal
        updatePDFList();
        
    } catch (error) {
        console.error('Erreur lors du téléversement:', error);
        showUploadStatus('Erreur lors du téléversement: ' + error.message, 'error');
    }
}

// Simuler le téléversement vers GitHub (à remplacer par votre implémentation réelle)
async function simulateGitHubUpload(file, title, description) {
    // Cette fonction simule le processus de téléversement
    // Dans un environnement réel, vous utiliseriez l'API GitHub pour:
    // 1. Téléverser le fichier PDF
    // 2. Mettre à jour le fichier liste-pdfs.json
    // 3. Committer et pousser les changements
    
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Simulation de succès
            resolve();
        }, 2000);
    });
}

// Mettre à jour la liste des PDFs (pour refléter les changements sur le site principal)
function updatePDFList() {
    // Cette fonction pourrait déclencher une reconstruction du site
    // ou rafraîchir le cache selon votre configuration GitHub Pages
    
    // Pour l'instant, nous allons simplement recharger la page après un délai
    setTimeout(() => {
        window.location.reload();
    }, 3000);
}

// Afficher le statut du téléversement
function showUploadStatus(message, type) {
    const statusElement = document.getElementById('uploadStatus');
    statusElement.textContent = message;
    statusElement.className = 'upload-status';
    
    if (type === 'success') {
        statusElement.classList.add('success');
    } else if (type === 'error') {
        statusElement.classList.add('error');
    }
}

// Réinitialiser le formulaire
function resetForm() {
    document.getElementById('pdfTitle').value = '';
    document.getElementById('pdfDescription').value = '';
    document.getElementById('pdfFile').value = '';
    document.getElementById('uploadStatus').textContent = '';
    document.getElementById('uploadStatus').className = 'upload-status';
}

// Modifier un PDF existant
function editPDF(index) {
    // Implémentez la logique de modification
    alert('Fonctionnalité de modification à implémenter');
}

// Supprimer un PDF
function deletePDF(index) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce PDF?')) {
        // Implémentez la logique de suppression
        alert('Fonctionnalité de suppression à implémenter');
    }
}