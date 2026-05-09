# Ecole Riham Privee - Systeme de Gestion Web v4.0

Application web statique pour la gestion interne de l'Ecole Riham Privee.

## Deploiement GitHub Pages

1. Creer un depot GitHub, par exemple `ecole-riham-web`.
2. Envoyer tous les fichiers de ce dossier dans le depot.
3. Dans GitHub, ouvrir `Settings` puis `Pages`.
4. Choisir `Deploy from a branch`, branche `main`, dossier `/root`.
5. Le site sera disponible a l'adresse `https://votre-username.github.io/ecole-riham-web/`.

## Structure

```text
ecole-riham-web/
|-- index.html
|-- css/
|   `-- style.css
|-- js/
|   |-- config.js
|   |-- db.js
|   |-- utils.js
|   |-- auth.js
|   |-- shell.js
|   |-- gerante.js
|   |-- directrice.js
|   |-- professeur.js
|   `-- app.js
```

Le logo est integre directement dans `index.html` pour que la page GitHub Pages reste fonctionnelle sans upload binaire supplementaire.

## Securite importante

Le jeton Turso prive n'est pas inclus dans ce depot. Sur GitHub Pages, tout fichier JavaScript est public, donc il ne faut jamais publier un jeton d'ecriture dans `js/config.js`.

Pour tester l'application apres hebergement, ouvrir la page, choisir un espace, cliquer sur `Configurer la base`, puis coller le jeton Turso prive sur l'appareil autorise.

Pour une vraie production, la solution recommandee est d'ajouter un petit backend ou proxy securise entre le navigateur et Turso.

## Base de donnees

URL Turso utilisee par l'application :

```text
https://ecoleriham-akirus.aws-eu-west-1.turso.io
```

Les comptes et mots de passe doivent rester dans un document prive, pas dans un depot GitHub public.
