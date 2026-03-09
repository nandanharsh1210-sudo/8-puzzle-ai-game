## 1. Introduction
The 8-puzzle is a classic sliding puzzle that consists of a frame of numbered square tiles in random order with one tile missing. The objective is to place the tiles in order by making sliding moves that use the empty space. This project implements this game with a focus on Artificial Intelligence and algorithm visualization.

## 2. Architecture

### 2.1 Component Structure
- **App.tsx**: The central hub of the application. Manages the game state, timer, UI rendering, and coordinates the AI solver animations.
- **solver.ts**: A pure logic module containing the implementation of search algorithms. It is decoupled from the UI to allow for easy testing and potential reuse.
- **types.ts**: Centralized TypeScript definitions to ensure type safety across the project.
- **index.css**: Implements a custom Neumorphic design system using Tailwind CSS v4.

### 2.2 State Management
The application uses React's `useState` and `useReducer` patterns (via `useState` hooks) to manage:
- **Grid State**: A flat array of 9 numbers (0 representing the blank).
- **History/Redo**: Stacks of previous grid states to support Undo/Redo functionality.
- **Game Stats**: Move count and time (tracked with `setInterval` and `useRef`).

## 3. Algorithm Implementation

### 3.1 Solvability
Before starting a game, the application checks if the generated scramble is solvable using the **Inversion Count** method. For a 3x3 puzzle, it is solvable if the number of inversions is even.

### 3.2 Heuristics
For informed search (A* and Greedy), the **Manhattan Distance** is used. It calculates the sum of the absolute differences between the current coordinates and the target coordinates for each tile.

### 3.3 Search Algorithms
1. **BFS**: Implemented using a Queue. It is optimal but memory-intensive.
2. **DFS**: Implemented using a Stack. It is memory-efficient but not optimal.
3. **A***: Implemented using a Priority Queue. It is both optimal and efficient when using the Manhattan Distance heuristic.
4. **IDS**: A hybrid approach that repeatedly runs DFS with increasing depth limits.

## 4. UI/UX Design
- **Neumorphism**: The UI uses soft shadows and highlights to create a tactile, physical feel.
- **Animations**: `framer-motion` is used for smooth tile transitions and modal entries.
- **Feedback**: Confetti effects on win states and real-time solver statistics provide immediate feedback to the user.

## 5. Future Enhancements
- Support for larger grids (15-puzzle, 24-puzzle).
- More advanced heuristics (e.g., Pattern Databases).
- Web Worker integration for solvers to prevent UI blocking during complex calculations.