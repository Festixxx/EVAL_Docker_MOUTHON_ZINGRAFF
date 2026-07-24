import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";
const errorRate = new Rate("error_rate");

export const options = {
  stages: [
    { duration: "2m", target: 50 },
    { duration: "3m", target: 50 },
    { duration: "1m", target: 100 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<500"],
  },
};

const GAMES = ["pacman", "tetris", "snake", "breakout", "donkeykong"];
const MAX_SCORES = { pacman: 999999, tetris: 9999999, snake: 99999, breakout: 896980, donkeykong: 1247700 };

export default function () {
  const game = GAMES[Math.floor(Math.random() * GAMES.length)];
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const player = letters[Math.floor(Math.random()*26)] + letters[Math.floor(Math.random()*26)] + letters[Math.floor(Math.random()*26)];
  const score = Math.floor(Math.random() * MAX_SCORES[game]);

  if (Math.random() < 0.6) {
    const res = http.post(`${BASE_URL}/scores`, JSON.stringify({ player, game, score }), {
      headers: { "Content-Type": "application/json" },
    });
    const ok = check(res, { "score accepté ou rejet connu": (r) => [201, 400, 422, 429].includes(r.status) });
    errorRate.add(!ok);
  }

  if (Math.random() < 0.3) {
    const res = http.get(`${BASE_URL}/leaderboard/${game}?limit=10`);
    check(res, { "leaderboard 200": (r) => r.status === 200 });
  }

  sleep(0.5 + Math.random() * 0.5);
}
