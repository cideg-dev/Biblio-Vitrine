let pdfs = []
let uploadAbort = null
let selectedIndex = -1
let searchQuery = ''
const REPO_OWNER = 'cideg-dev'
const REPO_NAME = 'Biblio-Vitrine'
const REPO_BRANCH = 'master'
const LISTE_PATH = 'assets/documents/liste-pdfs.json'
const DOCS_PATH = 'assets/documents/'
const TOKEN_KEY = 'githubAdminToken'
const TESTIMONIALS_PATH = 'assets/data/testimonials.json'
const DONATION_GOAL_PATH = 'assets/data/donation-goal.json'
const MISSION_PATH = 'assets/data/mission.json'
const CONFIG_PATH = 'assets/data/config.json'
const GALLERY_PATH = 'assets/images/missions/'

const CATEGORIES = [
  'Théologie', 'Étude biblique', 'Vie chrétienne', 'Évangélisation',
  'Leadership', 'Famille', 'Guérison', 'Prophétie', 'Enseignement',
  'Témoignage', 'Jeûne & Prière', 'Non classé'
]

document.addEventListener('DOMContentLoaded', () => {
  checkAuth()
  document.getElementById('loginBtn').addEventListener('click', handleLogin)
  document.getElementById('startOAuthBtn')?.addEventListener('click', startOAuth)
  document.getElementById('cancelOAuthBtn')?.addEventListener('click', cancelOAuth)
  document.getElementById('logoutBtn').addEventListener('click', handleLogout)
  document.getElementById('saveChangesBtn').addEventListener('click', saveChanges)
  document.getElementById('deleteFromListBtn').addEventListener('click', deleteSelected)
  document.getElementById('addPdfBtn').addEventListener('click', handleAddPdf)
  document.getElementById('cancelUploadBtn').addEventListener('click', cancelUpload)
  document.getElementById('metaSearch').addEventListener('input', e => { searchQuery = e.target.value.toLowerCase(); renderBookList() })

  document.getElementById('addTestimonialBtn').addEventListener('click', () => {
    document.getElementById('addTestimonialForm').style.display = 'block'
  })
  document.getElementById('confirmAddTestimonial').addEventListener('click', addTestimonial)
  document.getElementById('saveTestimonialsBtn').addEventListener('click', saveTestimonials)
  document.getElementById('saveDonationBtn').addEventListener('click', saveDonationGoal)
  document.getElementById('donationShowToggle').addEventListener('change', updateDonationPreview)
  document.getElementById('saveMissionBtn').addEventListener('click', saveMission)
  document.getElementById('addWomenItem').addEventListener('click', () => addMissionListItem('womenItemsContainer', 'womenItem', ''))
  document.getElementById('addDisabledItem').addEventListener('click', () => addMissionListItem('disabledItemsContainer', 'disabledItem', ''))
  document.getElementById('addPoorItem').addEventListener('click', () => addMissionListItem('poorItemsContainer', 'poorItem', ''))
  document.getElementById('addMisTestimonial').addEventListener('click', addMisTestimonial)
  document.getElementById('saveConfigBtn').addEventListener('click', saveConfig)
  document.getElementById('saveGalleryBtn').addEventListener('click', saveGallerySettings)

  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'))
      document.querySelectorAll('.admin-tab-content').forEach(t => t.classList.remove('active'))
      tab.classList.add('active')
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active')
      if (tab.dataset.tab === 'testimonials') loadTestimonialsAdmin()
      if (tab.dataset.tab === 'donation') loadDonationGoal()
      if (tab.dataset.tab === 'mission') loadMission()
      if (tab.dataset.tab === 'config') loadConfig()
      if (tab.dataset.tab === 'gallery') loadGalleryAdmin()
      if (tab.dataset.tab === 'home') loadHome()
      if (tab.dataset.tab === 'blog') loadBlog()
      if (tab.dataset.tab === 'stats') loadStats()
    })
  })

  const dz = document.getElementById('dropzone')
  const fileInput = document.getElementById('newPdfFile')
  dz.addEventListener('click', () => fileInput.click())
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over') })
  dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'))
  dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('drag-over'); handleFileDrop(e.dataTransfer.files[0]) })
  fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleFileDrop(fileInput.files[0]) })
  document.getElementById('githubToken').addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin() })

  document.getElementById('galleryGitUploadBtn').addEventListener('click', uploadGalleryToGitHub)
  document.getElementById('galleryGitFile').addEventListener('change', handleGalleryFileSelect)
  document.getElementById('saveHomeBtn').addEventListener('click', saveHome)
  document.getElementById('addHomeValue').addEventListener('click', addHomeValueItem)
  document.getElementById('addArticleBtn').addEventListener('click', addArticle)
  document.getElementById('saveArticlesBtn').addEventListener('click', saveArticles)
  document.getElementById('refreshStatsBtn').addEventListener('click', loadStats)
  document.getElementById('resetStatsBtn').addEventListener('click', resetStats)
  document.getElementById('publishStatsBtn').addEventListener('click', publishStats)

  document.querySelector('.hamburger')?.addEventListener('click', () => {
    document.querySelector('.hamburger').classList.toggle('active')
    document.querySelector('.nav-menu').classList.toggle('active')
  })
  document.querySelectorAll('.nav-link').forEach(n => n.addEventListener('click', () => {
    document.querySelector('.hamburger')?.classList.remove('active')
    document.querySelector('.nav-menu')?.classList.remove('active')
  }))
})

function getToken() { return sessionStorage.getItem(TOKEN_KEY) }
function checkAuth() { getToken() ? showAdmin() : showLogin() }
function showLogin() {
  document.getElementById('loginSection').style.display = 'flex'
  document.getElementById('adminInterface').style.display = 'none'
}
async function showAdmin() {
  document.getElementById('loginSection').style.display = 'none'
  document.getElementById('adminInterface').style.display = 'block'
  document.getElementById('notificationMessage').style.display = 'none'
  await loadPDFs()
}
function handleLogin() {
  const token = document.getElementById('githubToken').value.trim()
  if (!token) return showNotif('Token requis', 'error')
  sessionStorage.setItem(TOKEN_KEY, token)
  showAdmin()
}
function handleLogout() {
  sessionStorage.removeItem(TOKEN_KEY)
  showLogin()
}

// ─── OAuth Device Flow (connexion sans token) ───
let oauthPollTimer = null

async function startOAuth() {
  const clientId = document.getElementById('oauthClientId').value.trim()
  if (!clientId) return showNotif('Entre ton Client ID GitHub OAuth', 'error')
  try {
    const res = await fetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, scope: 'repo' })
    })
    if (!res.ok) throw new Error('Erreur GitHub')
    const data = await res.json()
    document.getElementById('oauthStep1').style.display = 'none'
    document.getElementById('oauthStep2').style.display = 'block'
    document.getElementById('userCodeDisplay').textContent = data.user_code
    document.getElementById('deviceVerificationLink').href = data.verification_uri
    const interval = (data.interval || 5) * 1000
    oauthPollTimer = setInterval(async () => {
      try {
        const pollRes = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: clientId, device_code: data.device_code, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' })
        })
        const pollData = await pollRes.json()
        if (pollData.access_token) {
          clearInterval(oauthPollTimer)
          oauthPollTimer = null
          sessionStorage.setItem(TOKEN_KEY, pollData.access_token)
          document.getElementById('oauthSection').style.display = 'none'
          showNotif('Connecté avec GitHub OAuth !', 'success')
          showAdmin()
        } else if (pollData.error === 'authorization_pending') {
          // Attente utilisateur...
        } else if (pollData.error === 'slow_down') {
          // Ralentir le polling
        } else if (pollData.error === 'expired_token') {
          clearInterval(oauthPollTimer)
          oauthPollTimer = null
          showNotif('Code expiré. Réessaie.', 'error')
          cancelOAuth()
        }
      } catch {}
    }, interval)
  } catch (e) {
    showNotif('Erreur OAuth: ' + e.message, 'error')
  }
}

function cancelOAuth() {
  if (oauthPollTimer) { clearInterval(oauthPollTimer); oauthPollTimer = null }
  document.getElementById('oauthStep1').style.display = 'block'
  document.getElementById('oauthStep2').style.display = 'none'
}

async function githubFetch(path, options = {}) {
  const token = getToken()
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      ...options.headers
    }
  })
  if (res.status === 401 || res.status === 403) {
    sessionStorage.removeItem(TOKEN_KEY)
    showLogin()
    throw new Error('Token invalide ou expiré')
  }
  return res
}

async function getFileSHA(path) {
  try {
    const res = await githubFetch(path)
    if (!res.ok) return null
    const data = await res.json()
    return data.sha
  } catch { return null }
}

async function saveJSON(path, data, msg) {
  const sha = await getFileSHA(path)
  const json = JSON.stringify(data, null, 2)
  const encoded = btoa(unescape(encodeURIComponent(json)))
  await githubFetch(path, {
    method: 'PUT',
    body: JSON.stringify({ message: msg, content: encoded, sha, branch: REPO_BRANCH })
  })
}

async function loadJSON(path) {
  try {
    const res = await githubFetch(path)
    if (!res.ok) throw new Error('Not found')
    const data = await res.json()
    return JSON.parse(atob(data.content.replace(/\n/g, '')))
  } catch { return null }
}

// ─── PDF Metadata ───
async function loadPDFs() {
  try {
    const res = await githubFetch(LISTE_PATH)
    const data = await res.json()
    const content = atob(data.content.replace(/\n/g, ''))
    pdfs = JSON.parse(content)
    document.getElementById('statTotal').textContent = pdfs.length
    document.getElementById('metaCount').textContent = pdfs.length
    renderBookList()
  } catch (e) {
    console.error(e)
    showNotif('Erreur chargement liste PDFs', 'error')
  }
}

function getSearchText(pdf) {
  const title = pdf.titre || pdf.nom_du_fichier.replace('.pdf', '').replace(/_/g, ' ')
  return (title + ' ' + pdf.nom_du_fichier + ' ' + (pdf.categorie || '') + ' ' + (pdf.auteur || '')).toLowerCase()
}

function renderBookList() {
  const list = document.getElementById('bookList')
  list.innerHTML = ''
  if (!pdfs || !pdfs.length) {
    list.innerHTML = '<div class="book-list-empty">Aucun PDF dans la liste.</div>'
    return
  }
  pdfs.forEach((pdf, i) => {
    if (searchQuery && !getSearchText(pdf).includes(searchQuery)) return
    const title = pdf.titre || pdf.nom_du_fichier.replace('.pdf', '').replace(/_/g, ' ')
    const item = document.createElement('div')
    item.className = 'book-list-item' + (i === selectedIndex ? ' selected' : '')
    item.dataset.index = i
    item.onclick = () => selectBook(i)
    const cat = pdf.categorie || 'Non classé'
    item.innerHTML = `
      <span class="bli-num">${i + 1}</span>
      <span class="bli-title">${esc(title)}</span>
      <span class="bli-cat">${esc(cat)}</span>
    `
    list.appendChild(item)
  })
}

function selectBook(index) {
  selectedIndex = index
  renderBookList()
  const pdf = pdfs[index]
  const title = pdf.titre || pdf.nom_du_fichier.replace('.pdf', '').replace(/_/g, ' ')
  document.getElementById('editFileLabel').innerHTML = `<i class="fas fa-file-pdf"></i> ${esc(pdf.nom_du_fichier)}`
  document.getElementById('editTitle').value = title
  document.getElementById('editDescription').value = pdf.description || ''
  document.getElementById('editAuthor').value = pdf.auteur || ''
  const catSelect = document.getElementById('editCategory')
  catSelect.innerHTML = CATEGORIES.map(c => `<option value="${c}" ${pdf.categorie === c ? 'selected' : ''}>${c}</option>`).join('')
  document.querySelector('.edit-placeholder').style.display = 'none'
  document.getElementById('editForm').style.display = 'block'
  const el = document.querySelector(`.book-list-item[data-index="${index}"]`)
  if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}

function deleteSelected() {
  if (selectedIndex < 0) return
  if (!confirm(`Retirer "${pdfs[selectedIndex].nom_du_fichier}" de la liste ?`)) return
  pdfs.splice(selectedIndex, 1)
  document.getElementById('metaCount').textContent = pdfs.length
  document.getElementById('statTotal').textContent = pdfs.length
  selectedIndex = -1
  document.querySelector('.edit-placeholder').style.display = ''
  document.getElementById('editForm').style.display = 'none'
  renderBookList()
  showNotif('PDF retiré de la liste (non supprimé du dépôt)', 'info')
}

async function saveChanges() {
  if (selectedIndex < 0) return
  pdfs[selectedIndex].titre = document.getElementById('editTitle').value
  pdfs[selectedIndex].description = document.getElementById('editDescription').value
  pdfs[selectedIndex].auteur = document.getElementById('editAuthor').value
  pdfs[selectedIndex].categorie = document.getElementById('editCategory').value
  showNotif('Sauvegarde en cours…', 'info')
  try {
    await saveJSON(LISTE_PATH, pdfs, 'Mise à jour des métadonnées des PDFs')
    renderBookList()
    showNotif('Modifications sauvegardées sur GitHub', 'success')
  } catch (e) {
    showNotif('Erreur: ' + e.message, 'error')
  }
}

// ─── Upload PDF ───
function handleFileDrop(file) {
  const fileInput = document.getElementById('newPdfFile')
  if (!file || file.type !== 'application/pdf') {
    return showNotif('Seuls les fichiers PDF sont acceptés', 'error')
  }
  if (file.size > 50 * 1024 * 1024) {
    return showNotif('Le fichier dépasse 50 Mo. Utilise git push manuellement.', 'error')
  }
  const dt = new DataTransfer()
  dt.items.add(file)
  fileInput.files = dt.files
  document.getElementById('dropzone').style.display = 'none'
  document.getElementById('uploadInfo').textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(1)} Mo)`
  document.querySelector('.upload-fields').style.display = 'block'
  document.getElementById('newPdfTitle').value = file.name.replace('.pdf', '').replace(/_/g, ' ')
}

function cancelUpload() {
  if (uploadAbort) { uploadAbort.abort(); uploadAbort = null }
  resetUpload()
  showNotif('Upload annulé', 'info')
}

function resetUpload() {
  document.getElementById('dropzone').style.display = ''
  document.querySelector('.upload-fields').style.display = 'none'
  document.getElementById('newPdfFile').value = ''
  document.getElementById('newPdfTitle').value = ''
  document.getElementById('newPdfDescription').value = ''
  document.getElementById('uploadProgress').style.display = 'none'
  document.getElementById('progressBar').style.width = '0%'
  document.getElementById('progressText').textContent = '0%'
  document.getElementById('cancelUploadBtn').style.display = 'none'
  document.getElementById('addPdfBtn').disabled = false
  document.getElementById('addPdfBtn').innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Uploader sur GitHub'
}

async function handleAddPdf() {
  const fileInput = document.getElementById('newPdfFile')
  const titleInput = document.getElementById('newPdfTitle')
  const descInput = document.getElementById('newPdfDescription')
  const file = fileInput.files[0]
  const title = titleInput.value.trim()
  const desc = descInput.value.trim()
  if (!file) return showNotif('Sélectionne un fichier PDF', 'error')
  if (!title) return showNotif('Entre un titre', 'error')
  uploadAbort = new AbortController()
  document.getElementById('uploadProgress').style.display = 'flex'
  document.getElementById('cancelUploadBtn').style.display = ''
  document.getElementById('addPdfBtn').disabled = true
  document.getElementById('addPdfBtn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Upload en cours…'
  try {
    const filename = file.name
    const path = DOCS_PATH + filename
    showNotif('Lecture du fichier…', 'info')
    const base64 = await readFileAsBase64(file, (pct) => {
      document.getElementById('progressBar').style.width = (pct * 0.3) + '%'
      document.getElementById('progressText').textContent = Math.round(pct * 30) + '%'
    })
    if (uploadAbort.signal.aborted) throw new Error('Annulé')
    document.getElementById('progressText').textContent = 'Vérification…'
    let sha
    try {
      const existRes = await githubFetch(path)
      if (existRes.ok) { const existData = await existRes.json(); sha = existData.sha }
    } catch {}
    if (uploadAbort.signal.aborted) throw new Error('Annulé')
    document.getElementById('progressBar').style.width = '35%'
    document.getElementById('progressText').textContent = 'Upload vers GitHub…'
    await githubFetch(path, {
      method: 'PUT',
      body: JSON.stringify({ message: `Ajout PDF: ${filename}`, content: base64, sha, branch: REPO_BRANCH })
    })
    document.getElementById('progressBar').style.width = '70%'
    document.getElementById('progressText').textContent = 'Mise à jour de la liste…'
    pdfs.push({ titre: title, description: desc || 'Aucune description disponible.', nom_du_fichier: filename, categorie: 'Non classé' })
    await saveJSON(LISTE_PATH, pdfs, 'Mise à jour liste-pdfs.json')
    document.getElementById('progressBar').style.width = '100%'
    document.getElementById('progressText').textContent = 'Terminé'
    resetUpload()
    renderBookList()
    document.getElementById('statTotal').textContent = pdfs.length
    showNotif('PDF ajouté avec succès sur GitHub', 'success')
  } catch (e) {
    if (e.message === 'Annulé') return
    showNotif('Erreur: ' + e.message, 'error')
    document.getElementById('addPdfBtn').disabled = false
    document.getElementById('addPdfBtn').innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Uploader sur GitHub'
    document.getElementById('cancelUploadBtn').style.display = 'none'
  }
}

function readFileAsBase64(file, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = () => reject(new Error('Erreur lecture fichier'))
    reader.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total) }
    reader.readAsDataURL(file)
  })
}

// ─── Testimonials ───
let testimonials = []
async function loadTestimonialsAdmin() {
  const d = await loadJSON(TESTIMONIALS_PATH)
  testimonials = d || []
  renderTestimonialsAdmin()
}
function renderTestimonialsAdmin() {
  const container = document.getElementById('testimonialsAdminList')
  document.getElementById('testimonialsCount').textContent = testimonials.length
  if (!testimonials || !testimonials.length) {
    container.innerHTML = '<div class="admin-empty"><i class="fas fa-quote-left"></i><p>Aucun témoignage.</p></div>'
    return
  }
  container.innerHTML = testimonials.map((t, i) => `
    <div class="testi-admin-item" data-index="${i}">
      <div style="display:flex;gap:0.6rem;align-items:center;flex-wrap:wrap">
        <span class="testi-admin-num">${i + 1}</span>
        <input class="testi-admin-name" value="${esc(t.nom)}" placeholder="Nom" style="flex:1;min-width:120px">
        <span class="testi-admin-date">${t.date || ''}</span>
        <button class="testi-admin-del" onclick="deleteTestimonial(${i})" title="Supprimer"><i class="fas fa-trash-alt"></i></button>
      </div>
      <textarea class="testi-admin-msg" rows="2" placeholder="Témoignage…" style="margin-top:0.5rem;width:100%">${esc(t.message)}</textarea>
    </div>
  `).join('')
}
function addTestimonial() {
  const name = document.getElementById('testiName').value.trim()
  const msg = document.getElementById('testiMessage').value.trim()
  if (!name || !msg) return showNotif('Nom et message requis', 'error')
  testimonials.push({ nom: name, message: msg, date: new Date().toISOString().slice(0, 10) })
  document.getElementById('addTestimonialForm').style.display = 'none'
  document.getElementById('testiName').value = ''
  document.getElementById('testiMessage').value = ''
  renderTestimonialsAdmin()
  showNotif('Témoignage ajouté (non sauvegardé)', 'info')
}
function deleteTestimonial(index) {
  if (!confirm('Supprimer ce témoignage ?')) return
  testimonials.splice(index, 1)
  renderTestimonialsAdmin()
  showNotif('Témoignage retiré', 'info')
}
async function saveTestimonials() {
  document.querySelectorAll('.testi-admin-item').forEach(el => {
    const i = parseInt(el.dataset.index)
    if (isNaN(i)) return
    testimonials[i].nom = el.querySelector('.testi-admin-name').value
    testimonials[i].message = el.querySelector('.testi-admin-msg').value
  })
  showNotif('Sauvegarde en cours…', 'info')
  try {
    await saveJSON(TESTIMONIALS_PATH, testimonials, 'Mise à jour des témoignages')
    showNotif('Témoignages sauvegardés', 'success')
  } catch (e) { showNotif('Erreur: ' + e.message, 'error') }
}

// ─── Donation ───
async function loadDonationGoal() {
  try {
    const d = await loadJSON(DONATION_GOAL_PATH)
    if (d) {
      document.getElementById('donationCurrentInput').value = d.current || 0
      document.getElementById('donationTargetInput').value = d.target || 150000
      document.getElementById('donationShowToggle').checked = d.show || false
    }
  } catch {}
  updateDonationPreview()
}
function updateDonationPreview() {
  const show = document.getElementById('donationShowToggle').checked
  document.getElementById('donationPreviewLabel').textContent = show ? 'Visible sur le site' : 'Masqué'
  document.getElementById('donationPreviewLabel').style.color = show ? 'var(--primary)' : 'var(--text3)'
}
async function saveDonationGoal() {
  const current = parseInt(document.getElementById('donationCurrentInput').value) || 0
  const target = parseInt(document.getElementById('donationTargetInput').value) || 150000
  const show = document.getElementById('donationShowToggle').checked
  showNotif('Sauvegarde en cours…', 'info')
  try {
    await saveJSON(DONATION_GOAL_PATH, { current, target, show, lastUpdated: new Date().toISOString().slice(0, 10) }, 'Mise à jour objectif de dons')
    showNotif('Objectif mis à jour', 'success')
  } catch (e) { showNotif('Erreur: ' + e.message, 'error') }
}

// ─── Mission Admin ───
let missionData = null
async function loadMission() {
  missionData = await loadJSON(MISSION_PATH) || {
    hero: { title: 'Notre Mission Humanitaire', subtitle: '' },
    intro: { title: 'Qui nous sommes', paragraphs: ['', ''] },
    stats: [{ number: '+50', label: 'Femmes accompagnées' }, { number: '+30', label: 'Personnes handicapées soutenues' }, { number: '+100', label: 'Familles aidées' }, { number: 'Depuis', label: '2024' }],
    womenTitle: 'Autonomisation des femmes', womenSubtitle: '', womenItems: [],
    disabledTitle: 'Aide aux personnes handicapées', disabledItems: [],
    poorTitle: 'Soutien aux familles démunies', poorItems: [],
    testimonials: []
  }
  renderMissionForm()
}
function renderMissionForm() {
  const d = missionData
  document.getElementById('missionHeroTitle').value = d.hero?.title || ''
  document.getElementById('missionHeroSub').value = d.hero?.subtitle || ''
  document.getElementById('missionIntroTitle').value = d.intro?.title || ''
  document.getElementById('missionIntroP1').value = d.intro?.paragraphs?.[0] || ''
  document.getElementById('missionIntroP2').value = d.intro?.paragraphs?.[1] || ''
  document.getElementById('stat1Num').value = d.stats?.[0]?.number || ''
  document.getElementById('stat1Label').value = d.stats?.[0]?.label || ''
  document.getElementById('stat2Num').value = d.stats?.[1]?.number || ''
  document.getElementById('stat2Label').value = d.stats?.[1]?.label || ''
  document.getElementById('stat3Num').value = d.stats?.[2]?.number || ''
  document.getElementById('stat3Label').value = d.stats?.[2]?.label || ''
  document.getElementById('stat4Num').value = d.stats?.[3]?.number || ''
  document.getElementById('stat4Label').value = d.stats?.[3]?.label || ''
  document.getElementById('womenTitle').value = d.womenTitle || ''
  document.getElementById('womenSub').value = d.womenSubtitle || ''
  document.getElementById('disabledTitle').value = d.disabledTitle || ''
  document.getElementById('poorTitle').value = d.poorTitle || ''
  renderMissionList('womenItemsContainer', 'womenItem', d.womenItems, (item) =>
    `<div style="display:flex;gap:0.5rem;margin-bottom:0.5rem;align-items:start">
      <select class="womenItem-icon" style="padding:0.5rem;background:var(--bg);border:1px solid rgba(255,255,255,0.06);border-radius:var(--radius);color:var(--text);font-size:0.8rem;font-family:var(--font);width:80px">
        <option value="sewing-needle" ${item.icon === 'sewing-needle' ? 'selected' : ''}>Couture</option>
        <option value="chart-line" ${item.icon === 'chart-line' ? 'selected' : ''}>Graphique</option>
        <option value="book-open" ${item.icon === 'book-open' ? 'selected' : ''}>Livre</option>
        <option value="hands-helping" ${item.icon === 'hands-helping' ? 'selected' : ''}>Aide</option>
        <option value="heart" ${item.icon === 'heart' ? 'selected' : ''}>Coeur</option>
        <option value="graduation-cap" ${item.icon === 'graduation-cap' ? 'selected' : ''}>Éducation</option>
      </select>
      <div style="flex:1">
        <input type="text" class="womenItem-title" value="${esc(item.title)}" placeholder="Titre" style="width:100%;margin-bottom:0.3rem;font-size:0.8rem;padding:0.4rem 0.6rem">
        <textarea class="womenItem-desc" rows="2" placeholder="Description" style="width:100%;font-size:0.8rem;padding:0.4rem 0.6rem">${esc(item.desc || '')}</textarea>
      </div>
      <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--accent);cursor:pointer;padding:0.3rem"><i class="fas fa-times"></i></button>
    </div>`)
  renderMissionList('disabledItemsContainer', 'disabledItem', d.disabledItems, (item) =>
    `<div style="display:flex;gap:0.5rem;margin-bottom:0.3rem;align-items:center">
      <input type="text" class="disabledItem-val" value="${esc(item)}" placeholder="Point…" style="flex:1;font-size:0.8rem;padding:0.4rem 0.6rem">
      <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--accent);cursor:pointer;padding:0.3rem"><i class="fas fa-times"></i></button>
    </div>`)
  renderMissionList('poorItemsContainer', 'poorItem', d.poorItems, (item) =>
    `<div style="display:flex;gap:0.5rem;margin-bottom:0.3rem;align-items:center">
      <input type="text" class="poorItem-val" value="${esc(item)}" placeholder="Point…" style="flex:1;font-size:0.8rem;padding:0.4rem 0.6rem">
      <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--accent);cursor:pointer;padding:0.3rem"><i class="fas fa-times"></i></button>
    </div>`)
  renderMissionList('misTestimonialsContainer', 'misTesti', d.testimonials, (item) =>
    `<div style="display:flex;gap:0.5rem;margin-bottom:0.5rem;align-items:start">
      <div style="flex:1">
        <div style="display:flex;gap:0.5rem;margin-bottom:0.3rem">
          <input type="text" class="misTesti-name" value="${esc(item.name)}" placeholder="Nom" style="flex:1;font-size:0.8rem;padding:0.4rem 0.6rem">
        </div>
        <textarea class="misTesti-text" rows="2" placeholder="Témoignage…" style="width:100%;font-size:0.8rem;padding:0.4rem 0.6rem">${esc(item.text || '')}</textarea>
      </div>
      <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--accent);cursor:pointer;padding:0.3rem"><i class="fas fa-times"></i></button>
    </div>`)
}
function renderMissionList(containerId, cls, items, renderFn) {
  const container = document.getElementById(containerId)
  container.innerHTML = ''
  items.forEach(item => { const div = document.createElement('div'); div.innerHTML = renderFn(item); container.appendChild(div) })
}
function addMissionListItem(containerId, cls, defaultValue) {
  const container = document.getElementById(containerId)
  const div = document.createElement('div')
  if (cls === 'womenItem') {
    div.innerHTML = `<div style="display:flex;gap:0.5rem;margin-bottom:0.5rem;align-items:start">
      <select class="womenItem-icon" style="padding:0.5rem;background:var(--bg);border:1px solid rgba(255,255,255,0.06);border-radius:var(--radius);color:var(--text);font-size:0.8rem;font-family:var(--font);width:80px">
        <option value="sewing-needle">Couture</option><option value="chart-line">Graphique</option>
        <option value="book-open">Livre</option><option value="hands-helping">Aide</option>
        <option value="heart">Coeur</option><option value="graduation-cap">Éducation</option>
      </select>
      <div style="flex:1">
        <input type="text" class="womenItem-title" placeholder="Titre" style="width:100%;margin-bottom:0.3rem;font-size:0.8rem;padding:0.4rem 0.6rem">
        <textarea class="womenItem-desc" rows="2" placeholder="Description" style="width:100%;font-size:0.8rem;padding:0.4rem 0.6rem"></textarea>
      </div>
      <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--accent);cursor:pointer;padding:0.3rem"><i class="fas fa-times"></i></button>
    </div>`
  } else if (cls === 'disabledItem') {
    div.innerHTML = `<div style="display:flex;gap:0.5rem;margin-bottom:0.3rem;align-items:center">
      <input type="text" class="disabledItem-val" placeholder="Point…" style="flex:1;font-size:0.8rem;padding:0.4rem 0.6rem">
      <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--accent);cursor:pointer;padding:0.3rem"><i class="fas fa-times"></i></button>
    </div>`
  } else if (cls === 'poorItem') {
    div.innerHTML = `<div style="display:flex;gap:0.5rem;margin-bottom:0.3rem;align-items:center">
      <input type="text" class="poorItem-val" placeholder="Point…" style="flex:1;font-size:0.8rem;padding:0.4rem 0.6rem">
      <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--accent);cursor:pointer;padding:0.3rem"><i class="fas fa-times"></i></button>
    </div>`
  }
  container.appendChild(div)
}
function addMisTestimonial() {
  const container = document.getElementById('misTestimonialsContainer')
  const div = document.createElement('div')
  div.innerHTML = `<div style="display:flex;gap:0.5rem;margin-bottom:0.5rem;align-items:start">
    <div style="flex:1">
      <div style="display:flex;gap:0.5rem;margin-bottom:0.3rem">
        <input type="text" class="misTesti-name" placeholder="Nom" style="flex:1;font-size:0.8rem;padding:0.4rem 0.6rem">
      </div>
      <textarea class="misTesti-text" rows="2" placeholder="Témoignage…" style="width:100%;font-size:0.8rem;padding:0.4rem 0.6rem"></textarea>
    </div>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--accent);cursor:pointer;padding:0.3rem"><i class="fas fa-times"></i></button>
  </div>`
  container.appendChild(div)
}
function collectMissionData() {
  const womenItems = []
  document.querySelectorAll('#womenItemsContainer > div').forEach(el => {
    const icon = el.querySelector('.womenItem-icon'); const title = el.querySelector('.womenItem-title'); const desc = el.querySelector('.womenItem-desc')
    if (title && title.value.trim()) womenItems.push({ icon: icon?.value || 'heart', title: title.value, desc: desc?.value || '' })
  })
  const disabledItems = []
  document.querySelectorAll('#disabledItemsContainer > div').forEach(el => {
    const val = el.querySelector('.disabledItem-val')
    if (val && val.value.trim()) disabledItems.push(val.value)
  })
  const poorItems = []
  document.querySelectorAll('#poorItemsContainer > div').forEach(el => {
    const val = el.querySelector('.poorItem-val')
    if (val && val.value.trim()) poorItems.push(val.value)
  })
  const testimonials = []
  document.querySelectorAll('#misTestimonialsContainer > div').forEach(el => {
    const name = el.querySelector('.misTesti-name'); const text = el.querySelector('.misTesti-text')
    if (name && name.value.trim() && text && text.value.trim()) testimonials.push({ name: name.value, text: text.value })
  })
  return {
    hero: { title: document.getElementById('missionHeroTitle').value, subtitle: document.getElementById('missionHeroSub').value },
    intro: { title: document.getElementById('missionIntroTitle').value, paragraphs: [document.getElementById('missionIntroP1').value, document.getElementById('missionIntroP2').value] },
    stats: [
      { number: document.getElementById('stat1Num').value, label: document.getElementById('stat1Label').value },
      { number: document.getElementById('stat2Num').value, label: document.getElementById('stat2Label').value },
      { number: document.getElementById('stat3Num').value, label: document.getElementById('stat3Label').value },
      { number: document.getElementById('stat4Num').value, label: document.getElementById('stat4Label').value }
    ],
    womenTitle: document.getElementById('womenTitle').value, womenSubtitle: document.getElementById('womenSub').value, womenItems,
    disabledTitle: document.getElementById('disabledTitle').value, disabledItems,
    poorTitle: document.getElementById('poorTitle').value, poorItems, testimonials
  }
}
async function saveMission() {
  const data = collectMissionData()
  showNotif('Sauvegarde en cours…', 'info')
  try {
    await saveJSON(MISSION_PATH, data, 'Mise à jour page Mission')
    missionData = data
    showNotif('Page Mission sauvegardée', 'success')
  } catch (e) { showNotif('Erreur: ' + e.message, 'error') }
}

// ─── Config (Analytics, etc.) ───
async function loadConfig() {
  const d = await loadJSON(CONFIG_PATH)
  const cfg = d || { googleAnalyticsId: '' }
  document.getElementById('gaIdInput').value = cfg.googleAnalyticsId || ''
}
async function saveConfig() {
  const data = { googleAnalyticsId: document.getElementById('gaIdInput').value.trim(), updatedAt: new Date().toISOString() }
  showNotif('Sauvegarde…', 'info')
  try {
    await saveJSON(CONFIG_PATH, data, 'Mise à jour configuration')
    showNotif('Configuration sauvegardée', 'success')
  } catch (e) { showNotif('Erreur: ' + e.message, 'error') }
}

// ─── Gallery Admin ───
let selectedGalleryFiles = []
function loadGalleryAdmin() {
  document.getElementById('galleryPreviewContainer').innerHTML = ''
}
function handleGalleryFileSelect(e) {
  selectedGalleryFiles = Array.from(e.target.files)
  const container = document.getElementById('galleryPreviewContainer')
  container.innerHTML = ''
  selectedGalleryFiles.forEach((f, i) => {
    const url = URL.createObjectURL(f)
    container.innerHTML += `<div class="gallery-preview-item"><img src="${url}" alt=""><span>${f.name}</span><button onclick="removeGalleryFile(${i})"><i class="fas fa-times"></i></button></div>`
  })
  document.getElementById('galleryUploadBtnRow').style.display = selectedGalleryFiles.length ? '' : 'none'
}
function removeGalleryFile(idx) {
  selectedGalleryFiles.splice(idx, 1)
  document.getElementById('galleryGitFile').value = ''
  loadGalleryAdmin()
  if (selectedGalleryFiles.length) {
    const dt = new DataTransfer()
    selectedGalleryFiles.forEach(f => dt.items.add(f))
    document.getElementById('galleryGitFile').files = dt.files
    const container = document.getElementById('galleryPreviewContainer')
    container.innerHTML = ''
    selectedGalleryFiles.forEach((f, i) => {
      const url = URL.createObjectURL(f)
      container.innerHTML += `<div class="gallery-preview-item"><img src="${url}" alt=""><span>${f.name}</span><button onclick="removeGalleryFile(${i})"><i class="fas fa-times"></i></button></div>`
    })
  }
}
async function uploadGalleryToGitHub() {
  if (!selectedGalleryFiles.length) return showNotif('Sélectionne des images', 'error')
  showNotif('Upload des images en cours…', 'info')
  for (let i = 0; i < selectedGalleryFiles.length; i++) {
    const file = selectedGalleryFiles[i]
    const path = GALLERY_PATH + file.name
    try {
      const base64 = await readFileAsBase64(file)
      const sha = await getFileSHA(path)
      await githubFetch(path, {
        method: 'PUT',
        body: JSON.stringify({ message: `Ajout image mission: ${file.name}`, content: base64, sha, branch: REPO_BRANCH })
      })
      showNotif(`Image ${i+1}/${selectedGalleryFiles.length}: ${file.name} uploadée`, 'success')
    } catch (e) {
      showNotif(`Erreur upload ${file.name}: ${e.message}`, 'error')
    }
  }
  showNotif('Upload terminé ! Les images sont sur GitHub.', 'success')
  selectedGalleryFiles = []
  document.getElementById('galleryGitFile').value = ''
  document.getElementById('galleryPreviewContainer').innerHTML = ''
  document.getElementById('galleryUploadBtnRow').style.display = 'none'
}
async function saveGallerySettings() {
  const paths = document.getElementById('galleryPathsInput').value.split('\n').map(s => s.trim()).filter(Boolean)
  await saveJSON(GALLERY_PATH + 'gallery.json', { images: paths, updatedAt: new Date().toISOString() }, 'Mise à jour galerie')
  showNotif('Configuration galerie sauvegardée', 'success')
}

// ─── Home (Accueil) Admin ───
let homeData = null
const HOME_PATH = 'assets/data/accueil.json'

async function loadHome() {
  homeData = await loadJSON(HOME_PATH) || {
    heroBadge: '100% Gratuit · Sans inscription',
    heroTitle: 'La Parole de Dieu\nà portée de tous',
    heroSubtitle: '',
    missionTitle: 'Notre Mission',
    missionSubtitle: '',
    values: [],
    donateTitle: 'Soutenez l\'Œuvre',
    donateSubtitle: '',
    donateImpact: [],
    newsletterTitle: 'Restez informé',
    newsletterText: ''
  }
  renderHomeForm()
}

function renderHomeForm() {
  const d = homeData
  document.getElementById('homeHeroBadge').value = d.heroBadge || ''
  document.getElementById('homeHeroTitle').value = d.heroTitle || ''
  document.getElementById('homeHeroSub').value = d.heroSubtitle || ''
  document.getElementById('homeMissionTitle').value = d.missionTitle || ''
  document.getElementById('homeMissionSub').value = d.missionSubtitle || ''
  document.getElementById('homeDonateTitle').value = d.donateTitle || ''
  document.getElementById('homeDonateSub').value = d.donateSubtitle || ''
  document.getElementById('homeImpacts').value = (d.donateImpact || []).join('\n')
  document.getElementById('homeNewsletterTitle').value = d.newsletterTitle || ''
  document.getElementById('homeNewsletterText').value = d.newsletterText || ''
  const container = document.getElementById('homeValuesContainer')
  container.innerHTML = ''
  ;(d.values || []).forEach(v => {
    addHomeValueItemDOM(v.icon || 'lock-open', v.title || '', v.desc || '')
  })
}

function addHomeValueItemDOM(icon, title, desc) {
  const container = document.getElementById('homeValuesContainer')
  const div = document.createElement('div')
  div.style.cssText = 'display:flex;gap:0.5rem;margin-bottom:0.5rem;align-items:start;padding:0.8rem;background:var(--bg);border-radius:var(--radius)'
  div.innerHTML = `
    <div style="flex:1">
      <div style="display:flex;gap:0.5rem;margin-bottom:0.3rem">
        <input type="text" class="hv-icon" value="${esc(icon)}" placeholder="Icon FA (ex: lock-open)" style="width:40%;font-size:0.8rem;padding:0.4rem 0.6rem">
        <input type="text" class="hv-title" value="${esc(title)}" placeholder="Titre" style="flex:1;font-size:0.8rem;padding:0.4rem 0.6rem">
      </div>
      <textarea class="hv-desc" rows="2" placeholder="Description" style="width:100%;font-size:0.8rem;padding:0.4rem 0.6rem">${esc(desc)}</textarea>
    </div>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--accent);cursor:pointer;padding:0.3rem"><i class="fas fa-times"></i></button>`
  container.appendChild(div)
}

function addHomeValueItem() {
  addHomeValueItemDOM('lock-open', '', '')
}

async function saveHome() {
  const values = []
  document.querySelectorAll('#homeValuesContainer > div').forEach(el => {
    const icon = el.querySelector('.hv-icon')?.value || 'lock-open'
    const title = el.querySelector('.hv-title')?.value || ''
    const desc = el.querySelector('.hv-desc')?.value || ''
    if (title) values.push({ icon, title, desc })
  })
  const data = {
    heroBadge: document.getElementById('homeHeroBadge').value,
    heroTitle: document.getElementById('homeHeroTitle').value,
    heroSubtitle: document.getElementById('homeHeroSub').value,
    missionTitle: document.getElementById('homeMissionTitle').value,
    missionSubtitle: document.getElementById('homeMissionSub').value,
    values,
    donateTitle: document.getElementById('homeDonateTitle').value,
    donateSubtitle: document.getElementById('homeDonateSub').value,
    donateImpact: document.getElementById('homeImpacts').value.split('\n').map(s => s.trim()).filter(Boolean),
    newsletterTitle: document.getElementById('homeNewsletterTitle').value,
    newsletterText: document.getElementById('homeNewsletterText').value
  }
  showNotif('Sauvegarde en cours…', 'info')
  try {
    await saveJSON(HOME_PATH, data, 'Mise à jour page d\'accueil')
    homeData = data
    showNotif('Page d\'accueil sauvegardée', 'success')
  } catch (e) { showNotif('Erreur: ' + e.message, 'error') }
}

// ─── Blog Admin ───
let articles = []
const ARTICLES_PATH = 'assets/data/articles.json'

async function loadBlog() {
  articles = await loadJSON(ARTICLES_PATH) || []
  renderBlogAdmin()
}

function renderBlogAdmin() {
  document.getElementById('blogCount').textContent = articles.length
  const container = document.getElementById('articlesAdminContainer')
  if (!articles.length) {
    container.innerHTML = '<div class="admin-empty"><i class="fas fa-newspaper"></i><p>Aucun article. Cliquez sur "Nouvel article".</p></div>'
    return
  }
  container.innerHTML = articles.map((a, i) => `
    <div class="testi-admin-item" data-article-index="${i}">
      <div style="display:flex;gap:0.6rem;align-items:center;flex-wrap:wrap;margin-bottom:0.5rem">
        <span class="testi-admin-num">${i + 1}</span>
        <input class="art-title" value="${esc(a.title)}" placeholder="Titre" style="flex:1;min-width:150px">
        <input class="art-date" value="${esc(a.date || '')}" placeholder="Date" style="width:120px;font-size:0.78rem">
        <button onclick="deleteArticle(${i})" style="background:none;border:none;color:var(--accent);cursor:pointer"><i class="fas fa-trash-alt"></i></button>
      </div>
      <textarea class="art-excerpt" rows="2" placeholder="Résumé" style="width:100%;margin-bottom:0.3rem;font-size:0.8rem">${esc(a.excerpt || '')}</textarea>
      <textarea class="art-content" rows="4" placeholder="Contenu (Markdown ou HTML simple)" style="width:100%;font-size:0.8rem">${esc(a.content || '')}</textarea>
    </div>
  `).join('')
}

function addArticle() {
  articles.push({ title: 'Nouvel article', date: new Date().toISOString().slice(0, 10), excerpt: '', content: '' })
  renderBlogAdmin()
  showNotif('Article ajouté (non sauvegardé)', 'info')
}

function deleteArticle(index) {
  if (!confirm('Supprimer cet article ?')) return
  articles.splice(index, 1)
  renderBlogAdmin()
  showNotif('Article retiré', 'info')
}

async function saveArticles() {
  document.querySelectorAll('.testi-admin-item[data-article-index]').forEach(el => {
    const i = parseInt(el.dataset.articleIndex)
    if (isNaN(i)) return
    articles[i].title = el.querySelector('.art-title').value
    articles[i].date = el.querySelector('.art-date').value
    articles[i].excerpt = el.querySelector('.art-excerpt').value
    articles[i].content = el.querySelector('.art-content').value
  })
  showNotif('Sauvegarde en cours…', 'info')
  try {
    await saveJSON(ARTICLES_PATH, articles, 'Mise à jour des articles')
    showNotif('Articles sauvegardés', 'success')
  } catch (e) { showNotif('Erreur: ' + e.message, 'error') }
}

// ─── Stats ───
function loadStats() {
  const container = document.getElementById('statsList')
  try {
    const raw = localStorage.getItem('downloadStats')
    if (!raw) { container.innerHTML = '<div class="admin-empty"><i class="fas fa-inbox"></i><p>Aucune donnée pour le moment. Consultez des PDFs depuis le site pour générer des stats.</p></div>'; return }
    const stats = JSON.parse(raw)
    const entries = Object.entries(stats).sort((a, b) => b[1] - a[1])
    const total = entries.reduce((s, e) => s + e[1], 0)
    const maxCount = entries[0]?.[1] || 1
    container.innerHTML = `
      <p style="font-size:0.85rem;color:var(--text2);margin-bottom:1rem">Total des consultations : <strong style="color:var(--text)">${total}</strong></p>
      <div style="display:flex;flex-direction:column;gap:0.4rem">
        ${entries.slice(0, 50).map(([name, count]) => {
          const pct = (count / maxCount) * 100
          const shortName = name.length > 50 ? name.slice(0, 47) + '…' : name
          return `<div style="display:flex;align-items:center;gap:0.5rem;font-size:0.78rem">
            <span style="min-width:2rem;text-align:right;color:var(--text3);font-weight:600">${count}</span>
            <div style="flex:1;height:18px;background:var(--bg);border-radius:100px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--primary),var(--accent));border-radius:100px;transition:width 0.5s"></div>
            </div>
            <span style="flex:1;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(shortName)}</span>
          </div>`
        }).join('')}
      </div>`
  } catch (e) { container.innerHTML = '<p style="color:var(--accent)">Erreur: ' + e.message + '</p>' }
}

function resetStats() {
  if (!confirm('Réinitialiser toutes les statistiques ?')) return
  localStorage.removeItem('downloadStats')
  loadStats()
  showNotif('Stats réinitialisées', 'info')
}

async function publishStats() {
  try {
    const raw = localStorage.getItem('downloadStats')
    const stats = raw ? JSON.parse(raw) : {}
    await saveJSON('assets/data/stats.json', { stats, updatedAt: new Date().toISOString() }, 'Publication des statistiques')
    showNotif('Stats publiées sur GitHub', 'success')
  } catch (e) { showNotif('Erreur: ' + e.message, 'error') }
}

// ─── UI ───
function showNotif(msg, type) {
  const el = document.getElementById('notificationMessage')
  if (!el) return
  el.textContent = msg
  el.className = 'upload-status ' + type
  el.style.display = 'block'
  setTimeout(() => el.style.display = 'none', 6000)
}
function esc(s) {
  if (typeof s !== 'string') return ''
  return s.replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]))
}
