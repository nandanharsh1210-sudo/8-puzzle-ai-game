import { Grid, GOAL_STATE, SolverStats } from './types';

export const getInversions = (grid: Grid): number => {
  let inversions = 0;
  const flat = grid.filter(x => x !== 0);
  for (let i = 0; i < flat.length; i++) {
    for (let j = i + 1; j < flat.length; j++) {
      if (flat[i] > flat[j]) inversions++;
    }
  }
  return inversions;
};

export const isSolvable = (grid: Grid): boolean => {
  return getInversions(grid) % 2 === 0;
};

export const manhattanDistance = (grid: Grid): number => {
  let distance = 0;
  for (let i = 0; i < grid.length; i++) {
    const val = grid[i];
    if (val !== 0) {
      const targetIdx = val - 1;
      const currentRow = Math.floor(i / 3);
      const currentCol = i % 3;
      const targetRow = Math.floor(targetIdx / 3);
      const targetCol = targetIdx % 3;
      distance += Math.abs(currentRow - targetRow) + Math.abs(currentCol - targetCol);
    }
  }
  return distance;
};

export const getNeighbors = (grid: Grid): { grid: Grid; move: string }[] => {
  const blankIdx = grid.indexOf(0);
  const row = Math.floor(blankIdx / 3);
  const col = blankIdx % 3;
  const neighbors: { grid: Grid; move: string }[] = [];

  const moves = [
    { r: -1, c: 0, label: 'U' },
    { r: 1, c: 0, label: 'D' },
    { r: 0, c: -1, label: 'L' },
    { r: 0, c: 1, label: 'R' },
  ];

  for (const m of moves) {
    const nr = row + m.r;
    const nc = col + m.c;
    if (nr >= 0 && nr < 3 && nc >= 0 && nc < 3) {
      const targetIdx = nr * 3 + nc;
      const newGrid = [...grid];
      [newGrid[blankIdx], newGrid[targetIdx]] = [newGrid[targetIdx], newGrid[blankIdx]];
      neighbors.push({ grid: newGrid, move: m.label });
    }
  }
  return neighbors;
};

class PriorityQueue<T> {
  private items: { item: T; priority: number }[] = [];
  push(item: T, priority: number) {
    this.items.push({ item, priority });
    this.items.sort((a, b) => a.priority - b.priority);
  }
  pop(): T | undefined { return this.items.shift()?.item; }
  get length() { return this.items.length; }
}

export const solveBFS = (startGrid: Grid): SolverStats | null => {
  const startTime = performance.now();
  const queue: { grid: Grid; path: string[] }[] = [{ grid: startGrid, path: [] }];
  const visited = new Set<string>([JSON.stringify(startGrid)]);
  let nodesExplored = 0;
  let maxDepth = 0;

  while (queue.length > 0) {
    const { grid, path } = queue.shift()!;
    nodesExplored++;
    maxDepth = Math.max(maxDepth, path.length);
    if (JSON.stringify(grid) === JSON.stringify(GOAL_STATE)) {
      return { algorithm: 'BFS', steps: path.length, nodesExplored, maxDepth, computeTime: performance.now() - startTime, path };
    }
    for (const neighbor of getNeighbors(grid)) {
      const key = JSON.stringify(neighbor.grid);
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ grid: neighbor.grid, path: [...path, neighbor.move] });
      }
    }
    if (performance.now() - startTime > 10000) break;
  }
  return null;
};

export const solveDFS = (startGrid: Grid, limit: number = 20): SolverStats | null => {
    const startTime = performance.now();
    const stack: { grid: Grid; path: string[] }[] = [{ grid: startGrid, path: [] }];
    const visited = new Map<string, number>();
    let nodesExplored = 0;
    let maxDepth = 0;

    while (stack.length > 0) {
        const { grid, path } = stack.pop()!;
        nodesExplored++;
        maxDepth = Math.max(maxDepth, path.length);
        if (JSON.stringify(grid) === JSON.stringify(GOAL_STATE)) {
            return { algorithm: 'DFS', steps: path.length, nodesExplored, maxDepth, computeTime: performance.now() - startTime, path };
        }
        if (path.length < limit) {
            for (const neighbor of getNeighbors(grid)) {
                const key = JSON.stringify(neighbor.grid);
                const prevDepth = visited.get(key);
                if (prevDepth === undefined || path.length + 1 < prevDepth) {
                    visited.set(key, path.length + 1);
                    stack.push({ grid: neighbor.grid, path: [...path, neighbor.move] });
                }
            }
        }
        if (performance.now() - startTime > 10000) break;
    }
    return null;
};

export const solveAStar = (startGrid: Grid, greedy: boolean = false): SolverStats | null => {
  const startTime = performance.now();
  const pq = new PriorityQueue<{ grid: Grid; path: string[]; g: number }>();
  pq.push({ grid: startGrid, path: [], g: 0 }, manhattanDistance(startGrid));
  const visited = new Map<string, number>();
  let nodesExplored = 0;
  let maxDepth = 0;

  while (pq.length > 0) {
    const { grid, path, g } = pq.pop()!;
    nodesExplored++;
    maxDepth = Math.max(maxDepth, path.length);
    if (JSON.stringify(grid) === JSON.stringify(GOAL_STATE)) {
      return { algorithm: greedy ? 'Greedy' : 'A*', steps: path.length, nodesExplored, maxDepth, computeTime: performance.now() - startTime, path };
    }
    for (const neighbor of getNeighbors(grid)) {
      const key = JSON.stringify(neighbor.grid);
      const newG = g + 1;
      const h = manhattanDistance(neighbor.grid);
      const f = greedy ? h : newG + h;
      if (!visited.has(key) || newG < visited.get(key)!) {
        visited.set(key, newG);
        pq.push({ grid: neighbor.grid, path: [...path, neighbor.move], g: newG }, f);
      }
    }
    if (performance.now() - startTime > 10000) break;
  }
  return null;
};

export const solveIDS = (startGrid: Grid, maxLimit: number = 50): SolverStats | null => {
    const startTime = performance.now();
    let totalNodes = 0;
    for (let limit = 0; limit <= maxLimit; limit++) {
        const result = solveDFS(startGrid, limit);
        if (result) {
            result.algorithm = 'IDS';
            result.nodesExplored += totalNodes;
            result.computeTime = performance.now() - startTime;
            return result;
        }
        totalNodes += 100;
        if (performance.now() - startTime > 10000) break;
    }
    return null;
};