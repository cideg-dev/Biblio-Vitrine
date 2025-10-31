# Guide Simplifié pour Ajouter un Nouvel Article

Ce guide vous explique, étape par étape, comment ajouter un nouvel article à votre site en utilisant la page d'administration pour vous assister.

---

### Étape 1 : Écrire et Générer votre Article

1.  **Ouvrez le fichier `admin.html`** dans votre navigateur.

2.  **Connectez-vous** avec votre mot de passe administrateur.

3.  Allez à la nouvelle section **"Gestion des Articles"** (que je vais créer).

4.  **Remplissez les champs :**
    *   `Titre de l'article` : Le titre de votre nouvel article.
    *   `Auteur` : Votre nom.
    *   `Contenu de l'article` : Écrivez ici tout le corps de votre article.

5.  Cliquez sur le bouton **"Générer le Code de l'Article"**.

6.  Deux blocs de code apparaîtront. Ne vous inquiétez pas, vous n'aurez qu'à les copier-coller.
    *   **Bloc 1 : Code HTML de l'Article**
    *   **Bloc 2 : Ligne JSON pour la Liste**

---

### Étape 2 : Créer le Fichier de votre Article

1.  Dans votre explorateur de fichiers, allez dans le dossier `articles/` (que je vais créer).

2.  **Créez un nouveau fichier texte.**

3.  **Nommez ce fichier** avec un nom simple et en minuscules, se terminant par `.html` (par exemple : `etude-sur-la-foi.html`).

4.  Ouvrez ce nouveau fichier avec un éditeur de texte (comme le Bloc-notes).

5.  **Copiez** le **Bloc 1 (Code HTML de l'Article)** depuis la page `admin.html`.

6.  **Collez** ce code dans votre nouveau fichier `.html`.

7.  **Enregistrez** le fichier.

---

### Étape 3 : Ajouter l'Article à la Liste Principale

1.  Dans votre explorateur de fichiers, allez dans le dossier `assets/config/`.

2.  Ouvrez le fichier `liste-articles.json`.

3.  **Copiez** le **Bloc 2 (Ligne JSON pour la Liste)** depuis la page `admin.html`.

4.  **Collez** cette ligne à l'intérieur des crochets `[]` du fichier `liste-articles.json`. **Important :** Assurez-vous d'ajouter une virgule `,` après l'élément précédent s'il y en a un.

    *Exemple :*
    ```json
    [
      {
        "title": "Un Ancien Article",
        "file": "ancien-article.html"
      },
      { 
        "title": "Votre Nouvel Article",
        "file": "votre-nouvel-article.html"
      } <--- Vous collez votre bloc ici, après la virgule.
    ]
    ```

5.  **Enregistrez** le fichier `liste-articles.json`.

---

### Étape 4 : Publier les Changements

1.  Une fois les étapes 2 et 3 terminées, revenez me voir (l'assistant Gemini).

2.  Dites-moi simplement : **"J'ai ajouté un nouvel article, tu peux commiter et pousser les changements."**

3.  Je m'occuperai alors de toutes les commandes `git` pour mettre votre nouvel article en ligne.

---

Ce processus vous permet de vous concentrer sur l'écriture sans vous soucier du code, tout en respectant les contraintes techniques de votre site.
