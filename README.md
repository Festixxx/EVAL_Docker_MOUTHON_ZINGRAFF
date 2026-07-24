# Retro Arcade Leaderboard 🕹️

Projet DevOps réalisé dans le cadre d'une évaluation. L'API était déjà fournie, notre boulot c'était de la rendre utilisable en vrai : CI, Docker, monitoring, alertes et test de charge.

---

## C'est quoi ce projet ?

Une API pour gérer des scores de jeux d'arcade rétro (Pac-Man, Tetris, Snake...). Elle est écrite en Python avec FastAPI. On n'a pas touché au code de l'API, on a juste mis en place tout ce qui l'entoure.

---

## Ce qu'on a fait

- **CI** (GitHub Actions) : à chaque push, le pipeline vérifie que le code est clean, que les tests passent et que l'image Docker n'a pas de failles de sécurité
- **Docker** : l'app tourne dans un conteneur, avec deux modes (dev et prod)
- **Monitoring** : Prometheus collecte les métriques, Grafana les affiche dans un dashboard
- **Alertes** : 4 alertes configurées (API down, latence élevée, trop d'erreurs, tentatives de triche)
- **Test de charge** : script k6 qui simule plein d'utilisateurs en même temps
- **Kubernetes** : fichiers de déploiement pour faire tourner l'app sur un cluster

---

## Lancer le projet

### Ce qu'il faut avoir installé
- Docker Desktop
- (optionnel) k6 pour les tests de charge
- (optionnel) kubectl + kind pour Kubernetes

### Mode développement (hot-reload)

```bash
docker compose up --build
```

Ce mode active le rechargement automatique du code, les logs verbeux, et monte le code source en volume.

### Mode production

```bash
docker compose -f docker-compose.yml up -d --build
```

Ce mode lance l'API avec 2 workers, un redémarrage automatique en cas de crash, et sans montage de code source.

### Accès

| Service | URL |
|---------|-----|
| API | http://localhost:8000 |
| Documentation interactive | http://localhost:8000/docs |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3000 (admin / admin) |

---

## CI – Intégration Continue

Le pipeline GitHub Actions (`.github/workflows/ci.yml`) tourne à chaque push et fait :

1. **Build** – installe les dépendances Python
2. **Lint** – vérifie la qualité du code avec `ruff`
3. **Tests** – lance les 19 tests avec `pytest`
4. **SAST** – analyse de sécurité du code avec Bandit
5. **Audit dépendances** – vérifie les CVE connues avec pip-audit
6. **Scan image Docker** – scan de l'image avec Trivy (bloque si CVE critique)

Si un test casse ou une faille critique est trouvée → le pipeline devient rouge ❌

![CI verte](docs/ci-green.png)

---

## Docker – Dev vs Prod

| | Dev | Prod |
|--|-----|------|
| Hot-reload | ✅ | ❌ |
| Code monté en volume | ✅ | ❌ |
| Workers uvicorn | 1 (reload) | 2 |
| Restart automatique | ❌ | ✅ |
| Logs | debug | normal |

La séparation se fait via deux fichiers :
- `docker-compose.yml` → prod
- `docker-compose.override.yml` → dev (appliqué automatiquement par Docker Compose)

La base SQLite est dans un volume Docker (`scores_data`) pour survivre aux redémarrages.

---

## Monitoring

Prometheus scrape `/metrics` de l'API toutes les 15 secondes. Le dashboard Grafana est provisionné automatiquement au démarrage.

Il affiche : trafic HTTP, latence p95, taux d'erreurs 5xx, tentatives de triche, scores soumis par jeu.

![Dashboard Grafana](docs/grafana-dashboard.png)

---

## Alertes

4 alertes configurées dans `monitoring/rules.yml` :

| Alerte | Condition |
|--------|-----------|
| **ServiceDown** | API down depuis 30s |
| **HighLatencyP95** | Latence p95 > 500ms pendant 1min |
| **HighErrorRate** | Plus de 5% de réponses en erreur |
| **CheatAttemptSpike** | Plus de 5 scores rejetés/s |

Pour déclencher ServiceDown : `docker compose stop api` → attendre 30s → visible sur http://localhost:9090/alerts

![Alerte Prometheus](docs/prometheus-alert.png)

---

## Test de charge (k6)

```bash
k6 run k6/load-test.js
```

Monte de 0 à 100 utilisateurs virtuels sur 7 minutes. Le pic déclenche l'alerte de latence dans Grafana.

---

## Structure du projet

```
.
├── app/                          # Code de l'API (fourni, non modifié)
├── tests/                        # Tests unitaires (fournis, non modifiés)
├── Dockerfile                    # Multi-stage (builder + production)
├── docker-compose.yml            # Stack prod
├── docker-compose.override.yml   # Surcharge dev (hot-reload)
├── requirements.txt
├── requirements-dev.txt
├── .github/workflows/ci.yml      # Pipeline CI
├── monitoring/
│   ├── prometheus.yml
│   ├── rules.yml                 # 4 règles d'alertes
│   ├── alertmanager.yml
│   └── grafana/                  # Dashboard provisionné automatiquement
├── k6/load-test.js               # Script de charge
├── k8s/
│   ├── deployment.yaml
│   └── service.yaml
└── docs/                         # Captures d'écran
```

---

## Kubernetes (bonus)

```bash
kind create cluster --name arcade
docker build -t arcade-leaderboard:latest .
kind load docker-image arcade-leaderboard:latest --name arcade
kubectl apply -f k8s/
kubectl get pods
kubectl port-forward svc/arcade-api 8000:80
curl http://localhost:8000/health
```

Le Deployment tourne avec 2 replicas et des probes `readiness` + `liveness` sur `/health`.
