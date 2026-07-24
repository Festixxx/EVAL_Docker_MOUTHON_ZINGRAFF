# Retro Arcade Leaderboard — code fourni

Ce dossier contient l'API et les tests unitaires **déjà écrits** pour
l'évaluation Cyber. Voir `Evaluation_Cyber_Arcade_Leaderboard.md` pour
l'énoncé complet et ce qui est attendu de vous.

## Lancer l'API en local

```bash
python -m venv .venv
source .venv/bin/activate   # .venv\Scripts\activate sous Windows
pip install -r requirements-dev.txt

uvicorn app.main:app --reload
```

L'API écoute par défaut sur `http://127.0.0.1:8000`. La base SQLite est
créée automatiquement dans `data/scores.db` (chemin surchargeable via la
variable d'environnement `DB_PATH`). Documentation interactive (Swagger)
disponible sur `http://127.0.0.1:8000/docs`.

## Tester manuellement (curl)

```bash
curl http://127.0.0.1:8000/health

curl -X POST http://127.0.0.1:8000/scores \
  -H "Content-Type: application/json" \
  -d '{"player": "AAA", "game": "pacman", "score": 123456}'

curl "http://127.0.0.1:8000/leaderboard/pacman?limit=5"
curl http://127.0.0.1:8000/players/AAA
curl http://127.0.0.1:8000/games
curl http://127.0.0.1:8000/metrics
```

## Lancer les tests

```bash
pytest -q
```

## Vérifier le linter

```bash
ruff check .
```

## Structure du code

```
app/
  main.py       # routes FastAPI (câblage HTTP uniquement)
  business.py   # règles métier pures (anti-triche, classement, cooldown)
  storage.py    # persistance SQLite
  metrics.py    # métriques Prometheus
  models.py     # schémas Pydantic
  games.py      # référentiel des jeux et de leur score max
tests/
  test_business.py  # tests unitaires de la logique métier
  test_api.py        # tests d'intégration de la couche HTTP
```

La logique métier (`business.py`) est volontairement indépendante de
FastAPI et de SQLite : c'est ce qui permet de la tester sans monter de
serveur ni de base de données.
