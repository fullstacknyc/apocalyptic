const canvas = document.createElement("canvas");
document.body.style.margin = "0";
document.body.style.overflow = "hidden";
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
document.body.appendChild(canvas);
const ctx = canvas.getContext("2d");

let playerX = canvas.width / 2;
let playerY = canvas.height / 2;
const playerSize = 30;
let playerHealth = 102;
let playerStamina = 100;
const maxStamina = 100;
const staminaRegenRate = 0.5;
const staminaDrainRate = 1;
const normalSpeed = 3;
const runSpeed = 10;
let currentSpeed = normalSpeed;
let attackCooldown = 0;
let attackFlash = 0;
let inventory = ["fists", "gun", "shotgun"];
let activeWeapon = "fists";
const keysPressed = {};
let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;

let zombies = [];
let bullets = [];
let zombieRespawnTimer = 0;
let score = 0;
let gameOver = false;

// Add variables for start screen and pause functionality
let gameStarted = false;
let gamePaused = false;

// Add sound effects
const sounds = {
  attack: new Audio("attack.mp3"),
  zombieDeath: new Audio("zombie-death.mp3"),
  switchWeapon: new Audio("switch-weapon.mp3"),
  healthPack: new Audio("health-pack.mp3"),
};

// Add health packs
let healthPacks = [];
function spawnHealthPack() {
  let x, y;
  do {
    x = Math.random() * canvas.width;
    y = Math.random() * canvas.height;
  } while (
    x > safeZone.x && x < safeZone.x + safeZone.size &&
    y > safeZone.y && y < safeZone.y + safeZone.size
  );
  healthPacks.push({ x, y, size: 20, timer: 600 }); // Despawn after 600 frames (~10 seconds)
}

function updateHealthPacks() {
  healthPacks.forEach((pack) => pack.timer--);
  healthPacks = healthPacks.filter((pack) => pack.timer > 0);
}

function drawHealthPacks() {
  ctx.fillStyle = "pink";
  healthPacks.forEach((pack) => ctx.fillRect(pack.x, pack.y, pack.size, pack.size));
}

// Fix: Ensure player health doesn't exceed the maximum
function checkHealthPackCollisions() {
  healthPacks = healthPacks.filter((pack) => {
    const touching =
      playerX < pack.x + pack.size &&
      playerX + playerSize > pack.x &&
      playerY < pack.y + pack.size &&
      playerY + playerSize > pack.y;
    if (touching) {
      playerHealth = Math.min(playerHealth + 30, 100); // Cap health at 100
      sounds.healthPack.play();
      return false;
    }
    return true;
  });
}

// Add shotgun weapon
function shootShotgun() {
  for (let i = -2; i <= 2; i++) {
    const angle = Math.atan2(mouseY - (playerY + playerSize / 2), mouseX - (playerX + playerSize / 2)) + i * 0.1;
    bullets.push({
      x: playerX + playerSize / 2,
      y: playerY + playerSize / 2,
      vx: Math.cos(angle) * 6,
      vy: Math.sin(angle) * 6,
      hit: false,
    });
  }
}

// Fix: Ensure event listeners don't stack if the game is restarted
window.removeEventListener("keydown", handleKeyDown);
window.removeEventListener("keyup", handleKeyUp);
window.removeEventListener("mousemove", handleMouseMove);
window.removeEventListener("mousedown", handleMouseDown);

function handleKeyDown(e) {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "q", "Shift"].includes(e.key)) {
    e.preventDefault();
  }
  keysPressed[e.key] = true;
  if (e.key === "q") switchWeapon();
  if (e.key === "r" && gameOver) {
    location.reload(); // Restart the game
  }
  if (e.key === "Enter" && !gameStarted) {
    gameStarted = true;
    draw();
  }
  if (e.key === "Escape" && gameStarted) togglePause();
}

function handleKeyUp(e) {
  keysPressed[e.key] = false;
}

function handleMouseMove(e) {
  mouseX = e.clientX;
  mouseY = e.clientY;
}

function handleMouseDown(e) {
  if (e.button === 0 && attackCooldown <= 0) {
    if (activeWeapon === "fists") {
      attackZombies();
      attackCooldown = 20;
      attackFlash = 5;
      sounds.attack.play();
    } else if (activeWeapon === "gun") {
      shootBullet();
      attackCooldown = 10;
    } else if (activeWeapon === "shotgun") {
      shootShotgun();
      attackCooldown = 30;
    } else if (activeWeapon === "sniper") {
      shootSniper();
      attackCooldown = sniperCooldown;
    }
  }
}

window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
window.addEventListener("mousemove", handleMouseMove);
window.addEventListener("mousedown", handleMouseDown);

// Fix: Ensure zombies and boss zombies spawn at a safe distance from the player
function spawnZombie() {
  let x, y;
  do {
    x = Math.random() * canvas.width; // Spawn inside the map
    y = Math.random() * canvas.height; // Spawn inside the map
  } while (Math.hypot(playerX - x, playerY - y) < 300); // Ensure zombie spawns at least 300px away
  zombies.push({ x, y, size: 40, health: 50, state: "idle" });
}

function switchWeapon() {
  activeWeapon = inventory[(inventory.indexOf(activeWeapon) + 1) % inventory.length];
  sounds.switchWeapon.play();
  attackFlash = 10; // Flash effect for weapon switching
}

// Fix: Prevent player stamina from going negative
function updatePlayerPosition() {
  if (keysPressed["Shift"] && playerStamina > 0) {
    currentSpeed = runSpeed;
    playerStamina -= staminaDrainRate;
    if (playerStamina < 0) playerStamina = 0;
  } else {
    currentSpeed = normalSpeed;
    if (!keysPressed["Shift"] && playerStamina < maxStamina) {
      playerStamina += staminaRegenRate;
      if (playerStamina > maxStamina) playerStamina = maxStamina;
    }
  }

  if (keysPressed["ArrowUp"] || keysPressed["w"]) playerY -= currentSpeed;
  if (keysPressed["ArrowDown"] || keysPressed["s"]) playerY += currentSpeed;
  if (keysPressed["ArrowLeft"] || keysPressed["a"]) playerX -= currentSpeed;
  if (keysPressed["ArrowRight"] || keysPressed["d"]) playerX += currentSpeed;

  playerX = Math.max(0, Math.min(playerX, canvas.width - playerSize));
  playerY = Math.max(0, Math.min(playerY, canvas.height - playerSize));
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
  ctx.fillText(`Weapon: ${activeWeapon}`, 10, 120); // Move weapon text below XP bar
}

function drawPlayerStamina() {
  ctx.fillStyle = "yellow";
  ctx.fillRect(10, 40, (playerStamina / maxStamina) * 200, 20);
  ctx.strokeStyle = "white";
  ctx.strokeRect(10, 40, 200, 20);
  ctx.fillStyle = "white";
  ctx.font = "16px sans-serif";
  ctx.fillText(`Stamina: ${Math.ceil(playerStamina)}`, 220, 56);
}

function moveZombies() {
  zombies.forEach((z) => {
    if (checkSafeZone(z)) return; // Prevent zombies from entering the safe zone
    const dx = playerX - z.x;
    const dy = playerY - z.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 300) z.state = "aggro";
    else if (dist > 500) z.state = "idle";
    if (z.state === "aggro" && z.health > 0) {
      z.x += (dx / dist) * (z.speed || 1.2);
      z.y += (dy / dist) * (z.speed || 1.2);
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
    const dx = playerX - z.x;
    const dy = playerY - z.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 200) { // Only draw health bars inside the fog of war
      ctx.fillStyle = "red";
      ctx.fillRect(z.x, z.y - 10, Math.max(z.health, 0) * 0.8, 5);
      ctx.strokeStyle = "black";
      ctx.strokeRect(z.x, z.y - 10, 40, 5);
    }
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
    damage: 10,
    hit: false
  });
}

// Fix: Ensure bullets deal damage only once per zombie
function updateBullets() {
  bullets.forEach((b) => {
    b.x += b.vx;
    b.y += b.vy;
    zombies.forEach((z) => {
      if (
        z.health > 0 &&
        !b.hit &&
        b.x > z.x &&
        b.x < z.x + z.size &&
        b.y > z.y &&
        b.y < z.y + z.size
      ) {
        z.health -= b.damage || 10;
        b.hit = true;
      }
    });
    if (
      bossZombie &&
      !b.hit &&
      b.x > bossZombie.x &&
      b.x < bossZombie.x + bossZombie.size &&
      b.y > bossZombie.y &&
      b.y < bossZombie.y + bossZombie.size
    ) {
      bossZombie.health -= b.damage || 10;
      b.hit = true;
    }
  });
  bullets = bullets.filter(
    (b) => !b.hit && b.x > 0 && b.x < canvas.width && b.y > 0 && b.y < canvas.height
  );
}

function drawBullets() {
  ctx.fillStyle = "yellow";
  bullets.forEach((b) => ctx.fillRect(b.x, b.y, 5, 5));
}

function removeDeadZombies() {
  zombies = zombies.filter(z => {
    if (z.health <= 0) {
      score += 10; // Increase score for each zombie killed
      sounds.zombieDeath.play();
      return false;
    }
    return true;
  });
}

function drawFogOfWar() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(playerX + playerSize / 2, playerY + playerSize / 2, 200, 0, Math.PI * 2); // Center fog around the player
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
}

function drawCrosshair() {
  ctx.fillStyle = "white";
  ctx.fillRect(mouseX - 10, mouseY - 2, 20, 4); 
  ctx.fillRect(mouseX - 2, mouseY - 10, 4, 20); 
}

function drawScore() {
  ctx.fillStyle = "white";
  ctx.font = "20px sans-serif";
  ctx.fillText(`Score: ${score}`, canvas.width - 120, 30);
}

function checkGameOver() {
  if (playerHealth <= 0) {
    gameOver = true;
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "40px sans-serif";
    ctx.fillText("Game Over", canvas.width / 2 - 100, canvas.height / 2 - 20);
    ctx.font = "20px sans-serif";
    ctx.fillText(`Final Score: ${score}`, canvas.width / 2 - 80, canvas.height / 2 + 20);
    ctx.fillText("Press R to Restart", canvas.width / 2 - 100, canvas.height / 2 + 60);
    return true;
  }
  return false;
}

function drawMiniMap() {
  const mapSize = 150;
  const mapScale = canvas.width / mapSize; // Adjust scale for symmetry
  const mapX = canvas.width / 2 - mapSize / 2; // Center the mini-map horizontally
  const mapY = canvas.height - mapSize - 10; // Position at the bottom

  // Draw mini-map background
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(mapX, mapY, mapSize, mapSize);

  // Draw player on mini-map
  ctx.fillStyle = "blue";
  ctx.fillRect(
    mapX + (playerX / canvas.width) * mapSize - 2,
    mapY + (playerY / canvas.height) * mapSize - 2,
    4,
    4
  );

  // Draw zombies on mini-map
  zombies.forEach((z) => {
    if (z.health > 0) {
      ctx.fillStyle = z.state === "aggro" ? "red" : "green";
      ctx.fillRect(
        mapX + (z.x / canvas.width) * mapSize - 2,
        mapY + (z.y / canvas.height) * mapSize - 2,
        4,
        4
      );
    }
  });

  // Draw mini-map border
  ctx.strokeStyle = "white";
  ctx.strokeRect(mapX, mapY, mapSize, mapSize);
}

function drawLowHealthWarning() {
  if (playerHealth > 0 && playerHealth <= 20) {
    ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "30px sans-serif";
    ctx.fillText("WARNING: LOW HEALTH!", canvas.width / 2 - 150, canvas.height / 2);
  }
}

// Add start screen and pause functionality
function drawStartScreen() {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.font = "40px sans-serif";
  ctx.fillText("Zombie Survival", canvas.width / 2 - 150, canvas.height / 2 - 40);
  ctx.font = "20px sans-serif";
  ctx.fillText("Press Enter to Start", canvas.width / 2 - 100, canvas.height / 2 + 20);
}

function togglePause() {
  gamePaused = !gamePaused;
  if (!gamePaused) draw();
}

// Add new weapon: Sniper Rifle
inventory.push("sniper");
const sniperCooldown = 50;
const sniperDamage = 100;

// Fix: Add missing safe zone initialization
const safeZone = { x: canvas.width / 2 - 100, y: canvas.height / 2 - 100, size: 200 };

// Add Boss Zombie logic
let bossZombie = null;

// Fix: Ensure boss zombie spawns correctly and doesn't overlap with the player
function spawnBossZombie() {
  let x, y;
  do {
    x = Math.random() * canvas.width;
    y = Math.random() * canvas.height;
  } while (Math.hypot(playerX - x, playerY - y) < 500); // Ensure boss spawns at least 500px away
  bossZombie = { x, y, size: 80, health: 500, speed: 0.8 };
}

// Fix: Ensure game doesn't crash if boss zombie is null
function drawBossZombie() {
  if (bossZombie) {
    const dx = playerX - bossZombie.x;
    const dy = playerY - bossZombie.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 200) { // Only draw boss inside the fog of war
      ctx.fillStyle = "purple";
      ctx.fillRect(bossZombie.x, bossZombie.y, bossZombie.size, bossZombie.size);
      ctx.fillStyle = "red";
      ctx.fillRect(bossZombie.x, bossZombie.y - 10, bossZombie.health / 5, 5);
      ctx.strokeStyle = "black";
      ctx.strokeRect(bossZombie.x, bossZombie.y - 10, 100, 5);
    }
  }
}

// Fix: Prevent boss zombie from overlapping with the safe zone
function moveBossZombie() {
  if (bossZombie) {
    const dx = playerX - bossZombie.x;
    const dy = playerY - bossZombie.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0) {
      bossZombie.x += (dx / dist) * bossZombie.speed;
      bossZombie.y += (dy / dist) * bossZombie.speed;
    }
    // Prevent boss from despawning in the safe zone
    if (checkSafeZone(bossZombie)) {
      bossZombie.x -= (dx / dist) * bossZombie.speed;
      bossZombie.y -= (dy / dist) * bossZombie.speed;
    }
  }
}

function checkBossZombieCollision() {
  if (bossZombie) {
    const touching =
      playerX < bossZombie.x + bossZombie.size &&
      playerX + playerSize > bossZombie.x &&
      playerY < bossZombie.y + bossZombie.size &&
      playerY + playerSize > bossZombie.y;
    if (touching) {
      playerHealth -= 1; // Boss deals more damage
      if (playerHealth < 0) playerHealth = 0;
    }
  }
}

function removeBossZombie() {
  if (bossZombie && bossZombie.health <= 0) {
    score += 100; // Higher score for defeating the boss
    bossZombie = null;
    sounds.zombieDeath.play();
  }
}

// Add sniper shooting logic
function shootSniper() {
  const angle = Math.atan2(mouseY - (playerY + playerSize / 2), mouseX - (playerX + playerSize / 2));
  bullets.push({
    x: playerX + playerSize / 2,
    y: playerY + playerSize / 2,
    vx: Math.cos(angle) * 10,
    vy: Math.sin(angle) * 10,
    damage: sniperDamage,
    hit: false,
  });
}

// Add leveling system
let playerLevel = 0; // Start at level 0
let experience = 0;
const experienceToLevelUp = 100;

function gainExperience(amount) {
  experience += amount;
  if (experience >= experienceToLevelUp) {
    playerLevel++;
    experience -= experienceToLevelUp;
    playerHealth = Math.min(playerHealth + 20, 100); // Heal on level up
    maxStamina += 10; // Increase stamina cap
  }
}

function drawPlayerLevel() {
  ctx.fillStyle = "white";
  ctx.font = "16px sans-serif";
  const levelText = `Level: ${playerLevel}`;
  const xpText = `XP: ${experience}/${experienceToLevelUp}`;
  const barWidth = Math.max(ctx.measureText(levelText).width, ctx.measureText(xpText).width) + 20;

  ctx.fillText(levelText, 10, 80);
  ctx.fillText(xpText, 10, 100);

  ctx.strokeStyle = "white";
  ctx.strokeRect(10, 110, barWidth, 10);
  ctx.fillStyle = "green";
  ctx.fillRect(10, 110, (experience / experienceToLevelUp) * barWidth, 10);
}

// Add weapon cooldown indicator
function drawWeaponCooldown() {
  const cooldownWidth = (attackCooldown / 50) * 200;
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.fillRect(10, 70, 200, 10);
  ctx.fillStyle = "red";
  ctx.fillRect(10, 70, cooldownWidth, 10);
  ctx.strokeStyle = "white";
  ctx.strokeRect(10, 70, 200, 10);
}

// Modify safe zone logic to unlock after reaching level 1
function drawSafeZone() {
  if (playerLevel >= 1) {
    ctx.strokeStyle = "rgba(0, 255, 0, 0.5)";
    ctx.lineWidth = 2;
    ctx.strokeRect(safeZone.x, safeZone.y, safeZone.size, safeZone.size);
  }
}

// Fix: Prevent zombies from entering the safe zone
function checkSafeZone(zombie) {
  if (playerLevel < 1) return false; // Safe zone is inactive before level 1
  return (
    zombie.x + zombie.size > safeZone.x &&
    zombie.x < safeZone.x + safeZone.size &&
    zombie.y + zombie.size > safeZone.y &&
    zombie.y < safeZone.y + safeZone.size
  );
}

// Add boss spawn timer
let bossSpawnTimer = 1500; // Quintuple the previous spawn time (300 * 5)

function drawBossSpawnTimer() {
  ctx.fillStyle = "white";
  ctx.font = "16px sans-serif";
  ctx.fillText(`Boss Spawn In: ${bossSpawnTimer}s`, canvas.width - 200, 50);
}

// Add visual stamina depletion effect
function drawStaminaEffect() {
  if (playerStamina <= 20) {
    ctx.fillStyle = "rgba(255, 255, 0, 0.2)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

// Add a visual indicator for boss spawn location
function drawBossSpawnIndicator() {
  if (bossSpawnTimer <= 5) {
    ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
    ctx.font = "20px sans-serif";
    ctx.fillText("Boss Incoming!", canvas.width / 2 - 80, canvas.height / 2 - 20);
  }
}

// Fix: Ensure game loop doesn't crash if gameOver is true
function draw() {
  if (!gameStarted) {
    drawStartScreen();
    return;
  }
  if (gamePaused) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "30px sans-serif";
    ctx.fillText("Paused", canvas.width / 2 - 50, canvas.height / 2);
    return;
  }
  if (checkGameOver()) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  updatePlayerPosition();
  moveZombies();
  moveBossZombie(); // Move boss zombie
  updateBullets();
  updateHealthPacks(); // Update health pack timers
  drawFogOfWar();
  drawSafeZone(); // Draw safe zone
  drawPlayer();
  drawPlayerHealth();
  drawPlayerStamina();
  drawStaminaEffect(); // Add stamina effect
  drawPlayerLevel(); // Draw player level
  drawWeaponCooldown(); // Draw weapon cooldown
  drawZombies();
  drawZombiesHealth();
  drawBossZombie(); // Draw boss zombie
  drawBullets();
  checkZombieCollisions();
  checkBossZombieCollision(); // Check collision with boss
  removeDeadZombies();
  removeBossZombie(); // Remove boss if defeated
  drawCrosshair();
  drawScore();
  drawMiniMap();
  drawLowHealthWarning(); // Add low health warning
  drawHealthPacks();
  checkHealthPackCollisions();
  drawBossSpawnTimer(); // Draw boss spawn timer
  drawBossSpawnIndicator(); // Add boss spawn indicator
  if (zombieRespawnTimer-- <= 0) {
    spawnZombie();
    zombieRespawnTimer = 200 + Math.random() * 300;
  }
  if (attackCooldown > 0) attackCooldown--;
  if (attackFlash > 0) attackFlash--;
  if (bossSpawnTimer-- <= 0) {
    spawnBossZombie();
    bossSpawnTimer = 1500; // Reset boss spawn timer
  }
  requestAnimationFrame(draw);
}

// Add difficulty progression
function increaseDifficulty() {
  zombies.forEach((z) => (z.speed = (z.speed || 1.2) + 0.1));
  zombieRespawnTimer = Math.max(zombieRespawnTimer - 10, 50);
}
setInterval(increaseDifficulty, 30000); // Increase difficulty every 30 seconds

// Spawn health packs periodically
setInterval(spawnHealthPack, 20000); // Spawn a health pack every 20 seconds

// Spawn boss zombie periodically
setInterval(spawnBossZombie, 60000); // Spawn boss every 60 seconds

// Add a loading screen removal
window.addEventListener('load', () => {
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) loadingScreen.style.display = 'none';
});

spawnZombie();
spawnZombie();
draw();
