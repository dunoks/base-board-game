'use client';

import { useEffect, useState, useCallback } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Compass, Shield, Zap, RefreshCw, User } from 'lucide-react';
import { IdentityCard } from '@coinbase/onchainkit/identity';
import { useAccount } from 'wagmi';

const GRID_SIZE = 8;
const INITIAL_PLAYER_POS = { x: 0, y: 0 };

type Position = { x: number; y: number };
type Item = { id: string; type: 'gem' | 'powerup' | 'hazard'; pos: Position };

export default function GamePage() {
  const [isSDKReady, setIsSDKReady] = useState(false);
  const [playerPos, setPlayerPos] = useState<Position>(INITIAL_PLAYER_POS);
  const [score, setScore] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const { address } = useAccount();

  // Initialize SDK
  useEffect(() => {
    const initSDK = async () => {
      await sdk.actions.ready();
      setIsSDKReady(true);
    };
    initSDK();
  }, []);

  // Spawn items
  const spawnItem = useCallback(() => {
    if (items.length > 5) return;
    
    const x = Math.floor(Math.random() * GRID_SIZE);
    const y = Math.floor(Math.random() * GRID_SIZE);
    
    // Don't spawn on player
    if (x === playerPos.x && y === playerPos.y) return;

    const newItem: Item = {
      id: Math.random().toString(36).substr(2, 9),
      type: Math.random() > 0.8 ? 'powerup' : 'gem',
      pos: { x, y }
    };

    setItems(prev => [...prev, newItem]);
  }, [items.length, playerPos.x, playerPos.y]);

  useEffect(() => {
    const interval = setInterval(spawnItem, 3000);
    return () => clearInterval(interval);
  }, [spawnItem]);

  // Handle movement
  const movePlayer = (dx: number, dy: number) => {
    setPlayerPos(prev => {
      const newX = Math.min(Math.max(prev.x + dx, 0), GRID_SIZE - 1);
      const newY = Math.min(Math.max(prev.y + dy, 0), GRID_SIZE - 1);
      
      // Check for collisions with items
      const collidedItem = items.find(item => item.pos.x === newX && item.pos.y === newY);
      if (collidedItem) {
        if (collidedItem.type === 'gem') setScore(s => s + 10);
        if (collidedItem.type === 'powerup') setScore(s => s + 50);
        setItems(prevItems => prevItems.filter(i => i.id !== collidedItem.id));
      }
      
      return { x: newX, y: newY };
    });
  };

  if (!isSDKReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="animate-spin text-blue-500">
          <RefreshCw size={48} />
        </div>
      </div>
    );
  }

  return (
    <main className="flex flex-col items-center justify-start p-4 min-h-screen max-w-md mx-auto">
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-6 pt-4">
        <h1 className="text-2xl font-bold font-sans tracking-tight text-white flex items-center gap-2">
          <span className="text-blue-500"><Compass /></span> Base Quest
        </h1>
        <div className="bg-slate-900 px-4 py-2 rounded-full border border-slate-800 flex items-center gap-2">
          <Trophy size={18} className="text-yellow-500" />
          <span className="font-mono font-bold">{score}</span>
        </div>
      </div>

      {/* Identity Card Mini */}
      {address && (
        <div className="w-full mb-6">
          <IdentityCard 
            address={address} 
            className="rounded-xl border border-blue-500/30 bg-blue-500/5 backdrop-blur-sm shadow-xl"
          />
        </div>
      )}

      {/* Game Board */}
      <div 
        className="relative bg-slate-900/50 p-2 rounded-2xl border border-slate-800 shadow-inner grid gap-1"
        style={{ 
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          width: '100%',
          aspectRatio: '1/1'
        }}
      >
        {/* Background Grid */}
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
          <div key={i} className="bg-slate-800/30 rounded-md border border-slate-700/20" />
        ))}

        {/* Items */}
        <AnimatePresence>
          {items.map(item => (
            <motion.div
              key={item.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute flex items-center justify-center p-1"
              style={{
                left: `${(item.pos.x / GRID_SIZE) * 100}%`,
                top: `${(item.pos.y / GRID_SIZE) * 100}%`,
                width: `${100 / GRID_SIZE}%`,
                height: `${100 / GRID_SIZE}%`
              }}
            >
              {item.type === 'gem' ? (
                <div className="bg-blue-500 w-4 h-4 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse" />
              ) : (
                <Zap className="text-yellow-400 w-6 h-6 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Player */}
        <motion.div
          animate={{
            left: `${(playerPos.x / GRID_SIZE) * 100}%`,
            top: `${(playerPos.y / GRID_SIZE) * 100}%`
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="absolute z-10 flex items-center justify-center p-1"
          style={{
            width: `${100 / GRID_SIZE}%`,
            height: `${100 / GRID_SIZE}%`
          }}
        >
          <div className="bg-white w-full h-full rounded-lg shadow-2xl flex items-center justify-center transform scale-90 border-2 border-blue-500 overflow-hidden">
             <User className="text-blue-500" />
          </div>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="mt-8 grid grid-cols-3 gap-4">
        <div />
        <ControlButton onClick={() => movePlayer(0, -1)} direction="up" />
        <div />
        <ControlButton onClick={() => movePlayer(-1, 0)} direction="left" />
        <ControlButton onClick={() => movePlayer(0, 1)} direction="down" />
        <ControlButton onClick={() => movePlayer(1, 0)} direction="right" />
      </div>

      {/* Footer Info */}
      <div className="mt-12 text-center opacity-40 text-xs font-mono uppercase tracking-widest">
        Mission: Collect Base Gems
      </div>
    </main>
  );
}

function ControlButton({ onClick, direction }: { onClick: () => void, direction: string }) {
  return (
    <button 
      onClick={onClick}
      className="bg-slate-900 border border-slate-800 p-4 rounded-2xl active:bg-blue-600 transition-colors shadow-lg"
    >
      {direction === 'up' && <RefreshCw className="rotate-0" />}
      {direction === 'down' && <RefreshCw className="rotate-180" />}
      {direction === 'left' && <RefreshCw className="-rotate-90" />}
      {direction === 'right' && <RefreshCw className="rotate-90" />}
      <span className="sr-only">{direction}</span>
    </button>
  );
}
