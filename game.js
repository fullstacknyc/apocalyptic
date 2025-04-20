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
const normalSpeed = 3;
const runSpeed = 6;
let currentSpeed = normalSpeed;
let attackCooldown = 0;
let attackFlash = 0;
let inventory = ["fists", "gun"];
let activeWeapon = "fists";
const keysPressed = {};
let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;

let zombies = [];
let bullets = [];
let zombieRespawnTimer = 0;

function spawnZombie() {
  const edge = Math.floor(Math.random() * 4);
  let x, y;
  if (edge === 0) { x = -50; y = Math.random() * canvas.height; }
  else if (edge === 1) { x = canvas.width + 50; y = Math.random() * canvas.height; }
  else if (edge === 2) { x = Math.random() * canvas.width; y = -50; }
  else { x = Math.random() * canvas.width; y = canvas.height + 50; }
  zombies.push({ x, y, size: 40, health: 50, state: "idle" });
}

function switchWeapon() {
  activeWeapon = inventory[(inventory.indexOf(activeWeapon) + 1) % inventory.length];
}

window.addEventListener("keydown", (e) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "q", "Shift"].includes(e.key)) {
    e.preventDefault();
  }
  keysPressed[e.key] = true;
  if (e.key === "q") switchWeapon();
});

window.addEventListener("keyup", (e) => {
  keysPressed[e.key] = false;
});

window.addEventListener("mousemove", (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

function updatePlayerPosition() {
  if (keysPressed["ArrowUp"] || keysPressed["w"]) playerY -= currentSpeed;
  if (keysPressed["ArrowDown"] || keysPressed["s"]) playerY += currentSpeed;
  if (keysPressed["ArrowLeft"] || keysPressed["a"]) playerX -= currentSpeed;
  if (keysPressed["ArrowRight"] || keysPressed["d"]) playerX += currentSpeed;
  playerX = Math.max(0, Math.min(playerX, canvas.width - playerSize));
  playerY = Math.max(0, Math.min(playerY, canvas.height - playerSize));
  if (keysPressed["Shift"]) currentSpeed = runSpeed;
  else currentSpeed = normalSpeed;
}

function drawPlayer() {
  ctx.fillStyle = playerHealth <= 0 ? "gray" : attackFlash > 0 ? "red" : "blue";
  ctx.fillRect(playerX, playerY, playerSize, playerSize);
}

function drawPlayerHealth() {
  ctx.fillStyle = "red";
  ctx.fillRect(10, 10, Math.max(playerHealth, 0) * 2, 20);
  ctx.strokeStyle = "white";
  ctx.strokeRect(10, 10, 200, 20);
  ctx.fillStyle = "white";
  ctx.font = "16px sans-serif";
  ctx.fillText(`HP: ${Math.ceil(playerHealth)}`, 220, 26);
  ctx.fillText(`Weapon: ${activeWeapon}`, 10, 50);
}

function moveZombies() {
  zombies.forEach((z) => {
    const dx = playerX - z.x;
    const dy = playerY - z.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 300) z.state = "aggro";
    else if (dist > 500) z.state = "idle";
    if (z.state === "aggro" && z.health > 0) {
      z.x += (dx / dist) * 1.2;
      z.y += (dy / dist) * 1.2;
    }
  });
}

function drawZombies() {
  zombies.forEach((z) => {
    const dx = playerX - z.x;
    const dy = playerY - z.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 200) {  // Zombies only appear inside the fog of war
      ctx.fillStyle = z.health > 0 ? (z.state === "aggro" ? "#228822" : "green") : "black";
      ctx.fillRect(z.x, z.y, z.size, z.size);
    }
  });
}

function drawZombiesHealth() {
  zombies.forEach((z) => {
    ctx.fillStyle = "red";
    ctx.fillRect(z.x, z.y - 10, Math.max(z.health, 0) * 0.8, 5);
    ctx.strokeStyle = "black";
    ctx.strokeRect(z.x, z.y - 10, 40, 5);
  });
}

function checkZombieCollisions() {
  zombies.forEach((z) => {
    const touching = playerX < z.x + z.size && playerX + playerSize > z.x && playerY < z.y + z.size && playerY + playerSize > z.y;
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

function shootBullet() {
  const angle = Math.atan2(mouseY - (playerY + playerSize / 2), mouseX - (playerX + playerSize / 2));
  bullets.push({
    x: playerX + playerSize / 2,
    y: playerY + playerSize / 2,
    vx: Math.cos(angle) * 6,
    vy: Math.sin(angle) * 6,
    hit: false
  });
}

window.addEventListener("mousedown", (e) => {
  if (e.button === 0 && attackCooldown <= 0) {
    if (activeWeapon === "fists") {
      attackZombies();
      attackCooldown = 20;
      attackFlash = 5;
    } else if (activeWeapon === "gun") {
      shootBullet();
      attackCooldown = 10;
    }
  }
});

function updateBullets() {
  bullets.forEach((b) => {
    b.x += b.vx;
    b.y += b.vy;
    zombies.forEach((z) => {
      if (z.health > 0 && b.x > z.x && b.x < z.x + z.size && b.y > z.y && b.y < z.y + z.size) {
        z.health -= 10;
        b.hit = true;
      }
    });
  });
  bullets = bullets.filter((b) => !b.hit && b.x > 0 && b.x < canvas.width && b.y > 0 && b.y < canvas.height);
}

function drawBullets() {
  ctx.fillStyle = "yellow";
  bullets.forEach((b) => ctx.fillRect(b.x, b.y, 5, 5));
}

function removeDeadZombies() {
  zombies = zombies.filter(z => z.health > 0);
}

function drawFogOfWar() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(playerX, playerY, 200, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
}

function drawCrosshair() {
  ctx.fillStyle = "white";
  ctx.fillRect(mouseX - 10, mouseY - 10, 20, 2); 
  ctx.fillRect(mouseX - 10, mouseY - 10, 2, 20); 
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  updatePlayerPosition();
  moveZombies();
  updateBullets();
  drawFogOfWar();
  drawPlayer();
  drawPlayerHealth();
  drawZombies();
  drawZombiesHealth();
  drawBullets();
  checkZombieCollisions();
  removeDeadZombies();
  drawCrosshair();
  if (zombieRespawnTimer-- <= 0) {
    spawnZombie();
    zombieRespawnTimer = 200 + Math.random() * 300;
  }
  if (attackCooldown > 0) attackCooldown--;
  if (attackFlash > 0) attackFlash--;
  requestAnimationFrame(draw);
}

spawnZombie();
spawnZombie();
draw();
