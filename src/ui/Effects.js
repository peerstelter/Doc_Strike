class Particle {
  constructor(x, y, vx, vy, color, radius, life, decay) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.color  = color;
    this.radius = radius;
    this.life   = life;
    this.decay  = decay;
  }

  update() {
    this.x  += this.vx;
    this.y  += this.vy;
    this.vy += 0.12; // gravity
    this.vx *= 0.96;
    this.life -= this.decay;
  }

  draw(ctx) {
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle   = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(0.5, this.radius * this.life), 0, Math.PI * 2);
    ctx.fill();
  }
}

export class EffectManager {
  constructor() {
    this.particles = [];
  }

  // ── Spawners ────────────────────────────

  addHit(cx, cy) {
    // Explosion: bright orange / yellow / red sparks
    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4;
      const hue   = 10 + Math.random() * 40;
      this.particles.push(new Particle(
        cx, cy,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 1,
        `hsl(${hue},100%,${50 + Math.random() * 30}%)`,
        2 + Math.random() * 4,
        1.0,
        0.018 + Math.random() * 0.015
      ));
    }
    // White flash core
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2;
      this.particles.push(new Particle(
        cx, cy,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        '#fff',
        1 + Math.random() * 3,
        1.0,
        0.035 + Math.random() * 0.02
      ));
    }
  }

  addMiss(cx, cy) {
    // Water splash: blue/cyan droplets
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.8 + Math.random() * 2.5;
      const hue   = 190 + Math.random() * 30;
      this.particles.push(new Particle(
        cx, cy,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 2,
        `hsl(${hue},90%,65%)`,
        1.5 + Math.random() * 3,
        1.0,
        0.022 + Math.random() * 0.018
      ));
    }
  }

  addSunk(cx, cy) {
    // Big explosion + debris for a sunk ship
    this.addHit(cx, cy);
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 3;
      this.particles.push(new Particle(
        cx, cy,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 0.5,
        '#555',
        3 + Math.random() * 5,
        1.0,
        0.012 + Math.random() * 0.01
      ));
    }
  }

  // ── Lifecycle ──────────────────────────

  update() {
    for (const p of this.particles) p.update();
    this.particles = this.particles.filter(p => p.life > 0);
  }

  draw(ctx) {
    ctx.save();
    for (const p of this.particles) p.draw(ctx);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  hasActive() { return this.particles.length > 0; }
  clear()     { this.particles = []; }
}
