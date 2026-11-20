const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

ctx.imageSmoothingEnabled = false;

ctx.fillStyle = '#1e1e2e';
ctx.fillRect(0, 0, canvas.width, canvas.height);

ctx.fillStyle = '#ffffff';
ctx.font = '24px monospace';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('Soul Knight Mini - Ready', canvas.width / 2, canvas.height / 2);

console.log('Game initialized');
