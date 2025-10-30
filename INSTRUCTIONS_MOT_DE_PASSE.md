# Gestion du Mot de Passe Administrateur

Ce document explique comment changer votre mot de passe administrateur et comment le réinitialiser en cas de perte de votre machine de développement.

**Le principe fondamental :** Votre mot de passe n'est stocké nulle part. Seule son empreinte (hash) est stockée dans un fichier local (`assets/config/auth.json`) qui est ignoré par Git. La clé de tout est le **mot de passe que vous mémorisez**.

---

## 1. Changer votre mot de passe (Procédure normale)

Suivez ces étapes pour mettre à jour votre mot de passe sur votre machine de travail.

1.  **Ouvrez l'outil de génération :**
    Double-cliquez sur le fichier `generateur-hash.html` à la racine de votre projet pour l'ouvrir dans votre navigateur.

2.  **Générez votre nouvelle empreinte :**
    Dans la page, tapez votre **nouveau** mot de passe et cliquez sur "Générer l'empreinte".

3.  **Copiez l'empreinte** qui apparaît.

4.  **Ouvrez le fichier de configuration :**
    Ouvrez le fichier `assets/config/auth.json`.

5.  **Mettez à jour le fichier :**
    Le fichier contient une ligne : `{ "hash": "ancienne_empreinte" }`. Remplacez `ancienne_empreinte` par l'empreinte que vous venez de copier (en la gardant entre les guillemets).

6.  **Sauvegardez** le fichier `auth.json`.

Votre mot de passe est maintenant mis à jour.

---

## 2. Réinitialiser votre mot de passe (Après une perte de données ou sur un nouvel ordinateur)

Si vous perdez votre disque dur ou si vous changez d'ordinateur, voici comment restaurer votre accès.

1.  **Récupérez le projet depuis GitHub :**
    Sur votre nouvelle machine, clonez le projet avec la commande :
    ```bash
    git clone https://github.com/cideg-dev/Biblio-Vitrine
    ```

2.  **Recréez votre empreinte :**
    - Allez dans le dossier `Biblio-Vitrine` qui vient d'être créé.
    - Ouvrez le fichier `generateur-hash.html` dans votre navigateur.
    - Tapez le **mot de passe que vous aviez mémorisé**.
    - Générez l'empreinte et copiez-la.

3.  **Créez le nouveau fichier de configuration :**
    - Allez dans le dossier `assets`.
    - Créez un nouveau dossier nommé `config`.
    - Dans `config`, créez un nouveau fichier nommé `auth.json`.
    - Dans ce fichier, écrivez le contenu suivant, en collant votre empreinte :
      ```json
      {
          "hash": "VOTRE_EMPREINTE_COPIÉE_ICI"
      }
      ```
    - Sauvegardez le fichier.

Votre accès administrateur est maintenant restauré.
