let allPdfs = []
let filteredPdfs = []
let currentPage = 1
let currentCategory = 'Toutes'
let currentSort = 'defaut'
const itemsPerPage = 12
const PDF_BASE = 'assets/documents/'
const thumbCache = new Map()
let deferredPwaPrompt = null
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault()
  deferredPwaPrompt = e
  const btn = document.getElementById('installPwaBtn')
  if (btn) btn.style.display = 'flex'
})
// Fallback: show install button on mobile even if beforeinstallprompt never fired
setTimeout(() => {
  const btn = document.getElementById('installPwaBtn')
  if (!btn || btn.style.display === 'flex') return
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
  if (isMobile && !isStandalone) btn.style.display = 'flex'
}, 3000)

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
  initAppVersion()
  initThemeToggle()
  initSkipLink()
  initSmoothScroll()
  initSort()
  initSurprise()
  initViewToggle()
  initAuthorFilter()
  // initHomeContent sera appelé après chargement des PDFs
  // Préchargement de pdf.js en arrière-plan pour les vignettes
  loadPdfJs().catch(() => {})
  initPwaInstall()
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

// ─── App Version ───
function initAppVersion() {
  fetch('assets/data/version.json').then(r => r.ok ? r.json() : null).then(d => {
    if (!d) return
    const el = document.getElementById('appVersion')
    if (el) el.textContent = d.version
  }).catch(() => {})
}

// ─── Theme Toggle ───
function initThemeToggle() {
  const btn = document.getElementById('themeToggle')
  if (!btn) return
  const saved = localStorage.getItem('theme')
  const modes = ['dark', 'light', 'auto']
  const icons = ['fa-moon', 'fa-sun', 'fa-circle-half-stroke']
  const labels = ['Mode sombre', 'Mode clair', 'Mode auto']
  let idx = saved === 'light' ? 1 : saved === 'auto' ? 2 : 0
  if (idx === 0) document.body.classList.remove('light-mode', 'auto-theme')
  if (idx === 1) document.body.classList.add('light-mode')
  if (idx === 2) { document.body.classList.add('auto-theme'); initAutoTheme() }
  btn.setAttribute('aria-label', labels[idx])
  btn.innerHTML = `<i class="fas ${icons[idx]}"></i>`
  btn.addEventListener('click', () => {
    idx = (idx + 1) % 3
    localStorage.setItem('theme', modes[idx])
    document.body.classList.remove('light-mode', 'auto-theme')
    if (idx === 1) document.body.classList.add('light-mode')
    if (idx === 2) { document.body.classList.add('auto-theme'); initAutoTheme() }
    btn.setAttribute('aria-label', labels[idx])
    btn.innerHTML = `<i class="fas ${icons[idx]}"></i>`
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
  initContinueReading()
  initFavorites()
  initNewReleases()
  initShareButtons()
  handleDirectLink()
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
    case 'popular': list.sort((a, b) => (getDownloadCount(b.nom_du_fichier) || 0) - (getDownloadCount(a.nom_du_fichier) || 0)); break
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
    const fav = isFavorite(pdf.nom_du_fichier)
    const dlCount = getDownloadCount(pdf.nom_du_fichier)
    const isNew = isNewPdf(pdf)
    card.innerHTML = `
      <div class="pdf-thumbnail" id="thumb-${i}">
        <div class="thumb-placeholder"><i class="fas fa-book"></i></div>
        <canvas class="thumb-canvas" hidden></canvas>
        ${isNew ? '<span class="new-badge">Nouveau</span>' : ''}
        <button class="pdf-fav-btn ${fav ? 'active' : ''}" data-filename="${esc(pdf.nom_du_fichier)}" aria-label="${fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}"><i class="fa${fav ? 's' : 'r'} fa-heart"></i></button>
      </div>
      <div class="pdf-info">
        <div class="pdf-title">${esc(title)}</div>
        ${author ? `<div class="pdf-author"><i class="fas fa-user"></i> ${esc(author)}</div>` : ''}
        ${cat ? `<span class="pdf-cat-tag">${esc(cat)}</span>` : ''}
        <div class="pdf-description">${esc(desc)}</div>
        <div class="pdf-actions-row">
          <button class="pdf-read-btn" data-url="${esc(fileUrl)}" aria-label="Lire ${esc(title)}"><i class="fas fa-book-open"></i> Lire</button>
          <button class="pdf-dl-btn share-btn" data-url="${esc(fileUrl)}" data-title="${esc(title)}" title="Partager" aria-label="Partager ${esc(title)}"><i class="fas fa-share-alt"></i></button>
          <a href="${esc(fileUrl)}" download class="pdf-dl-btn" title="Télécharger ${esc(title)}" aria-label="Télécharger ${esc(title)}"><i class="fas fa-download"></i></a>
          ${dlCount > 0 ? `<span class="dl-count" title="Téléchargé ${dlCount} fois"><i class="fas fa-download"></i> ${dlCount}</span>` : ''}
        </div>
      </div>`
    const readBtn = card.querySelector('.pdf-read-btn')
    readBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      openPDF(fileUrl)
    })
    const dlBtn = card.querySelector('.pdf-dl-btn[download]')
    if (dlBtn) dlBtn.addEventListener('click', () => trackDownload(pdf.nom_du_fichier))
    const favBtn = card.querySelector('.pdf-fav-btn')
    if (favBtn) favBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleFavorite(pdf.nom_du_fichier); initFavorites() })
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
  if (!pdfjsLib) return
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

// ─── Continue Reading ───
function initContinueReading() {
  const section = document.getElementById('continue-reading')
  const list = document.getElementById('continueList')
  if (!section || !list) return
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('reading_'))
    if (!keys.length) return
    const entries = keys.map(k => {
      const url = atob(k.replace('reading_', ''))
      const page = parseInt(localStorage.getItem(k)) || 1
      const pdf = allPdfs.find(p => url.endsWith(p.nom_du_fichier))
      return { url, page, pdf, time: parseInt(localStorage.getItem(k + '_time') || '0') }
    }).filter(e => e.pdf).sort((a, b) => b.time - a.time).slice(0, 5)
    if (!entries.length) return
    section.style.display = ''
    list.innerHTML = entries.map(e => {
      const title = e.pdf.titre || e.pdf.nom_du_fichier.replace('.pdf', '').replace(/_/g, ' ')
      return `<div class="continue-card anim-fade visible">
        <div class="continue-info">
          <div class="continue-title">${esc(title)}</div>
          <div class="continue-meta">Page ${e.page} sur ${e.pdf.numero || '?'}</div>
        </div>
        <button class="pdf-read-btn continue-resume" data-url="${esc(e.url)}" data-page="${e.page}"><i class="fas fa-book-open"></i> Reprendre</button>
      </div>`
    }).join('')
    list.querySelectorAll('.continue-resume').forEach(btn => {
      btn.addEventListener('click', () => openPDF(btn.dataset.url, parseInt(btn.dataset.page)))
    })
  } catch {}
}

function saveReadingProgress(url, page) {
  try {
    const key = 'reading_' + btoa(url)
    localStorage.setItem(key, page.toString())
    localStorage.setItem(key + '_time', Date.now().toString())
  } catch {}
}

let pdfjsLib = null

async function loadPdfJs() {
  if (pdfjsLib) return
  await new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    script.onload = () => {
      pdfjsLib = window.pdfjsLib
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      resolve()
    }
    script.onerror = reject
    document.head.appendChild(script)
  })
}

// ─── PDF Viewer ───
function initPdfViewer() {
  document.getElementById('prevPage')?.addEventListener('click', showPrevPdfPage)
  document.getElementById('nextPage')?.addEventListener('click', showNextPdfPage)
  document.getElementById('zoomIn')?.addEventListener('click', zoomIn)
  document.getElementById('zoomOut')?.addEventListener('click', zoomOut)
  document.getElementById('fullscreenBtn')?.addEventListener('click', toggleFullscreen)
  document.getElementById('scrollModeToggle')?.addEventListener('click', toggleScrollMode)
  document.getElementById('readingModeBtn')?.addEventListener('click', toggleReadingMode)
  document.getElementById('bookmarkBtn')?.addEventListener('click', toggleBookmark)
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
    if (e.key === '?') toggleShortcutHelp()
    if (e.key === 'm' || e.key === 'M') toggleReadingMode()
    if (e.key === 'b' || e.key === 'B') toggleBookmark()
    if (e.key === 'g' || e.key === 'G') gotoPageDialog()
    if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault()
      document.getElementById('pdfSearchInput')?.focus()
    }
  })
  // Touch swipe + pinch
  const container = document.getElementById('pdf-canvas-container')
  if (container && window.Hammer) {
    const hammer = new Hammer(container)
    hammer.get('pinch').set({ enable: true })
    hammer.on('swipeleft', showNextPdfPage)
    hammer.on('swiperight', showPrevPdfPage)
    let lastScale = 1
    hammer.on('pinchstart', () => { lastScale = currentScale })
    hammer.on('pinchmove', (e) => {
      const newScale = Math.min(3, Math.max(0.25, lastScale * e.scale))
      if (Math.abs(newScale - currentScale) > 0.08) {
        currentScale = Math.round(newScale * 100) / 100
        pageCache.clear()
        isScrollMode ? renderScrollMode() : renderPdfPage(pageNum)
      }
    })
    hammer.on('swipedown', () => { if (isScrollMode) return; showNextPdfPage() })
    hammer.on('swipeup', () => { if (isScrollMode) return; showPrevPdfPage() })
  }
  // Double-click/double-tap zoom
  container?.addEventListener('dblclick', (e) => {
    if (currentScale < 1.8) { currentScale = 2.5 } else { currentScale = 1.2 }
    pageCache.clear(); isScrollMode ? renderScrollMode() : renderPdfPage(pageNum)
  })
  // Page slider (throttled)
  const pageSlider = document.getElementById('pageSlider')
  let sliderPending = null
  pageSlider?.addEventListener('input', () => {
    const target = parseInt(pageSlider.value)
    document.getElementById('pageLabel').textContent = target
    updateProgressBar()
    sliderPending = target
  })
  pageSlider?.addEventListener('change', () => {
    if (!sliderPending || !pdfDoc) return
    const target = sliderPending
    if (target < 1 || target > pdfDoc.numPages) return
    if (isScrollMode) {
      const c = container?.querySelector('[data-page="' + target + '"]')
      if (c) { c.scrollIntoView({ behavior: 'smooth', block: 'start' }); pageNum = target }
    } else {
      pageNum = target; queueRenderPage(pageNum)
    }
    sliderPending = null
  })
  document.querySelector('.keyhint')?.addEventListener('click', toggleShortcutHelp)
  document.getElementById('shareBtn')?.addEventListener('click', sharePdf)
  document.getElementById('closeSidebar')?.addEventListener('click', () => document.getElementById('pdfSidebar').style.display = 'none')
  document.getElementById('fitModeBtn')?.addEventListener('click', toggleFitMode)
  document.getElementById('reflowModeBtn')?.addEventListener('click', toggleReflowMode)
  document.getElementById('ttsBtn')?.addEventListener('click', toggleTts)
  document.getElementById('exportTxtBtn')?.addEventListener('click', exportPdfAsTxt)
  document.getElementById('tocBtn')?.addEventListener('click', () => {
    const sidebar = document.getElementById('tocSidebar')
    if (sidebar) { sidebar.style.display = sidebar.style.display === 'flex' ? 'none' : 'flex'; loadPdfOutline() }
  })
  document.getElementById('closeTocSidebar')?.addEventListener('click', () => document.getElementById('tocSidebar').style.display = 'none')
  initPdfSearch()
}

let pdfDoc = null, pageNum = 1, pageIsRendering = false, pageNumPending = null, currentScale = 1.5, isScrollMode = false
const canvas = document.getElementById('pdfCanvas')
const ctx = canvas?.getContext('2d')
const pageCache = new Map()
const CACHE_MAX = 10
let scrollCanvases = []

function setDesktopControlsVisible() {
  document.getElementById('prevPage').style.display = isScrollMode ? 'none' : ''
  document.getElementById('nextPage').style.display = isScrollMode ? 'none' : ''
  document.getElementById('pageInfo').style.display = ''
  document.getElementById('zoomIn').style.display = ''
  document.getElementById('zoomOut').style.display = ''
  document.getElementById('fullscreenBtn').style.display = ''
  document.getElementById('pdf-canvas-container').style.display = ''
}

async function openPDF(url, targetPage) {
  window._currentPdfUrl = url
  const loadingEl = document.getElementById('pdfLoadingIndicator')
  if (loadingEl) loadingEl.style.display = 'flex'
  const overlay = document.getElementById('pdf-viewer-overlay')
  overlay.style.display = 'flex'
  overlay.focus()
  isScrollMode = false
  scrollCanvases = []
  setDesktopControlsVisible()
  try {
    await loadPdfJs()
    document.getElementById('pdf-viewer-controls')?.classList.remove('hidden')
    pdfDoc = await pdfjsLib.getDocument(url).promise
    document.getElementById('pageCount').textContent = pdfDoc.numPages
    const saved = getReadingProgress(url)
    pageNum = targetPage || (saved > 0 && saved <= pdfDoc.numPages ? saved : 1)
    loadZoomForDoc(url)
    renderPdfPage(pageNum)
    // Auto-fullscreen on mobile
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && !document.fullscreenElement) {
      setTimeout(() => { document.getElementById('pdf-canvas-container')?.requestFullscreen?.().catch(() => {}) }, 500)
    }
    const slider = document.getElementById('pageSlider')
    if (slider) { slider.max = pdfDoc.numPages; slider.value = pageNum }
    document.getElementById('pageCountLabel').textContent = pdfDoc.numPages
    const currentPdf = allPdfs.find(p => url.endsWith(p.nom_du_fichier))
    if (currentPdf) { showPdfInfo(currentPdf); trackRead(currentPdf); showRecommendations(currentPdf.categorie, currentPdf.nom_du_fichier) }
    renderBookmarks(url)
    document.getElementById('pdfSearchInput').value = ''
    document.getElementById('pdfSearchResults').innerHTML = ''
    pdfSearchMatches = []
    cachePdfForOffline(url)
    if (!targetPage && saved > 0 && saved <= pdfDoc.numPages) {
      showResumeToast(pageNum)
    }
  } catch (e) {
    console.error(e)
    alert('Impossible de charger le PDF.')
    closePdfViewer()
  } finally {
    if (loadingEl) loadingEl.style.display = 'none'
  }
}

async function renderPdfPage(num) {
  if (!pdfDoc) return
  const container = document.getElementById('pdf-canvas-container')
  updateProgressBar()
  const slider = document.getElementById('pageSlider')
  if (slider) slider.value = num
  document.getElementById('pageLabel').textContent = num
  const cached = pageCache.get(num)
  if (cached) {
    canvas.height = cached.height
    canvas.width = cached.width
    ctx.clearRect(0, 0, cached.width, cached.height)
    ctx.drawImage(cached.img, 0, 0)
    pageIsRendering = false
    document.getElementById('pageNumber').textContent = num
    if (pageNumPending !== null) { renderPdfPage(pageNumPending); pageNumPending = null }
    return
  }
  pageIsRendering = true
  const page = await pdfDoc.getPage(num)
  const viewport = page.getViewport({ scale: currentScale })
  canvas.height = viewport.height
  canvas.width = viewport.width
  await page.render({ canvasContext: ctx, viewport }).promise
  pageIsRendering = false
  document.getElementById('pageNumber').textContent = num
  if (pageCache.size >= CACHE_MAX) {
    const firstKey = pageCache.keys().next().value
    pageCache.delete(firstKey)
  }
  const offscreen = document.createElement('canvas')
  offscreen.width = canvas.width
  offscreen.height = canvas.height
  const offCtx = offscreen.getContext('2d')
  offCtx.drawImage(canvas, 0, 0)
  pageCache.set(num, { img: offscreen, height: canvas.height, width: canvas.width })
  // Text layer
  const existingLayer = container.querySelector('.text-layer')
  if (existingLayer) existingLayer.remove()
  const wrapper = document.createElement('div')
  wrapper.style.position = 'relative'
  wrapper.style.display = 'inline-block'
  canvas.parentNode ? canvas.parentNode.replaceChild(wrapper, canvas) : null
  wrapper.appendChild(canvas)
  renderTextLayer(page, wrapper, currentScale)
  if (pageNumPending !== null) { renderPdfPage(pageNumPending); pageNumPending = null }
}
function queueRenderPage(num) { pageIsRendering ? (pageNumPending = num) : renderPdfPage(num) }
function showPrevPdfPage() {
  if (isScrollMode) {
    const container = document.getElementById('pdf-canvas-container')
    const c = container?.querySelector('[data-page="' + (pageNum - 1) + '"]')
    if (c) { c.scrollIntoView({ behavior: 'smooth', block: 'start' }); pageNum-- }
    return
  }
  if (pageNum > 1) { pageNum--; queueRenderPage(pageNum) }
}
function showNextPdfPage() {
  if (isScrollMode) {
    if (!pdfDoc || pageNum >= pdfDoc.numPages) return
    const container = document.getElementById('pdf-canvas-container')
    const c = container?.querySelector('[data-page="' + (pageNum + 1) + '"]')
    if (c) { c.scrollIntoView({ behavior: 'smooth', block: 'start' }); pageNum++ }
    return
  }
  if (pdfDoc && pageNum < pdfDoc.numPages) { pageNum++; queueRenderPage(pageNum) }
}
function zoomIn() { if (currentScale < 3) { currentScale += 0.25; pageCache.clear(); isScrollMode ? renderScrollMode() : renderPdfPage(pageNum) } }
function zoomOut() { if (currentScale > 0.25) { currentScale -= 0.25; pageCache.clear(); isScrollMode ? renderScrollMode() : renderPdfPage(pageNum) } }
function updateProgressBar() {
  const bar = document.getElementById('pdfProgressBar')
  const slider = document.getElementById('pageSlider')
  if (bar && pdfDoc) bar.style.width = ((pageNum / pdfDoc.numPages) * 100) + '%'
  if (slider && pdfDoc) { slider.max = pdfDoc.numPages; slider.value = pageNum }
}
function toggleFitMode() {
  if (!pdfDoc) return
  const container = document.getElementById('pdf-canvas-container')
  const btn = document.getElementById('fitModeBtn')
  if (btn?.classList.contains('active')) {
    btn.classList.remove('active')
    btn.title = 'Ajuster à la largeur'
    btn.innerHTML = '<i class="fas fa-arrows-alt-h"></i>'
    currentScale = 1.5
  } else {
    btn?.classList.add('active')
    btn.title = 'Largeur réelle'
    btn.innerHTML = '<i class="fas fa-arrows-alt-v"></i>'
    const vp = { width: container.clientWidth - 40 }
    currentScale = Math.min(3, Math.max(0.25, vp.width / 612))
  }
  pageCache.clear()
  isScrollMode ? renderScrollMode() : renderPdfPage(pageNum)
}
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

// ─── Scroll Mode ───
function toggleScrollMode() {
  if (!pdfDoc) return
  isScrollMode = !isScrollMode
  const btn = document.getElementById('scrollModeToggle')
  btn.classList.toggle('active', isScrollMode)
  setDesktopControlsVisible()
  if (isScrollMode) {
    renderScrollMode()
  } else {
    cleanupScrollMode()
    renderPdfPage(pageNum)
  }
}

function cleanupScrollMode() {
  scrollCanvases = []
  const container = document.getElementById('pdf-canvas-container')
  container.innerHTML = '<canvas id="pdfCanvas"></canvas>'
  container.style.overflow = ''
  container.style.padding = ''
}

async function renderScrollMode() {
  if (!pdfDoc) return
  const container = document.getElementById('pdf-canvas-container')
  container.innerHTML = ''
  container.style.overflow = 'auto'
  container.style.padding = '0.5rem'
  scrollCanvases = []

  const wrapper = document.createElement('div')
  wrapper.style.cssText = 'margin:0 auto;max-width:100%'
  container.appendChild(wrapper)

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const pageDiv = document.createElement('div')
    pageDiv.style.cssText = 'position:relative;display:inline-block;margin:0 auto 8px;max-width:100%'
    const pc = document.createElement('canvas')
    pc.dataset.page = i
    const page = await pdfDoc.getPage(i)
    const vp = page.getViewport({ scale: currentScale })
    pc.width = vp.width
    pc.height = vp.height
    pc.style.cssText = 'display:block;max-width:100%;border-radius:8px;border:1px solid rgba(255,255,255,0.04)'
    const pCtx = pc.getContext('2d')
    await page.render({ canvasContext: pCtx, viewport: vp }).promise
    pageDiv.appendChild(pc)
    renderTextLayer(page, pageDiv, currentScale)
    wrapper.appendChild(pageDiv)
    scrollCanvases.push(pc)
  }

  container.addEventListener('scroll', updateScrollPageIndicator)
  updateScrollPageIndicator()
  const slider = document.getElementById('pageSlider')
  if (slider) { slider.max = pdfDoc.numPages; slider.value = pageNum }
  document.getElementById('pageCountLabel').textContent = pdfDoc.numPages
  updateProgressBar()
}

function updateScrollPageIndicator() {
  if (!isScrollMode || !scrollCanvases.length) return
  const container = document.getElementById('pdf-canvas-container')
  const scrollTop = container.scrollTop + 100
  let found = 1
  for (let i = 0; i < scrollCanvases.length; i++) {
    if (scrollCanvases[i].offsetTop > scrollTop) break
    found = i + 1
  }
  pageNum = Math.min(found, scrollCanvases.length)
  document.getElementById('pageNumber').textContent = pageNum
}

// ─── Shortcut Help ───
function toggleShortcutHelp() {
  const el = document.getElementById('pdfShortcutHelp')
  if (!el) return
  el.style.display = el.style.display === 'flex' ? 'none' : 'flex'
}
function closeShortcutHelp() {
  const el = document.getElementById('pdfShortcutHelp')
  if (el) el.style.display = 'none'
}

// ─── Reading Progress ───
function getReadingProgress(url) {
  try {
    const key = 'reading_' + btoa(url)
    return parseInt(localStorage.getItem(key)) || 0
  } catch { return 0 }
}
function showResumeToast(page) {
  const toast = document.getElementById('resumeToast')
  if (!toast) return
  toast.textContent = `Reprise à la page ${page}`
  toast.classList.add('show')
  setTimeout(() => toast.classList.remove('show'), 3000)
}

function closePdfViewer() {
  const url = window._currentPdfUrl
  if (url && pdfDoc) { saveReadingProgress(url, pageNum); saveZoomForDoc(url) }
  if (ttsPlaying) stopTts()
  isScrollMode = false; scrollCanvases = []
  document.getElementById('pdf-viewer-overlay').style.display = 'none'
  document.getElementById('pdfShortcutHelp').style.display = 'none'
  const container = document.getElementById('pdf-canvas-container')
  container.innerHTML = '<canvas id="pdfCanvas"></canvas>'
  container.style.overflow = ''
  container.style.padding = ''
  pdfDoc = null; currentScale = 1.5; pageCache.clear()
  initContinueReading()
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

// ─── Download Stats ───
function trackDownload(filename) {
  try {
    const stats = JSON.parse(localStorage.getItem('downloadStats') || '{}')
    stats[filename] = (stats[filename] || 0) + 1
    localStorage.setItem('downloadStats', JSON.stringify(stats))
  } catch {}
}

// ─── Favorites ⭐ ───
function getFavorites() {
  try { return JSON.parse(localStorage.getItem('favorites') || '[]') } catch { return [] }
}
function toggleFavorite(filename) {
  let favs = getFavorites()
  const idx = favs.indexOf(filename)
  if (idx > -1) favs.splice(idx, 1); else favs.push(filename)
  localStorage.setItem('favorites', JSON.stringify(favs))
  render()
  initFavorites()
  return idx === -1
}
function isFavorite(filename) { return getFavorites().includes(filename) }
function initFavorites() {
  const section = document.getElementById('favorites-section')
  const list = document.getElementById('favoritesList')
  if (!section || !list) return
  const favs = getFavorites()
  const items = favs.map(f => allPdfs.find(p => p.nom_du_fichier === f)).filter(Boolean)
  if (!items.length) { section.style.display = 'none'; return }
  section.style.display = ''
  list.innerHTML = items.map(pdf => {
    const t = pdf.titre || pdf.nom_du_fichier.replace('.pdf', '').replace(/_/g, ' ')
    const u = PDF_BASE + pdf.nom_du_fichier
    return `<div class="continue-card anim-fade visible">
      <div class="continue-info"><div class="continue-title">${esc(t)}</div></div>
      <button class="pdf-read-btn continue-resume" data-url="${esc(u)}"><i class="fas fa-book-open"></i> Lire</button>
    </div>`
  }).join('')
  list.querySelectorAll('.continue-resume').forEach(b => b.addEventListener('click', () => openPDF(b.dataset.url)))
}

// ─── Partager 📤 ───
function initShareButtons() {
  document.querySelectorAll('.share-btn').forEach(b => b.addEventListener('click', sharePdf))
}
function sharePdf(e) {
  const btn = e.currentTarget
  const url = btn.dataset.url || window._currentPdfUrl
  const title = btn.dataset.title || document.querySelector('.pdf-info-title')?.textContent || 'Document'
  if (navigator.share) {
    navigator.share({ title, url: window.location.origin + '/' + url }).catch(() => {})
  } else {
    navigator.clipboard?.writeText(window.location.origin + '/' + url).then(() => {
      const orig = btn.innerHTML
      btn.innerHTML = '<i class="fas fa-check"></i>'
      setTimeout(() => btn.innerHTML = orig, 2000)
    }).catch(() => {})
  }
}

// ─── Mode lecture 🌙 ───
function toggleReadingMode() {
  document.body.classList.toggle('reading-mode')
  const btn = document.getElementById('readingModeBtn')
  if (btn) btn.classList.toggle('active')
  localStorage.setItem('readingMode', document.body.classList.contains('reading-mode') ? 'on' : 'off')
}
function initReadingMode() {
  const btn = document.getElementById('readingModeBtn')
  if (localStorage.getItem('readingMode') === 'on') {
    document.body.classList.add('reading-mode')
    if (btn) btn.classList.add('active')
  }
}

// ─── Liens directs ?pdf=filename ───
function handleDirectLink() {
  const params = new URLSearchParams(window.location.search)
  const name = params.get('pdf')
  if (!name) return
  const pdf = allPdfs.find(p => p.nom_du_fichier === name || p.nom_du_fichier === name + '.pdf')
  if (pdf) setTimeout(() => openPDF(PDF_BASE + pdf.nom_du_fichier), 500)
}

// ─── Nouveautés 📚 ───
function initNewReleases() {
  const section = document.getElementById('new-releases')
  const list = document.getElementById('newReleasesList')
  if (!section || !list || !allPdfs.length) return
  const sorted = [...allPdfs].filter(p => p.numero).sort((a, b) => (b.numero || 0) - (a.numero || 0)).slice(0, 8)
  if (!sorted.length) { section.style.display = 'none'; return }
  section.style.display = ''
  list.innerHTML = sorted.map(pdf => {
    const t = pdf.titre || pdf.nom_du_fichier.replace('.pdf', '').replace(/_/g, ' ')
    const u = PDF_BASE + pdf.nom_du_fichier
    return `<div class="continue-card anim-fade visible">
      <div class="continue-info">
        <div class="continue-title">${esc(t)}</div>
        ${pdf.auteur ? `<div class="continue-meta">${esc(pdf.auteur)}</div>` : ''}
      </div>
      <button class="pdf-read-btn continue-resume" data-url="${esc(u)}"><i class="fas fa-book-open"></i> Lire</button>
    </div>`
  }).join('')
  list.querySelectorAll('.continue-resume').forEach(b => b.addEventListener('click', () => openPDF(b.dataset.url)))
}

// ─── Recherche dans le PDF ouvert 🔍 ───
let pdfSearchMatches = [], pdfSearchIdx = 0
function initPdfSearch() {
  document.getElementById('pdfSearchInput')?.addEventListener('input', e => searchInPdf(e.target.value))
  document.getElementById('pdfSearchPrev')?.addEventListener('click', () => navigateSearch(-1))
  document.getElementById('pdfSearchNext')?.addEventListener('click', () => navigateSearch(1))
}
async function searchInPdf(term) {
  const resultsEl = document.getElementById('pdfSearchResults')
  if (!term || !pdfDoc) { resultsEl.innerHTML = ''; pdfSearchMatches = []; return }
  try {
    const pages = await Promise.all(Array.from({ length: pdfDoc.numPages }, (_, i) =>
      pdfDoc.getPage(i + 1).then(p => p.getTextContent())
    ))
    pdfSearchMatches = []
    pages.forEach((content, i) => {
      content.items.forEach(item => {
        if (item.str.toLowerCase().includes(term.toLowerCase())) {
          pdfSearchMatches.push({ page: i + 1, text: item.str, x: item.transform[4], y: item.transform[5] })
        }
      })
    })
    pdfSearchIdx = 0
    if (pdfSearchMatches.length) {
      resultsEl.innerHTML = `${pdfSearchMatches.length} résultat(s)`
      goToSearchResult(0)
    } else {
      resultsEl.innerHTML = 'Aucun résultat'
    }
  } catch {}
}
function navigateSearch(dir) {
  pdfSearchIdx = (pdfSearchIdx + dir + pdfSearchMatches.length) % pdfSearchMatches.length
  goToSearchResult(pdfSearchIdx)
}
function goToSearchResult(idx) {
  if (!pdfSearchMatches.length) return
  const match = pdfSearchMatches[idx]
  if (isScrollMode) {
    const c = document.querySelector(`[data-page="${match.page}"]`)
    if (c) c.scrollIntoView({ block: 'center' })
  } else {
    pageNum = match.page
    renderPdfPage(pageNum)
  }
  document.getElementById('pageInfo').style.color = 'var(--primary)'
  setTimeout(() => document.getElementById('pageInfo').style.color = '', 2000)
}

// ─── Signets 📌 ───
function getBookmarks(url) {
  try { return JSON.parse(localStorage.getItem('bm_' + btoa(url)) || '[]') } catch { return [] }
}
function addBookmark(url, page) {
  const bms = getBookmarks(url)
  if (bms.some(b => b.page === page)) return
  bms.push({ page, date: new Date().toLocaleDateString() })
  localStorage.setItem('bm_' + btoa(url), JSON.stringify(bms))
  renderBookmarks(url)
}
function removeBookmark(url, page) {
  let bms = getBookmarks(url)
  bms = bms.filter(b => b.page !== page)
  localStorage.setItem('bm_' + btoa(url), JSON.stringify(bms))
  renderBookmarks(url)
}
function renderBookmarks(url) {
  const list = document.getElementById('bookmarkList')
  const sidebar = document.getElementById('pdfSidebar')
  if (!list) return
  const bms = getBookmarks(url)
  if (sidebar) sidebar.style.display = bms.length ? '' : 'none'
  list.innerHTML = bms.map(b => `<div class="bm-item">
    <button class="btn-secondary bm-go" data-page="${b.page}" style="padding:0.2rem 0.6rem;font-size:0.75rem">Page ${b.page}</button>
    <span style="font-size:0.65rem;color:var(--text3)">${b.date}</span>
    <button class="bm-del" data-page="${b.page}" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:0.8rem;padding:0.2rem"><i class="fas fa-times"></i></button>
  </div>`).join('')
  list.querySelectorAll('.bm-go').forEach(b => b.addEventListener('click', () => {
    const p = parseInt(b.dataset.page)
    if (isScrollMode) {
      const c = document.querySelector(`[data-page="${p}"]`)
      if (c) c.scrollIntoView({ block: 'center' })
    } else { pageNum = p; renderPdfPage(p) }
  }))
  list.querySelectorAll('.bm-del').forEach(b => b.addEventListener('click', () => removeBookmark(url, parseInt(b.dataset.page))))
}
function toggleBookmark() {
  const url = window._currentPdfUrl
  if (!url || !pdfDoc) return
  const bms = getBookmarks(url)
  if (bms.some(b => b.page === pageNum)) { removeBookmark(url, pageNum); return }
  addBookmark(url, pageNum)
}

// ─── Stats de lecture 📊 ───
function trackRead(pdf) {
  try {
    const key = 'readStats'
    const stats = JSON.parse(localStorage.getItem(key) || '{"reads":{},"total":0}')
    stats.total = (stats.total || 0) + 1
    stats.reads[pdf.nom_du_fichier] = (stats.reads[pdf.nom_du_fichier] || 0) + 1
    const titles = JSON.parse(localStorage.getItem('readTitles') || '[]')
    if (!titles.includes(pdf.nom_du_fichier)) { titles.push(pdf.nom_du_fichier); localStorage.setItem('readTitles', JSON.stringify(titles)) }
    localStorage.setItem(key, JSON.stringify(stats))
  } catch {}
}

// ─── Infos du livre dans le viewer ───
function showPdfInfo(pdf) {
  const bar = document.getElementById('pdfInfoBar')
  if (!bar) return
  const title = pdf.titre || pdf.nom_du_fichier.replace('.pdf', '').replace(/_/g, ' ')
  bar.innerHTML = `
    <span class="pdf-info-title">${esc(title)}</span>
    ${pdf.auteur ? `<span class="pdf-info-author"><i class="fas fa-user"></i> ${esc(pdf.auteur)}</span>` : ''}
    ${pdf.categorie ? `<span class="pdf-cat-tag">${esc(pdf.categorie)}</span>` : ''}
  `
  bar.style.display = 'flex'
}

// ─── Export des donnees ───
function exportUserData() {
  const data = {}
  const keys = ['favorites','downloadStats','readStats','readTitles']
  keys.forEach(k => { try { data[k] = JSON.parse(localStorage.getItem(k)) } catch {} })
  const bmKeys = Object.keys(localStorage).filter(k => k.startsWith('bm_'))
  data.bookmarks = {}
  bmKeys.forEach(k => { try { data.bookmarks[k.slice(3)] = JSON.parse(localStorage.getItem(k)) } catch {} })
  const progKeys = Object.keys(localStorage).filter(k => k.startsWith('reading_') && !k.endsWith('_time'))
  data.readingProgress = {}
  progKeys.forEach(k => { try { data.readingProgress[k] = parseInt(localStorage.getItem(k)) } catch {} })
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `bibliotheque-donnees-${new Date().toISOString().slice(0,10)}.json`
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(a.href)
}

// ─── Selection de texte dans le viewer PDF ───
let textLayer = null
function renderTextLayer(page, pageDiv, scale) {
  const existing = pageDiv.querySelector('.text-layer')
  if (existing) existing.remove()
  page.getTextContent().then(tc => {
    const layer = document.createElement('div')
    layer.className = 'text-layer'
    layer.style.position = 'absolute'
    layer.style.top = '0'; layer.style.left = '0'
    layer.style.right = '0'; layer.style.bottom = '0'
    layer.style.pointerEvents = 'none'
    const viewport = page.getViewport({ scale })
    tc.items.forEach(item => {
      const tx = document.createElement('span')
      tx.textContent = item.str
      tx.style.position = 'absolute'
      tx.style.left = (item.transform[4] * scale) + 'px'
      tx.style.top = ((viewport.height - item.transform[5]) * scale) + 'px'
      tx.style.fontSize = (item.height * scale) + 'px'
      tx.style.fontFamily = item.fontName || 'sans-serif'
      tx.style.color = 'transparent'
      tx.style.pointerEvents = 'auto'
      tx.style.cursor = 'text'
      tx.style.userSelect = 'text'
      tx.style.whiteSpace = 'pre'
      layer.appendChild(tx)
    })
    pageDiv.appendChild(layer)
    textLayer = layer
  }).catch(() => {})
}

// ─── Livres recommandes par categorie ───
function showRecommendations(category, currentFile) {
  const section = document.getElementById('recommendations-section')
  const list = document.getElementById('recommendationsList')
  if (!section || !list || !allPdfs.length) return
  if (!category) { section.style.display = 'none'; return }
  const related = allPdfs.filter(p => (p.categorie || 'Non classé') === category && p.nom_du_fichier !== currentFile).slice(0, 4)
  if (!related.length) { section.style.display = 'none'; return }
  section.style.display = ''
  list.innerHTML = related.map(pdf => {
    const t = pdf.titre || pdf.nom_du_fichier.replace('.pdf', '').replace(/_/g, ' ')
    const u = PDF_BASE + pdf.nom_du_fichier
    return `<div class="continue-card anim-fade visible">
      <div class="continue-info"><div class="continue-title">${esc(t)}</div></div>
      <button class="pdf-read-btn continue-resume" data-url="${esc(u)}"><i class="fas fa-book-open"></i> Lire</button>
    </div>`
  }).join('')
  list.querySelectorAll('.continue-resume').forEach(b => b.addEventListener('click', () => openPDF(b.dataset.url)))
}

// ─── Mode hors-ligne : cache les PDFs ───
async function cachePdfForOffline(url) {
  if (!('caches' in window)) return
  try {
    const cache = await caches.open('pdf-cache')
    const exists = await cache.match(url)
    if (!exists) await cache.add(url)
  } catch {}
}

// ─── Filtre par categorie via URL ───
function handleCategoryFilter() {
  const params = new URLSearchParams(window.location.search)
  const cat = params.get('cat')
  if (!cat) return
  const btns = document.querySelectorAll('.cat-btn')
  btns.forEach(b => {
    if (b.dataset.cat.toLowerCase() === cat.toLowerCase()) {
      b.click()
    }
  })
}

// ─── Compteur de telechargements visible ───
function getDownloadCount(filename) {
  try {
    const stats = JSON.parse(localStorage.getItem('downloadStats') || '{}')
    return stats[filename] || 0
  } catch { return 0 }
}

// ─── Recherche plein texte dans tous les PDFs ───
let fullTextIndex = {}
async function buildTextIndex() {
  const visited = JSON.parse(localStorage.getItem('readTitles') || '[]')
  for (const file of visited) {
    if (fullTextIndex[file]) continue
    try {
      await loadPdfJs()
      const pdf = await pdfjsLib.getDocument(PDF_BASE + file).promise
      const texts = []
      for (let i = 1; i <= Math.min(pdf.numPages, 50); i++) {
        const page = await pdf.getPage(i)
        const tc = await page.getTextContent()
        texts.push(tc.items.map(it => it.str).join(' '))
      }
      fullTextIndex[file] = texts.join('\n').slice(0, 50000)
    } catch {}
  }
  localStorage.setItem('pdfTextIndex', JSON.stringify(fullTextIndex))
}
function searchAllPdfs(query) {
  query = query.toLowerCase().trim()
  if (!query) return []
  try { fullTextIndex = JSON.parse(localStorage.getItem('pdfTextIndex') || '{}') } catch {}
  const results = []
  Object.entries(fullTextIndex).forEach(([file, text]) => {
    const idx = text.toLowerCase().indexOf(query)
    if (idx > -1) {
      const snippet = text.slice(Math.max(0, idx - 60), idx + 120)
      results.push({ file, snippet: '...' + snippet + '...' })
    }
  })
  return results.sort((a, b) => a.file.localeCompare(b.file))
}
function initGlobalSearch() {
  document.getElementById('globalSearchInput')?.addEventListener('input', e => {
    const results = searchAllPdfs(e.target.value)
    const el = document.getElementById('globalSearchResults')
    if (!el) return
    if (!e.target.value.trim()) { el.innerHTML = ''; return }
    if (!results.length) { el.innerHTML = '<p style="font-size:0.8rem;color:var(--text3);padding:0.5rem">Aucun resultat</p>'; return }
    el.innerHTML = results.map(r => {
      const pdf = allPdfs.find(p => p.nom_du_fichier === r.file)
      const t = pdf ? (pdf.titre || r.file.replace('.pdf','')) : r.file
      return `<div class="global-search-item" data-file="${esc(r.file)}">
        <div class="gs-title">${esc(t)}</div>
        <div class="gs-snippet">${esc(r.snippet)}</div>
      </div>`
    }).join('')
    el.querySelectorAll('.global-search-item').forEach(item => {
      item.addEventListener('click', () => openPDF(PDF_BASE + item.dataset.file))
    })
  })
  // Rebuild index for visited PDFs in background
  setTimeout(buildTextIndex, 5000)
}

// ─── Synchronisation cloud via GitHub ───
async function syncToCloud(data) {
  const token = prompt('Entrez votre token GitHub (PAT) pour sauvegarder vos donnees dans le cloud:')
  if (!token) return
  try {
    const res = await fetch('https://api.github.com/repos/cideg-dev/Biblio-Vitrine/contents/assets/data/user-data.json', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Sync user data', content: btoa(unescape(encodeURIComponent(JSON.stringify(data)))), sha: '' })
    })
    if (!res.ok) throw new Error('Sync failed')
    showToast('Donnees synchronisees avec le cloud!')
  } catch (e) { alert('Erreur synchronisation: ' + e.message) }
}

const style = document.createElement('style')
style.textContent = `#dailyVerse, #dailyVerseRef { transition: opacity 0.4s ease; }`

// ─── Text layer styles ───
style.textContent += `
.text-layer { position: absolute; top:0; left:0; right:0; bottom:0; pointer-events:none; z-index:10; }
.text-layer span { pointer-events:auto; cursor:text; user-select:text; color:transparent; }
.text-layer span::selection { background: rgba(0,245,200,0.3); color:transparent; }
body.reading-mode .text-layer span::selection { background: rgba(42,122,90,0.3); }
`
document.head.appendChild(style)

// ─── PWA Install ───
function initPwaInstall() {
  const btn = document.getElementById('installPwaBtn')
  if (!btn) return
  btn.addEventListener('click', async () => {
    if (deferredPwaPrompt) {
      deferredPwaPrompt.prompt()
      const choice = await deferredPwaPrompt.userChoice
      if (choice.outcome === 'accepted') btn.style.display = 'none'
      deferredPwaPrompt = null
      return
    }
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    if (isIOS) {
      alert('Pour installer l\'application :\n1. Touche le bouton Partager (⬆️)\n2. Fais défiler et choisis "Sur l\'écran d\'accueil"\n3. Touche "Ajouter"')
    }
  })
  // If already installed, hide
  if (window.matchMedia('(display-mode: standalone)').matches) btn.style.display = 'none'
}
window.addEventListener('appinstalled', () => {
  const btn = document.getElementById('installPwaBtn')
  if (btn) btn.style.display = 'none'
})

// ─── Toast helper ───
function showToast(msg) {
  let t = document.getElementById('appToast')
  if (!t) {
    t = document.createElement('div')
    t.id = 'appToast'
    t.style.cssText = 'position:fixed;bottom:5rem;left:50%;transform:translateX(-50%);background:var(--primary);color:var(--bg);padding:0.6rem 1.5rem;border-radius:100px;font-size:0.85rem;font-weight:600;z-index:9999;transition:all 0.3s;opacity:0;pointer-events:none;font-family:var(--font)'
    document.body.appendChild(t)
  }
  t.textContent = msg
  t.style.opacity = '1'
  setTimeout(() => t.style.opacity = '0', 3000)
}

// ─── Theme auto (system preference) ───
function initAutoTheme() {
  const mq = window.matchMedia('(prefers-color-scheme: light)')
  if (localStorage.getItem('theme') === 'auto') {
    document.body.classList.toggle('light-theme', mq.matches)
  }
  mq.addEventListener('change', e => {
    if (localStorage.getItem('theme') === 'auto') document.body.classList.toggle('light-theme', e.matches)
  })
}

// ─── Goto page dialog ───
function gotoPageDialog() {
  if (!pdfDoc) return
  const p = prompt(`Aller à la page (1-${pdfDoc.numPages}):`, pageNum.toString())
  if (!p) return
  const n = parseInt(p)
  if (n >= 1 && n <= pdfDoc.numPages && n !== pageNum) {
    if (isScrollMode) {
      const c = document.querySelector(`[data-page="${n}"]`)
      if (c) { c.scrollIntoView({ block: 'start' }); pageNum = n; document.getElementById('pageNumber').textContent = n; updateProgressBar() }
    } else { pageNum = n; queueRenderPage(n) }
  }
}

// ─── Save/Load zoom per document ───
function saveZoomForDoc(url) {
  try { localStorage.setItem('zoom_' + btoa(url), currentScale.toString()) } catch {}
}
function loadZoomForDoc(url) {
  try { const z = parseFloat(localStorage.getItem('zoom_' + btoa(url))); if (z >= 0.25 && z <= 3) currentScale = z } catch {}
}

// ─── Mode Texte Reflow ───
let isReflowMode = false, reflowText = '', reflowPageLines = []
function toggleReflowMode() {
  if (!pdfDoc) return
  const btn = document.getElementById('reflowModeBtn')
  const container = document.getElementById('pdf-canvas-container')
  isReflowMode = !isReflowMode
  if (isReflowMode) {
    btn?.classList.add('active')
    btn.title = 'Mode page'
    btn.innerHTML = '<i class="fas fa-file-pdf"></i>'
    showReflowPage(pageNum)
  } else {
    btn?.classList.remove('active')
    btn.title = 'Mode texte fluide'
    btn.innerHTML = '<i class="fas fa-align-left"></i>'
    renderPdfPage(pageNum)
  }
}
async function showReflowPage(num) {
  if (!pdfDoc) return
  const container = document.getElementById('pdf-canvas-container')
  const page = await pdfDoc.getPage(num)
  const tc = await page.getTextContent()
  container.innerHTML = ''
  container.style.overflow = 'auto'
  container.style.padding = '1.5rem'
  const div = document.createElement('div')
  div.className = 'reflow-container'
  let lastY = null, block = []
  tc.items.forEach(item => {
    const y = Math.round(item.transform[5])
    if (lastY !== null && Math.abs(y - lastY) > 5 && block.length) {
      div.appendChild(createReflowBlock(block))
      block = []
    }
    block.push(item.str)
    lastY = y
  })
  if (block.length) div.appendChild(createReflowBlock(block))
  container.appendChild(div)
}
function createReflowBlock(lines) {
  const p = document.createElement('p')
  p.className = 'reflow-paragraph'
  p.textContent = lines.join(' ')
  return p
}

// ─── Table des matieres (PDF outline) ───
async function loadPdfOutline() {
  if (!pdfDoc) return
  const list = document.getElementById('tocList')
  if (!list) return
  try {
    const outline = await pdfDoc.getOutline()
    list.innerHTML = ''
    if (!outline || !outline.length) {
      list.innerHTML = '<p style="font-size:0.75rem;color:var(--text3);padding:0.5rem">Pas de table des matières</p>'
      return
    }
    const renderItems = (items, depth = 0) => {
      items.forEach(item => {
        const a = document.createElement('a')
        a.className = 'toc-item'
        a.style.paddingLeft = (0.5 + depth * 0.8) + 'rem'
        a.textContent = item.title
        a.addEventListener('click', async () => {
          if (item.dest) {
            try {
              const dest = typeof item.dest === 'string' ? await pdfDoc.getDestination(item.dest) : item.dest
              if (dest) {
                const pageIdx = await pdfDoc.getPageIndex(dest[0])
                const targetPage = pageIdx + 1
                if (isScrollMode) {
                  const c = document.querySelector(`[data-page="${targetPage}"]`)
                  if (c) c.scrollIntoView({ block: 'start' })
                } else { pageNum = targetPage; queueRenderPage(targetPage) }
              }
            } catch {}
          }
        })
        list.appendChild(a)
        if (item.items && item.items.length) renderItems(item.items, depth + 1)
      })
    }
    renderItems(outline)
  } catch { list.innerHTML = '<p style="font-size:0.75rem;color:var(--text3)">Erreur chargement</p>' }
}

// ─── Lecture audio (TTS) ───
let ttsSynth = null, ttsUtterance = null, ttsPlaying = false, ttsPageText = ''
function toggleTts() {
  if (!pdfDoc) return
  const btn = document.getElementById('ttsBtn')
  if (ttsPlaying) { stopTts(); btn?.classList.remove('active'); return }
  btn?.classList.add('active')
  ttsSynth = window.speechSynthesis
  if (!ttsSynth) { alert('Synthèse vocale non disponible'); btn?.classList.remove('active'); return }
  speakPage(pageNum)
}
function speakPage(num) {
  if (!pdfDoc || !ttsSynth) return
  pdfDoc.getPage(num).then(p => p.getTextContent()).then(tc => {
    ttsPageText = tc.items.map(i => i.str).join(' ')
    if (!ttsPageText.trim()) { stopTts(); return }
    ttsUtterance = new SpeechSynthesisUtterance(ttsPageText)
    ttsUtterance.lang = 'fr-FR'
    ttsUtterance.rate = 0.9
    ttsUtterance.onend = () => {
      if (pageNum < pdfDoc.numPages && ttsPlaying) {
        if (isScrollMode) {
          pageNum++; const c = document.querySelector(`[data-page="${pageNum}"]`)
          if (c) c.scrollIntoView({ block: 'start' })
        } else { pageNum++; queueRenderPage(pageNum) }
        speakPage(pageNum)
      } else { stopTts() }
    }
    ttsUtterance.onerror = stopTts
    ttsPlaying = true; ttsSynth.speak(ttsUtterance)
  }).catch(stopTts)
}
function stopTts() {
  ttsPlaying = false
  if (ttsSynth) { ttsSynth.cancel(); ttsSynth = null }
  document.getElementById('ttsBtn')?.classList.remove('active')
}

// ─── Export PDF → TXT ───
async function exportPdfAsTxt() {
  if (!pdfDoc) return
  const name = document.querySelector('.pdf-info-title')?.textContent || 'document'
  let fullText = ''
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i)
    const tc = await page.getTextContent()
    fullText += tc.items.map(i => i.str).join(' ') + '\n\n'
  }
  const blob = new Blob([fullText], { type: 'text/plain' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name + '.txt'
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(a.href)
}

// ─── Gestionnaire de signets global ───
function getAllBookmarks() {
  const all = {}
  Object.keys(localStorage).filter(k => k.startsWith('bm_')).forEach(k => {
    try { all[k.slice(3)] = JSON.parse(localStorage.getItem(k)) } catch {}
  })
  return all
}
function showGlobalBookmarks() {
  const overlay = document.getElementById('globalBookmarksOverlay')
  const list = document.getElementById('globalBookmarksList')
  if (!overlay || !list) return
  overlay.style.display = 'flex'
  const all = getAllBookmarks()
  const entries = Object.entries(all).flatMap(([encodedUrl, bms]) => {
    const url = atob(encodedUrl)
    const pdf = allPdfs.find(p => url.includes(p.nom_du_fichier))
    const title = pdf ? (pdf.titre || pdf.nom_du_fichier) : url.split('/').pop()
    return bms.map(b => ({ ...b, url, title, encodedUrl }))
  })
  if (!entries.length) { list.innerHTML = '<p style="color:var(--text3);padding:1rem;text-align:center">Aucun signet</p>'; return }
  list.innerHTML = entries.map((b, i) => `<div class="gb-item">
    <div class="gb-info"><strong>${esc(b.title)}</strong> — Page ${b.page} <span style="font-size:0.65rem;color:var(--text3)">(${b.date})</span></div>
    <div class="gb-actions">
      <button class="btn-secondary" onclick="openPDF('${esc(b.url)}');setTimeout(()=>{document.querySelector('[data-page=\\"${b.page}\\"]')?.scrollIntoView({block:'start'});document.getElementById('pageNum') && (pageNum=${b.page}, queueRenderPage(${b.page}))},800);closeGlobalBookmarks()" style="padding:0.2rem 0.5rem;font-size:0.7rem"><i class="fas fa-book-open"></i></button>
      <button class="btn-secondary" onclick="localStorage.setItem('bm_${esc(b.encodedUrl)}',JSON.stringify(JSON.parse(localStorage.getItem('bm_${esc(b.encodedUrl)}')||'[]').filter(x=>x.page!==${b.page})));showGlobalBookmarks()" style="padding:0.2rem 0.5rem;font-size:0.7rem;color:var(--accent)"><i class="fas fa-times"></i></button>
    </div>
  </div>`).join('')
}
function closeGlobalBookmarks() {
  document.getElementById('globalBookmarksOverlay').style.display = 'none'
}

// ─── Stats de lecture (page) ───
function showReadingStats() {
  const overlay = document.getElementById('readingStatsOverlay')
  const content = document.getElementById('readingStatsContent')
  if (!overlay || !content) return
  try {
    const readStats = JSON.parse(localStorage.getItem('readStats') || '{"reads":{},"total":0}')
    const readTitles = JSON.parse(localStorage.getItem('readTitles') || '[]')
    const favs = getFavorites()
    const allBms = getAllBookmarks()
    const bmCount = Object.values(allBms).reduce((s, a) => s + a.length, 0)
    // Streak
    let streak = 0
    const d = new Date()
    for (let i = 0; i < 365; i++) {
      const key = 'day_' + d.toISOString().slice(0, 10)
      if (localStorage.getItem(key)) { streak++ } else if (i > 0) break
      d.setDate(d.getDate() - 1)
    }
    const downloads = JSON.parse(localStorage.getItem('downloadStats') || '{}')
    const dlTotal = Object.values(downloads).reduce((s, c) => s + c, 0)
    overlay.style.display = 'flex'
    content.innerHTML = `
      <div class="stats-grid-inline">
        <div class="stat-card"><span class="stat-num">${readStats.total || 0}</span><span class="stat-lbl">Consultations</span></div>
        <div class="stat-card"><span class="stat-num">${readTitles.length}</span><span class="stat-lbl">Livres lus</span></div>
        <div class="stat-card"><span class="stat-num">${favs.length}</span><span class="stat-lbl">Favoris</span></div>
        <div class="stat-card"><span class="stat-num">${bmCount}</span><span class="stat-lbl">Signets</span></div>
        <div class="stat-card"><span class="stat-num">${dlTotal}</span><span class="stat-lbl">Téléchargements</span></div>
        <div class="stat-card"><span class="stat-num">${streak}</span><span class="stat-lbl">Jours de suite</span></div>
      </div>
      <p style="font-size:0.75rem;color:var(--text3);margin-top:0.5rem">Les stats sont stockées localement sur cet appareil.</p>
    `
  } catch { content.innerHTML = '<p style="color:var(--accent)">Erreur chargement stats</p>' }
}
function closeReadingStats() {
  document.getElementById('readingStatsOverlay').style.display = 'none'
}
// Track daily visit
function trackDailyVisit() {
  try {
    const today = new Date().toISOString().slice(0, 10)
    localStorage.setItem('day_' + today, '1')
  } catch {}
}

// ─── Badge nouveau sur les PDFs recents ───
function isNewPdf(pdf) {
  return pdf.numero && pdf.numero > (Math.max(...allPdfs.filter(p => p.numero).map(p => p.numero)) - 5)
}

// ─── Init all remaining ───
document.addEventListener('DOMContentLoaded', () => {
  initReadingMode()
  handleDirectLink()
  handleCategoryFilter()
  initGlobalSearch()
  initAutoTheme()
  trackDailyVisit()
  // Cookie banner
  const cookieBanner = document.getElementById('cookieBanner')
  if (cookieBanner && !localStorage.getItem('cookiesAccepted')) {
    cookieBanner.style.display = 'flex'
    document.getElementById('acceptCookies')?.addEventListener('click', () => {
      localStorage.setItem('cookiesAccepted', 'true')
      cookieBanner.style.display = 'none'
    })
  } else if (cookieBanner) {
    cookieBanner.style.display = 'none'
  }
})
