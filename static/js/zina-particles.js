/* ============================================================
   ZINA Particles — Food emoji floaters + Confetti burst
   ============================================================ */

(function () {
  'use strict';

  const FOOD_EMOJIS = ['🍽️', '⭐', '🌶️', '🥘', '🍲', '✨', '🌟', '🍛', '🫕', '🥗'];

  let particleCanvas = null;
  let particleCtx = null;
  let confettiCanvas = null;
  let confettiCtx = null;
  let particles = [];
  let confettiPieces = [];
  let animFrameId = null;
  let confettiFrameId = null;
  let isConfettiRunning = false;

  function getParticleCount() {
    const w = window.innerWidth;
    if (w < 480) return 8;
    if (w < 768) return 14;
    if (w < 1200) return 20;
    return 28;
  }

  class Particle {
    constructor(canvas) {
      this.canvas = canvas;
      this.reset(true);
    }

    reset(initial) {
      this.x = Math.random() * this.canvas.width;
      this.y = initial ? Math.random() * this.canvas.height : this.canvas.height + 30;
      this.emoji = FOOD_EMOJIS[Math.floor(Math.random() * FOOD_EMOJIS.length)];
      this.size = 14 + Math.random() * 14;
      this.speedY = 0.3 + Math.random() * 0.5;
      this.speedX = (Math.random() - 0.5) * 0.4;
      this.swayAmplitude = 20 + Math.random() * 30;
      this.swaySpeed = 0.01 + Math.random() * 0.015;
      this.swayOffset = Math.random() * Math.PI * 2;
      this.opacity = 0.15 + Math.random() * 0.3;
      this.rotation = (Math.random() - 0.5) * 0.3;
      this.rotSpeed = (Math.random() - 0.5) * 0.01;
      this.originX = this.x;
      this.tick = 0;
    }

    update() {
      this.tick++;
      this.y -= this.speedY;
      this.x = this.originX + Math.sin(this.tick * this.swaySpeed + this.swayOffset) * this.swayAmplitude;
      this.rotation += this.rotSpeed;

      if (this.y < -40) {
        this.originX = Math.random() * this.canvas.width;
        this.reset(false);
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = this.opacity;
      ctx.font = `${this.size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.fillText(this.emoji, 0, 0);
      ctx.restore();
    }
  }

  class ConfettiPiece {
    constructor(canvas) {
      this.canvas = canvas;
      this.x = canvas.width / 2 + (Math.random() - 0.5) * 200;
      this.y = canvas.height / 2 + (Math.random() - 0.5) * 100;
      this.w = 8 + Math.random() * 10;
      this.h = 4 + Math.random() * 6;
      this.color = this._randomColor();
      this.speedX = (Math.random() - 0.5) * 12;
      this.speedY = -6 - Math.random() * 10;
      this.gravity = 0.3;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 0.2;
      this.opacity = 1;
      this.alive = true;
    }

    _randomColor() {
      const colors = ['#C4002B', '#F5A623', '#00A651', '#FFD700', '#FF6B9D', '#4ECDC4', '#45B7D1', '#96CEB4'];
      return colors[Math.floor(Math.random() * colors.length)];
    }

    update() {
      this.speedY += this.gravity;
      this.x += this.speedX;
      this.y += this.speedY;
      this.rotation += this.rotSpeed;
      this.opacity -= 0.012;
      if (this.opacity <= 0 || this.y > this.canvas.height + 50) {
        this.alive = false;
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.opacity);
      ctx.fillStyle = this.color;
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
      ctx.restore();
    }
  }

  function initParticleCanvas() {
    particleCanvas = document.getElementById('particles-bg');
    if (!particleCanvas) return;
    particleCtx = particleCanvas.getContext('2d');
    resizeCanvases();
    createParticles();
    animateParticles();
  }

  function initConfettiCanvas() {
    confettiCanvas = document.getElementById('confetti-canvas');
    if (!confettiCanvas) return;
    confettiCtx = confettiCanvas.getContext('2d');
  }

  function resizeCanvases() {
    if (particleCanvas) {
      particleCanvas.width = window.innerWidth;
      particleCanvas.height = window.innerHeight;
    }
    if (confettiCanvas) {
      confettiCanvas.width = window.innerWidth;
      confettiCanvas.height = window.innerHeight;
    }
  }

  function createParticles() {
    particles = [];
    const count = getParticleCount();
    for (let i = 0; i < count; i++) {
      particles.push(new Particle(particleCanvas));
    }
  }

  function animateParticles() {
    if (!particleCtx || !particleCanvas) return;
    particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);

    particles.forEach(p => {
      p.update();
      p.draw(particleCtx);
    });

    animFrameId = requestAnimationFrame(animateParticles);
  }

  function animateConfetti() {
    if (!confettiCtx || !confettiCanvas) return;
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    confettiPieces = confettiPieces.filter(p => p.alive);
    confettiPieces.forEach(p => {
      p.update();
      p.draw(confettiCtx);
    });

    if (confettiPieces.length > 0) {
      confettiFrameId = requestAnimationFrame(animateConfetti);
    } else {
      confettiCanvas.style.display = 'none';
      isConfettiRunning = false;
    }
  }

  /**
   * Public API: triggerConfetti()
   * Launches a burst of colorful confetti
   */
  window.triggerConfetti = function () {
    if (!confettiCanvas) {
      initConfettiCanvas();
    }
    if (!confettiCanvas) return;

    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
    confettiCanvas.style.display = 'block';

    const BURST = 120;
    for (let i = 0; i < BURST; i++) {
      const p = new ConfettiPiece(confettiCanvas);
      // Spread burst from random positions at the top portion
      p.x = Math.random() * confettiCanvas.width;
      p.y = confettiCanvas.height * 0.3 + (Math.random() - 0.5) * 200;
      confettiPieces.push(p);
    }

    if (!isConfettiRunning) {
      isConfettiRunning = true;
      animateConfetti();
    }
  };

  // Handle resize
  window.addEventListener('resize', () => {
    resizeCanvases();
    if (particleCanvas) {
      particles.forEach(p => {
        p.canvas = particleCanvas;
        if (p.x > particleCanvas.width) p.x = Math.random() * particleCanvas.width;
        if (p.originX > particleCanvas.width) p.originX = Math.random() * particleCanvas.width;
      });

      // Adjust particle count
      const target = getParticleCount();
      while (particles.length < target) particles.push(new Particle(particleCanvas));
      while (particles.length > target) particles.pop();
    }
  });

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initParticleCanvas();
      initConfettiCanvas();
    });
  } else {
    initParticleCanvas();
    initConfettiCanvas();
  }
})();
