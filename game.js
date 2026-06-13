const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const bestEl = document.querySelector("#best");
const startButton = document.querySelector("#startButton");

const W = canvas.width;
const H = canvas.height;

let best = Number(localStorage.getItem("oneTapDriftBest") || 0);
let running = false;
let holding = false;
let score = 0;
let speed = 2.2;
let animationId;

const car = {
  x: W / 2,
  y: H - 120,
  angle: -Math.PI / 2,
  turn: 0.045,
  size: 16,
};

let barriers = [];

bestEl.textContent = best;

function resetGame() {
  score = 0;
  speed = 2.2;
  car.x = W / 2;
  car.y = H - 120;
  car.angle = -Math.PI / 2;
  barriers = [];
  for (let i = 0; i < 8; i++) {
    barriers.push(makeBarrier(-i * 110));
  }
}

function makeBarrier(offsetY = -80) {
  const gap = 125;
  const center = 70 + Math.random() * (W - 140);
  return {
    y: offsetY,
    leftWidth: center - gap / 2,
    rightX: center + gap / 2,
  };
}

function startGame() {
  cancelAnimationFrame(animationId);
  resetGame();
  running = true;
  startButton.textContent = "Restart game";
  loop();
}

function update() {
  const direction = holding ? 1 : -1;
  car.angle += direction * car.turn;
  car.x += Math.cos(car.angle) * speed;
  car.y += Math.sin(car.angle) * speed;

  barriers.forEach((barrier) => {
    barrier.y += speed * 1.7;
    if (barrier.y > H + 30) {
      Object.assign(barrier, makeBarrier(-70));
      score += 1;
      speed += 0.04;
    }
  });

  if (car.x < 8 || car.x > W - 8 || car.y < 8 || car.y > H - 8) {
    gameOver();
  }

  for (const barrier of barriers) {
    const nearBarrier = Math.abs(car.y - barrier.y) < 18;
    const hitsLeft = car.x < barrier.leftWidth;
    const hitsRight = car.x > barrier.rightX;
    if (nearBarrier && (hitsLeft || hitsRight)) {
      gameOver();
    }
  }

  scoreEl.textContent = score;
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let y = 0; y < H; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = "#e8e8e8";
  for (const barrier of barriers) {
    ctx.fillRect(0, barrier.y - 8, barrier.leftWidth, 16);
    ctx.fillRect(barrier.rightX, barrier.y - 8, W - barrier.rightX, 16);
  }

  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle + Math.PI / 2);
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(0, -car.size);
  ctx.lineTo(car.size * 0.7, car.size);
  ctx.lineTo(-car.size * 0.7, car.size);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  if (!running) {
    ctx.fillStyle = "rgba(0,0,0,0.48)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "bold 28px system-ui";
    ctx.fillText("Tap Start", W / 2, H / 2);
    ctx.font = "16px system-ui";
    ctx.fillText("Hold screen to drift right", W / 2, H / 2 + 32);
  }
}

function loop() {
  update();
  draw();
  if (running) animationId = requestAnimationFrame(loop);
}

function gameOver() {
  if (!running) return;
  running = false;
  best = Math.max(best, score);
  localStorage.setItem("oneTapDriftBest", String(best));
  bestEl.textContent = best;
  draw();
}

function setHolding(value) {
  holding = value;
}

startButton.addEventListener("click", startGame);

window.addEventListener("pointerdown", (event) => {
  if (event.target === startButton) return;
  setHolding(true);
});

window.addEventListener("pointerup", () => setHolding(false));
window.addEventListener("pointercancel", () => setHolding(false));

draw();
