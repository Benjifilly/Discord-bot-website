const canvas = document.getElementById('star-canvas');
const ctx = canvas.getContext('2d');

let width, height;
let stars = [];
let shootingStars = [];

// Configuration
const starCount = 300;
const shootingStarFrequency = 100; // Lower is more frequent

function resize() {
    width = window.innerWidth;
    height = window.innerHeight; // Header is roughly 100vh or defined size, but we want canvas to fill parent

    // We actually want the canvas to fill the header
    const header = document.querySelector('header');
    if (header) {
        width = header.clientWidth;
        height = header.clientHeight;
    }

    canvas.width = width;
    canvas.height = height;

    // Re-initialize stars on resize to avoid clustering
    initStars();
}

class Star {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 2;
        this.opacity = Math.random();
        this.velocity = Math.random() * 0.05;
    }

    draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }

    update() {
        // Subtle twinkling or movement
        this.opacity += (Math.random() - 0.5) * 0.1;
        if (this.opacity < 0.1) this.opacity = 0.1;
        if (this.opacity > 1) this.opacity = 1;
    }
}

class ShootingStar {
    constructor() {
        this.x = Math.random() * width;
        this.y = 0; // Start at top
        this.length = Math.random() * 80 + 20;
        this.speed = Math.random() * 10 + 5;
        this.angle = Math.PI / 4; // 45 degrees
        this.opacity = 1;
        this.active = true;
    }

    update() {
        this.x -= this.speed * Math.cos(this.angle); // Moving left
        this.y += this.speed * Math.sin(this.angle); // Moving down

        // Or actually provided image shows diagonal top-right to bottom-left or top-left to bottom-right?
        // Let's go top-right to bottom-left based on "shooting stars" usually being diagonal. 
        // Modified to go top-right to bottom-left:
        // x decreases, y increases

        this.length -= 0.5; // Shrink as it goes
        if (this.y > height || this.x < 0 || this.length <= 0) {
            this.active = false;
        }
    }

    draw() {
        if (!this.active) return;

        const endX = this.x + this.length * Math.cos(this.angle); // If moving left, endX is to the right
        const endY = this.y - this.length * Math.sin(this.angle); // endY is above

        // Actually better to draw line from (x, y) backwards 
        // We are moving x--, y++
        // So tail is at x++, y--

        ctx.strokeStyle = 'rgba(255, 255, 255, ' + this.opacity + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y); // Head
        ctx.lineTo(this.x + this.length * Math.cos(this.angle), this.y - this.length * Math.sin(this.angle)); // Tail
        ctx.stroke();
    }
}

function initStars() {
    stars = [];
    for (let i = 0; i < starCount; i++) {
        stars.push(new Star());
    }
}

function animate() {
    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw Background Gradient
    // Deep blue night sky
    let gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#020024');
    gradient.addColorStop(1, '#090979');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw static stars
    stars.forEach(star => {
        star.draw();
        star.update();
    });

    // Handle shooting stars
    if (Math.random() * 500 < 5) { // Chance to spawn
        shootingStars.push(new ShootingStar());
    }

    shootingStars.forEach((star, index) => {
        star.update();
        star.draw();
        if (!star.active) {
            shootingStars.splice(index, 1);
        }
    });

    requestAnimationFrame(animate);
}

// Initial set up
window.addEventListener('resize', resize);
// Wait for DOM to be ready implicitly if script loaded at end, or use DOMContentLoaded
// We will call resize() manually or onload
window.onload = function () {
    resize();
    animate();
    // Also include existing window.onload stuff if script.js overrides this
};

// If this is loaded alongside scripts.js, we should be careful about window.onload overwrites.
// Safer to use event listener
window.addEventListener('load', () => {
    resize();
    animate();
});
