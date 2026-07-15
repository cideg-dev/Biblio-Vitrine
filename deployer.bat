@echo off
echo ==================================================
echo      Mise en ligne des changements du catalogue
echo ==================================================

echo.
echo --- Ajout des fichiers modifies (git add) ---
git add assets/documents/liste-pdfs.json

echo.
echo --- Creation du commit (git commit) ---
git commit -m "Mise a jour du catalogue de PDFs"

echo.
echo --- Poussée vers le depot distant (git push) ---
git push

echo.
echo ==================================================
echo      Mise en ligne terminee !
echo ==================================================
echo.
pause
