import { Universe } from "wasm-game-of-life";

// We can directly access WebAssembly's linear memory via memory, 
// which is defined in the raw wasm module wasm_game_of_life_bg. 
// To draw the cells, we get a pointer to the universe's cells, 
// construct a Uint8Array overlaying the cells buffer, iterate over each cell, 
// and draw a white or black rectangle depending on whether the cell is dead or alive,
// respectively. By working with pointers and overlays, 
// we avoid copying the cells across the boundary on every tick.
//
// Import the WebAssembly memory at the top of the file.
import { memory } from "wasm-game-of-life/wasm_game_of_life_bg";

const CELL_SIZE = 5; // px
const GRID_COLOR = "#CCCCCC";
const DEAD_COLOR = "#FFFFFF";
const ALIVE_COLOR = "#000000";

// Construct the universe, and get its width and height.
const universe = Universe.new();
const width = universe.width();
const height = universe.height();


// Give the canvas room for all of our cells and a 1px border
// around each of them.
const canvas = document.getElementById("game-of-life-canvas");
canvas.height = (CELL_SIZE + 1) * height + 1;
canvas.width = (CELL_SIZE + 1) * width + 1;


const ctx = canvas.getContext('2d');

// When there is no queued animation frame, we set this variable to null
let animationId = null;

const renderLoop = () => {
  // we can use the debugger to pause on each iteration of our renderLoop function 
  // by placing a JavaScript debugger; statement above our call to universe.tick()
  // This provides us with a convenient checkpoint for inspecting logged messages, 
  // and comparing the currently rendered frame to the previous one.
  // debugger;

  universe.tick();

  drawGrid();
  drawCells();

  // To start the rendering process, 
  // all we have to do is make the initial call for the first iteration of the rendering loop
  // 
  // The result of `requestAnimationFrame` is assigned to `animationId`
  animationId = requestAnimationFrame(renderLoop);
};

// At any instant in time, we can tell whether the game is paused or not 
// by inspecting the value of animationId:
const isPaused = () => {
  return animationId === null;
};

const playPauseButton = document.getElementById("play-pause");

const play = () => {
  playPauseButton.textContent = "⏸";
  renderLoop();
};

const pause = () => {
  playPauseButton.textContent = "▶";
  cancelAnimationFrame(animationId);
  animationId = null;
};

playPauseButton.addEventListener("click", event => {
  if (isPaused()) {
    play();
  } else {
    pause();
  }
});

// To draw the grid between cells, we draw a set of equally-spaced horizontal lines, 
// and a set of equally-spaced vertical lines. These lines criss-cross to form the grid.
const drawGrid = () => {
  ctx.beginPath();
  ctx.strokeStyle = GRID_COLOR;

  // Vertical lines.
  for (let i = 0; i <= width; i++) {
    ctx.moveTo(i * (CELL_SIZE + 1) + 1, 0);
    ctx.lineTo(i * (CELL_SIZE + 1) + 1, (CELL_SIZE + 1) * height + 1);
  }

  // Horizontal lines.
  for (let j = 0; j <= height; j++) {
    ctx.moveTo(0,                           j * (CELL_SIZE + 1) + 1);
    ctx.lineTo((CELL_SIZE + 1) * width + 1, j * (CELL_SIZE + 1) + 1);
  }

  ctx.stroke();
};

const getIndex = (row, column) => {
  return row * width + column;
};


// Given an index and Uint8Array, 
// you can determine whether the nth bit is set with the following function:
const bitIsSet = (n, arr) => {
  const byte = Math.floor(n / 8);
  const mask = 1 << (n % 8);
  return (arr[byte] & mask) === mask;
};

const drawCells = () => {
  const cellsPtr = universe.cells();

  // Construct a Uint8Array from Wasm memory,
  // the length of the array is not width * height anymore, 
  // but width * height / 8 since we have a cell per bit rather than per byte
  const cells = new Uint8Array(memory.buffer, cellsPtr, width * height / 8);
  
  ctx.beginPath();

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const idx = getIndex(row, col);

      ctx.fillStyle = bitIsSet(idx, cells)
        ? ALIVE_COLOR
        : DEAD_COLOR;

      ctx.fillRect(
        col * (CELL_SIZE + 1) + 1,
        row * (CELL_SIZE + 1) + 1,
        CELL_SIZE,
        CELL_SIZE
      );
    }
  }

  ctx.stroke();
};

// we listen to click events on the <canvas> element, 
// translate the click event's page-relative coordinates into canvas-relative coordinates, 
// and then into a row and column, invoke the toggle_cell method, and finally redraw the scene.
canvas.addEventListener("click", event => {
  const boundingRect = canvas.getBoundingClientRect();

  const scaleX = canvas.width / boundingRect.width;
  const scaleY = canvas.height / boundingRect.height;

  const canvasLeft = (event.clientX - boundingRect.left) * scaleX;
  const canvasTop = (event.clientY - boundingRect.top) * scaleY;

  const row = Math.min(Math.floor(canvasTop / (CELL_SIZE + 1)), height - 1);
  const col = Math.min(Math.floor(canvasLeft / (CELL_SIZE + 1)), width - 1);

  universe.toggle_cell(row, col);

  drawGrid();
  drawCells();
});


// To start the rendering process, 
// we'll use the same code as above to start the first iteration of the rendering loop:
//
// Note that we call drawGrid() and drawCells() here before we call requestAnimationFrame(). 
// The reason we do this is so that the initial state of the universe is drawn 
// before we make modifications. 
// If we instead simply called requestAnimationFrame(renderLoop), 
// we'd end up with a situation where the first frame that was drawn 
// would actually be after the first call to universe.tick(), 
// which is the second "tick" of the life of these cells.
drawGrid();
drawCells();
// This used to be requestAnimationFrame(renderLoop);
play();
