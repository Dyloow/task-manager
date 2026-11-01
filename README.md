# Task Manager

Petit gestionnaire de tâches : tableau Kanban (glisser-déposer, ordre persisté), création et édition via une modale, filtrage, rendu côté serveur. Réalisé dans le cadre d'un test technique.

|                     Bureau (1280px)                     |                   Mobile (375px)                    |
| :-------------------------------------------------------: | :----------------------------------------------------: |
| ![Vue bureau](docs/screenshots/desktop.png)                | ![Vue mobile](docs/screenshots/mobile.png)              |

## Sommaire

- [Prérequis](#prérequis)
- [Installation et lancement](#installation-et-lancement)
- [Base de données](#base-de-données)
- [Architecture](#architecture)
- [API](#api)
- [Choix techniques et compromis](#choix-techniques-et-compromis)
- [Fonctionnalités](#fonctionnalités)
- [Pistes d'amélioration](#pistes-damélioration)

## Prérequis

- Node.js 22.22+ ou 24.15+ (contrainte posée par `@nuxt/nitro-server`, voir `engines` dans `package.json` ; `.nvmrc` fixe la version 24.15)
- npm (fourni avec Node)

## Installation et lancement

```bash
git clone https://github.com/Dyloow/task-manager.git
cd task-manager
npm install
```

`npm install` déclenche `nuxt prepare` (script `postinstall`) qui génère les types Nuxt.

### Développement

```bash
npm run dev
```

L'application est servie sur `http://localhost:3000`.

### Production

```bash
npm run build
npm run preview
```

`build` compile l'application dans `.output/`, `preview` sert ce build localement. Le stockage utilisant un chemin relatif, les données du build servi en `preview` vivent dans `.output/.data/tasks/list`, distinctes de celles de `npm run dev` (`.data/tasks/list`) : elles repartent du seed à chaque `npm run build`.

### Vérifications

```bash
npm run typecheck   # vue-tsc, sans émission
npm test            # les trois projets Vitest (unit, nuxt, e2e)
```

Un projet de tests peut être lancé isolément :

```bash
npx vitest run --project unit
npx vitest run --project nuxt
npx vitest run --project e2e
```

## Base de données

Pas de base de données : hors périmètre de l'exercice. Les tâches sont persistées dans un fichier JSON via le stockage Nitro (driver `fs`, voir `nitro.storage.tasks` dans `nuxt.config.ts`), sous `.data/tasks/`. L'accès ne passe jamais directement par ce fichier : tout transite par le dépôt de tâches (`server/utils/task-repository.ts`), dont les écritures sont sérialisées sur une file unique pour que deux requêtes concurrentes ne s'écrasent pas.

- **Initialisation** : au premier appel, si la clé `list` est absente du stockage, elle est amorcée depuis `server/data/tasks.json` (jeu de données de démonstration), puis écrite dans `.data/tasks/list`.
- **Réinitialisation** : supprimer le dossier `.data/tasks` (ou `.data` entier) puis recharger l'application ; les données de démonstration sont réécrites automatiquement au prochain accès.

  ```bash
  rm -rf .data
  npm run dev
  ```

- **Donnée corrompue** : toute lecture passe par le même dépôt de tâches, donc si le contenu stocké ne respecte pas le schéma Zod d'une tâche (édition manuelle du fichier, par exemple), chaque route (`GET`, `POST`, `PATCH`, `DELETE`, `POST .../move`) répond `500` avec le message « Task data is corrupted », sans jamais écraser le fichier existant : la donnée invalide reste disponible pour investigation, le détail de l'erreur est loggé côté serveur et jamais renvoyé au client.
- **Ordre des tâches** : chaque tâche porte un `position`, un rang entier propre à sa colonne de statut (`0..n-1`, renuméroté après chaque création, changement de statut, suppression ou déplacement). Une tâche stockée avant l'introduction de ce champ (donnée historique) n'a pas de 500 pour autant : à la lecture, les tâches sans `position` sont classées par `createdAt` au sein de leur statut, pour obtenir un rang valide.

## Architecture

```
app/
├── pages/index.vue          page unique : tableau, filtres, modale de tâche
├── components/
│   ├── TaskBoard.vue         colonnes visibles selon le filtre de statut
│   ├── TaskColumn.vue        une colonne : liste triable (vue-draggable-plus), bouton d'ajout
│   ├── TaskCard.vue           carte compacte, cliquable/focusable (ouvre la modale)
│   ├── TaskModal.vue          <dialog> natif : création ou édition
│   ├── TaskForm.vue           formulaire réutilisé par la modale (création et édition)
│   ├── TaskFilters.vue        filtres statut (colonnes visibles) et priorité
│   └── AppAlert.vue, TaskHiddenNotice.vue   bannières d'erreur et de notice
├── composables/               synchronisation des filtres avec l'URL
├── stores/tasks.ts            état Pinia : tâches, filtres, erreurs, mutations optimistes et pessimistes
├── utils/                     libellés français des énumérations, normalisation des erreurs API
└── assets/css/main.css        jetons Tailwind (@theme)

server/
├── api/tasks/                 routes Nitro (une par méthode HTTP, plus `[id]/move.post.ts`)
├── utils/task-repository.ts   lecture/écriture du fichier, ordre par colonne, file d'écriture sérialisée
└── data/tasks.json            jeu de données de démonstration (seed)

shared/
├── types/task.ts              types TypeScript dérivés des schémas
└── schemas/task.ts            schémas Zod, contrat unique utilisé par le client et le serveur

test/
├── unit/                      logique serveur et schémas, Node pur
├── nuxt/                      store, composables, composants (environnement Nuxt)
└── e2e/                       API complète sur un serveur réel, stockage en mémoire
```

Flux d'une requête : `page → store (action Pinia) → $fetch → route serveur → dépôt de tâches → fichier JSON`. Le chargement initial du tableau s'exécute côté serveur via `useAsyncData`, qui hydrate directement le store depuis le payload SSR : aucun second appel réseau n'a lieu au montage côté client. Le glisser-déposer, lui, ne peut s'activer qu'une fois monté côté client (il dépend du DOM réel) ; la liste de cartes qu'il enrichit est déjà rendue par le serveur.

## API

Base `/api`, JSON, sans versionnage. Le serveur génère `id`, `createdAt`, `updatedAt` et `position` ; le client ne les envoie jamais.

| Méthode  | Route                  | Succès                  | Erreurs                                              |
| -------- | ----------------------- | ------------------------ | ------------------------------------------------------ |
| `GET`    | `/api/tasks`             | `200` liste des tâches   | `500` donnée corrompue                                |
| `POST`   | `/api/tasks`              | `201` tâche créée (fin de sa colonne) | `400` corps invalide                    |
| `PATCH`  | `/api/tasks/:id`          | `200` tâche mise à jour  | `400` corps invalide · `404` id inconnu               |
| `DELETE` | `/api/tasks/:id`          | `204` sans contenu       | `404` id inconnu                                      |
| `POST`   | `/api/tasks/:id/move`     | `200` tâche déplacée     | `400` corps invalide ou `beforeId` hors de la colonne cible · `404` id inconnu |

Un `400` levé après l'analyse du corps (champ invalide, manquant...) renvoie le détail de validation Zod dans `data.issues` (`fieldErrors` par champ, `formErrors` globaux). Un `400` levé avant, parce que le corps n'est pas un JSON valide, n'a pas ce détail : il vient de `h3` lui-même (`readBody`), pas du schéma. Toute erreur est levée avec `createError` (`h3`), donc reçue côté client comme `{ statusCode, statusMessage, data }`.

Le corps de `POST /api/tasks/:id/move` est `{ status, beforeId }` : `status` est la colonne cible, `beforeId` l'identifiant de la tâche devant laquelle insérer (`null` pour la fin de la colonne). La position finale est calculée côté serveur, dans la file d'écriture : `beforeId` est cherché dans l'ordre complet de la colonne cible (y compris les tâches qu'un filtre de priorité masque côté client), pas dans un index brut, pour rester correct même si le filtre masque des cartes ou qu'un autre déplacement vient de s'appliquer.

## Choix techniques et compromis

| Choix                                                                 | Pourquoi / compromis                                                                 |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Chargement initial côté serveur (`useAsyncData` + Pinia)                | Le premier rendu est déjà peuplé, pas de flash de chargement ; le store est réhydraté depuis le payload SSR, jamais refetché au montage client |
| File d'écriture unique dans le dépôt de tâches                          | Lecture-modification-écriture atomique au sein d'un même processus Node ; ne protège pas une donnée partagée entre plusieurs instances (déploiement multi-process ou serverless), limite assumée vu le stockage fichier |
| Validation Zod à chaque lecture du fichier, pas seulement à l'écriture  | Détecte un fichier corrompu ou édité à la main avant de le renvoyer au client, au prix d'un `safeParse` sur chaque requête |
| `position` : rang entier par colonne, renuméroté `0..n-1` à chaque mutation | Simple et sans dérive de flottants ; la colonne est l'unité d'ordre. Une route dédiée (`POST .../move`) calcule ce rang côté serveur à partir d'un `beforeId`, plutôt que le client n'envoie un index brut, fragile dès qu'un filtre masque des cartes ou qu'une autre mutation s'intercale |
| `vue-draggable-plus` (SortableJS) pour le glisser-déposer                | Seule librairie testée dans le dépôt (`node_modules`) avant usage : composant `VueDraggable`, props `group`/`animation`, événements `update` (réordre dans une liste) et `add` (dépôt venant d'une autre liste). Elle ne touche jamais le store Pinia directement : chaque colonne garde une copie locale (`localTasks`) que la librairie réordonne visuellement, la page calcule le `beforeId` et appelle l'action du store, seule source de vérité |
| Pas de `<ClientOnly>` autour du glisser-déposer                         | `vue-draggable-plus` n'accède au DOM/`Sortable` qu'au montage (`onMounted`), jamais à l'import ni au rendu du composant : la liste de cartes est donc rendue côté serveur comme n'importe quel composant, et le glisser-déposer s'active seul une fois monté côté client, sans composant supplémentaire |
| Déplacement optimiste, édition pessimiste                               | Un glisser-déposer doit répondre à l'image ; son échec est rare et sans accumulation d'état à annuler proprement (deux colonnes réordonnées) : en cas d'échec, le tableau est simplement resynchronisé depuis le serveur (`fetchTasks`). Une édition de champ (titre, description...) doit au contraire pouvoir renvoyer une erreur de champ précise avant de toucher l'affichage : elle attend la réponse du serveur |
| `<dialog>` natif pour la modale de tâche                                | Gestion native du focus, de la touche Échap et du fond (`::backdrop`), sans dépendance ; une seule instance de modale et de formulaire, réinitialisée (`resetForCreate`/`loadForEdit`) à chaque ouverture plutôt que démontée/remontée |
| L'édition n'envoie que les champs modifiés                              | Le formulaire compare la saisie à la tâche d'origine avant de soumettre ; une édition sans changement ferme la modale sans appel réseau (un corps vide serait de toute façon rejeté par le serveur) |
| Erreurs normalisées en un objet `ApiErrorState` sérialisable             | Une instance de classe ne survit pas à la sérialisation du payload SSR (`devalue`) ; chaque action du store porte son propre message utilisateur en français, découplé du message HTTP brut |
| Filtres portés par l'URL (`useTaskFilters`), un seul sens de synchronisation | La query string est la source de vérité : un watcher unique la pousse vers le store, jamais l'inverse. Le filtre de statut sélectionne la ou les colonnes affichées (plus un sous-ensemble de lignes) ; le filtre de priorité masque des cartes à l'intérieur de chaque colonne affichée |
| Composants de présentation (props/emit), seule la page parle au store   | Composants testables et réutilisables indépendamment de Pinia |
| Tailwind v4 seul, jetons déclarés avec `@theme`                         | Pas de bibliothèque de composants ; palette et rayons centralisés dans `app/assets/css/main.css` |
| Interface en français, code et valeurs d'énumération en anglais         | Le public visé est francophone ; les identifiants restent des clés stables côté code |
| Suppression confirmée par un second clic (auto-annulé après 4 s) plutôt qu'une confirmation modale distincte | Le bouton vit déjà dans la modale de tâche ; éviter une boîte de dialogue dans une boîte de dialogue |
| Trois projets de tests (unit / nuxt / e2e)                              | Unit pour la logique serveur et les schémas en Node pur, nuxt pour le store et les composants avec `$fetch` mocké, e2e sur un serveur réel avec stockage en mémoire (dont des tests de requêtes concurrentes, création et déplacement) ; aucun test de navigateur (Playwright) n'est en place, le glisser-déposer réel n'est donc vérifié que manuellement |
| Pas de base de données, pas d'authentification, pas de backend séparé   | Hors périmètre de l'exercice (budget de 3 à 4 heures) |

Historique des filtres : chaque changement de filtre fait un `router.push`, donc `Précédent` revient au filtre précédent. La réinitialisation efface statut et priorité en un seul `push`, pour ne pas créer d'étape intermédiaire. La correction d'une valeur invalide dans l'URL fait un `replace` : ce n'est pas une navigation à annuler.

## Fonctionnalités

- [x] Tableau à trois colonnes (à faire / en cours / terminées), chargé côté serveur au premier rendu (SSR)
- [x] Glisser-déposer d'une tâche, dans une colonne ou entre colonnes, ordre persisté
- [x] Création d'une tâche via une modale (titre, description, statut, priorité), statut pré-rempli par la colonne d'origine
- [x] Édition d'une tâche existante via la même modale (clic sur une carte), uniquement les champs modifiés sont envoyés
- [x] Suppression d'une tâche depuis la modale (confirmation par second clic)
- [x] Filtrage par statut (sélectionne la ou les colonnes affichées) et par priorité (masque des cartes dans chaque colonne), reflété dans l'URL
- [x] Interface responsive (mobile : défilement horizontal des colonnes avec ancrage ; bureau : colonnes côte à côte), Tailwind uniquement
- [x] Retours d'erreur explicites : échec de chargement (avec reprise), échec de déplacement (bannière + tableau resynchronisé), échec d'édition (bannière, ou erreurs de champ en ligne sur un `400`)
- [x] Notification quand une tâche créée est masquée par les filtres actifs, avec une action pour tout afficher

## Pistes d'amélioration

- Base de données réelle avec transactions, pour un déploiement multi-instance
- Authentification
- Pagination et recherche
- Réorganisation du statut au clavier (alternative au glisser-déposer, au-delà de l'ouverture de la modale)
- Tests de navigateur de bout en bout (Playwright), notamment pour le glisser-déposer réel
- Internationalisation (l'interface est figée en français)
- Suppression par notification (toast) avec annulation, au lieu d'une confirmation par second clic
- Intégration continue (CI)
