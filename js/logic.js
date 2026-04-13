import { BLOCK_COLORS, MODES } from "./constants.js";

export class Pathfinding {
  /**
   * Link-Link core algorithm: BFS to determine if connection is possible within two turns
   * @param {number[][]} grid
   * @param {[number, number]} p1 [row, col]
   * @param {[number, number]} p2 [row, col]
   * @param {number} rows
   * @param {number} cols
   */
  static findPath(grid, p1, p2, rows, cols) {
    const [r1, c1] = p1;
    const [r2, c2] = p2;

    if (grid[r1][c1] !== grid[r2][c2] || (r1 === r2 && c1 === c2)) return null;

    const totalRows = rows + 2;
    const totalCols = cols + 2;

    // visited stores the minimum number of turns to reach the point
    const visited = Array.from({ length: totalRows }, () =>
      Array(totalCols).fill(Infinity),
    );
    visited[r1][c1] = -1;

    // queue: [row, col, turns, path]
    const queue = [[r1, c1, -1, [[r1, c1]]]];

    while (queue.length > 0) {
      const [r, c, t, path] = queue.shift();
      if (t >= 2) continue;

      const directions = [
        [-1, 0],
        [0, 1],
        [1, 0],
        [0, -1],
      ];
      for (const [dr, dc] of directions) {
        let nr = r + dr;
        let nc = c + dc;
        let newPath = [...path];

        while (nr >= 0 && nr < totalRows && nc >= 0 && nc < totalCols) {
          if (nr === r2 && nc === c2) return [...newPath, [nr, nc]];
          if (grid[nr][nc] !== 0) break; // Obstacle

          if (visited[nr][nc] >= t + 1) {
            visited[nr][nc] = t + 1;
            queue.push([nr, nc, t + 1, [...newPath, [nr, nc]]]);
          }

          newPath.push([nr, nc]);
          nr += dr;
          nc += dc;
        }
      }
    }
    return null;
  }
}

export class Board {
  constructor(modeName) {
    const config = MODES[modeName];
    this.rows = config.rows;
    this.cols = config.cols;
    this.cellSize = config.cellSize;
    this.grid = [];
    this.generateBoard();
  }

  generateBoard() {
    const totalCells = this.rows * this.cols;
    let pairs = [];
    for (let i = 0; i < totalCells / 2; i++) {
      const blockId = (i % BLOCK_COLORS.length) + 1;
      pairs.push(blockId, blockId);
    }

    // Shuffle pairs
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }

    // Initialize grid with outer boundary (0 represents empty)
    this.grid = Array.from({ length: this.rows + 2 }, () =>
      Array(this.cols + 2).fill(0),
    );
    let idx = 0;
    for (let r = 1; r <= this.rows; r++) {
      for (let c = 1; c <= this.cols; c++) {
        this.grid[r][c] = pairs[idx++];
      }
    }

    if (!this.hasSolution()) this.shuffle();
  }

  shuffle() {
    let remaining = [];
    let positions = [];
    for (let r = 1; r <= this.rows; r++) {
      for (let c = 1; c <= this.cols; c++) {
        if (this.grid[r][c] !== 0) {
          remaining.push(this.grid[r][c]);
          positions.push([r, c]);
        }
      }
    }

    if (remaining.length === 0) return;

    // Shuffle remaining blocks
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }

    for (let i = 0; i < positions.length; i++) {
      const [r, c] = positions[i];
      this.grid[r][c] = remaining[i];
    }

    if (!this.hasSolution() && remaining.length > 0) {
      this.shuffle();
    }
  }

  /**
   * Optimized findHint: Groups positions by block ID to reduce search complexity
   */
  findHint() {
    const colorGroups = {};
    for (let r = 1; r <= this.rows; r++) {
      for (let c = 1; c <= this.cols; c++) {
        const val = this.grid[r][c];
        if (val !== 0) {
          if (!colorGroups[val]) colorGroups[val] = [];
          colorGroups[val].push([r, c]);
        }
      }
    }

    for (const val in colorGroups) {
      const positions = colorGroups[val];
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          if (
            Pathfinding.findPath(
              this.grid,
              positions[i],
              positions[j],
              this.rows,
              this.cols,
            )
          ) {
            return [positions[i], positions[j]];
          }
        }
      }
    }
    return null;
  }

  hasSolution() {
    return this.findHint() !== null;
  }

  isEmpty() {
    for (let r = 1; r <= this.rows; r++) {
      for (let c = 1; c <= this.cols; c++) {
        if (this.grid[r][c] !== 0) return false;
      }
    }
    return true;
  }
}
