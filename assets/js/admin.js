// Global array to hold PDF data
let pdfs = [];
const PDF_LIST_FILE = 'liste-pdfs.json';
const PDF_DIR = 'assets/documents/';

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

    // Event listener for Add PDF button
    const addPdfBtn = document.getElementById('addPdfBtn');
    if (addPdfBtn) {
        addPdfBtn.addEventListener('click', addPDF);
    }

    // Event listener for Save Changes button
    const saveChangesBtn = document.getElementById('saveChangesBtn');
    if (saveChangesBtn) {
        saveChangesBtn.addEventListener('click', saveChanges);
    }

    // Event listener for Reset Form button
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetForm);
    }

    // Initial load of PDFs
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
    // Hide notification message when showing interface
    document.getElementById('notificationMessage').style.display = 'none';
}

// Gérer la connexion admin
async function handleAdminLogin() {
    const password = document.getElementById('adminPassword').value;

    try {
        const response = await fetch('assets/config/auth.json');
        if (!response.ok) {
            throw new Error("Le fichier de configuration 'auth.json' est manquant ou illisible. Veuillez le créer en utilisant 'generateur-hash.html'.");
        }
        const config = await response.json();
        const storedHash = config.hash;

        const msgUint8 = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const enteredHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        if (enteredHash === storedHash) {
            localStorage.setItem('adminAuthenticated', 'true');
            showAdminInterface();
        } else {
            alert('Mot de passe incorrect');
        }
    } catch (error) {
        console.error("Erreur d'authentification:", error);
        alert(error.message || 'Une erreur est survenue lors de la tentative de connexion.');
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
        const response = await fetch(PDF_DIR + PDF_LIST_FILE);
        if (!response.ok) {
            // If file not found, assume empty list
            pdfs = [];
            console.warn(`Fichier ${PDF_LIST_FILE} non trouvé ou illisible. Initialisation d'une liste vide.`);
        } else {
            pdfs = await response.json();
        }
        displayExistingPDFs();
    } catch (error) {
        console.error('Erreur lors du chargement des PDFs existants:', error);
        pdfs = []; // Ensure pdfs is an array even on error
        displayExistingPDFs();
    }
}

// Afficher les PDFs existants
function displayExistingPDFs() {
    const existingPDFs = document.getElementById('existingPDFs');
    existingPDFs.innerHTML = '';

    if (pdfs.length === 0) {
        existingPDFs.innerHTML = '<p>Aucun PDF dans la liste. Ajoutez-en un nouveau !</p>';
        return;
    }

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
    // Show save button if there are changes (or just always show it if list is not empty)
    if (pdfs.length > 0) {
        document.getElementById('saveChangesBtn').style.display = 'inline-block';
    } else {
        document.getElementById('saveChangesBtn').style.display = 'none';
    }
}

// Ajouter un nouveau PDF à la liste (en mémoire)
function addPDF() {
    const title = document.getElementById('pdfTitle').value.trim();
    const description = document.getElementById('pdfDescription').value.trim();
    const fileName = document.getElementById('pdfFileName').value.trim();

    if (!title || !description || !fileName) {
        showUploadStatus('Veuillez remplir tous les champs (Titre, Description, Nom du fichier PDF).', 'error');
        return;
    }

    const newPdf = { title, description, file: fileName };
    pdfs.push(newPdf);
    displayExistingPDFs();
    resetForm();
    showUploadStatus('PDF ajouté à la liste en mémoire. N\'oubliez pas de sauvegarder les changements !', 'success');
    document.getElementById('saveChangesBtn').style.display = 'inline-block'; // Show save button
}

// Supprimer un PDF de la liste (en mémoire)
function deletePDF(index) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce PDF de la liste ?')) {
        pdfs.splice(index, 1);
        displayExistingPDFs();
        showUploadStatus('PDF supprimé de la liste en mémoire. N\'oubliez pas de sauvegarder les changements !', 'success');
        document.getElementById('saveChangesBtn').style.display = 'inline-block'; // Show save button
    }
}

// Sauvegarder les changements en téléchargeant le nouveau fichier JSON
function saveChanges() {
    const jsonString = JSON.stringify(pdfs, null, 4); // Pretty print JSON

    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = PDF_LIST_FILE;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showUploadStatus('Nouveau fichier ' + PDF_LIST_FILE + ' téléchargé ! Veuillez le remplacer manuellement dans le dossier assets/documents/.', 'success');
    displayPostSaveInstructions();
    document.getElementById('saveChangesBtn').style.display = 'none'; // Hide save button after saving
}

// Afficher les instructions après la sauvegarde
function displayPostSaveInstructions() {
    const notificationMessage = document.getElementById('notificationMessage');
    notificationMessage.innerHTML = `
        <h3>Étapes Suivantes pour Mettre à Jour le Site :</h3>
        <ol>
            <li>**Remplacez le fichier :** Prenez le fichier \`${PDF_LIST_FILE}\` que vous venez de télécharger et utilisez-le pour remplacer l'ancien fichier situé dans \`${PDF_DIR}\`.</li>
            <li>**Lancez le déploiement :** Double-cliquez sur le script \`deployer.bat\` (situé à la racine de votre projet) pour que vos changements soient mis en ligne sur GitHub.</li>
        </ol>
        <p>C'est tout ! Votre site sera mis à jour après le déploiement.</p>
    `;
    notificationMessage.style.display = 'block';
}

// Afficher le statut (pour les messages d'erreur/succès temporaires)
function showUploadStatus(message, type) {
    const statusElement = document.getElementById('uploadStatus');
    statusElement.textContent = message;
    statusElement.className = 'upload-status'; // Reset classes
    if (type) {
        statusElement.classList.add(type);
    }
    statusElement.style.display = 'block';
    // Hide after a few seconds
    setTimeout(() => {
        statusElement.style.display = 'none';
    }, 5000);
}

// Réinitialiser le formulaire d'ajout de PDF
function resetForm() {
    document.getElementById('pdfTitle').value = '';
    document.getElementById('pdfDescription').value = '';
    document.getElementById('pdfFileName').value = '';
    // Clear status message
    document.getElementById('uploadStatus').style.display = 'none';
}

// Placeholder for edit function (not implemented yet)
function editPDF(index) {
    alert('Fonctionnalité de modification à implémenter');
}
