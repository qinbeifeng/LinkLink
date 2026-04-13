import { WINDOW_WIDTH, WINDOW_HEIGHT, COLORS } from "./constants.js";

export class EffectManager {
  constructor() {
    this.effects = [];
    this.screenFlash = 0;
  }

  addEffect(effect) {
    this.effects.push(effect);
  }

  triggerFlash(amount = 50) {
    this.screenFlash = amount;
  }

  update() {
    this.effects = this.effects.filter((e) => !e.isFinished());
    this.effects.forEach((e) => e.update());
    if (this.screenFlash > 0) this.screenFlash -= 5;
  }

  draw(ctx) {
    this.effects.forEach((e) => e.draw(ctx));
    if (this.screenFlash > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${this.screenFlash / 255})`;
      ctx.fillRect(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT);
      ctx.restore();
    }
  }
}

export class LightningArc {
  constructor(pathPoints, duration = 150) {
    this.basePath = pathPoints; // [[x, y], ...]
    this.duration = duration;
    this.startTime = Date.now();
    this.currentArcs = [];
  }

  generateJitterPath(p1, p2) {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const dist = Math.sqrt(dx * dx + dy * dy);
    const segments = Math.max(2, Math.floor(dist / 15));
    let jitterPath = [p1];

    for (let i = 1; i < segments; i++) {
      const ratio = i / segments;
      const baseX = p1[0] + dx * ratio;
      const baseY = p1[1] + dy * ratio;
      const perpDx = -dy / dist;
      const perpDy = dx / dist;
      const offset = (Math.random() - 0.5) * 12;
      jitterPath.push([baseX + perpDx * offset, baseY + perpDy * offset]);
    }
    jitterPath.push(p2);
    return jitterPath;
  }

  generateFullArc() {
    let allLines = [];
    let mainPath = [];
    for (let i = 0; i < this.basePath.length - 1; i++) {
      mainPath.push(
        ...this.generateJitterPath(this.basePath[i], this.basePath[i + 1]),
      );
    }
    allLines.push(mainPath);

    // Random branches
    for (let i = 1; i < mainPath.length - 1; i++) {
      if (Math.random() < 0.1) {
        const pStart = mainPath[i];
        const angle =
          Math.atan2(
            pStart[1] - mainPath[i - 1][1],
            pStart[0] - mainPath[i - 1][0],
          ) +
          ((Math.random() - 0.5) * Math.PI) / 1.5;
        const length = 10 + Math.random() * 20;
        const pEnd = [
          pStart[0] + Math.cos(angle) * length,
          pStart[1] + Math.sin(angle) * length,
        ];
        allLines.push(this.generateJitterPath(pStart, pEnd));
      }
    }
    return allLines;
  }

  isFinished() {
    return Date.now() - this.startTime > this.duration;
  }

  update() {
    this.currentArcs = this.generateFullArc();
  }

  draw(ctx) {
    const elapsed = Date.now() - this.startTime;
    const alpha = Math.max(0, 1 - elapsed / this.duration);

    ctx.save();
    this.currentArcs.forEach((arc) => {
      if (arc.length < 2) return;

      // Outer Glow
      ctx.beginPath();
      ctx.moveTo(arc[0][0], arc[0][1]);
      for (let i = 1; i < arc.length; i++) ctx.lineTo(arc[i][0], arc[i][1]);
      ctx.strokeStyle = `rgba(0, 191, 255, ${alpha * 0.25})`;
      ctx.lineWidth = 8;
      ctx.stroke();

      // Middle Layer
      ctx.beginPath();
      ctx.moveTo(arc[0][0], arc[0][1]);
      for (let i = 1; i < arc.length; i++) ctx.lineTo(arc[i][0], arc[i][1]);
      ctx.strokeStyle = `rgba(0, 191, 255, ${alpha * 0.5})`;
      ctx.lineWidth = 4;
      ctx.stroke();

      // Core
      ctx.beginPath();
      ctx.moveTo(arc[0][0], arc[0][1]);
      for (let i = 1; i < arc.length; i++) ctx.lineTo(arc[i][0], arc[i][1]);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    });
    ctx.restore();
  }
}

export class DestructionEffect {
  constructor(pos, color, duration = 250) {
    this.x = pos[0];
    this.y = pos[1];
    this.color = color;
    this.duration = duration;
    this.startTime = Date.now();
    this.particles = [];

    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      this.particles.push({
        pos: [this.x, this.y],
        vel: [Math.cos(angle) * speed, Math.sin(angle) * speed],
        size: 3 + Math.random() * 4,
        life: 1.0,
      });
    }
  }

  isFinished() {
    return Date.now() - this.startTime > this.duration;
  }

  update() {
    this.particles.forEach((p) => {
      p.pos[0] += p.vel[0];
      p.pos[1] += p.vel[1];
      p.vel[1] += 0.2; // Gravity
      p.life -= 0.04;
    });
  }

  draw(ctx) {
    const elapsed = Date.now() - this.startTime;
    const alpha = Math.max(0, 1 - elapsed / this.duration);

    ctx.save();
    this.particles.forEach((p) => {
      if (p.life > 0) {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = alpha * p.life;
        ctx.fillRect(p.pos[0], p.pos[1], p.size, p.size);
      }
    });
    ctx.restore();
  }
}
