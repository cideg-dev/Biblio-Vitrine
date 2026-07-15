// --- State Management ---
let allPdfs = []; // The master list of all PDFs, fetched once.
let filteredPdfs = []; // The list of PDFs after applying the search filter.
let currentPage = 1;
const itemsPerPage = 12; // Display 12 PDFs per page.

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', function() {
    // Mobile navigation (unchanged)
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });
    document.querySelectorAll('.nav-link').forEach(n => n.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    }));

    // Back to top button
    const backToTop = document.getElementById('backToTop');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    });
    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Initial data load
    loadAndDisplayPDFs();

    // Search listener
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }
    
    // PDF.js Modal Listeners (unchanged)
    document.getElementById('prevPage').addEventListener('click', showPrevPdfPage);
    document.getElementById('nextPage').addEventListener('click', showNextPdfPage);
    document.getElementById('zoomIn').addEventListener('click', zoomIn);
    document.getElementById('zoomOut').addEventListener('click', zoomOut);
    document.getElementById('back-to-library').addEventListener('click', closePdfViewer);

    const pdfViewerOverlay = document.getElementById('pdf-viewer-overlay');
    const pdfCanvasContainer = document.getElementById('pdf-canvas-container');

    pdfViewerOverlay.addEventListener('click', (e) => {
        console.log('click event');
        if (e.target === pdfViewerOverlay || e.target === pdfCanvas) {
            pdfViewerOverlay.classList.toggle('controls-visible');
        }
    });

    let touchstartX = 0;
    let touchendX = 0;

    pdfCanvasContainer.addEventListener('touchstart', function(event) {
        touchstartX = event.changedTouches[0].screenX;
    }, false);

    pdfCanvasContainer.addEventListener('touchend', function(event) {
        touchendX = event.changedTouches[0].screenX;
        handleSwipe();
    }, false); 

    function handleSwipe() {
        if (touchendX < touchstartX) {
            showNextPdfPage();
        }
        if (touchendX > touchstartX) {
            showPrevPdfPage();
        }
    }

    const mc = new Hammer(pdfCanvasContainer);

    mc.get('pinch').set({ enable: true });

    let initialScale = currentScale;

    mc.on('pinchstart', (ev) => {
        initialScale = currentScale;
    });

    mc.on('pinch', (ev) => {
        currentScale = initialScale * ev.scale;
        renderPdfPage(pageNum);
    });
});

// --- Data Loading and Rendering ---

async function loadAndDisplayPDFs() {
    showSkeletonLoader();
    try {
        const response = await fetch('assets/documents/liste-pdfs.json');
        if (!response.ok) throw new Error('Network response was not ok.');
        allPdfs = await response.json();
        filteredPdfs = [...allPdfs];
        render();
    } catch (error) {
        console.error('Erreur lors du chargement des PDFs:', error);
        document.getElementById('pdfList').innerHTML = '<p class="error-message">Impossible de charger la bibliothèque. Veuillez réessayer plus tard.</p>';
    }
}

function showSkeletonLoader() {
    const container = document.getElementById('pdfList');
    const skeletonCount = 6;
    container.innerHTML = Array.from({ length: skeletonCount }, () => `
        <div class="pdf-card skeleton">
            <div class="pdf-thumbnail skeleton-box"></div>
            <div class="pdf-info">
                <div class="skeleton-line skeleton-line-title"></div>
                <div class="skeleton-line skeleton-line-text"></div>
                <div class="skeleton-line skeleton-line-text short"></div>
            </div>
        </div>
    `).join('');
}

// Main render function: re-renders the grid and pagination
function render() {
    renderPdfGrid();
    renderPagination();
}

// Renders the grid for the current page
function renderPdfGrid() {
    const pdfListContainer = document.getElementById('pdfList');
    pdfListContainer.innerHTML = '';

    if (filteredPdfs.length === 0) {
        pdfListContainer.innerHTML = '<p>Aucun résultat trouvé.</p>';
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageItems = filteredPdfs.slice(startIndex, endIndex);

    pageItems.forEach((pdf, index) => {
        const pdfCard = document.createElement('div');
        pdfCard.className = 'pdf-card';
        // Use nom_du_fichier from the new JSON structure
        const title = pdf.titre || pdf.nom_du_fichier.replace('.pdf', '').replace(/_/g, ' ');
        const description = pdf.description || 'Aucune description disponible.';
        
        pdfCard.innerHTML = `
            <div class="pdf-thumbnail">
                <i class="fas fa-book"></i>
            </div>
            <div class="pdf-info">
                <div class="pdf-title">${title}</div>
                <div class="pdf-description">${description}</div>
            </div>
        `;
        pdfCard.addEventListener('click', () => openPDF('assets/documents/' + pdf.nom_du_fichier));
        
        // Add staggered animation
        pdfCard.style.animationDelay = `${index * 75}ms`;
        pdfCard.classList.add('fade-in');

        pdfListContainer.appendChild(pdfCard);
    });
}

// Renders the pagination controls
function renderPagination() {
    const paginationContainer = document.getElementById('pagination-container');
    paginationContainer.innerHTML = '';
    const pageCount = Math.ceil(filteredPdfs.length / itemsPerPage);

    if (pageCount <= 1) return; // No need for pagination if there's only one page

    const maxPagesToShow = 5; // Max number of page buttons to display
    let startPage, endPage;

    if (pageCount <= maxPagesToShow) {
        // Less than maxPagesToShow total pages so show all
        startPage = 1;
        endPage = pageCount;
    } else {
        // More than maxPagesToShow total pages so calculate start and end pages
        if (currentPage <= Math.ceil(maxPagesToShow / 2)) {
            startPage = 1;
            endPage = maxPagesToShow;
        } else if (currentPage + Math.floor(maxPagesToShow / 2) >= pageCount) {
            startPage = pageCount - maxPagesToShow + 1;
            endPage = pageCount;
        } else {
            startPage = currentPage - Math.floor(maxPagesToShow / 2);
            endPage = currentPage + Math.floor(maxPagesToShow / 2);
        }
    }

    // Previous button
    const prevButton = document.createElement('button');
    prevButton.textContent = 'Précédent';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            render();
        }
    });
    paginationContainer.appendChild(prevButton);

    // First page button and ellipsis if needed
    if (startPage > 1) {
        const firstPageButton = document.createElement('button');
        firstPageButton.textContent = '1';
        firstPageButton.addEventListener('click', () => {
            currentPage = 1;
            render();
        });
        paginationContainer.appendChild(firstPageButton);
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            paginationContainer.appendChild(ellipsis);
        }
    }

    // Page number buttons
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        if (i === currentPage) {
            pageButton.classList.add('active');
        }
        pageButton.addEventListener('click', () => {
            currentPage = i;
            render();
        });
        paginationContainer.appendChild(pageButton);
    }

    // Ellipsis and last page button if needed
    if (endPage < pageCount) {
        if (endPage < pageCount - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            paginationContainer.appendChild(ellipsis);
        }
        const lastPageButton = document.createElement('button');
        lastPageButton.textContent = pageCount;
        lastPageButton.addEventListener('click', () => {
            currentPage = pageCount;
            render();
        });
        paginationContainer.appendChild(lastPageButton);
    }

    // Next button
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Suivant';
    nextButton.disabled = currentPage === pageCount;
    nextButton.addEventListener('click', () => {
        if (currentPage < pageCount) {
            currentPage++;
            render();
        }
    });
    paginationContainer.appendChild(nextButton);
}

// --- Search and Filtering ---

function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    filteredPdfs = allPdfs.filter(pdf => {
        const title = (pdf.titre || pdf.nom_du_fichier).toLowerCase();
        const description = (pdf.description || '').toLowerCase();
        return title.includes(searchTerm) || description.includes(searchTerm);
    });
    currentPage = 1; // Reset to first page after a new search
    render();
}

function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

// --- PDF.js Viewer Logic (largely unchanged) ---
let pdfDoc = null, pageNum = 1, pageIsRendering = false, pageNumPending = null;
let currentScale = 1.5;
const canvas = document.getElementById('pdfCanvas');
const ctx = canvas.getContext('2d');

async function openPDF(url) {
    document.getElementById('pdf-viewer-overlay').style.display = 'flex';
    try {
        pdfDoc = await pdfjsLib.getDocument(url).promise;
        document.getElementById('pageCount').textContent = pdfDoc.numPages;
        pageNum = 1;
        renderPdfPage(pageNum);
    } catch (error) {
        console.error('Erreur lors du chargement du PDF:', error);
        alert('Impossible de charger le PDF.');
        closePdfViewer();
    }
}

async function renderPdfPage(num) {
    pageIsRendering = true;
    const page = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale: currentScale });
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    const renderContext = { canvasContext: ctx, viewport };
    await page.render(renderContext).promise;
    pageIsRendering = false;
    document.getElementById('pageNumber').textContent = num;
    if (pageNumPending !== null) {
        renderPdfPage(pageNumPending);
        pageNumPending = null;
    }
}

function queueRenderPage(num) {
    if (pageIsRendering) {
        pageNumPending = num;
    } else {
        renderPdfPage(num);
    }
}

function showPrevPdfPage() {
    if (pageNum <= 1) return;
    pageNum--;
    queueRenderPage(pageNum);
}

function showNextPdfPage() {
    if (pageNum >= pdfDoc.numPages) return;
    pageNum++;
    queueRenderPage(pageNum);
}

function zoomIn() {
    if (currentScale >= 3.0) return;
    currentScale += 0.25;
    renderPdfPage(pageNum);
}

function zoomOut() {
    if (currentScale <= 0.25) return;
    currentScale -= 0.25;
    renderPdfPage(pageNum);
}

function closePdfViewer() {
    document.getElementById('pdf-viewer-overlay').style.display = 'none';
    pdfDoc = null;
    currentScale = 1.5;
}