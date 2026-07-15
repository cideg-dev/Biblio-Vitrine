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

document.addEventListener('DOMContentLoaded', () => {
    checkAuth()
    document.getElementById('loginBtn').addEventListener('click', handleLogin)
    document.getElementById('logoutBtn').addEventListener('click', handleLogout)
    document.getElementById('saveChangesBtn').addEventListener('click', saveChanges)
    document.getElementById('deleteFromListBtn').addEventListener('click', deleteSelected)
    document.getElementById('addPdfBtn').addEventListener('click', handleAddPdf)
    document.getElementById('cancelUploadBtn').addEventListener('click', cancelUpload)
    document.getElementById('metaSearch').addEventListener('input', e => { searchQuery = e.target.value.toLowerCase(); renderBookList() })

    // Testimonials
    document.getElementById('addTestimonialBtn').addEventListener('click', () => {
        document.getElementById('addTestimonialForm').style.display = 'block'
    })
    document.getElementById('confirmAddTestimonial').addEventListener('click', addTestimonial)
    document.getElementById('saveTestimonialsBtn').addEventListener('click', saveTestimonials)

    // Tabs
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'))
            document.querySelectorAll('.admin-tab-content').forEach(t => t.classList.remove('active'))
            tab.classList.add('active')
            document.getElementById('tab-' + tab.dataset.tab).classList.add('active')
            if (tab.dataset.tab === 'testimonials') loadTestimonialsAdmin()
        })
    })

    // Dropzone
    const dz = document.getElementById('dropzone')
    const fileInput = document.getElementById('newPdfFile')
    dz.addEventListener('click', () => fileInput.click())
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over') })
    dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'))
    dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('drag-over'); handleFileDrop(e.dataTransfer.files[0]) })
    fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleFileDrop(fileInput.files[0]) })

    // Enter key on password field
    document.getElementById('githubToken').addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin() })
})

function getToken() { return localStorage.getItem(TOKEN_KEY) }

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
    localStorage.setItem(TOKEN_KEY, token)
    showAdmin()
}

function handleLogout() {
    localStorage.removeItem(TOKEN_KEY)
    showLogin()
}

// ─── GitHub API ───
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
        localStorage.removeItem(TOKEN_KEY)
        showLogin()
        throw new Error('Token invalide ou expiré')
    }
    return res
}

// ─── Load & Display ───
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
    return (title + ' ' + pdf.nom_du_fichier).toLowerCase()
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
        item.innerHTML = `
            <span class="bli-num">${i + 1}</span>
            <span class="bli-title">${esc(title)}</span>
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
    document.querySelector('.edit-placeholder').style.display = 'none'
    document.getElementById('editForm').style.display = 'block'
    // Scroll the selected item into view in the list
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

// ─── Save Metadata ───
async function saveChanges() {
    if (selectedIndex < 0) return
    pdfs[selectedIndex].titre = document.getElementById('editTitle').value
    pdfs[selectedIndex].description = document.getElementById('editDescription').value

    showNotif('Sauvegarde en cours…', 'info')
    try {
        const res = await githubFetch(LISTE_PATH)
        const data = await res.json()
        const json = JSON.stringify(pdfs, null, 2)
        const encoded = btoa(unescape(encodeURIComponent(json)))
        await githubFetch(LISTE_PATH, {
            method: 'PUT',
            body: JSON.stringify({
                message: 'Mise à jour des métadonnées des PDFs',
                content: encoded,
                sha: data.sha,
                branch: REPO_BRANCH
            })
        })
        renderBookList()
        showNotif('✅ Modifications sauvegardées sur GitHub', 'success')
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

    // Create a FileList-like entry
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

        // Step 1: Read file as base64 (with progress)
        showNotif('Lecture du fichier…', 'info')
        const base64 = await readFileAsBase64(file, (pct) => {
            document.getElementById('progressBar').style.width = (pct * 0.3) + '%'
            document.getElementById('progressText').textContent = Math.round(pct * 30) + '%'
        })

        if (uploadAbort.signal.aborted) throw new Error('Annulé')

        // Step 2: Check if file exists on GitHub
        document.getElementById('progressText').textContent = 'Vérification…'
        let sha
        try {
            const existRes = await githubFetch(path)
            if (existRes.ok) {
                const existData = await existRes.json()
                sha = existData.sha
            }
        } catch {}

        if (uploadAbort.signal.aborted) throw new Error('Annulé')

        // Step 3: Upload to GitHub
        document.getElementById('progressBar').style.width = '35%'
        document.getElementById('progressText').textContent = 'Upload vers GitHub…'

        await githubFetch(path, {
            method: 'PUT',
            body: JSON.stringify({
                message: `Ajout PDF: ${filename}`,
                content: base64,
                sha,
                branch: REPO_BRANCH
            })
        })

        document.getElementById('progressBar').style.width = '70%'
        document.getElementById('progressText').textContent = 'Mise à jour de la liste…'

        // Step 4: Update liste-pdfs.json
        pdfs.push({ titre: title, description: desc || 'Aucune description disponible.', nom_du_fichier: filename })
        await savePdfList()

        document.getElementById('progressBar').style.width = '100%'
        document.getElementById('progressText').textContent = '✅ Terminé'

        resetUpload()
        displayPDFs()
        document.getElementById('statTotal').textContent = pdfs.length
        showNotif('✅ PDF ajouté avec succès sur GitHub', 'success')
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
        reader.onload = () => {
            const base64 = reader.result.split(',')[1]
            resolve(base64)
        }
        reader.onerror = () => reject(new Error('Erreur lecture fichier'))
        reader.onprogress = (e) => {
            if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total)
        }
        reader.readAsDataURL(file)
    })
}

async function savePdfList() {
    const res = await githubFetch(LISTE_PATH)
    const data = await res.json()
    const json = JSON.stringify(pdfs, null, 2)
    const encoded = btoa(unescape(encodeURIComponent(json)))
    await githubFetch(LISTE_PATH, {
        method: 'PUT',
        body: JSON.stringify({
            message: 'Mise à jour liste-pdfs.json',
            content: encoded,
            sha: data.sha,
            branch: REPO_BRANCH
        })
    })
}

// ─── Testimonials Admin ───
let testimonials = []

async function loadTestimonialsAdmin() {
    try {
        const res = await githubFetch(TESTIMONIALS_PATH)
        const data = await res.json()
        const content = atob(data.content.replace(/\n/g, ''))
        testimonials = JSON.parse(content)
        renderTestimonialsAdmin()
    } catch (e) {
        document.getElementById('testimonialsAdminList').innerHTML = '<div class="admin-empty"><i class="fas fa-inbox"></i><p>Erreur chargement.</p></div>'
    }
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
    // Sync inputs
    document.querySelectorAll('.testi-admin-item').forEach(el => {
        const i = parseInt(el.dataset.index)
        if (isNaN(i)) return
        testimonials[i].nom = el.querySelector('.testi-admin-name').value
        testimonials[i].message = el.querySelector('.testi-admin-msg').value
    })
    showNotif('Sauvegarde en cours…', 'info')
    try {
        const res = await githubFetch(TESTIMONIALS_PATH)
        const data = await res.json()
        const json = JSON.stringify(testimonials, null, 2)
        const encoded = btoa(unescape(encodeURIComponent(json)))
        await githubFetch(TESTIMONIALS_PATH, {
            method: 'PUT',
            body: JSON.stringify({
                message: 'Mise à jour des témoignages',
                content: encoded,
                sha: data.sha,
                branch: REPO_BRANCH
            })
        })
        showNotif('✅ Témoignages sauvegardés', 'success')
    } catch (e) {
        showNotif('Erreur: ' + e.message, 'error')
    }
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
