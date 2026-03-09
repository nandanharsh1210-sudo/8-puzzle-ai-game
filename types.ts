export type Grid = number[];

export interface SolverStats {
  algorithm: string;
  steps: number;
  nodesExplored: number;
  maxDepth: number;
  computeTime: number;
  path: string[];
}

export interface GameState {
  grid: Grid;
  moves: number;
  time: number;
  isPaused: boolean;
  isSolved: boolean;
  history: Grid[];
  redoStack: Grid[];
}

export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type Theme = 'light' | 'dark';

export const GOAL_STATE: Grid = [1, 2, 3, 4, 5, 6, 7, 8, 0];