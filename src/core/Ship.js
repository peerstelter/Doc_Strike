export const FLEET = [
  { name: 'Carrier',    size: 5, emoji: '🛳️', color: '#2196f3' },
  { name: 'Battleship', size: 4, emoji: '⚓',  color: '#9c27b0' },
  { name: 'Cruiser',    size: 3, emoji: '🚢',  color: '#4caf50' },
  { name: 'Submarine',  size: 3, emoji: '🚤',  color: '#ff9800' },
  { name: 'Destroyer',  size: 2, emoji: '🛥️',  color: '#f44336' },
];

export class Ship {
  constructor({ name, size, emoji, color }) {
    this.name = name;
    this.size = size;
    this.emoji = emoji;
    this.color = color;
    this.hits = 0;
    this.placed = false;
    this.cells = [];       // [{row, col}, …]
    this.horizontal = true;
  }

  hit()    { this.hits++; }
  isSunk() { return this.hits >= this.size; }

  reset() {
    this.hits = 0;
    this.placed = false;
    this.cells = [];
    this.horizontal = true;
  }
}
