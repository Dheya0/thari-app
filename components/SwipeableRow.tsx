import React, { useState, useRef, useEffect } from 'react';
import { motion, PanInfo, useMotionValue, useTransform, animate } from 'motion/react';
import { Edit2, Trash2 } from 'lucide-react';
import { NativeHaptics } from '../services/nativeServices';

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

  // High performance motion value for smooth 60-120fps physics animations
  const x = useMotionValue(0);

  // Synchronize motion value when swipeOffset state changes
  useEffect(() => {
    const controls = animate(x, swipeOffset, {
      type: 'spring',
      stiffness: 480,
      damping: 32,
      mass: 0.6
    });
    return () => controls.stop();
  }, [swipeOffset, x]);

  // Real-time physics reactive transformations for Edit button (swiping left: x < 0)
  const editScale = useTransform(x, [0, -25, -88, -120], [0.55, 0.85, 1, 1.15]);
  const editOpacity = useTransform(x, [0, -12, -60], [0, 0.45, 1]);
  const editRotate = useTransform(x, [0, -88], [20, 0]);
  const editBgOpacity = useTransform(x, [0, -88], [0, 1]);

  // Real-time physics reactive transformations for Delete button (swiping right: x > 0)
  const deleteScale = useTransform(x, [0, 25, 88, 120], [0.55, 0.85, 1, 1.15]);
  const deleteOpacity = useTransform(x, [0, 12, 60], [0, 0.45, 1]);
  const deleteRotate = useTransform(x, [0, 88], [-20, 0]);
  const deleteBgOpacity = useTransform(x, [0, 88], [0, 1]);

  // If component re-mounts or ID changes (e.g. recycled during virtualization), reset swipe
  useEffect(() => {
    setSwipeOffset(0);
    x.set(0);
  }, [id, x]);

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
    dragDistanceRef.current = Math.abs(info.offset.x);
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    dragEndTimeRef.current = Date.now();
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 280);

    const currentX = x.get();
    const velocity = info.velocity.x;

    let targetOffset = 0;

    if (swipeOffset !== 0) {
      // If currently open on Edit (offset < 0) and dragged rightwards, snap closed
      if (swipeOffset < 0 && (currentX > -30 || velocity > 160)) {
        targetOffset = 0;
      }
      // If currently open on Delete (offset > 0) and dragged leftwards, snap closed
      else if (swipeOffset > 0 && (currentX < 30 || velocity < -160)) {
        targetOffset = 0;
      }
      // Maintain open if within threshold
      else {
        targetOffset = swipeOffset;
      }
    } else {
      // Determine snap state from closed initial position
      // Swipe left (reveals Edit on the right) with magnetic threshold & velocity check
      if (currentX < -36 || velocity < -220) {
        targetOffset = -88;
      } 
      // Swipe right (reveals Delete on the left) with magnetic threshold & velocity check
      else if (currentX > 36 || velocity > 220) {
        targetOffset = 88;
      } 
      else {
        targetOffset = 0;
      }
    }

    setSwipeOffset(targetOffset);
    animate(x, targetOffset, {
      type: 'spring',
      stiffness: 480,
      damping: 32,
      mass: 0.6
    });

    if (targetOffset !== 0) {
      window.dispatchEvent(new CustomEvent(SWIPE_OPEN_EVENT, { detail: { id } }));
      NativeHaptics.impact('LIGHT').catch(() => {});
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([15]); } catch {}
      }
    }
  };

  const handleRowClick = () => {
    if (Date.now() - dragEndTimeRef.current < 280 || dragDistanceRef.current > 10) {
      return;
    }

    if (swipeOffset !== 0) {
      setSwipeOffset(0);
      animate(x, 0, {
        type: 'spring',
        stiffness: 480,
        damping: 32,
        mass: 0.6
      });
    } else if (onClick) {
      onClick();
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSwipeOffset(0);
    animate(x, 0, {
      type: 'spring',
      stiffness: 480,
      damping: 32,
      mass: 0.6
    });
    NativeHaptics.selection().catch(() => {});
    if (onEdit) onEdit();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSwipeOffset(0);
    animate(x, 0, {
      type: 'spring',
      stiffness: 480,
      damping: 32,
      mass: 0.6
    });
    NativeHaptics.notification('WARNING').catch(() => {});
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
      <motion.div 
        className="absolute inset-y-0 right-0 w-[88px] flex items-center justify-center z-0 bg-gradient-to-l from-amber-500/25 via-[#1E1B15] to-[#0A0D10] border-s border-amber-500/35 rounded-e-2xl sm:rounded-e-3xl overflow-hidden select-none"
        style={{ opacity: editBgOpacity }}
        aria-hidden={swipeOffset >= 0}
      >
        {onEdit && (
          <button
            type="button"
            onClick={handleEditClick}
            className="flex flex-col items-center justify-center gap-1.5 w-full h-full text-amber-300 hover:bg-amber-500/15 active:scale-90 transition-all cursor-pointer select-none group"
            title={editLabel}
          >
            <motion.div 
              style={{ scale: editScale, opacity: editOpacity, rotate: editRotate }}
              className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#F5DEAA] via-[#D9B978] to-[#997328] text-[#0A0D10] flex items-center justify-center shadow-lg shadow-amber-500/40 border border-amber-200/60 transition-transform group-hover:scale-110"
            >
              <Edit2 size={18} strokeWidth={2.5} />
            </motion.div>
            <motion.span 
              style={{ opacity: editOpacity }}
              className="text-[11px] font-black tracking-tight text-amber-300 drop-shadow-xs"
            >
              {editLabel}
            </motion.span>
          </button>
        )}
      </motion.div>

      {/* Left Action Layer (Delete) - Revealed when swiping right */}
      <motion.div 
        className="absolute inset-y-0 left-0 w-[88px] flex items-center justify-center z-0 bg-gradient-to-r from-rose-600/30 via-[#2A1217] to-[#0A0D10] border-e border-rose-500/35 rounded-s-2xl sm:rounded-s-3xl overflow-hidden select-none"
        style={{ opacity: deleteBgOpacity }}
        aria-hidden={swipeOffset <= 0}
      >
        {onDelete && (
          <button
            type="button"
            onClick={handleDeleteClick}
            className="flex flex-col items-center justify-center gap-1.5 w-full h-full text-rose-400 hover:bg-rose-500/15 active:scale-90 transition-all cursor-pointer select-none group"
            title={deleteLabel}
          >
            <motion.div 
              style={{ scale: deleteScale, opacity: deleteOpacity, rotate: deleteRotate }}
              className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 via-rose-600 to-red-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/45 border border-rose-300/40 transition-transform group-hover:scale-110"
            >
              <Trash2 size={18} strokeWidth={2.5} />
            </motion.div>
            <motion.span 
              style={{ opacity: deleteOpacity }}
              className="text-[11px] font-black tracking-tight text-rose-300 drop-shadow-xs"
            >
              {deleteLabel}
            </motion.span>
          </button>
        )}
      </motion.div>

      {/* Foreground Draggable Card */}
      <motion.div
        drag={disabled ? false : 'x'}
        dragDirectionLock={true}
        dragConstraints={{ left: -88, right: 88 }}
        dragElastic={0.25}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ x, touchAction: 'pan-y' }}
        onClick={handleRowClick}
        className="relative z-10 w-full cursor-grab active:cursor-grabbing will-change-transform bg-[#11161C] rounded-2xl sm:rounded-3xl shadow-xs"
      >
        {children}
      </motion.div>
    </div>
  );
};
