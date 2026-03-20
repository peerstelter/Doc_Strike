/**
 * Generates PWA icons (192x192 and 512x512) using Node.js canvas.
 * Run once: node generate-icons.mjs
 * Requires: npm install canvas  (only needed at generation time)
 */
import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx    = canvas.getContext('2d');
  const cx = size / 2, cy = size / 2, r = size * 0.46;

  // Background circle
  const grad = ctx.createRadialGradient(cx, cy * 0.8, 0, cx, cy, r);
  grad.addColorStop(0, '#0d2a45');
  grad.addColorStop(1, '#050c18');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Anchor emoji
  ctx.font      = `${size * 0.55}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚓', cx, cy + size * 0.03);

  // Ring
  ctx.strokeStyle = '#00d4ff';
  ctx.lineWidth   = size * 0.025;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  return canvas.toBuffer('image/png');
}

writeFileSync('public/icon-192.png', drawIcon(192));
writeFileSync('public/icon-512.png', drawIcon(512));
console.log('Icons generated.');
