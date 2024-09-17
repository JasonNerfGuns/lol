const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameButton = document.getElementById('game-button');

let player;
let circles = [];
let bullets = [];
let pulses = [];
let gameRunning = false;
let gameOver = false;
let lastShotTime = 0;
let lastSpecialShotTime = 0;
let score = 0;
let mouseX = 0;
let mouseY = 0;
const shootCooldown = 500;
const specialShootCooldown = 60000;

// Camera and world size
let camera = { x: 0, y: 0 };
const worldWidth = 5000;
const worldHeight = 5000;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Player {
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.speed = 7;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x - camera.x, this.y - camera.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'blue';
        ctx.fill();
        ctx.closePath();
    }

    move(dx, dy) {
        this.x = Math.max(this.radius, Math.min(worldWidth - this.radius, this.x + dx * this.speed));
        this.y = Math.max(this.radius, Math.min(worldHeight - this.radius, this.y + dy * this.speed));
        this.updateCamera();
    }

    updateCamera() {
        camera.x = this.x - canvas.width / 2;
        camera.y = this.y - canvas.height / 2;
        camera.x = Math.max(0, Math.min(worldWidth - canvas.width, camera.x));
        camera.y = Math.max(0, Math.min(worldHeight - canvas.height, camera.y));
    }
}

class Circle {
    constructor(x, y, radius, speed) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.speed = speed;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x - camera.x, this.y - camera.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.closePath();
    }

    move() {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        this.x += (dx / distance) * this.speed;
        this.y += (dy / distance) * this.speed;
    }
}

class Bullet {
    constructor(x, y, targetX, targetY) {
        this.x = x + camera.x;
        this.y = y + camera.y;
        this.radius = 5;
        this.speed = 10;
        const dx = targetX - x;
        const dy = targetY - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        this.vx = (dx / distance) * this.speed;
        this.vy = (dy / distance) * this.speed;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x - camera.x, this.y - camera.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'yellow';
        ctx.fill();
        ctx.closePath();
    }

    move() {
        this.x += this.vx;
        this.y += this.vy;
    }

    isOutOfBounds() {
        return this.x < 0 || this.x > worldWidth || this.y < 0 || this.y > worldHeight;
    }
}

class Pulse {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.maxRadius = 200;
        this.growthRate = 5;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x - camera.x, this.y - camera.y, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'purple';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.closePath();
    }

    grow() {
        this.radius += this.growthRate;
    }

    isFinished() {
        return this.radius >= this.maxRadius;
    }
}

function init() {
    canvas.style.display = 'block';
    gameButton.style.display = 'none';
    gameOver = false;
    gameRunning = true;
    player = new Player(worldWidth / 2, worldHeight / 2, 20);
    circles = [];
    bullets = [];
    pulses = [];
    score = 0;
    lastShotTime = 0;
    lastSpecialShotTime = 0;
    for (let i = 0; i < 20; i++) {
        spawnCircle();
    }
    gameLoop();
}

function spawnCircle() {
    const radius = 10;
    let x, y;
    const minDistance = 500; // Minimum spawn distance from player
    do {
        x = Math.random() * worldWidth;
        y = Math.random() * worldHeight;
    } while (Math.sqrt((x - player.x) ** 2 + (y - player.y) ** 2) < minDistance);
    circles.push(new Circle(x, y, radius, 2));
}

function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw world boundaries
    ctx.strokeStyle = 'white';
    ctx.strokeRect(-camera.x, -camera.y, worldWidth, worldHeight);

    player.draw();

    circles.forEach((circle, index) => {
        circle.move();
        circle.draw();
        const dx = player.x - circle.x;
        const dy = player.y - circle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < player.radius + circle.radius) {
            gameOver = true;
            gameRunning = false;
            showGameOver();
        }
    });

    bullets = bullets.filter(bullet => {
        bullet.move();
        bullet.draw();
        let hitEnemy = false;
        circles = circles.filter(circle => {
            const dx = bullet.x - circle.x;
            const dy = bullet.y - circle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < bullet.radius + circle.radius) {
                hitEnemy = true;
                score += 10;
                return false;
            }
            return true;
        });
        return !hitEnemy && !bullet.isOutOfBounds();
    });

    pulses = pulses.filter(pulse => {
        pulse.grow();
        pulse.draw();
        circles = circles.filter(circle => {
            const dx = pulse.x - circle.x;
            const dy = pulse.y - circle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= pulse.radius) {
                score += 10;
                return false;
            }
            return true;
        });
        return !pulse.isFinished();
    });

    if (Math.random() < 0.02) {
        spawnCircle();
    }

    drawCooldownIndicator(10, 10, shootCooldown, lastShotTime, 'yellow');
    drawCooldownIndicator(10, 50, specialShootCooldown, lastSpecialShotTime, 'purple');

    ctx.font = '24px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 10, 100);
}


function drawCooldownIndicator(x, y, cooldown, lastTime, color) {
    const currentTime = Date.now();
    const elapsedTime = currentTime - lastTime;
    const remainingTime = Math.max(0, cooldown - elapsedTime);
    const progress = 1 - (remainingTime / cooldown);

    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fillStyle = 'gray';
    ctx.fill();
    ctx.closePath();

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, 20, -Math.PI / 2, -Math.PI / 2 + (2 * Math.PI * progress));
    ctx.lineTo(x, y);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.closePath();
}

function showGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = '72px Arial'; // Increased font size
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 150);
    ctx.font = '48px Arial'; // Increased font size
    ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 - 50);
    ctx.font = '36px Arial'; // Increased font size
    ctx.fillText('Click to Restart', canvas.width / 2, canvas.height / 2 + 50);
}

function shoot(x, y) {
    const currentTime = Date.now();
    if (currentTime - lastShotTime >= shootCooldown) {
        const bulletX = player.x - camera.x;
        const bulletY = player.y - camera.y;
        bullets.push(new Bullet(bulletX, bulletY, x, y));
        lastShotTime = currentTime;
    }
}

function specialShoot() {
    const currentTime = Date.now();
    if (currentTime - lastSpecialShotTime >= specialShootCooldown) {
        pulses.push(new Pulse(player.x, player.y));
        lastSpecialShotTime = currentTime;
    }
}

canvas.addEventListener('mousemove', (e) => {
    mouseX = e.clientX + camera.x;
    mouseY = e.clientY + camera.y;
});

canvas.addEventListener('click', (e) => {
    if (gameOver) {
        init();
    } else if (gameRunning) {
        shoot(e.clientX, e.clientY);
    }
});

let keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === 'f' || e.key === 'F') {
        specialShoot();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

gameButton.addEventListener('click', init);

function gameLoop() {
    if (gameRunning) {
        let dx = 0;
        let dy = 0;
        if (keys['w']) dy -= 1;
        if (keys['s']) dy += 1;
        if (keys['a']) dx -= 1;
        if (keys['d']) dx += 1;
        player.move(dx, dy);
        update();
        requestAnimationFrame(gameLoop);
    }
}