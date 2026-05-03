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

type QuestType = 'collect_gems' | 'visit_coords';
interface Quest {
  id: string;
  title: string;
  description: string;
  type: QuestType;
  targetCount?: number;
  targetPos?: Position;
  progress: number;
  completed: boolean;
  reward: number;
}

const INITIAL_QUESTS: Quest[] = [
  {
    id: 'q1',
    title: 'Gem Hunter I',
    description: 'Collect 3 Gems',
    type: 'collect_gems',
    targetCount: 3,
    progress: 0,
    completed: false,
    reward: 100,
  },
  {
    id: 'q2',
    title: 'Pathfinder I',
    description: 'Visit the corner (7, 7)',
    type: 'visit_coords',
    targetPos: { x: 7, y: 7 },
    progress: 0,
    completed: false,
    reward: 150,
  },
  {
    id: 'q3',
    title: 'Center Scout',
    description: 'Find the middle square (4, 4)',
    type: 'visit_coords',
    targetPos: { x: 4, y: 4 },
    progress: 0,
    completed: false,
    reward: 50,
  }
];

export default function GamePage() {
  const [isSDKReady, setIsSDKReady] = useState(false);
  const [playerPos, setPlayerPos] = useState<Position>(INITIAL_PLAYER_POS);
  const [score, setScore] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [quests, setQuests] = useState<Quest[]>(INITIAL_QUESTS);
  const [gemsCollected, setGemsCollected] = useState(0);
  const { address } = useAccount();

  // Initialize SDK
  useEffect(() => {
    const initSDK = async () => {
      await sdk.actions.ready();
      setIsSDKReady(true);
    };
    initSDK();
  }, []);

  // Quest checking logic
  useEffect(() => {
    setQuests(currentQuests => 
      currentQuests.map(quest => {
        if (quest.completed) return quest;

        let newProgress = quest.progress;
        let isNowCompleted = false;

        if (quest.type === 'collect_gems') {
          newProgress = gemsCollected;
          if (newProgress >= (quest.targetCount || 0)) {
            isNowCompleted = true;
          }
        } else if (quest.type === 'visit_coords') {
          if (playerPos.x === quest.targetPos?.x && playerPos.y === quest.targetPos?.y) {
            newProgress = 1;
            isNowCompleted = true;
          }
        }

        if (isNowCompleted) {
          setScore(s => s + quest.reward);
          return { ...quest, progress: newProgress, completed: true };
        }

        return { ...quest, progress: newProgress };
      })
    );
  }, [gemsCollected, playerPos]);

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
        if (collidedItem.type === 'gem') {
          setScore(s => s + 10);
          setGemsCollected(g => g + 1);
        }
        if (collidedItem.type === 'powerup') setScore(s => s + 50);
        setItems(prevItems => prevItems.filter(i => i.id !== collidedItem.id));
      }
      
      return { x: newX, y: newY };
    });
  };

  if (!isSDKReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-blue-50">
        <div className="animate-spin text-blue-600">
          <RefreshCw size={48} />
        </div>
      </div>
    );
  }

  return (
    <main className="flex flex-col items-center justify-start p-6 min-h-screen max-w-md mx-auto bg-blue-50">
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-8 pt-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-neo">
            <Compass className="text-white" size={20} />
          </div>
          <h1 className="text-2xl font-black text-blue-900 tracking-tight leading-none">
            BASE QUEST
          </h1>
        </div>
        <div className="bg-yellow-100 border-2 border-yellow-400 px-4 py-2 rounded-full flex items-center gap-2 shadow-sm">
          <Trophy size={18} className="text-yellow-600" />
          <span className="font-mono font-black text-yellow-800">{score}</span>
        </div>
      </div>

      {/* Identity Card Mini */}
      {address && (
        <div className="w-full mb-8">
          <IdentityCard 
            address={address} 
            className="rounded-[32px] border-4 border-blue-100 bg-white shadow-sm overflow-hidden"
          />
        </div>
      )}

      {/* Game Board */}
      <div 
        className="relative bg-white p-2 rounded-[48px] border-8 border-white shadow-2xl grid gap-2"
        style={{ 
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          width: '100%',
          aspectRatio: '1/1'
        }}
      >
        {/* Background Grid */}
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
          <div key={i} className="bg-blue-50/50 rounded-xl border border-blue-100" />
        ))}

        {/* Items */}
        <AnimatePresence mode="popLayout">
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
                <div className="bg-blue-600 w-5 h-5 rounded-lg border-2 border-blue-400 rotate-12 shadow-[0_0_15px_rgba(37,99,235,0.4)] animate-pulse" />
              ) : (
                <Zap className="text-yellow-500 w-8 h-8 drop-shadow-[2px_2px_0px_rgba(234,179,8,0.3)]" />
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
          <div className="bg-blue-600 w-full h-full rounded-2xl shadow-xl flex items-center justify-center border-4 border-white overflow-hidden">
             <User className="text-white" size={24} />
          </div>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="mt-10 grid grid-cols-3 gap-6">
        <div />
        <ControlButton onClick={() => movePlayer(0, -1)} direction="up" />
        <div />
        <ControlButton onClick={() => movePlayer(-1, 0)} direction="left" />
        <ControlButton onClick={() => movePlayer(0, 1)} direction="down" />
        <ControlButton onClick={() => movePlayer(1, 0)} direction="right" />
      </div>

      {/* Quest Section */}
      <div className="w-full mt-12 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-blue-900 tracking-tight flex items-center gap-2">
            <Shield className="text-blue-600" size={20} /> ONCHAIN QUESTS
          </h2>
          <span className="text-xs font-bold text-blue-400 bg-blue-100 px-2 py-1 rounded-lg">
            {quests.filter(q => q.completed).length} / {quests.length}
          </span>
        </div>
        
        <div className="space-y-3">
          {quests.map(quest => (
            <motion.div 
              key={quest.id}
              layout
              className={`p-4 rounded-3xl border-2 transition-all ${
                quest.completed 
                ? 'bg-green-50 border-green-200' 
                : 'bg-white border-blue-100 shadow-sm'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className={`font-black text-sm ${quest.completed ? 'text-green-700' : 'text-blue-900'}`}>
                    {quest.title} {quest.completed && '✓'}
                  </h3>
                  <p className="text-xs text-blue-500 font-medium">{quest.description}</p>
                </div>
                {!quest.completed && (
                  <span className="text-[10px] font-black bg-blue-600 text-white px-2 py-1 rounded-lg">
                    +{quest.reward}
                  </span>
                )}
              </div>
              
              {!quest.completed && quest.type === 'collect_gems' && (
                <div className="w-full h-2 bg-blue-50 rounded-full overflow-hidden border border-blue-100">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(quest.progress / (quest.targetCount || 1)) * 100}%` }}
                    className="h-full bg-blue-600"
                  />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Mission Badge */}
      <div className="mt-12 mb-8 bg-blue-100 rounded-2xl px-6 py-3 border-2 border-blue-200">
        <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">
          Mission: Collect Base Gems
        </span>
      </div>
    </main>
  );
}

function ControlButton({ onClick, direction }: { onClick: () => void, direction: string }) {
  return (
    <button 
      onClick={onClick}
      className="bg-white border-b-4 border-blue-800 p-5 rounded-2xl shadow-lg active:border-b-0 active:translate-y-1 transition-all hover:bg-blue-50 group border-x-2 border-t-2 border-blue-600"
    >
      <div className="text-blue-600 group-active:text-blue-800">
        {direction === 'up' && <RefreshCw className="rotate-0" />}
        {direction === 'down' && <RefreshCw className="rotate-180" />}
        {direction === 'left' && <RefreshCw className="-rotate-90" />}
        {direction === 'right' && <RefreshCw className="rotate-90" />}
      </div>
      <span className="sr-only">{direction}</span>
    </button>
  );
}
