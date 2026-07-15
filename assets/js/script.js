let allPdfs = []
let filteredPdfs = []
let currentPage = 1
const itemsPerPage = 12
const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
const PDF_BASE = 'assets/documents/'
const thumbCache = new Map()

document.addEventListener('DOMContentLoaded', () => {
    // Mobile nav
    const hamburger = document.querySelector('.hamburger')
    const navMenu = document.querySelector('.nav-menu')
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active')
        navMenu.classList.toggle('active')
    })
    document.querySelectorAll('.nav-link').forEach(n => n.addEventListener('click', () => {
        hamburger.classList.remove('active')
        navMenu.classList.remove('active')
    }))

    // Back to top
    const backToTop = document.getElementById('backToTop')
    window.addEventListener('scroll', () => {
        backToTop.classList.toggle('visible', window.scrollY > 400)
    })
    backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }))

    // Load PDFs
    loadAndDisplayPDFs()

    // Search
    const searchInput = document.getElementById('searchInput')
    if (searchInput) searchInput.addEventListener('input', debounce(handleSearch, 300))

    // PDF viewer
    document.getElementById('prevPage')?.addEventListener('click', showPrevPdfPage)
    document.getElementById('nextPage')?.addEventListener('click', showNextPdfPage)
    document.getElementById('zoomIn')?.addEventListener('click', zoomIn)
    document.getElementById('zoomOut')?.addEventListener('click', zoomOut)
    document.getElementById('back-to-library')?.addEventListener('click', closePdfViewer)
    document.getElementById('downloadPdfBtn')?.addEventListener('click', () => window._currentPdfUrl && window.open(window._currentPdfUrl, '_blank'))

    if (isMobile) {
        const hint = document.getElementById('viewerHint')
        if (hint) hint.textContent = 'Ouvre dans une nouvelle fenêtre pour une meilleure expérience'
    }

    // Donate amount buttons
    document.querySelectorAll('.amount-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'))
            btn.classList.add('active')
            const paypalLink = document.getElementById('paypalBtn')
            if (paypalLink) {
                const base = paypalLink.href.replace(/&amount=[\d.]+/, '')
                const amount = btn.dataset.amount
                paypalLink.href = base + '&amount=' + amount
            }
        })
    })
    // Trigger first amount button to set default
    const firstAmount = document.querySelector('.amount-btn')
    if (firstAmount) firstAmount.click()

    // Newsletter
    document.getElementById('newsletterForm')?.addEventListener('submit', handleNewsletter)

    // Load testimonials
    loadTestimonials()

    // Open external download in viewer
    window.downloadCurrentPdf = function() {
        if (window._currentPdfUrl) window.open(window._currentPdfUrl, '_blank')
    }

    // Smooth scroll for CTA
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
            const href = a.getAttribute('href')
            if (href === '#') return
            e.preventDefault()
            document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
        })
    })

    // Daily verse rotation
    setInterval(rotateVerse, 8000)
})

// ─── Data ───
async function loadAndDisplayPDFs() {
    showSkeletonLoader()
    try {
        const res = await fetch('assets/documents/liste-pdfs.json')
        if (!res.ok) throw new Error('Network error')
        allPdfs = await res.json()
        filteredPdfs = [...allPdfs]
        document.getElementById('totalPdfCount').textContent = allPdfs.length
        document.querySelectorAll('.pdf-count-hero').forEach(el => el.textContent = allPdfs.length + '+')
        render()
    } catch (e) {
        console.error(e)
        document.getElementById('pdfList').innerHTML = '<p class="error-message">Impossible de charger la bibliothèque.</p>'
    }
}

function showSkeletonLoader() {
    const container = document.getElementById('pdfList')
    container.innerHTML = Array.from({ length: 6 }, () => `
        <div class="pdf-card" style="opacity:1">
            <div class="pdf-thumbnail skeleton-box"></div>
            <div class="pdf-info">
                <div class="skeleton-line skeleton-line-title skeleton-box"></div>
                <div class="skeleton-line skeleton-line-text skeleton-box"></div>
                <div class="skeleton-line skeleton-line-text short skeleton-box"></div>
            </div>
        </div>`).join('')
}

function render() {
    renderPdfGrid()
    renderPagination()
}

function renderPdfGrid() {
    const container = document.getElementById('pdfList')
    container.innerHTML = ''
    if (!filteredPdfs.length) {
        container.innerHTML = '<p style="text-align:center;padding:3rem;color:var(--text3)">Aucun résultat trouvé.</p>'
        return
    }
    const start = (currentPage - 1) * itemsPerPage
    const items = filteredPdfs.slice(start, start + itemsPerPage)
    items.forEach((pdf, i) => {
        const card = document.createElement('div')
        card.className = 'pdf-card'
        card.style.animationDelay = `${i * 60}ms`
        const title = pdf.titre || pdf.nom_du_fichier.replace('.pdf', '').replace(/_/g, ' ')
        const desc = pdf.description || 'Aucune description disponible.'
        const fileUrl = PDF_BASE + pdf.nom_du_fichier
        card.innerHTML = `
            <div class="pdf-thumbnail" id="thumb-${i}">
                <div class="thumb-placeholder"><i class="fas fa-book"></i></div>
                <canvas class="thumb-canvas" hidden></canvas>
            </div>
            <div class="pdf-info">
                <div class="pdf-title">${esc(title)}</div>
                <div class="pdf-description">${esc(desc)}</div>
                <div class="pdf-actions-row">
                    <button class="pdf-read-btn" data-url="${esc(fileUrl)}"><i class="fas fa-book-open"></i> Lire</button>
                    <a href="${esc(fileUrl)}" download class="pdf-dl-btn" title="Télécharger"><i class="fas fa-download"></i></a>
                </div>
            </div>`
        const readBtn = card.querySelector('.pdf-read-btn')
        readBtn.addEventListener('click', (e) => {
            e.stopPropagation()
            isMobile ? window.open(fileUrl, '_blank') : openPDF(fileUrl)
        })
        container.appendChild(card)
        loadThumbnail(pdf.nom_du_fichier, i)
    })
}

// ─── PDF Thumbnails ───
function loadThumbnail(filename, idx) {
    const placeholder = document.getElementById('thumb-' + idx)
    if (!placeholder) return

    if (thumbCache.has(filename)) {
        const dataUrl = thumbCache.get(filename)
        placeholder.innerHTML = `<img src="${dataUrl}" alt="" class="pdf-thumb-img" loading="lazy">`
        return
    }

    const url = PDF_BASE + filename
    pdfjsLib.getDocument(url).promise.then(doc => {
        doc.getPage(1).then(page => {
            const vp = page.getViewport({ scale: 0.25 })
            const c = document.createElement('canvas')
            c.width = vp.width; c.height = vp.height
            page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise.then(() => {
                const dataUrl = c.toDataURL('image/jpeg', 0.5)
                thumbCache.set(filename, dataUrl)
                placeholder.innerHTML = `<img src="${dataUrl}" alt="" class="pdf-thumb-img" loading="lazy">`
            })
        })
    }).catch(() => {})
}

function renderPagination() {
    const container = document.getElementById('pagination-container')
    container.innerHTML = ''
    const pages = Math.ceil(filteredPdfs.length / itemsPerPage)
    if (pages <= 1) return

    const append = (el) => container.appendChild(el)

    const prev = document.createElement('button')
    prev.textContent = '‹'
    prev.disabled = currentPage === 1
    prev.addEventListener('click', () => { currentPage--; render() })
    append(prev)

    let start = Math.max(1, currentPage - 2)
    let end = Math.min(pages, currentPage + 2)
    if (currentPage <= 3) { start = 1; end = Math.min(5, pages) }
    if (currentPage > pages - 3) { start = Math.max(1, pages - 4); end = pages }

    if (start > 1) {
        const b = document.createElement('button'); b.textContent = '1'; b.addEventListener('click', () => { currentPage = 1; render() }); append(b)
        if (start > 2) { const s = document.createElement('span'); s.textContent = '…'; append(s) }
    }
    for (let i = start; i <= end; i++) {
        const b = document.createElement('button'); b.textContent = i
        if (i === currentPage) b.className = 'active'
        b.addEventListener('click', () => { currentPage = i; render() }); append(b)
    }
    if (end < pages) {
        if (end < pages - 1) { const s = document.createElement('span'); s.textContent = '…'; append(s) }
        const b = document.createElement('button'); b.textContent = pages
        b.addEventListener('click', () => { currentPage = pages; render() }); append(b)
    }

    const next = document.createElement('button')
    next.textContent = '›'
    next.disabled = currentPage === pages
    next.addEventListener('click', () => { currentPage++; render() })
    append(next)
}

// ─── Search ───
function handleSearch(e) {
    const term = e.target.value.toLowerCase()
    filteredPdfs = allPdfs.filter(p => {
        const t = (p.titre || p.nom_du_fichier).toLowerCase()
        const d = (p.description || '').toLowerCase()
        return t.includes(term) || d.includes(term)
    })
    currentPage = 1
    render()
}

function debounce(fn, ms) {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms) }
}

// ─── Daily Verse ───
const verses = [
    { text: 'Ta parole est une lampe à mes pieds, et une lumière sur mon sentier.', ref: 'Psaume 119:105' },
    { text: 'Car Dieu a tant aimé le monde qu\'il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu\'il ait la vie éternelle.', ref: 'Jean 3:16' },
    { text: 'Je puis tout par celui qui me fortifie.', ref: 'Philippiens 4:13' },
    { text: 'Ne crains point, car je suis avec toi; ne promène pas des regards inquiets, car je suis ton Dieu.', ref: 'Ésaïe 41:10' },
    { text: 'Cherchez premièrement le royaume et la justice de Dieu; et toutes ces choses vous seront données par-dessus.', ref: 'Matthieu 6:33' },
    { text: 'L\'Éternel est mon berger: je ne manquerai de rien.', ref: 'Psaume 23:1' },
    { text: 'Sachez que je suis avec vous tous les jours, jusqu\'à la fin du monde.', ref: 'Matthieu 28:20' },
]
let verseIndex = 0
function rotateVerse() {
    const el = document.getElementById('dailyVerse')
    const ref = document.getElementById('dailyVerseRef')
    if (!el || !ref) return
    verseIndex = (verseIndex + 1) % verses.length
    el.style.opacity = '0'
    ref.style.opacity = '0'
    setTimeout(() => {
        el.textContent = '« ' + verses[verseIndex].text + ' »'
        ref.textContent = '— ' + verses[verseIndex].ref
        el.style.opacity = '1'
        ref.style.opacity = '1'
    }, 400)
}

// ─── Newsletter ───
function handleNewsletter(e) {
    e.preventDefault()
    const email = document.getElementById('newsletterEmail').value
    if (!email) return
    alert('Merci pour votre inscription, ' + email + ' ! Vous recevrez nos prochaines actualités.')
    document.getElementById('newsletterEmail').value = ''
}

// ─── PDF Viewer ───
let pdfDoc = null, pageNum = 1, pageIsRendering = false, pageNumPending = null, currentScale = 1.5
const canvas = document.getElementById('pdfCanvas')
const ctx = canvas?.getContext('2d')

async function openPDF(url) {
    window._currentPdfUrl = url
    const overlay = document.getElementById('pdf-viewer-overlay')
    overlay.style.display = 'flex'
    try {
        pdfDoc = await pdfjsLib.getDocument(url).promise
        document.getElementById('pageCount').textContent = pdfDoc.numPages
        pageNum = 1
        renderPdfPage(pageNum)
    } catch (e) {
        console.error(e)
        alert('Impossible de charger le PDF.')
        closePdfViewer()
    }
}

async function renderPdfPage(num) {
    if (!pdfDoc) return
    pageIsRendering = true
    const page = await pdfDoc.getPage(num)
    const viewport = page.getViewport({ scale: currentScale })
    canvas.height = viewport.height
    canvas.width = viewport.width
    await page.render({ canvasContext: ctx, viewport }).promise
    pageIsRendering = false
    document.getElementById('pageNumber').textContent = num
    if (pageNumPending !== null) { renderPdfPage(pageNumPending); pageNumPending = null }
}
function queueRenderPage(num) { pageIsRendering ? (pageNumPending = num) : renderPdfPage(num) }
function showPrevPdfPage() { if (pageNum > 1) { pageNum--; queueRenderPage(pageNum) } }
function showNextPdfPage() { if (pdfDoc && pageNum < pdfDoc.numPages) { pageNum++; queueRenderPage(pageNum) } }
function zoomIn() { if (currentScale < 3) { currentScale += 0.25; renderPdfPage(pageNum) } }
function zoomOut() { if (currentScale > 0.25) { currentScale -= 0.25; renderPdfPage(pageNum) } }
function closePdfViewer() {
    document.getElementById('pdf-viewer-overlay').style.display = 'none'
    pdfDoc = null; currentScale = 1.5
}

function esc(s) {
    if (typeof s !== 'string') return ''
    return s.replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]))
}

// ─── Testimonials ───
async function loadTestimonials() {
    const list = document.getElementById('testimonialsList')
    if (!list) return
    try {
        const res = await fetch('assets/data/testimonials.json')
        if (!res.ok) throw new Error('Not found')
        const data = await res.json()
        if (!data || !data.length) {
            list.innerHTML = '<p class="testimonials-empty">Soyez le premier à témoigner !</p>'
            return
        }
        list.innerHTML = data.map(t => `
            <div class="testimonial-card">
                <div class="testimonial-stars">★★★★★</div>
                <p class="testimonial-text">"${esc(t.message)}"</p>
                <div class="testimonial-author">
                    <span class="testimonial-name">${esc(t.nom)}</span>
                    <span class="testimonial-date">${t.date}</span>
                </div>
            </div>
        `).join('')
    } catch (e) {
        list.innerHTML = '<p class="testimonials-empty">Impossible de charger les témoignages.</p>'
    }
}

// ─── Donation progress ───
// Simulate a dynamic progress (stored in localStorage to persist)
function updateDonationProgress() {
    let current = parseInt(localStorage.getItem('donationTotal') || '0')
    const target = 150000
    const pct = Math.min(100, (current / target) * 100)
    const fill = document.getElementById('progressFill')
    const display = document.getElementById('donationCurrent')
    if (fill) fill.style.width = pct + '%'
    if (display) display.textContent = current.toLocaleString()
}

// Call this on load and after donations
document.addEventListener('DOMContentLoaded', () => {
    updateDonationProgress()
    // Simulate: increment by random amount periodically to show progress is alive
    setInterval(() => {
        let c = parseInt(localStorage.getItem('donationTotal') || '0')
        localStorage.setItem('donationTotal', String(c + Math.floor(Math.random() * 500)))
        updateDonationProgress()
    }, 300000) // every 5 minutes
})

// Add verse transition styles
const style = document.createElement('style')
style.textContent = `#dailyVerse, #dailyVerseRef { transition: opacity 0.4s ease; }`
document.head.appendChild(style)
