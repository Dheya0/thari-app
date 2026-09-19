import React, { useState, useRef, useEffect } from 'react';
import { motion, PanInfo } from 'motion/react';
import { Edit2, Trash2 } from 'lucide-react';

interface SwipeableRowProps {
  id: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
  children: React.ReactNode;
  editLabel?: string;
  deleteLabel?: string;
  confirmDeleteText?: string;
  className?: string;
  disabled?: boolean;
}

const SWIPE_OPEN_EVENT = 'thari:swipe-row-opened';

export const SwipeableRow: React.FC<SwipeableRowProps> = ({
  id,
  onEdit,
  onDelete,
  onClick,
  children,
  editLabel = 'تعديل',
  deleteLabel = 'حذف',
  className = '',
  disabled = false,
}) => {
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragDistanceRef = useRef(0);
  const dragEndTimeRef = useRef(0);

  // If component re-mounts or ID changes, reset swipe offset
  useEffect(() => {
    setSwipeOffset(0);
  }, [id]);

  // Coordinate so only one swipe row is open across the entire app
  useEffect(() => {
    const handleOtherRowOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>;
      if (customEvent.detail?.id !== id) {
        setSwipeOffset(0);
      }
    };
    window.addEventListener(SWIPE_OPEN_EVENT, handleOtherRowOpen);
    return () => {
      window.removeEventListener(SWIPE_OPEN_EVENT, handleOtherRowOpen);
    };
  }, [id]);

  // Auto-close when tapping anywhere outside the active row
  useEffect(() => {
    if (swipeOffset === 0) return;
    const handleGlobalPointer = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSwipeOffset(0);
      }
    };
    window.addEventListener('pointerdown', handleGlobalPointer, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', handleGlobalPointer);
    };
  }, [swipeOffset]);

  const handleDragStart = () => {
    isDraggingRef.current = true;
    dragDistanceRef.current = 0;
  };

  const handleDrag = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Keep track of movement distance without updating state (0 re-renders during drag)
    dragDistanceRef.current = Math.abs(info.offset.x);
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    dragEndTimeRef.current = Date.now();
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 280);

    const x = info.offset.x;
    const velocity = info.velocity.x;

    if (swipeOffset !== 0) {
      // If currently open on Edit (offset < 0) and dragged rightwards, snap closed
      if (swipeOffset < 0 && (x > 20 || velocity > 150)) {
        setSwipeOffset(0);
        return;
      }
      // If currently open on Delete (offset > 0) and dragged leftwards, snap closed
      if (swipeOffset > 0 && (x < -20 || velocity < -150)) {
        setSwipeOffset(0);
        return;
      }
      // User held or pulled slightly further in open direction: maintain open
      if ((swipeOffset < 0 && x < -10) || (swipeOffset > 0 && x > 10)) {
        return;
      }
    }

    // Determine snap state from closed initial position
    // Swipe left (x < -32 or quick flick) reveals Edit on the right
    if (x < -32 || velocity < -200) {
      setSwipeOffset(-84);
      window.dispatchEvent(new CustomEvent(SWIPE_OPEN_EVENT, { detail: { id } }));
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(8); } catch {}
      }
    } 
    // Swipe right (x > 32 or quick flick) reveals Delete on the left
    else if (x > 32 || velocity > 200) {
      setSwipeOffset(84);
      window.dispatchEvent(new CustomEvent(SWIPE_OPEN_EVENT, { detail: { id } }));
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(8); } catch {}
      }
    } 
    // Otherwise smoothly snap closed
    else {
      setSwipeOffset(0);
    }
  };

  const handleRowClick = () => {
    // If a touch drag completed recently or movement was detected, ignore click
    if (Date.now() - dragEndTimeRef.current < 280 || dragDistanceRef.current > 10) {
      return;
    }

    if (swipeOffset !== 0) {
      // If already open, tapping snaps it back closed
      setSwipeOffset(0);
    } else if (onClick) {
      onClick();
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSwipeOffset(0);
    if (onEdit) onEdit();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSwipeOffset(0);
    if (onDelete) onDelete();
  };

  return (
    <div 
      ref={containerRef}
      id={`swipe-container-${id}`} 
      className={`relative overflow-hidden select-none rounded-2xl sm:rounded-3xl bg-[#0A0D10] h-full ${className}`}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Right Action Layer (Edit) - Revealed when swiping left */}
      <div 
        className="absolute inset-y-0 right-0 w-[84px] flex items-center justify-center z-0 bg-gradient-to-l from-[#D9B978]/25 via-[#171E27] to-[#11161C] border-s border-[#D9B978]/20 rounded-e-2xl sm:rounded-e-3xl"
        aria-hidden={swipeOffset >= 0}
      >
        {onEdit && (
          <button
            type="button"
            onClick={handleEditClick}
            className="flex flex-col items-center justify-center gap-1.5 w-full h-full text-[#D9B978] hover:bg-[#D9B978]/10 active:scale-90 transition-transform cursor-pointer select-none"
            title={editLabel}
          >
            <div className="w-8 h-8 rounded-full bg-[#D9B978] text-[#0A0D10] flex items-center justify-center shadow-lg shadow-[#D9B978]/20">
              <Edit2 size={15} strokeWidth={2.5} />
            </div>
            <span className="text-[11px] font-black tracking-tight">{editLabel}</span>
          </button>
        )}
      </div>

      {/* Left Action Layer (Delete) - Revealed when swiping right */}
      <div 
        className="absolute inset-y-0 left-0 w-[84px] flex items-center justify-center z-0 bg-gradient-to-r from-rose-500/25 via-[#23171A] to-[#11161C] border-e border-rose-500/20 rounded-s-2xl sm:rounded-s-3xl"
        aria-hidden={swipeOffset <= 0}
      >
        {onDelete && (
          <button
            type="button"
            onClick={handleDeleteClick}
            className="flex flex-col items-center justify-center gap-1.5 w-full h-full text-rose-400 hover:bg-rose-500/10 active:scale-90 transition-transform cursor-pointer select-none"
            title={deleteLabel}
          >
            <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/25">
              <Trash2 size={15} strokeWidth={2.5} />
            </div>
            <span className="text-[11px] font-black tracking-tight">{deleteLabel}</span>
          </button>
        )}
      </div>

      {/* Foreground Draggable Card */}
      <motion.div
        drag={disabled ? false : 'x'}
        dragDirectionLock={true}
        dragConstraints={{ left: -84, right: 84 }}
        dragElastic={0.25}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={{ x: swipeOffset }}
        transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.6 }}
        onClick={handleRowClick}
        className="relative z-10 w-full cursor-grab active:cursor-grabbing will-change-transform bg-[#11161C] rounded-2xl sm:rounded-3xl shadow-xs"
        style={{ touchAction: 'pan-y' }}
      >
        {children}
      </motion.div>
    </div>
  );
};

