# Assistia

Assistia est une application desktop Tauri + React pour installer, demarrer et piloter un environnement IA local avec Ollama et Open WebUI.

L'application lance les services localement sur la machine de l'utilisateur :

- Ollama expose son API sur <http://127.0.0.1:11434>.
- Open WebUI expose son interface sur <http://127.0.0.1:8080>.
- Open WebUI est connecte a Ollama avec `OLLAMA_BASE_URL=http://127.0.0.1:11434`.
- Le modele prepare par Assistia est `qwen3:4b`.

## Fonctionnement general

Au lancement, Assistia sait :

- detecter l'installation d'Ollama ;
- detecter l'installation d'Open WebUI ;
- installer uniquement les composants manquants depuis le menu `Parametrage` ;
- demarrer Ollama avec `ollama serve` si l'API locale ne repond pas encore ;
- telecharger ou verifier le modele `qwen3:4b` avec `ollama pull qwen3:4b` ;
- preparer Open WebUI dans un environnement Python local si necessaire ;
- lancer Open WebUI avec `open-webui serve --host 127.0.0.1 --port 8080`.

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

## Parametrage dans l'application

Le bouton `Parametrage` se trouve en bas a droite de la fenetre.

Le menu contient :

- `Chemin vers Ollama` : chemin complet vers l'executable Ollama ou vers le dossier qui le contient.
- `Chemin vers Open WebUI` : chemin complet vers l'executable Open WebUI ou vers le dossier qui le contient.
- `Installer les composants manquants` : bouton unique qui installe uniquement ce qui manque.

Si les chemins sont vides, Assistia utilise la detection automatique. Pour Open WebUI, Assistia privilegie son installation locale geree si aucun chemin personnalise n'est fourni.

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

Le bouton `Patreon`, en bas a gauche, ouvre <https://www.patreon.com/c/MartinAMeunier>.

## Construire l'application

Pour generer une version de production :

```bash
npm run tauri build
```

Le resultat de compilation se trouve dans `src-tauri/target/release/bundle/`.

## References

- Tauri v2 prerequisites : <https://v2.tauri.app/start/prerequisites/>
- Ollama : <https://ollama.com/>
- Ollama CLI : <https://docs.ollama.com/cli>
- Open WebUI : <https://docs.openwebui.com/>
- uv : <https://docs.astral.sh/uv/>
- Node.js : <https://nodejs.org/>
- Rust : <https://www.rust-lang.org/tools/install>

## Licence

Assistia est distribue sous une licence proprietaire limitee aux usages non commerciaux. Consultez [LICENSE.md](LICENSE.md) pour les conditions completes.

L'utilisation d'Assistia reste egalement soumise au respect des licences et conditions applicables a Ollama, Open WebUI, aux bibliotheques tierces et aux modeles telecharges ou utilises.
