import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, RotateCcw, Undo2, Redo2, 
  ChevronDown, Info, Trophy, Share2, Brain, Zap,
  Timer, Hash, Activity, Layers, MousePointer2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Grid, GameState, Difficulty, Theme, GOAL_STATE, SolverStats } from './types';
import { 
  getNeighbors, solveBFS, solveDFS, 
  solveAStar, solveIDS 
} from './solver';

const INITIAL_GRID: Grid = [1, 2, 3, 4, 5, 6, 7, 8, 0];

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    grid: INITIAL_GRID,
    moves: 0,
    time: 0,
    isPaused: false,
    isSolved: false,
    history: [],
    redoStack: [],
  });

  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  const [theme, setTheme] = useState<Theme>('light');
  const [showInstructions, setShowInstructions] = useState(false);
  const [showSolverStats, setShowSolverStats] = useState<SolverStats | null>(null);
  const [isSolving, setIsSolving] = useState(false);
  const [solveSpeed, setSolveSpeed] = useState(300);
  const [bestScores, setBestScores] = useState<Record<string, { moves: number; time: number }>>({});

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const savedBest = localStorage.getItem('puzzle_best');
    if (savedBest) setBestScores(JSON.parse(savedBest));
    const savedTheme = localStorage.getItem('puzzle_theme') as Theme;
    if (savedTheme) setTheme(savedTheme);
  }, []);

  useEffect(() => {
    localStorage.setItem('puzzle_theme', theme);
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  useEffect(() => {
    if (!gameState.isPaused && !gameState.isSolved && gameState.moves > 0) {
      timerRef.current = setInterval(() => {
        setGameState(prev => ({ ...prev, time: prev.time + 0.1 }));
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState.isPaused, gameState.isSolved, gameState.moves]);

  const checkWin = (grid: Grid) => {
    if (JSON.stringify(grid) === JSON.stringify(GOAL_STATE)) {
      setGameState(prev => ({ ...prev, isSolved: true }));
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#10b981', '#3b82f6', '#f59e0b'] });
      const currentBest = bestScores[difficulty];
      if (!currentBest || gameState.moves < currentBest.moves) {
        const newBests = { ...bestScores, [difficulty]: { moves: gameState.moves, time: gameState.time } };
        setBestScores(newBests);
        localStorage.setItem('puzzle_best', JSON.stringify(newBests));
      }
    }
  };

  const moveTile = useCallback((index: number) => {
    if (gameState.isPaused || gameState.isSolved || isSolving) return;
    const blankIdx = gameState.grid.indexOf(0);
    const row = Math.floor(index / 3), col = index % 3;
    const bRow = Math.floor(blankIdx / 3), bCol = blankIdx % 3;
    if (Math.abs(row - bRow) + Math.abs(col - bCol) === 1) {
      const newGrid = [...gameState.grid];
      [newGrid[index], newGrid[blankIdx]] = [newGrid[blankIdx], newGrid[index]];
      setGameState(prev => ({ ...prev, grid: newGrid, moves: prev.moves + 1, history: [...prev.history, prev.grid], redoStack: [] }));
      checkWin(newGrid);
    }
  }, [gameState, isSolving]);

  const scramble = (diff: Difficulty) => {
    let currentGrid = [...GOAL_STATE];
    const moveCount = diff === 'Easy' ? 20 : diff === 'Medium' ? 40 : 80;
    for (let i = 0; i < moveCount; i++) {
      const neighbors = getNeighbors(currentGrid);
      currentGrid = neighbors[Math.floor(Math.random() * neighbors.length)].grid;
    }
    setGameState({ grid: currentGrid, moves: 0, time: 0, isPaused: false, isSolved: false, history: [], redoStack: [] });
    setShowSolverStats(null);
  };

  const undo = () => {
    if (gameState.history.length === 0 || isSolving) return;
    const prevGrid = gameState.history[gameState.history.length - 1];
    setGameState(prev => ({ ...prev, grid: prevGrid, moves: prev.moves - 1, history: prev.history.slice(0, -1), redoStack: [prev.grid, ...prev.redoStack] }));
  };

  const redo = () => {
    if (gameState.redoStack.length === 0 || isSolving) return;
    const nextGrid = gameState.redoStack[0];
    setGameState(prev => ({ ...prev, grid: nextGrid, moves: prev.moves + 1, history: [...prev.history, prev.grid], redoStack: prev.redoStack.slice(1) }));
  };

  const runSolver = async (algo: string) => {
    if (isSolving || gameState.isSolved) return;
    setIsSolving(true);
    let result: SolverStats | null = null;
    const currentGrid = gameState.grid;
    switch (algo) {
      case 'BFS': result = solveBFS(currentGrid); break;
      case 'DFS': result = solveDFS(currentGrid, 20); break;
      case 'AStar': result = solveAStar(currentGrid); break;
      case 'Greedy': result = solveAStar(currentGrid, true); break;
      case 'IDS': result = solveIDS(currentGrid); break;
    }
    if (result) {
      setShowSolverStats(result);
      let tempGrid = [...currentGrid];
      for (const move of result.path) {
        const blankIdx = tempGrid.indexOf(0);
        let targetIdx = -1;
        if (move === 'U') targetIdx = blankIdx - 3;
        if (move === 'D') targetIdx = blankIdx + 3;
        if (move === 'L') targetIdx = blankIdx - 1;
        if (move === 'R') targetIdx = blankIdx + 1;
        if (targetIdx !== -1) {
          [tempGrid[blankIdx], tempGrid[targetIdx]] = [tempGrid[targetIdx], tempGrid[blankIdx]];
          const nextGrid = [...tempGrid];
          setGameState(prev => ({ ...prev, grid: nextGrid, moves: prev.moves + 1, history: [...prev.history, prev.grid] }));
          await new Promise(resolve => setTimeout(resolve, solveSpeed));
        }
      }
      checkWin(tempGrid);
    } else { alert('Solver timed out or no solution found.'); }
    setIsSolving(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const blankIdx = gameState.grid.indexOf(0);
      let targetIdx = -1;
      if (e.key === 'ArrowUp' || e.key === 'w') targetIdx = blankIdx + 3;
      if (e.key === 'ArrowDown' || e.key === 's') targetIdx = blankIdx - 3;
      if (e.key === 'ArrowLeft' || e.key === 'a') targetIdx = blankIdx + 1;
      if (e.key === 'ArrowRight' || e.key === 'd') targetIdx = blankIdx - 1;
      if (targetIdx >= 0 && targetIdx < 9) {
        const row = Math.floor(targetIdx / 3), col = targetIdx % 3;
        const bRow = Math.floor(blankIdx / 3), bCol = blankIdx % 3;
        if (Math.abs(row - bRow) + Math.abs(col - bCol) === 1) moveTile(targetIdx);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.grid, moveTile]);

  const formatTime = (t: number) => {
    const mins = Math.floor(t / 60);
    const secs = (t % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, '0')}`;
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center gap-8">
      <header className="w-full max-w-2xl flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-3 neumorphic-card text-emerald-500"><Brain size={32} /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">8-Puzzle Master</h1>
            <p className="text-sm opacity-60 font-mono">AI Solver Edition</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-3 neumorphic-button">
            {theme === 'light' ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button onClick={() => setShowInstructions(!showInstructions)} className="p-3 neumorphic-button"><Info size={20} /></button>
        </div>
      </header>

      <div className="w-full max-w-2xl grid grid-cols-3 gap-4">
        <div className="neumorphic-inset p-4 flex flex-col items-center">
          <div className="flex items-center gap-2 text-xs opacity-60 uppercase tracking-wider mb-1"><Hash size={14} /> Moves</div>
          <span className="text-2xl font-bold font-mono">{gameState.moves}</span>
        </div>
        <div className="neumorphic-inset p-4 flex flex-col items-center">
          <div className="flex items-center gap-2 text-xs opacity-60 uppercase tracking-wider mb-1"><Timer size={14} /> Time</div>
          <span className="text-2xl font-bold font-mono">{formatTime(gameState.time)}</span>
        </div>
        <div className="neumorphic-inset p-4 flex flex-col items-center">
          <div className="flex items-center gap-2 text-xs opacity-60 uppercase tracking-wider mb-1"><Trophy size={14} /> Best</div>
          <span className="text-2xl font-bold font-mono">{bestScores[difficulty]?.moves || '--'}</span>
        </div>
      </div>

      <main className="relative w-full max-w-[400px] aspect-square neumorphic-card p-4 grid grid-cols-3 gap-4">
        <AnimatePresence>
          {gameState.grid.map((tile, idx) => (
            <motion.button key={tile} layout initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} onClick={() => moveTile(idx)}
              className={`relative flex items-center justify-center text-3xl font-bold rounded-2xl transition-all ${tile === 0 ? 'bg-transparent shadow-none cursor-default' : 'neumorphic-button hover:scale-[1.02] active:scale-[0.98]'} ${tile === 0 && !gameState.isSolved ? 'after:content-[""] after:absolute after:inset-2 after:border-2 after:border-dashed after:border-emerald-500/20 after:rounded-xl after:animate-pulse' : ''}`}
              disabled={tile === 0 || isSolving}>
              {tile !== 0 && <span className={tile === idx + 1 ? 'text-emerald-500' : ''}>{tile}</span>}
            </motion.button>
          ))}
        </AnimatePresence>
        {gameState.isSolved && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 z-10 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center rounded-2xl">
            <Trophy size={64} className="text-emerald-500 mb-4" /><h2 className="text-3xl font-bold mb-2">Solved!</h2>
            <p className="opacity-70 mb-6">You completed the puzzle in {gameState.moves} moves and {formatTime(gameState.time)}.</p>
            <div className="flex gap-3">
              <button onClick={() => scramble(difficulty)} className="px-6 py-3 neumorphic-button flex items-center gap-2 font-bold"><RotateCcw size={18} /> New Game</button>
              <button onClick={() => { navigator.clipboard.writeText(`I solved the 8-puzzle in ${gameState.moves} moves!`); alert('Stats copied!'); }} className="p-3 neumorphic-button"><Share2 size={18} /></button>
            </div>
          </motion.div>
        )}
      </main>

      <div className="w-full max-w-2xl flex flex-wrap justify-center gap-4">
        <div className="flex gap-2">
          <button onClick={() => scramble(difficulty)} className="px-6 py-3 neumorphic-button font-bold flex items-center gap-2"><RotateCcw size={18} /> New Puzzle</button>
          <div className="relative group">
            <button className="px-4 py-3 neumorphic-button flex items-center gap-2">{difficulty} <ChevronDown size={16} /></button>
            <div className="absolute top-full left-0 mt-2 w-32 hidden group-hover:block z-20">
              <div className="neumorphic-card p-2 flex flex-col gap-1">
                {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map(d => (
                  <button key={d} onClick={() => { setDifficulty(d); scramble(d); }} className={`px-3 py-2 rounded-lg text-left text-sm transition-colors ${difficulty === d ? 'bg-emerald-500 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-800'}`}>{d}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={undo} disabled={gameState.history.length === 0 || isSolving} className="p-3 neumorphic-button disabled:opacity-30"><Undo2 size={20} /></button>
          <button onClick={redo} disabled={gameState.redoStack.length === 0 || isSolving} className="p-3 neumorphic-button disabled:opacity-30"><Redo2 size={20} /></button>
          <button onClick={() => setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }))} className="p-3 neumorphic-button">{gameState.isPaused ? <Play size={20} /> : <Pause size={20} />}</button>
        </div>
      </div>

      <section className="w-full max-w-2xl mt-4">
        <div className="flex items-center gap-2 mb-4 opacity-60 uppercase tracking-widest text-xs font-bold"><Zap size={14} /> AI Solvers</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[{ id: 'BFS', label: 'BFS', icon: <Layers size={16} /> }, { id: 'AStar', label: 'A*', icon: <Brain size={16} /> }, { id: 'Greedy', label: 'Greedy', icon: <Zap size={16} /> }, { id: 'IDS', label: 'IDS', icon: <Activity size={16} /> }].map(algo => (
            <button key={algo.id} onClick={() => runSolver(algo.id)} disabled={isSolving || gameState.isSolved} className="px-4 py-3 neumorphic-button flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50">{algo.icon} {algo.label}</button>
          ))}
        </div>
        <div className="mt-6 neumorphic-inset p-4">
          <div className="flex justify-between items-center mb-2"><span className="text-xs font-bold opacity-60 uppercase">Replay Speed</span><span className="text-xs font-mono">{solveSpeed}ms</span></div>
          <input type="range" min="100" max="1000" step="100" value={solveSpeed} onChange={(e) => setSolveSpeed(Number(e.target.value))} className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
        </div>
        {showSolverStats && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 neumorphic-card p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex flex-col"><span className="text-[10px] font-bold opacity-50 uppercase mb-1">Algorithm</span><span className="font-bold text-emerald-500">{showSolverStats.algorithm}</span></div>
            <div className="flex flex-col"><span className="text-[10px] font-bold opacity-50 uppercase mb-1">Steps</span><span className="font-bold">{showSolverStats.steps}</span></div>
            <div className="flex flex-col"><span className="text-[10px] font-bold opacity-50 uppercase mb-1">Nodes Explored</span><span className="font-bold">{showSolverStats.nodesExplored}</span></div>
            <div className="flex flex-col"><span className="text-[10px] font-bold opacity-50 uppercase mb-1">Compute Time</span><span className="font-bold">{showSolverStats.computeTime.toFixed(1)}ms</span></div>
          </motion.div>
        )}
      </section>

      <AnimatePresence>
        {showInstructions && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-lg neumorphic-card p-8 relative">
              <button onClick={() => setShowInstructions(false)} className="absolute top-4 right-4 p-2 neumorphic-button"><RotateCcw size={16} className="rotate-45" /></button>
              <h2 className="text-2xl font-bold mb-4">How to Play</h2>
              <div className="space-y-4 text-sm opacity-80 leading-relaxed">
                <p>Arrange tiles in numerical order (1-8) with the blank space at the bottom right.</p>
                <div className="flex items-start gap-3"><MousePointer2 size={18} className="shrink-0 text-emerald-500" /><p>Click or tap any tile adjacent to the blank space to move it.</p></div>
                <div className="flex items-start gap-3"><Layers size={18} className="shrink-0 text-emerald-500" /><p>Use <strong>AI Solvers</strong> to see how algorithms find the solution path.</p></div>
                <div className="flex items-start gap-3"><Activity size={18} className="shrink-0 text-emerald-500" /><p>Keyboard: Use <strong>WASD</strong> or <strong>Arrow Keys</strong> to move tiles.</p></div>
              </div>
              <button onClick={() => setShowInstructions(false)} className="w-full mt-8 py-3 neumorphic-button font-bold text-emerald-500">Got it!</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <footer className="mt-auto py-8 opacity-40 text-xs font-mono">&copy; 2026 8-Puzzle Master • Built with React & AI</footer>
    </div>
  );
}
