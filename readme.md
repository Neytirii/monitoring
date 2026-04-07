# Monitoring Platform

Plateforme de monitoring open-source : agents légers Go, métriques temps-réel, alertes et tableaux de bord.

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React 18 + Vite + TailwindCSS |
| Backend | Fastify 5 + Node.js 20 + TypeScript |
| Base de données | PostgreSQL 16 + TimescaleDB |
| Cache / Queue | Redis 7 |
| Agent | Go 1.22 + gopsutil |
| Proxy | Caddy (TLS auto Let's Encrypt) |

---

## Prérequis

- [Docker](https://docs.docker.com/get-docker/) et **Docker Compose v2** (pour l'infrastructure)
- [Node.js 20+](https://nodejs.org/) (développement local)
- [Go 1.22+](https://go.dev/dl/) (pour lancer l'agent)

---

## 🚀 Démarrage rapide — Mode développement (recommandé)

C'est le mode le plus simple pour explorer et développer. Le backend et le frontend
tournent directement sur votre machine ; seule l'infrastructure (base de données, Redis)
tourne dans Docker.

### 1. Cloner le dépôt

```bash
git clone https://github.com/Neytirii/monitoring.git
cd monitoring
```

### 2. Configurer les variables d'environnement

```bash
cp apps/backend/.env.example apps/backend/.env
```

Éditer `apps/backend/.env` et **définir des secrets JWT robustes** :

```env
# Générer avec : openssl rand -base64 32
JWT_SECRET=remplacez-par-un-secret-long-et-aleatoire
JWT_AGENT_SECRET=remplacez-par-un-autre-secret-agent
```

> ⚠️ Le backend refuse de démarrer en production si ces variables sont vides.
> En mode développement (`NODE_ENV=development`, valeur par défaut), il tolère des
> valeurs vides mais elles sont quand même requises pour que l'auth fonctionne.

### 3. Démarrer l'infrastructure

```bash
docker compose -f infra/docker-compose.infra.yml up -d
```

Attendez que PostgreSQL soit prêt (environ 15 secondes) :

```bash
docker compose -f infra/docker-compose.infra.yml ps
# postgres   running (healthy)
# redis      running (healthy)
```

> **Première fois uniquement** — Docker exécute automatiquement `infra/init.sql`
> qui active l'extension TimescaleDB et crée la table `metrics` (hypertable).

### 4. Installer les dépendances npm

```bash
npm install
```

### 5. Synchroniser le schéma de base de données

```bash
cd apps/backend
npx prisma db push
cd ../..
```

Cela crée toutes les tables relationnelles (users, hosts, dashboards, alerts, triggers…).

### 6. Lancer le backend

```bash
cd apps/backend
npm run dev
```

Vérifier :

```bash
curl http://localhost:3000/health
# {"status":"ok","timestamp":"..."}
```

### 7. Lancer le frontend (dans un autre terminal)

```bash
cd apps/frontend
npm run dev
```

Ouvrir **http://localhost:5173** dans le navigateur.

---

## 🎯 Premier lancement — Pas à pas dans l'interface

### Étape 1 : Créer un compte

Sur http://localhost:5173 → cliquer **"Create one"** sous le formulaire de connexion.

| Champ | Exemple |
|---|---|
| Organisation name | `Demo` |
| Organisation slug | `demo` (auto-généré) |
| Your name | `Alice` |
| Email | `alice@demo.com` |
| Password | `monmotdepasse` |

→ Vous êtes connecté et redirigé vers la page **Hosts**.

### Étape 2 : Ajouter un hôte

Cliquer **"Add Host"** :

| Champ | Exemple |
|---|---|
| Name | `Ma machine locale` |
| Hostname | `localhost` |

→ Cliquer **"Create Host"**. Une commande d'installation s'affiche.

### Étape 3 : Lancer l'agent Go

Copiez le token depuis l'interface (valeur de `--token` dans la commande affichée).

```bash
cd agent

# Remplacer TOKEN par la valeur copiée depuis l'interface
SERVER_URL=http://localhost:3000 \
AGENT_TOKEN=TOKEN \
go run .
```

L'agent s'enregistre, affiche son Host ID et commence à envoyer des métriques
**toutes les 10 secondes**.

```
Registered as host ID: clxxxxxxxxxxxxx
2024/01/15 10:00:00 Monitoring agent started. Server: http://localhost:3000, ...
```

### Étape 4 : Vérifier que les métriques arrivent

Retourner dans l'interface → **Hosts** → le statut passe à 🟢 **ONLINE**.

Pour voir les métriques brutes via l'API (récupérer votre token depuis les DevTools
du navigateur → Application → LocalStorage → `auth-storage` → `token`) :

```bash
TOKEN="votre-token-jwt"
HOST_ID="votre-host-id"

curl "http://localhost:3000/api/v1/metrics/hosts/$HOST_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.metrics[:3]'
```

### Étape 5 : Créer une alerte automatique

Dans la sidebar → **Triggers** → **New Trigger** :

| Champ | Valeur |
|---|---|
| Name | `CPU élevé` |
| Metric | `cpu.usage_percent` |
| Operator | `>` |
| Threshold | `5` (valeur basse pour tester facilement) |
| Severity | `WARNING` |

→ Cliquer **"Create Trigger"**. Dans quelques secondes, si le CPU dépasse 5%,
une alerte apparaît dans **Alerts**.

### Étape 6 : Créer un dashboard

Créer un dashboard via l'API, puis l'ouvrir dans l'interface :

```bash
# Créer le dashboard
curl -X POST http://localhost:3000/api/v1/dashboards \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Mon Dashboard"}' | jq '.dashboard.id'

# Ouvrir dans le navigateur :
# http://localhost:5173/dashboard/<id-retourné>
```

Dans la page du dashboard → **"Add Widget"** → choisir un type de graphique.

---

## 🚢 Déploiement via Portainer (recommandé pour la production)

Le moyen le plus simple de déployer la stack sur un serveur est d'utiliser **Portainer** avec l'image CI pré-construite hébergée sur GitHub Container Registry (GHCR).

À chaque push sur `main`, GitHub Actions build et publie automatiquement 4 images :

| Image | Rôle |
|---|---|
| `ghcr.io/neytirii/monitoring-backend:latest` | API Fastify |
| `ghcr.io/neytirii/monitoring-frontend:latest` | Interface React (nginx) |
| `ghcr.io/neytirii/monitoring-caddy:latest` | Reverse proxy (Caddyfile intégré) |
| `ghcr.io/neytirii/monitoring-postgres:latest` | TimescaleDB + init automatique |

### Pré-requis

- Un serveur avec [Docker](https://docs.docker.com/engine/install/) et [Portainer](https://docs.portainer.io/start/install-ce) installés.
- Accès à l'interface Portainer (par défaut sur le port 9000 ou 9443).

### Déployer la stack

1. **Ouvrir Portainer** → sélectionner l'environnement cible → **Stacks** → **Add stack**.

2. **Choisir "Repository"** et renseigner :
   - Repository URL : `https://github.com/Neytirii/monitoring`
   - Compose path : `docker-compose.portainer.yml`
   - Cocher **"Automatic updates"** (optionnel) pour redéployer automatiquement à chaque nouveau push.

3. **Définir les variables d'environnement** dans la section *Environment variables* :

   | Variable | Obligatoire | Description |
   |---|---|---|
   | `JWT_SECRET` | ✅ | Secret JWT utilisateurs — générer avec `openssl rand -base64 32` |
   | `JWT_AGENT_SECRET` | ✅ | Secret JWT agents — générer avec `openssl rand -base64 32` |
   | `PUBLIC_URL` | | URL publique ex. `https://monitoring.example.com` (défaut : `http://localhost`) |
   | `POSTGRES_USER` | | Utilisateur PostgreSQL (défaut : `monitoring`) |
   | `POSTGRES_PASSWORD` | | Mot de passe PostgreSQL (défaut : `monitoring`) |
   | `POSTGRES_DB` | | Nom de la base (défaut : `monitoring`) |
   | `HTTP_PORT` | | Port HTTP exposé (défaut : `80`) |
   | `HTTPS_PORT` | | Port HTTPS exposé (défaut : `443`) |

4. **Cliquer "Deploy the stack"**.

Portainer télécharge les images, démarre les conteneurs et attend que PostgreSQL soit prêt avant de lancer le backend. La base de données est initialisée automatiquement (TimescaleDB + hypertable `metrics`).

### Accéder à l'interface

Ouvrir `http://<ip-du-serveur>` (ou `https://` si DNS + TLS configuré).

### Mettre à jour la stack

Avec **"Automatic updates"** activé, Portainer redéploie automatiquement après chaque push sur `main`.

Sinon, dans Portainer → **Stacks** → votre stack → **Pull and redeploy**.

---

## 🐳 Démarrage complet avec Docker Compose

Tous les services dans des conteneurs (mode production-like).

### 1. Générer des secrets

```bash
export JWT_SECRET=$(openssl rand -base64 32)
export JWT_AGENT_SECRET=$(openssl rand -base64 32)
```

### 2. Lancer la stack complète

```bash
cd infra
docker compose up -d --build
```

Première build : ~3–5 minutes. Les lancements suivants sont instantanés.

### 3. Accéder à l'interface

Ouvrir **http://localhost** dans le navigateur.

### Arrêter / relancer

```bash
docker compose down          # arrêt (données conservées)
docker compose down -v       # arrêt + suppression des volumes (reset complet)
docker compose up -d         # relancer (sans rebuild)
docker compose up -d --build # relancer avec rebuild
```

---

## 📦 Structure du projet

```
monitoring/
├── apps/
│   ├── backend/                 # API Fastify (Node.js + TypeScript)
│   │   ├── Dockerfile
│   │   ├── prisma/schema.prisma # Schéma relationnel (13 modèles)
│   │   └── src/
│   │       ├── routes/          # auth, hosts, metrics, dashboards,
│   │       │                    # alerts, triggers, agent
│   │       ├── plugins/         # auth (JWT), prisma, websocket (Redis pub/sub)
│   │       ├── services/        # alertProcessor (BullMQ), notificationService
│   │       └── middleware/      # RBAC (ADMIN / EDITOR / VIEWER)
│   └── frontend/                # React 18 + Vite + TailwindCSS
│       ├── Dockerfile
│       ├── nginx.conf
│       └── src/
│           ├── pages/           # Login, Register, Hosts, Alerts,
│           │                    # Triggers, Dashboard, NetworkMap
│           ├── components/      # layout, charts, dashboard, network-map
│           ├── hooks/           # useMetrics, useSocket
│           └── store/           # useAuthStore (Zustand)
├── agent/                       # Agent Go (binaire statique)
│   ├── collector/               # Collecte CPU, RAM, disque, réseau (gopsutil)
│   └── sender/                  # Envoi HTTPS vers l'API + retry
├── infra/
│   ├── docker-compose.yml       # Stack complète (prod)
│   ├── docker-compose.infra.yml # Infrastructure seule (dev)
│   ├── init.sql                 # TimescaleDB extension + hypertable metrics
│   └── caddy/Caddyfile          # Reverse proxy (TLS auto)
├── packages/
│   └── shared-types/            # Types TypeScript partagés frontend/backend
└── scripts/
    ├── install-agent-linux.sh   # Installe l'agent comme service systemd
    └── install-agent-windows.ps1
```

---

## 📊 Métriques collectées par l'agent

| Métrique | Description |
|---|---|
| `cpu.usage_percent` | Utilisation CPU globale (%) |
| `mem.used_percent` | Utilisation mémoire (%) |
| `mem.used_bytes` | Mémoire utilisée (octets) |
| `mem.total_bytes` | Mémoire totale (octets) |
| `disk.used_percent` | Utilisation partition `/` (%) |
| `net.bytes_sent` | Octets envoyés (réseau, cumulatif) |
| `net.bytes_recv` | Octets reçus (réseau, cumulatif) |

---

## 🔌 API Reference

Toutes les routes (sauf `/health` et `/api/v1/agent/*`) nécessitent :
```
Authorization: Bearer <token>
```

### Authentification

```bash
# Créer un compte (+ tenant)
POST /api/v1/auth/register
{
  "tenantName": "Acme",
  "tenantSlug": "acme",
  "name": "Alice",
  "email": "alice@acme.com",
  "password": "motdepasse"
}
# → { token, user, tenant }

# Connexion
POST /api/v1/auth/login
{ "email": "alice@acme.com", "password": "motdepasse" }
# → { token, user, tenant }

# Profil courant
GET /api/v1/auth/me
```

### Hôtes

```bash
GET    /api/v1/hosts              # Lister
POST   /api/v1/hosts              # Créer → retourne installCommand
GET    /api/v1/hosts/:id
DELETE /api/v1/hosts/:id          # (ADMIN)
GET    /api/v1/hosts/:id/install-script  # linux + windows commands
```

### Métriques (TimescaleDB)

```bash
# Métriques d'un hôte
GET /api/v1/metrics/hosts/:hostId
    ?metric=cpu.usage_percent
    &from=2024-01-15T00:00:00Z
    &to=2024-01-15T01:00:00Z
    &limit=500

# Toutes les métriques du tenant
GET /api/v1/metrics
    ?hostId=...&metric=...&from=...&to=...&limit=1000
```

### Triggers (règles d'alerte)

```bash
GET    /api/v1/triggers           # Lister
POST   /api/v1/triggers           # Créer (EDITOR)
{
  "name": "CPU élevé",
  "expression": { "metric": "cpu.usage_percent", "operator": ">", "threshold": 80 },
  "severity": "WARNING"
}
GET    /api/v1/triggers/:id
PUT    /api/v1/triggers/:id       # Modifier (EDITOR)
PATCH  /api/v1/triggers/:id/toggle  # Activer/désactiver (EDITOR)
DELETE /api/v1/triggers/:id       # Supprimer (ADMIN)
```

### Alertes

```bash
GET   /api/v1/alerts              # Lister (?state=FIRING&hostId=...&severity=HIGH)
PATCH /api/v1/alerts/:id/resolve  # Résoudre manuellement (EDITOR)
```

### Dashboards

```bash
GET    /api/v1/dashboards
POST   /api/v1/dashboards         { "name": "Mon Dashboard" }
GET    /api/v1/dashboards/:id
PUT    /api/v1/dashboards/:id
DELETE /api/v1/dashboards/:id

# Widgets
POST   /api/v1/dashboards/:id/widgets
PUT    /api/v1/dashboards/:id/widgets/:widgetId
DELETE /api/v1/dashboards/:id/widgets/:widgetId
```

### Agent (authentification par token)

```bash
# Enregistrement initial (token = valeur du champ agentToken du host)
POST /api/v1/agent/register
Authorization: Bearer <agentToken>
{ "hostname": "server1", "os": "linux", "ipAddress": "192.168.1.10" }

# Envoi de métriques (toutes les 10s)
POST /api/v1/agent/ingest
Authorization: Bearer <jwtAgentToken>
{
  "host_id": "...",
  "timestamp": "2024-01-15T10:00:00Z",
  "metrics": [
    { "name": "cpu.usage_percent", "value": 45.2, "tags": {} }
  ]
}
```

---

## 🔐 Variables d'environnement (backend)

| Variable | Défaut | Obligatoire |
|---|---|---|
| `JWT_SECRET` | — | ✅ en prod |
| `JWT_AGENT_SECRET` | — | ✅ en prod |
| `DATABASE_URL` | `postgresql://monitoring:monitoring@localhost:5432/monitoring` | |
| `REDIS_URL` | `redis://localhost:6379` | |
| `PORT` | `3000` | |
| `HOST` | `0.0.0.0` | |
| `PUBLIC_URL` | `http://localhost:3000` | Utilisé dans les scripts d'install agent |
| `NODE_ENV` | `development` | |
| `SMTP_HOST` | — | Pour les notifications email |
| `SMTP_PORT` | `587` | |
| `SMTP_USER` | — | |
| `SMTP_PASS` | — | |
| `SMTP_FROM` | `noreply@monitoring.example.com` | |

---

## 🚨 Dépannage

### Le backend ne démarre pas : `Missing required environment variable: JWT_SECRET`

Le fichier `apps/backend/.env` est absent ou les variables JWT ne sont pas définies.

```bash
cp apps/backend/.env.example apps/backend/.env
# Éditer et définir JWT_SECRET et JWT_AGENT_SECRET
```

### Erreur Prisma : `Table "metrics" does not exist`

La table `metrics` est une hypertable TimescaleDB créée par `infra/init.sql`.
Ce script ne s'exécute que lors de la **première création** du volume Docker.
Si vous utilisez une base existante, appliquez-le manuellement :

```bash
docker exec -i monitoring-postgres \
  psql -U monitoring -d monitoring < infra/init.sql
```

### L'agent ne s'enregistre pas

- Vérifier que `SERVER_URL` pointe vers le backend (`http://localhost:3000` en dev)
- Vérifier que `AGENT_TOKEN` correspond à la valeur `agentToken` visible dans la
  réponse de `GET /api/v1/hosts/:id` (ou dans la commande affichée dans l'UI)

### Docker Compose : `JWT_SECRET must be set`

```bash
export JWT_SECRET=$(openssl rand -base64 32)
export JWT_AGENT_SECRET=$(openssl rand -base64 32)
docker compose -f infra/docker-compose.yml up -d
```

### Port 5432 déjà utilisé

```bash
# Arrêter un postgres local existant
sudo systemctl stop postgresql
# Ou changer le port dans docker-compose.infra.yml : "5433:5432"
# Et adapter DATABASE_URL dans .env : ...@localhost:5433/...
```

---

## 🏗️ Architecture de sécurité

- **Multi-tenant** — chaque JWT embarque un `tenantId` ; toutes les requêtes SQL
  filtrent automatiquement par tenant.
- **RBAC** — 3 rôles par tenant : `ADMIN` (tout), `EDITOR` (CRUD), `VIEWER` (lecture).
- **Tokens agent** — JWT distinct signé avec `JWT_AGENT_SECRET`, scope `"agent"`,
  révocable depuis l'interface (supprimer/recréer le host).
- **TLS** — En production, Caddy impose HTTPS et renouvelle automatiquement
  les certificats Let's Encrypt.
