// Gestion de la navigation mobile
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Fermer le menu mobile en cliquant sur un lien
document.querySelectorAll('.nav-link').forEach(n => n.addEventListener('click', () => {
    hamburger.classList.remove('active');
    navMenu.classList.remove('active');
}));

// Variables globales pour PDF.js
let pdfDoc = null, pageNum = 1, pageIsRendering = false, pageNumPending = null;
const scale = 1.5;
const canvas = document.getElementById('pdfCanvas');
const ctx = canvas.getContext('2d');

// Chargement des PDFs
document.addEventListener('DOMContentLoaded', function() {
    loadPDFs();
    
    // Vérifier si l'utilisateur a un abonnement Pro
    checkProStatus();
    
    // Gestion de la recherche
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterPDFs);
    }
    
    // Gestion du bouton Pro
    const proButton = document.getElementById('proButton');
    if (proButton) {
        proButton.addEventListener('click', initiateProPayment);
    }

    // Gestion des boutons de navigation PDF
    document.getElementById('prevPage').addEventListener('click', showPrevPage);
    document.getElementById('nextPage').addEventListener('click', showNextPage);

    // Fermer le modal
    document.querySelector('.close').addEventListener('click', closePdfModal);
});

// Charger la liste des PDFs
async function loadPDFs() {
    try {
        const response = await fetch('assets/documents/liste-pdfs.json');
        const pdfs = await response.json();
        displayPDFs(pdfs);
    } catch (error) {
        console.error('Erreur lors du chargement des PDFs:', error);
        document.getElementById('pdfList').innerHTML = '<p>Erreur lors du chargement de la bibliothèque.</p>';
    }
}

// Afficher les PDFs dans la grille
function displayPDFs(pdfs) {
    const pdfList = document.getElementById('pdfList');
    pdfList.innerHTML = '';
    
    pdfs.forEach(pdf => {
        const pdfCard = document.createElement('div');
        pdfCard.className = 'pdf-card';
        pdfCard.innerHTML = `
            <div class="pdf-thumbnail">
                <i class="fas fa-book"></i>
            </div>
            <div class="pdf-info">
                <div class="pdf-title">${pdf.title}</div>
                <div class="pdf-description">${pdf.description}</div>
            </div>
        `;
        
        pdfCard.addEventListener('click', () => openPDF('assets/documents/' + pdf.file));
        pdfList.appendChild(pdfCard);
    });
}

// Filtrer les PDFs selon la recherche
function filterPDFs() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const pdfCards = document.querySelectorAll('.pdf-card');
    
    pdfCards.forEach(card => {
        const title = card.querySelector('.pdf-title').textContent.toLowerCase();
        const description = card.querySelector('.pdf-description').textContent.toLowerCase();
        
        if (title.includes(searchTerm) || description.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Ouvre le PDF
async function openPDF(url) {
    const modal = document.getElementById('pdfModal');
    modal.style.display = 'block';

    // Masquer les publicités si l'utilisateur est Pro
    if (isProUser()) {
        hideAds();
    }

    // Charger le document PDF
    try {
        pdfDoc = await pdfjsLib.getDocument(url).promise;
        document.getElementById('pageCount').textContent = pdfDoc.numPages;
        renderPage(pageNum);
    } catch (error) {
        console.error('Erreur lors du chargement du PDF:', error);
        alert('Impossible de charger le PDF.');
        closePdfModal();
    }
}

// Rendre la page
async function renderPage(num) {
    pageIsRendering = true;
    const page = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale });

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
        canvasContext: ctx,
        viewport
    };

    await page.render(renderContext).promise;
    pageNum = num;
    document.getElementById('pageNumber').textContent = pageNum;
    pageIsRendering = false;

    if (pageNumPending !== null) {
        renderPage(pageNumPending);
        pageNumPending = null;
    }
}

// File d'attente pour le rendu des pages
function queueRenderPage(num) {
    if (pageIsRendering) {
        pageNumPending = num;
    } else {
        renderPage(num);
    }
}

// Afficher la page précédente
function showPrevPage() {
    if (pageNum <= 1) {
        return;
    }
    queueRenderPage(--pageNum);
}

// Afficher la page suivante
function showNextPage() {
    if (pageNum >= pdfDoc.numPages) {
        return;
    }
    queueRenderPage(++pageNum);
}

// Fermer le modal PDF
function closePdfModal() {
    document.getElementById('pdfModal').style.display = 'none';
    pdfDoc = null; // Libérer le document PDF
    pageNum = 1; // Réinitialiser la page
    document.getElementById('pageNumber').textContent = '';
    document.getElementById('pageCount').textContent = '';
}

// Vérifier le statut Pro
function checkProStatus() {
    if (isProUser()) {
        hideAds();
        updateUIForProUser();
    }
}

function isProUser() {
    return localStorage.getItem('proUser') === 'true';
}

function hideAds() {
    const ads = document.querySelectorAll('.adsense-ad');
    ads.forEach(ad => {
        ad.style.display = 'none';
    });
}

function updateUIForProUser() {
    const proButton = document.getElementById('proButton');
    if (proButton) {
        proButton.textContent = 'Membre Pro';
        proButton.disabled = true;
        proButton.style.backgroundColor = '#7f8c8d';
    }
}

// Initialiser le paiement Pro
function initiateProPayment() {
    // Initialiser Stripe avec votre clé publique
    const stripe = Stripe('pk_test_VOTRE_CLE_PUBLIQUE_STRIPE');
    
    // Créer une session de checkout
    fetch('/create-checkout-session', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            price: 300, // 3 dollars en cents
        }),
    })
    .then(response => response.json())
    .then(session => {
        return stripe.redirectToCheckout({ sessionId: session.id });
    })
    .then(result => {
        if (result.error) {
            alert(result.error.message);
        }
    })
    .catch(error => {
        console.error('Erreur:', error);
    });
}

// Simuler le succès du paiement (à remplacer par votre logique réelle)
function handlePaymentSuccess() {
    localStorage.setItem('proUser', 'true');
    checkProStatus();
    alert('Merci pour votre achat! Vous avez maintenant accès à la version Pro.');
}