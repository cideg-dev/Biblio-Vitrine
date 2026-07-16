let allPdfs = []
let filteredPdfs = []
let currentPage = 1
let currentCategory = 'Toutes'
let currentSort = 'defaut'
const itemsPerPage = 12
const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
const PDF_BASE = 'assets/documents/'
const thumbCache = new Map()

document.addEventListener('DOMContentLoaded', () => {
  initNav()
  initBackToTop()
  loadConfig()
  loadAndDisplayPDFs()
  initSearch()
  initPdfViewer()
  initDonateAmounts()
  initNewsletter()
  loadTestimonials()
  loadDonationGoal()
  initScrollAnimations()
  initThemeToggle()
  initSkipLink()
  initSmoothScroll()
  initSort()
  initSurprise()
  initViewToggle()
  initAuthorFilter()
  // initHomeContent sera appelé après chargement des PDFs

})

// ─── Config ───
async function loadConfig() {
  try {
    const res = await fetch('assets/data/config.json')
    if (!res.ok) return
    const cfg = await res.json()
    if (cfg.googleAnalyticsId && cfg.googleAnalyticsId !== 'G-XXXXXXXXXX') {
      document.querySelectorAll('script[src*="googletagmanager"]').forEach(s => {
        s.src = s.src.replace('G-XXXXXXXXXX', cfg.googleAnalyticsId)
      })
      window.gtag && gtag('config', cfg.googleAnalyticsId)
    }
  } catch {}
}

// ─── Navigation ───
function initNav() {
  const hamburger = document.querySelector('.hamburger')
  const navMenu = document.querySelector('.nav-menu')
  if (!hamburger) return
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active')
    navMenu.classList.toggle('active')
  })
  document.querySelectorAll('.nav-link').forEach(n => n.addEventListener('click', () => {
    hamburger.classList.remove('active')
    navMenu.classList.remove('active')
  }))
}

function initBackToTop() {
  const btn = document.getElementById('backToTop')
  if (!btn) return
  window.addEventListener('scroll', () => btn.classList.toggle('visible', window.scrollY > 400))
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }))
}

// ─── Theme Toggle ───
function initThemeToggle() {
  const btn = document.getElementById('themeToggle')
  if (!btn) return
  const saved = localStorage.getItem('theme')
  if (saved === 'light') document.body.classList.add('light-mode')
  btn.setAttribute('aria-label', document.body.classList.contains('light-mode') ? 'Mode sombre' : 'Mode clair')
  btn.innerHTML = document.body.classList.contains('light-mode') ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>'
  btn.addEventListener('click', () => {
    document.body.classList.toggle('light-mode')
    const isLight = document.body.classList.contains('light-mode')
    localStorage.setItem('theme', isLight ? 'light' : 'dark')
    btn.setAttribute('aria-label', isLight ? 'Mode sombre' : 'Mode clair')
    btn.innerHTML = isLight ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>'
  })
}

// ─── Skip Link ───
function initSkipLink() {
  const skip = document.getElementById('skipLink')
  if (!skip) return
  skip.addEventListener('click', e => {
    e.preventDefault()
    const main = document.querySelector('main')
    if (main) { main.setAttribute('tabindex', '-1'); main.focus() }
  })
}

// ─── Smooth Scroll ───
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const href = a.getAttribute('href')
      if (href === '#') return
      e.preventDefault()
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
    })
  })
}

// ─── Scroll Animations ───
function initScrollAnimations() {
  if (!('IntersectionObserver' in window)) return
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible')
        observer.unobserve(entry.target)
      }
    })
  }, { threshold: 0.1 })
  document.querySelectorAll('.anim-fade').forEach(el => observer.observe(el))
}

// ─── Surprise Button ───
function initSurprise() {
  const btn = document.getElementById('surpriseBtn')
  if (!btn) return
  btn.addEventListener('click', () => {
    if (!allPdfs.length) return
    const idx = Math.floor(Math.random() * allPdfs.length)
    const pdf = allPdfs[idx]
    const fileUrl = PDF_BASE + pdf.nom_du_fichier
    openPDF(fileUrl)
  })
}

// ─── View Toggle ───
function initViewToggle() {
  const grid = document.getElementById('gridViewBtn')
  const list = document.getElementById('listViewBtn')
  if (!grid || !list) return
  grid.addEventListener('click', () => {
    grid.classList.add('active'); list.classList.remove('active')
    document.getElementById('pdfList').classList.remove('list-view')
  })
  list.addEventListener('click', () => {
    list.classList.add('active'); grid.classList.remove('active')
    document.getElementById('pdfList').classList.add('list-view')
  })
}

// ─── Author Filter ───
function initAuthorFilter() {
  const sel = document.getElementById('authorFilter')
  if (!sel) return
  setTimeout(() => {
    const authors = [...new Set(allPdfs.map(p => p.auteur).filter(Boolean))]
    authors.sort()
    sel.innerHTML = '<option value="">Tous les auteurs</option>' + authors.map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join('')
  }, 500)
  sel.addEventListener('change', () => {
    currentPage = 1
    filterAndSort()
  })
}

// ─── Home Content (accueil.json) ───
function initHomeContent() {
  fetch('assets/data/accueil.json').then(r => r.ok ? r.json() : null).then(d => {
    if (!d) return
    const badge = document.querySelector('.hero-badge')
    const title = document.querySelector('.hero-content h1')
    const subtitle = document.querySelector('.hero-subtitle')
    const missionTitle = document.querySelector('#apropos h2')
    const missionSub = document.querySelector('#apropos .section-subtitle')
    const donateTitle = document.querySelector('#soutenir h2')
    const donateSub = document.querySelector('#soutenir .section-subtitle')
    const newsletterTitle = document.querySelector('.newsletter-card h2')
    const newsletterText = document.querySelector('.newsletter-card p')
    const impacts = document.querySelector('.impact-list')

    if (badge && d.heroBadge) badge.textContent = d.heroBadge
    if (title && d.heroTitle) title.innerHTML = d.heroTitle.replace(/\n/g, '<br>').replace('à portée de tous', '<span class="highlight">à portée de tous</span>')
    if (subtitle && d.heroSubtitle) subtitle.innerHTML = d.heroSubtitle.replace('%count%', allPdfs.length)
    if (missionTitle && d.missionTitle) missionTitle.textContent = d.missionTitle
    if (missionSub && d.missionSubtitle) missionSub.textContent = d.missionSubtitle
    if (donateTitle && d.donateTitle) donateTitle.textContent = d.donateTitle
    if (donateSub && d.donateSubtitle) donateSub.textContent = d.donateSubtitle
    if (newsletterTitle && d.newsletterTitle) newsletterTitle.textContent = d.newsletterTitle
    if (newsletterText && d.newsletterText) newsletterText.textContent = d.newsletterText
    if (impacts && d.donateImpact) {
      impacts.innerHTML = d.donateImpact.map(item => `<li><i class="fas fa-check-circle" aria-hidden="true"></i> ${item}</li>`).join('')
    }
  }).catch(() => {})
}

// ─── Data Loading ───
async function loadAndDisplayPDFs() {
  showSkeletonLoader()
  try {
    const res = await fetch('assets/documents/liste-pdfs.json')
    if (!res.ok) throw new Error('Network error')
    allPdfs = await res.json()
    filteredPdfs = [...allPdfs]
    document.getElementById('totalPdfCount').textContent = allPdfs.length
    document.querySelectorAll('.pdf-count-hero').forEach(el => el.textContent = allPdfs.length + '+')
  renderCategories()
  render()
  // Populate author filter now that allPdfs is loaded
  const authSel = document.getElementById('authorFilter')
  if (authSel) {
    const authors = [...new Set(allPdfs.map(p => p.auteur).filter(Boolean))]
    authors.sort()
    authSel.innerHTML = '<option value="">Tous les auteurs</option>' + authors.map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join('')
  }
  // Update home content now that count is known
  initHomeContent()
  } catch (e) {
    console.error(e)
    document.getElementById('pdfList').innerHTML = '<p class="error-message">Impossible de charger la bibliothèque.</p>'
  }
}

function showSkeletonLoader() {
  const container = document.getElementById('pdfList')
  if (!container) return
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

// ─── Catégories ───
function renderCategories() {
  const container = document.getElementById('categoryFilter')
  if (!container) return
  const cats = ['Toutes', ...new Set(allPdfs.map(p => p.categorie || 'Non classé').filter(Boolean))]
  container.innerHTML = cats.map(c =>
    `<button class="cat-btn ${c === currentCategory ? 'active' : ''}" data-cat="${c}" role="tab" aria-selected="${c === currentCategory}">${esc(c)}</button>`
  ).join('')
  container.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.cat-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false') })
      btn.classList.add('active')
      btn.setAttribute('aria-selected', 'true')
      currentCategory = btn.dataset.cat
      currentPage = 1
      filterAndSort()
    })
  })
}

// ─── Sort ───
function initSort() {
  const sel = document.getElementById('sortSelect')
  if (!sel) return
  sel.addEventListener('change', () => {
    currentSort = sel.value
    currentPage = 1
    filterAndSort()
  })
}

function filterAndSort() {
  let list = [...allPdfs]
  if (currentCategory !== 'Toutes') {
    list = list.filter(p => (p.categorie || 'Non classé') === currentCategory)
  }
  const authorFilter = document.getElementById('authorFilter')
  if (authorFilter && authorFilter.value) {
    list = list.filter(p => (p.auteur || '') === authorFilter.value)
  }
  switch (currentSort) {
    case 'alpha-asc': list.sort((a, b) => (a.titre || a.nom_du_fichier).localeCompare(b.titre || b.nom_du_fichier)); break
    case 'alpha-desc': list.sort((a, b) => (b.titre || b.nom_du_fichier).localeCompare(a.titre || a.nom_du_fichier)); break
    case 'newest': list.sort((a, b) => (b.numero || 0) - (a.numero || 0)); break
  }
  filteredPdfs = list
  render()
}

// ─── Render ───
function render() {
  renderPdfGrid()
  renderPagination()
}

function renderPdfGrid() {
  const container = document.getElementById('pdfList')
  if (!container) return
  container.innerHTML = ''
  if (!filteredPdfs.length) {
    container.innerHTML = '<p class="error-message" role="status">Aucun résultat trouvé.</p>'
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
    const author = pdf.auteur || ''
    const cat = pdf.categorie || ''
    const fileUrl = PDF_BASE + pdf.nom_du_fichier
    card.innerHTML = `
      <div class="pdf-thumbnail" id="thumb-${i}">
        <div class="thumb-placeholder"><i class="fas fa-book"></i></div>
        <canvas class="thumb-canvas" hidden></canvas>
      </div>
      <div class="pdf-info">
        <div class="pdf-title">${esc(title)}</div>
        ${author ? `<div class="pdf-author"><i class="fas fa-user"></i> ${esc(author)}</div>` : ''}
        ${cat ? `<span class="pdf-cat-tag">${esc(cat)}</span>` : ''}
        <div class="pdf-description">${esc(desc)}</div>
        <div class="pdf-actions-row">
          <button class="pdf-read-btn" data-url="${esc(fileUrl)}" aria-label="Lire ${esc(title)}"><i class="fas fa-book-open"></i> Lire</button>
          <a href="${esc(fileUrl)}" download class="pdf-dl-btn" title="Télécharger ${esc(title)}" aria-label="Télécharger ${esc(title)}"><i class="fas fa-download"></i></a>
        </div>
      </div>`
    const readBtn = card.querySelector('.pdf-read-btn')
    readBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      openPDF(fileUrl)
    })
    const dlBtn = card.querySelector('.pdf-dl-btn')
    if (dlBtn) dlBtn.addEventListener('click', () => trackDownload(pdf.nom_du_fichier))
    container.appendChild(card)
    loadThumbnail(pdf.nom_du_fichier, i)
  })
}

// ─── PDF Thumbnails (lazy avec IntersectionObserver) ───
function loadThumbnail(filename, idx) {
  const placeholder = document.getElementById('thumb-' + idx)
  if (!placeholder) return
  if (thumbCache.has(filename)) {
    const dataUrl = thumbCache.get(filename)
    placeholder.innerHTML = `<img src="${dataUrl}" alt="" class="pdf-thumb-img" loading="lazy">`
    return
  }
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          obs.unobserve(entry.target)
          renderThumbnail(filename, placeholder)
        }
      })
    }, { rootMargin: '200px' })
    obs.observe(placeholder)
  } else {
    renderThumbnail(filename, placeholder)
  }
}

function renderThumbnail(filename, placeholder) {
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
  if (!container) return
  container.innerHTML = ''
  const pages = Math.ceil(filteredPdfs.length / itemsPerPage)
  if (pages <= 1) return
  const append = (el) => container.appendChild(el)
  const prev = document.createElement('button')
  prev.innerHTML = '<i class="fas fa-chevron-left"></i>'
  prev.disabled = currentPage === 1
  prev.setAttribute('aria-label', 'Page précédente')
  prev.addEventListener('click', () => { currentPage--; render() })
  append(prev)
  let start = Math.max(1, currentPage - 2)
  let end = Math.min(pages, currentPage + 2)
  if (currentPage <= 3) { start = 1; end = Math.min(5, pages) }
  if (currentPage > pages - 3) { start = Math.max(1, pages - 4); end = pages }
  if (start > 1) {
    const b = document.createElement('button'); b.textContent = '1'; b.setAttribute('aria-label', 'Page 1'); b.addEventListener('click', () => { currentPage = 1; render() }); append(b)
    if (start > 2) { const s = document.createElement('span'); s.textContent = '…'; s.setAttribute('aria-hidden', 'true'); append(s) }
  }
  for (let i = start; i <= end; i++) {
    const b = document.createElement('button'); b.textContent = i
    if (i === currentPage) { b.className = 'active'; b.setAttribute('aria-current', 'page') }
    b.setAttribute('aria-label', `Page ${i}`)
    b.addEventListener('click', () => { currentPage = i; render() }); append(b)
  }
  if (end < pages) {
    if (end < pages - 1) { const s = document.createElement('span'); s.textContent = '…'; s.setAttribute('aria-hidden', 'true'); append(s) }
    const b = document.createElement('button'); b.textContent = pages; b.setAttribute('aria-label', `Page ${pages}`)
    b.addEventListener('click', () => { currentPage = pages; render() }); append(b)
  }
  const next = document.createElement('button')
  next.innerHTML = '<i class="fas fa-chevron-right"></i>'
  next.disabled = currentPage === pages
  next.setAttribute('aria-label', 'Page suivante')
  next.addEventListener('click', () => { currentPage++; render() })
  append(next)
}

// ─── Search ───
function initSearch() {
  const searchInput = document.getElementById('searchInput')
  if (!searchInput) return
  searchInput.addEventListener('input', debounce(handleSearch, 300))
}

function handleSearch(e) {
  const term = e.target.value.toLowerCase()
  filteredPdfs = allPdfs.filter(p => {
    const t = (p.titre || p.nom_du_fichier).toLowerCase()
    const d = (p.description || '').toLowerCase()
    const a = (p.auteur || '').toLowerCase()
    const c = (p.categorie || '').toLowerCase()
    return t.includes(term) || d.includes(term) || a.includes(term) || c.includes(term)
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
// Start rotation after DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const v = document.getElementById('dailyVerse')
  if (v) setInterval(rotateVerse, 8000)
})

// ─── Newsletter ───
function initNewsletter() {
  document.getElementById('newsletterForm')?.addEventListener('submit', handleNewsletter)
}
function handleNewsletter(e) {
  e.preventDefault()
  const email = document.getElementById('newsletterEmail').value
  if (!email) return
  alert('Merci pour votre inscription, ' + email + ' ! Vous recevrez nos prochaines actualités.')
  document.getElementById('newsletterEmail').value = ''
}

// ─── PDF Viewer ───
function initPdfViewer() {
  document.getElementById('prevPage')?.addEventListener('click', showPrevPdfPage)
  document.getElementById('nextPage')?.addEventListener('click', showNextPdfPage)
  document.getElementById('zoomIn')?.addEventListener('click', zoomIn)
  document.getElementById('zoomOut')?.addEventListener('click', zoomOut)
  document.getElementById('fullscreenBtn')?.addEventListener('click', toggleFullscreen)
  document.getElementById('back-to-library')?.addEventListener('click', closePdfViewer)
  document.getElementById('downloadPdfBtn')?.addEventListener('click', () => {
    const url = window._currentPdfUrl
    if (!url) return
    const a = document.createElement('a')
    a.href = url; a.download = ''; document.body.appendChild(a); a.click(); document.body.removeChild(a)
  })
  // Keyboard navigation
  document.addEventListener('keydown', e => {
    const overlay = document.getElementById('pdf-viewer-overlay')
    if (!overlay || overlay.style.display !== 'flex') return
    if (e.key === 'Escape') closePdfViewer()
    if (e.key === 'ArrowLeft') showPrevPdfPage()
    if (e.key === 'ArrowRight') showNextPdfPage()
    if (e.key === '+' || e.key === '=') zoomIn()
    if (e.key === '-') zoomOut()
  })
  // Touch swipe
  const container = document.getElementById('pdf-canvas-container')
  if (container && window.Hammer) {
    const hammer = new Hammer(container)
    hammer.on('swipeleft', showNextPdfPage)
    hammer.on('swiperight', showPrevPdfPage)
  }
}

let pdfDoc = null, pageNum = 1, pageIsRendering = false, pageNumPending = null, currentScale = 1.5
const canvas = document.getElementById('pdfCanvas')
const ctx = canvas?.getContext('2d')

function setDesktopControlsVisible(visible) {
  document.getElementById('prevPage').style.display = visible ? '' : 'none'
  document.getElementById('nextPage').style.display = visible ? '' : 'none'
  document.getElementById('pageInfo').style.display = visible ? '' : 'none'
  document.getElementById('zoomIn').style.display = visible ? '' : 'none'
  document.getElementById('zoomOut').style.display = visible ? '' : 'none'
  document.getElementById('fullscreenBtn').style.display = visible ? '' : 'none'
  document.getElementById('pdf-canvas-container').style.display = visible ? '' : 'none'
  document.getElementById('pdfMobileContainer').style.display = visible ? 'none' : ''
}

async function openPDF(url) {
  window._currentPdfUrl = url
  const overlay = document.getElementById('pdf-viewer-overlay')
  overlay.style.display = 'flex'
  overlay.focus()
  if (isMobile) {
    setDesktopControlsVisible(false)
    const embed = document.getElementById('pdfEmbed')
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Network error')
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      window._currentBlobUrl = blobUrl
      embed.src = blobUrl
    } catch (e) {
      console.error(e)
      alert('Impossible de charger le PDF.')
      closePdfViewer()
    }
  } else {
    setDesktopControlsVisible(true)
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
function toggleFullscreen() {
  const container = document.getElementById('pdf-canvas-container')
  const btn = document.getElementById('fullscreenBtn')
  if (!document.fullscreenElement) {
    container.requestFullscreen?.()
    btn.innerHTML = '<i class="fas fa-compress"></i>'
  } else {
    document.exitFullscreen?.()
    btn.innerHTML = '<i class="fas fa-expand"></i>'
  }
}
document.addEventListener('fullscreenchange', () => {
  const btn = document.getElementById('fullscreenBtn')
  if (btn) btn.innerHTML = document.fullscreenElement ? '<i class="fas fa-compress"></i>' : '<i class="fas fa-expand"></i>'
})

function closePdfViewer() {
  document.getElementById('pdf-viewer-overlay').style.display = 'none'
  document.getElementById('pdfEmbed').src = ''
  if (window._currentBlobUrl) { URL.revokeObjectURL(window._currentBlobUrl); window._currentBlobUrl = null }
  setDesktopControlsVisible(true)
  pdfDoc = null; currentScale = 1.5
}

function esc(s) {
  if (typeof s !== 'string') return ''
  return s.replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]))
}

// ─── Donate Amounts ───
function initDonateAmounts() {
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
  const firstAmount = document.querySelector('.amount-btn')
  if (firstAmount) firstAmount.click()
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
        <div class="testimonial-stars" aria-label="5 étoiles">★★★★★</div>
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
async function loadDonationGoal() {
  const section = document.querySelector('.donate-goal')
  if (!section) return
  try {
    const res = await fetch('assets/data/donation-goal.json')
    if (!res.ok) throw new Error('Not found')
    const data = await res.json()
    const fill = document.getElementById('progressFill')
    const display = document.getElementById('donationCurrent')
    if (fill) fill.style.width = Math.min(100, (data.current / data.target) * 100) + '%'
    if (display) display.textContent = (data.current || 0).toLocaleString()
    section.style.display = data.show ? '' : 'none'
  } catch (e) {
    if (section) section.style.display = 'none'
  }
}

// ─── Verse transition styles ───
// ─── Download Stats ───
function trackDownload(filename) {
  try {
    const stats = JSON.parse(localStorage.getItem('downloadStats') || '{}')
    stats[filename] = (stats[filename] || 0) + 1
    localStorage.setItem('downloadStats', JSON.stringify(stats))
  } catch {}
}

const style = document.createElement('style')
style.textContent = `#dailyVerse, #dailyVerseRef { transition: opacity 0.4s ease; }`
document.head.appendChild(style)
