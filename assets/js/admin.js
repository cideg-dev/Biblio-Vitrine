let pdfs = []
const REPO_OWNER = 'cideg-dev'
const REPO_NAME = 'Biblio-Vitrine'
const REPO_BRANCH = 'master'
const LISTE_PATH = 'assets/documents/liste-pdfs.json'
const DOCS_PATH = 'assets/documents/'
const TOKEN_KEY = 'githubAdminToken'

document.addEventListener('DOMContentLoaded', () => {
    checkAuth()
    document.getElementById('loginBtn').addEventListener('click', handleLogin)
    document.getElementById('logoutBtn').addEventListener('click', handleLogout)
    document.getElementById('saveChangesBtn').addEventListener('click', saveChanges)
    document.getElementById('addPdfBtn').addEventListener('click', handleAddPdf)
})

function getToken() {
    return localStorage.getItem(TOKEN_KEY)
}

function checkAuth() {
    getToken() ? showAdmin() : showLogin()
}

function showLogin() {
    document.getElementById('loginSection').style.display = 'block'
    document.getElementById('adminInterface').style.display = 'none'
}

async function showAdmin() {
    document.getElementById('loginSection').style.display = 'none'
    document.getElementById('adminInterface').style.display = 'block'
    await loadPDFs()
}

function handleLogin() {
    const token = document.getElementById('githubToken').value.trim()
    if (!token) return alert('Token requis')
    localStorage.setItem(TOKEN_KEY, token)
    showAdmin()
}

function handleLogout() {
    localStorage.removeItem(TOKEN_KEY)
    showLogin()
}

async function githubFetch(path, options = {}) {
    const token = getToken()
    const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
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

async function loadPDFs() {
    try {
        const res = await githubFetch(LISTE_PATH)
        const data = await res.json()
        const content = atob(data.content.replace(/\n/g, ''))
        pdfs = JSON.parse(content)
        displayPDFs()
    } catch (e) {
        console.error(e)
        showNotification('Erreur chargement liste PDFs', 'error')
    }
}

function displayPDFs() {
    const container = document.getElementById('existingPDFs')
    container.innerHTML = ''
    if (!pdfs || !pdfs.length) {
        container.innerHTML = '<p>Aucun PDF.</p>'
        document.getElementById('saveChangesBtn').style.display = 'none'
        return
    }
    pdfs.forEach((pdf, i) => {
        const item = document.createElement('div')
        item.className = 'pdf-item'
        item.innerHTML = `
            <div class="form-group">
                <label>Titre :</label>
                <input type="text" class="pdf-title-input" value="${esc(pdf.titre)}">
            </div>
            <div class="form-group">
                <label>Description :</label>
                <textarea class="pdf-description-input">${esc(pdf.description)}</textarea>
            </div>
            <div class="form-group">
                <label>Fichier :</label>
                <input type="text" class="pdf-filename-input" value="${esc(pdf.nom_du_fichier)}" readonly>
            </div>
            <div class="pdf-actions">
                <button class="btn btn-secondary" onclick="deletePDF(${i})">Supprimer</button>
            </div>`
        container.appendChild(item)
    })
    document.getElementById('saveChangesBtn').style.display = 'block'
}

function deletePDF(index) {
    if (confirm(`Supprimer "${pdfs[index].nom_du_fichier}" ?`)) {
        pdfs.splice(index, 1)
        displayPDFs()
    }
}

async function saveChanges() {
    showNotification('Sauvegarde...', 'info')
    const items = document.querySelectorAll('.pdf-item')
    const newList = []
    items.forEach(item => {
        newList.push({
            titre: item.querySelector('.pdf-title-input').value,
            description: item.querySelector('.pdf-description-input').value,
            nom_du_fichier: item.querySelector('.pdf-filename-input').value
        })
    })
    try {
        const res = await githubFetch(LISTE_PATH)
        const data = await res.json()
        const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(newList, null, 2))))
        await githubFetch(LISTE_PATH, {
            method: 'PUT',
            body: JSON.stringify({
                message: 'Mise à jour des métadonnées des PDFs',
                content: encoded,
                sha: data.sha,
                branch: REPO_BRANCH
            })
        })
        pdfs = newList
        showNotification('Métadonnées sauvegardées', 'success')
    } catch (e) {
        showNotification('Erreur sauvegarde: ' + e.message, 'error')
    }
}

async function handleAddPdf() {
    const fileInput = document.getElementById('newPdfFile')
    const titleInput = document.getElementById('newPdfTitle')
    const descInput = document.getElementById('newPdfDescription')
    const file = fileInput.files[0]
    const title = titleInput.value.trim()
    const desc = descInput.value.trim()

    if (!file) return showNotification('Sélectionne un fichier PDF', 'error')
    if (!title) return showNotification('Entre un titre', 'error')

    showNotification('Upload en cours...', 'info')

    try {
        const filename = file.name
        const path = DOCS_PATH + filename

        const reader = new FileReader()
        reader.onload = async (e) => {
            const base64 = e.target.result.split(',')[1]

            let sha
            try {
                const existRes = await githubFetch(path)
                const existData = await existRes.json()
                if (existRes.ok) sha = existData.sha
            } catch { }

            await githubFetch(path, {
                method: 'PUT',
                body: JSON.stringify({
                    message: `Ajout PDF: ${filename}`,
                    content: base64,
                    sha,
                    branch: REPO_BRANCH
                })
            })

            pdfs.push({ titre: title, description: desc || 'Aucune description disponible.', nom_du_fichier: filename })
            await savePdfList()

            fileInput.value = ''
            titleInput.value = ''
            descInput.value = ''
            displayPDFs()
            showNotification('PDF ajouté avec succès', 'success')
        }
        reader.readAsDataURL(file)
    } catch (e) {
        showNotification('Erreur upload: ' + e.message, 'error')
    }
}

async function savePdfList() {
    const res = await githubFetch(LISTE_PATH)
    const data = await res.json()
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(pdfs, null, 2))))
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

function showNotification(msg, type) {
    const el = document.getElementById('notificationMessage')
    if (!el) return
    el.textContent = msg
    el.className = `upload-status ${type}`
    el.style.display = 'block'
    setTimeout(() => el.style.display = 'none', 5000)
}

function esc(str) {
    if (typeof str !== 'string') return ''
    return str.replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]))
}
