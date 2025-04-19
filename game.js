const canvas = document.createElement("canvas");
document.body.style.margin = "0";
document.body.style.overflow = "hidden";
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
document.body.appendChild(canvas);
const ctx = canvas.getContext("2d");

let playerX = canvas.width / 2;
let playerY = canvas.height / 2;
const playerSize = 40;
let playerHealth = 100;
const speed = 3;

const keysPressed = {};
let attackCooldown = 0;
let attackFlash = 0;
let inventory = ["fists"];
let activeWeapon = "fists";

window.addEventListener("keydown", (e) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
    e.preventDefault();
  }
  keysPressed[e.key] = true;

  if (e.key === " " && attackCooldown <= 0) {
    if (activeWeapon === "fists") {
      attackZombies();
      attackCooldown = 20;
      attackFlash = 5;
    } else if (activeWeapon === "gun") {
      shootBullet();
    }
  }
});

window.addEventListener("keyup", (e) => {
  keysPressed[e.key] = false;
});

function updatePlayerPosition() {
  if (keysPressed["ArrowUp"] && playerY > 0) playerY -= speed;
  if (keysPressed["ArrowDown"] && playerY + playerSize < canvas.height) playerY += speed;
  if (keysPressed["ArrowLeft"] && playerX > 0) playerX -= speed;
  if (keysPressed["ArrowRight"] && playerX + playerSize < canvas.width) playerX += speed;
}

function drawPlayer() {
  if (playerHealth <= 0) {
    ctx.fillStyle = "gray";
  } else {
    ctx.fillStyle = attackFlash > 0 ? "red" : "blue";
  }
  ctx.fillRect(playerX, playerY, playerSize, playerSize);
}

function drawPlayerHealth() {
  ctx.fillStyle = "red";
  ctx.fillRect(10, 10, Math.max(playerHealth, 0) * 2, 20);
  ctx.strokeStyle = "black";
  ctx.strokeRect(10, 10, 200, 20);
}

let zombies = [
  { x: 100, y: 100, size: 40, health: 50, state: "idle" },
  { x: 500, y: 400, size: 40, health: 50, state: "idle" },
];

function moveZombies() {
  zombies.forEach((zombie) => {
    let dx = playerX - zombie.x;
    let dy = playerY - zombie.y;
    let dist = Math.hypot(dx, dy);

    if (dist < 300) zombie.state = "aggro";
    if (dist > 400) zombie.state = "idle";

    if (zombie.state === "aggro" && zombie.health > 0) {
      zombie.x += (dx / dist) * 1.2;
      zombie.y += (dy / dist) * 1.2;
    }
  });
}

function drawZombies() {
  zombies.forEach((z) => {
    ctx.fillStyle = z.health > 0 ? (z.state === "aggro" ? "#228822" : "green") : "black";
    ctx.fillRect(z.x, z.y, z.size, z.size);
  });
}

function drawZombiesHealth() {
  ctx.fillStyle = "red";
  zombies.forEach((z) => {
    ctx.fillRect(z.x, z.y - 10, Math.max(z.health, 0) * 0.8, 5);
    ctx.strokeStyle = "black";
    ctx.strokeRect(z.x, z.y - 10, 40, 5);
  });
}

function checkZombieCollisions() {
  zombies.forEach((z) => {
    const touching =
      playerX < z.x + z.size &&
      playerX + playerSize > z.x &&
      playerY < z.y + z.size &&
      playerY + playerSize > z.y;

    if (touching && z.health > 0 && playerHealth > 0) {
      playerHealth -= 0.3;
      if (playerHealth < 0) playerHealth = 0;
    }
  });
}

function attackZombies() {
  zombies.forEach((z) => {
    const dx = playerX - z.x;
    const dy = playerY - z.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 60 && z.health > 0) {
      z.health -= 20;
    }
  });
}

let bullets = [];

function shootBullet() {
  bullets.push({
    x: playerX + playerSize / 2,
    y: playerY + playerSize / 2,
    vx: 5,
    vy: 0,
  });
}

function updateBullets() {
  bullets.forEach((b) => {
    b.x += b.vx;
    b.y += b.vy;
  });

  bullets.forEach((b) => {
    zombies.forEach((z) => {
      if (
        z.health > 0 &&
        b.x > z.x &&
        b.x < z.x + z.size &&
        b.y > z.y &&
        b.y < z.y + z.size
      ) {
        z.health -= 10;
      }
    });
  });

  bullets = bullets.filter((b) => b.x < canvas.width && b.y < canvas.height);
}

function drawBullets() {
  ctx.fillStyle = "yellow";
  bullets.forEach((b) => {
    ctx.fillRect(b.x, b.y, 5, 5);
  });
}

function removeDeadZombies() {
  zombies = zombies.filter(z => z.health > 0);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  updatePlayerPosition();
  moveZombies();
  updateBullets();

  drawPlayer();
  drawPlayerHealth();
  drawZombies();
  drawZombiesHealth();
  drawBullets();
  checkZombieCollisions();
  removeDeadZombies();

  if (attackCooldown > 0) attackCooldown--;
  if (attackFlash > 0) attackFlash--;

  requestAnimationFrame(draw);
}

draw();
