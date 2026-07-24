/**
 * Test de montée en charge – Retro Arcade Leaderboard
 *
 * Usage :
 *   k6 run k6/load-test.js
 *   k6 run --env BASE_URL=http://localhost:8000 k6/load-test.js
 *
 * Scénario :
 *   0→2 min  : montée progressive de 0 à 50 VUs (ramp-up)
 *   2→5 min  : charge stable à 50 VUs
 *   5→6 min  : pic à 100 VUs (pour déclencher les alertes)
 *   6→7 min  : descente progressive (ramp-down)
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";

const errorRate = new Rate("error_rate");

export const options = {
  stages: [
    { duration: "2m", target: 50 },   // ramp-up
    { duration: "3m", target: 50 },   // charge stable
    { duration: "1m", target: 100 },  // pic → doit déclencher alerte latence
    { duration: "1m", target: 0 },    // ramp-down
  ],
  thresholds: {
    http_req_failed: ["rate<0.05"],            // < 5% d'erreurs
    http_req_duration: ["p(95)<500"],          // p95 < 500ms
    error_rate: ["rate<0.05"],
  },
};

const GAMES = ["pacman", "tetris", "snake", "breakout", "donkeykong"];
const MAX_SCORES = {
  pacman: 999999,
  tetris: 9999999,
  snake: 99999,
  breakout: 896980,
  donkeykong: 1247700,
};

function randomGame() {
  return GAMES[Math.floor(Math.random() * GAMES.length)];
}

function randomPlayer() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return (
    letters[Math.floor(Math.random() * 26)] +
    letters[Math.floor(Math.random() * 26)] +
    letters[Math.floor(Math.random() * 26)]
  );
}

export default function () {
  const game = randomGame();
  const player = randomPlayer();
  const score = Math.floor(Math.random() * MAX_SCORES[game]);

  // 60% : soumettre un score
  if (Math.random() < 0.6) {
    const payload = JSON.stringify({ player, game, score });
    const res = http.post(`${BASE_URL}/scores`, payload, {
      headers: { "Content-Type": "application/json" },
    });

    const ok = check(res, {
      "submit score 201 ou rejet connu": (r) =>
        [201, 400, 422, 429].includes(r.status),
    });
    errorRate.add(!ok);
  }

  // 30% : consulter le classement
  if (Math.random() < 0.3) {
    const res = http.get(`${BASE_URL}/leaderboard/${game}?limit=10`);
    check(res, { "leaderboard 200": (r) => r.status === 200 });
  }

  // 10% : consulter les scores d'un joueur
  if (Math.random() < 0.1) {
    const res = http.get(`${BASE_URL}/players/${player}`);
    check(res, { "player scores 200": (r) => r.status === 200 });
  }

  sleep(0.5 + Math.random() * 0.5); // 0.5–1s entre chaque itération
}
