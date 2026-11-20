import { DungeonMap } from './map.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

ctx.imageSmoothingEnabled = false;
ctx.clearRect(0, 0, canvas.width, canvas.height);

const dungeonMap = new DungeonMap();
dungeonMap.draw(ctx);

console.log('Dungeon map loaded');
