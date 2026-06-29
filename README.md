# Assistia

Assistia est une application desktop Tauri + React pour installer, demarrer et piloter un environnement IA local avec Ollama, Open WebUI, ComfyUI, Aider et SearXNG.

Le depot contient aussi le site public d'Assistia, la documentation fonctionnelle, la documentation technique, une page de telechargement des installateurs et une galerie d'images, le tout deployable avec Docker et Apache.

L'application lance les services localement sur la machine de l'utilisateur :

- Ollama expose son API sur <http://127.0.0.1:11434>.
- Open WebUI expose son interface sur <http://127.0.0.1:8080>.
- ComfyUI expose son interface sur <http://127.0.0.1:8188>.
- SearXNG expose son service local sur <http://127.0.0.1:8888> quand la recherche web est activee.
- Open WebUI est connecte a Ollama avec `OLLAMA_BASE_URL=http://127.0.0.1:11434`.
- Le modele prepare par Assistia est `qwen3:4b`.
- L'agent developpeur Aider utilise `qwen2.5-coder:7b` par defaut.

## Fonctionnement general

Au lancement, Assistia sait :

- detecter l'installation d'Ollama ;
- detecter l'installation d'Open WebUI ;
- detecter l'installation de ComfyUI ;
- installer uniquement les composants manquants depuis le menu `Parametrage` ;
- demarrer Ollama avec `ollama serve` si l'API locale ne repond pas encore ;
- telecharger ou verifier le modele `qwen3:4b` avec `ollama pull qwen3:4b` ;
- preparer Open WebUI dans un environnement Python local si necessaire ;
- lancer Open WebUI avec `open-webui serve --host 127.0.0.1 --port 8080` ;
- preparer et lancer ComfyUI depuis la page `Generateur d'image` ;
- preparer Aider pour l'agent developpeur ;
- preparer et lancer SearXNG pour la recherche web ;
- verrouiller les URL locales d'Ollama, ComfyUI et SearXNG quand les options locales sont cochees.

## Prerequis de developpement

Ces prerequis sont necessaires pour compiler et lancer le projet en developpement.

### Node.js et npm

npm est fourni avec Node.js. Installez une version LTS de Node.js depuis <https://nodejs.org/>.

Verifiez l'installation :

```bash
node --version
npm --version
```

### Rust

Rust est necessaire pour compiler la partie Tauri.

Installez Rust avec rustup :

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Rechargez ensuite votre terminal, puis verifiez l'installation :

```bash
rustc --version
cargo --version
```

### Dependances systeme pour Tauri

Selon votre systeme, Tauri peut demander des dependances supplementaires :

- macOS : installez les outils de ligne de commande Xcode.

```bash
xcode-select --install
```

- Windows : installez Microsoft Visual Studio Build Tools avec la charge de travail C++.
- Linux Debian / Ubuntu : installez les bibliotheques de compilation et WebKit.

```bash
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

## Installation du projet

Installez les dependances JavaScript :

```bash
npm install
```

Lancez l'application desktop en developpement :

```bash
npm run tauri dev
```

Pour lancer uniquement l'interface Vite dans le navigateur :

```bash
npm run dev
```

L'interface Vite est alors disponible sur <http://localhost:5173>.

## Site vitrine et documentation

Le site statique est regroupe dans `site-documentaire`. Il est servi par Apache depuis l'image Docker definie dans `site-documentaire/Dockerfile`.

Contenu principal :

- `site-documentaire/index.html` : presentation du logiciel Assistia ;
- `site-documentaire/telechargements.html` : page de telechargement des installateurs ;
- `site-documentaire/galerie.html` : galerie avec carrousel d'images ;
- `site-documentaire/documentation/` : documentation fonctionnelle en francais et en anglais ;
- `site-documentaire/documentation-technique/` : documentation technique ;
- `site-documentaire/installateurs/mac/` et `site-documentaire/installateurs/windows/` : installateurs publies sur le site ;
- `site-documentaire/images/galerie/` : images affichees dans la galerie.

Le menu public est mutualise dans `site-documentaire/menu.html`. Les pages HTML l'incluent avec Apache SSI, donc il faut tester le site via Apache ou Docker pour voir le menu rendu correctement.

Pour tester localement :

```bash
cd site-documentaire
docker compose up -d --build
```

Le site est alors disponible sur <http://localhost/>.

Le Dockerfile copie les pages publiques, les deux documentations, les installateurs, les images, le favicon, `robots.txt` et `sitemap.xml` dans Apache. La configuration `httpd-cache.conf` active les includes SSI, les redirections canoniques, les droits de lecture et les en-tetes de cache adaptes aux fichiers statiques.

Le referencement est prepare avec :

- balises `title` et `meta description` sur les pages publiques ;
- liens canoniques ;
- metadonnees Open Graph et Twitter ;
- donnees structurees JSON-LD ;
- `robots.txt` ;
- `sitemap.xml`.

La page d'accueil de la documentation contient aussi les liens publics vers le projet GitHub <https://github.com/martinameunier/assistia> et vers Patreon <https://www.patreon.com/cw/MartinAMeunier>.

## Installation d'Ollama

Assistia peut installer Ollama depuis son interface.

Dans le menu `Parametrage`, cliquez sur `Installer les composants manquants`. Assistia verifie d'abord si Ollama est deja disponible. Si Ollama est absent, l'application lance le script officiel adapte au systeme.

Commandes officielles utilisees :

macOS et Linux :

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

Windows :

```powershell
irm https://ollama.com/install.ps1 | iex
```

Vous pouvez aussi installer Ollama manuellement depuis <https://ollama.com/download>.

Verification manuelle :

```bash
ollama --version
ollama serve
```

Assistia detecte automatiquement les emplacements courants d'Ollama. Vous pouvez aussi renseigner un chemin personnalise dans le champ `Chemin vers Ollama`.

Exemples :

- Windows : `C:\Users\vous\AppData\Local\Programs\Ollama\ollama.exe`
- macOS : `/usr/local/bin/ollama`
- Linux : `/usr/bin/ollama`

## Installation d'Open WebUI

Assistia peut installer Open WebUI dans un environnement local gere par l'application.

Dans le menu `Parametrage`, cliquez sur `Installer les composants manquants`. Assistia verifie d'abord si Open WebUI est deja disponible. Si Open WebUI est absent, l'application :

- prepare un dossier local dans les donnees applicatives d'Assistia ;
- verifie qu'un Python 3.11 est disponible ;
- installe `uv` si Python 3.11 doit etre recupere automatiquement ;
- cree un environnement Python local ;
- installe Open WebUI dans cet environnement ;
- utilise `uv pip install --python <python_du_venv> --upgrade open-webui` pour eviter de dependre de `pip` dans l'environnement.

Open WebUI est ensuite lance avec :

```bash
open-webui serve --host 127.0.0.1 --port 8080
```

Variables d'environnement configurees par Assistia :

- `OLLAMA_BASE_URL=http://127.0.0.1:11434`
- `DATA_DIR=<dossier applicatif local>/open-webui/data`
- `WEBUI_URL=http://127.0.0.1:8080`

Vous pouvez aussi renseigner un chemin personnalise dans le champ `Chemin vers Open WebUI`.

Exemples :

- Windows : `C:\Users\vous\AppData\Roaming\Python\Scripts\open-webui.exe`
- macOS : `/usr/local/bin/open-webui`
- Linux : `/usr/local/bin/open-webui`

Documentation officielle Open WebUI : <https://docs.openwebui.com/>

## Installation de ComfyUI

Assistia peut installer ComfyUI dans un environnement local gere par l'application.

Dans le menu `Parametrage`, cliquez sur `Installer les composants manquants`, ou utilisez la page `Generateur d'image`. Si ComfyUI est absent, l'application :

- prepare un dossier local dans les donnees applicatives d'Assistia ;
- telecharge et extrait l'archive officielle depuis <https://github.com/Comfy-Org/ComfyUI> ;
- installe `uv` si necessaire ;
- prepare Python 3.13 via `uv` ;
- cree un environnement Python local ;
- installe les dependances avec `uv pip install --python <python_du_venv> --upgrade -r requirements.txt`.

ComfyUI est ensuite lance avec :

```bash
python main.py --listen 127.0.0.1 --port 8188 --disable-api-nodes
```

La page `Generateur d'image` permet d'installer, demarrer, ouvrir et arreter le serveur local ComfyUI.

Documentation officielle ComfyUI : <https://github.com/Comfy-Org/ComfyUI>

## Agent developpeur Aider

Assistia peut preparer un agent developpeur local base sur Aider.

Depuis le menu `Parametrage`, l'installation des composants manquants prepare aussi Aider si l'agent developpeur est absent. L'application :

- prepare un dossier local dans les donnees applicatives d'Assistia ;
- verifie ou installe Python 3.11 via `uv` ;
- cree un environnement Python local ;
- installe `aider-chat` dans cet environnement ;
- conserve l'historique de l'agent dans les donnees applicatives.

L'agent utilise l'URL Ollama configuree dans les parametres. Par defaut, la case `Utiliser l'adresse locale` force `http://127.0.0.1:11434` et verrouille le champ d'URL pour eviter les modifications accidentelles.

## Recherche web SearXNG

Assistia peut preparer SearXNG dans un environnement Python local pour fournir une recherche web controlable depuis l'application.

Quand SearXNG est installe et lance par Assistia, il ecoute par defaut sur :

```bash
http://127.0.0.1:8888
```

La recherche web peut etre activee ou desactivee dans les parametres. La case `Utiliser l'adresse locale` force l'URL locale SearXNG et verrouille le champ d'URL. Si vous voulez utiliser une instance distante, decochez cette case puis renseignez une URL `http://` ou `https://`.

## Parametrage dans l'application

Le bouton `Parametrage` se trouve en bas a droite de la fenetre.

Le menu contient :

- `Chemin vers Ollama` : chemin complet vers l'executable Ollama ou vers le dossier qui le contient.
- `Chemin vers Open WebUI` : chemin complet vers l'executable Open WebUI ou vers le dossier qui le contient.
- `URL Ollama` pour l'agent developpeur Aider.
- `URL ComfyUI` pour le generateur d'image.
- `URL SearXNG` pour la recherche web.
- une case `Utiliser l'adresse locale` pour chaque URL locale.
- `Installer les composants manquants` : bouton unique qui installe uniquement ce qui manque.

Si les chemins sont vides, Assistia utilise la detection automatique. Pour Open WebUI, Assistia privilegie son installation locale geree si aucun chemin personnalise n'est fourni. Pour ComfyUI, Aider et SearXNG, Assistia utilise ses installations locales gerees.

Quand une case `Utiliser l'adresse locale` est cochee, Assistia force l'adresse par defaut du composant et verrouille le champ correspondant :

- Ollama : `http://127.0.0.1:11434` ;
- ComfyUI : `http://127.0.0.1:8188` ;
- SearXNG : `http://127.0.0.1:8888`.

Pour utiliser un service distant ou une URL personnalisee, decochez la case locale puis renseignez l'adresse voulue.

## Demarrage des services

Le bouton `Demarrer` lance Ollama et Open WebUI.

Au demarrage, Assistia :

- verifie qu'Ollama est installe ;
- demarre `ollama serve` si besoin ;
- attend que l'API Ollama reponde ;
- prepare le modele `qwen3:4b` ;
- verifie qu'Open WebUI est installe ou le prepare si necessaire ;
- demarre Open WebUI sur <http://127.0.0.1:8080>.

Le bouton `Ouvrir Open WebUI` ouvre l'interface web quand elle est disponible.

La page `Generateur d'image` lance ComfyUI separement sur <http://127.0.0.1:8188>.

L'agent developpeur lance Aider a la demande avec l'URL Ollama configuree.

La recherche web utilise SearXNG si elle est activee dans les parametres.

Le site public et la documentation pointent vers GitHub <https://github.com/martinameunier/assistia> et Patreon <https://www.patreon.com/cw/MartinAMeunier>.

## Construire l'application

Pour generer une version de production :

```bash
npm run tauri build
```

Le resultat de compilation se trouve dans `src-tauri/target/release/bundle/`.

## Builds et deploiement

Les scripts de release automatisent la creation des installateurs, la collecte des artefacts et le deploiement du site public sur le serveur.

```bash
npm run release:build
```

Tauri genere des bundles natifs : lancez cette commande sur macOS pour le `.dmg`, sur Windows pour les installateurs Windows, et sur Linux pour les paquets Linux. Les artefacts detectes sont copies dans `dist-release/artifacts/<plateforme>/`.

Les installateurs affiches sur le site peuvent ensuite etre places dans :

- `site-documentaire/installateurs/mac/` ;
- `site-documentaire/installateurs/windows/` ;
- `site-documentaire/installateurs/linux/` si une page Linux est ajoutee plus tard.

Pour configurer le serveur :

```bash
cp scripts/release-deploy.env.example .env.release
set -a && source .env.release && set +a
```

Puis deployez le site et les artefacts deja collectes :

```bash
npm run release:deploy
```

Pour tout faire depuis la plateforme courante :

```bash
npm run release
```

Commandes utiles :

```bash
npm run release:check
npm run release -- --skip-build --require-all-platforms
TAURI_BUILD_ARGS=--no-sign npm run release:build
```

`npm run release:check` verifie les liens locaux du site statique, la configuration Docker Compose de `site-documentaire` et la presence des artefacts macOS, Windows et Linux. Sans l'option `--require-all-platforms`, les artefacts manquants produisent seulement un avertissement.

### Mettre a jour uniquement la documentation

Depuis le Mac qui possede la cle SSH du serveur, utilisez le script dedie :

```bash
cp scripts/deploy-documentation.env.example .env.documentation
set -a && source .env.documentation && set +a
npm run documentation:deploy
```

Le script est volontairement limite a macOS. Il depose `site-documentaire` avec `sftp`, se connecte ensuite en SSH, remplace le dossier distant puis relance Docker Compose.

Par defaut, le redemarrage distant execute l'equivalent de :

```bash
docker compose down
docker compose up -d --build
```

Le `--build` est utile car le site est copie dans l'image Apache par le Dockerfile. Pour utiliser l'ancien binaire Compose, renseignez `DOC_COMPOSE_CMD=docker-compose`. Pour lancer strictement `docker compose up -d`, renseignez `DOC_COMPOSE_UP_ARGS=-d`.

Un essai sans action distante est possible avec :

```bash
npm run documentation:deploy -- --dry-run
```

## References

- Tauri v2 prerequisites : <https://v2.tauri.app/start/prerequisites/>
- Ollama : <https://ollama.com/>
- Ollama CLI : <https://docs.ollama.com/cli>
- Open WebUI : <https://docs.openwebui.com/>
- ComfyUI : <https://github.com/Comfy-Org/ComfyUI>
- Aider : <https://github.com/Aider-AI/aider>
- SearXNG : <https://github.com/searxng/searxng>
- uv : <https://docs.astral.sh/uv/>
- Node.js : <https://nodejs.org/>
- Rust : <https://www.rust-lang.org/tools/install>

## Licence

Assistia est distribue sous une licence proprietaire limitee aux usages non commerciaux. Consultez [LICENSE.md](LICENSE.md) pour les conditions completes.

L'utilisation d'Assistia reste egalement soumise au respect des licences et conditions applicables a Ollama, Open WebUI, ComfyUI, Aider, SearXNG, aux bibliotheques tierces et aux modeles telecharges ou utilises.
