import React, { useState, useRef } from 'react';
import { motion, PanInfo } from 'motion/react';
import { Edit2, Trash2, X, Check } from 'lucide-react';

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

export const SwipeableRow: React.FC<SwipeableRowProps> = ({
  id,
  onEdit,
  onDelete,
  onClick,
  children,
  editLabel = 'تعديل',
  deleteLabel = 'حذف',
  confirmDeleteText = 'تأكيد الحذف؟',
  className = '',
  disabled = false,
}) => {
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isDraggingRef = useRef(false);
  const dragDistanceRef = useRef(0);

  const handleDragStart = () => {
    isDraggingRef.current = true;
    dragDistanceRef.current = 0;
  };

  const handleDrag = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    dragDistanceRef.current = Math.abs(info.offset.x);
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 60);

    const x = info.offset.x;
    const velocity = info.velocity.x;

    if (swipeOffset !== 0) {
      // If currently swiped left (offset < 0) and dragged rightwards, snap back closed
      if (swipeOffset < 0 && (x > 15 || velocity > 40)) {
        setSwipeOffset(0);
        setShowDeleteConfirm(false);
        return;
      }
      // If currently swiped right (offset > 0) and dragged leftwards, snap back closed
      if (swipeOffset > 0 && (x < -15 || velocity < -40)) {
        setSwipeOffset(0);
        setShowDeleteConfirm(false);
        return;
      }
      // If dragged further in the same direction, stay open
      if ((swipeOffset < 0 && x < -15) || (swipeOffset > 0 && x > 15)) {
        return;
      }
    }

    // Determine snap state from closed initial position (hyper-sensitive & responsive thresholds)
    if (x < -10 || velocity < -30) {
      // Swiped Left (reveal right actions)
      setSwipeOffset(-96);
    } else if (x > 10 || velocity > 30) {
      // Swiped Right (reveal left actions)
      setSwipeOffset(96);
    } else {
      // Snap closed
      setSwipeOffset(0);
      setShowDeleteConfirm(false);
    }
  };

  const handleRowClick = () => {
    // If was just dragging with real movement, don't trigger click
    if (isDraggingRef.current && dragDistanceRef.current > 8) return;

    if (swipeOffset !== 0) {
      // If already open, clicking closes the swipe
      setSwipeOffset(0);
      setShowDeleteConfirm(false);
    } else if (onClick) {
      onClick();
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSwipeOffset(0);
    setShowDeleteConfirm(false);
    if (onEdit) onEdit();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
    } else {
      setSwipeOffset(0);
      setShowDeleteConfirm(false);
      if (onDelete) onDelete();
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  return (
    <div 
      id={`swipe-container-${id}`} 
      className={`relative overflow-hidden select-none rounded-2xl sm:rounded-3xl touch-pan-y ${className}`}
    >
      {/* Background Action Layer */}
      <div 
        className="absolute inset-0 flex items-center justify-between px-2.5 bg-[#0B0F14] border border-white/[0.06] rounded-2xl sm:rounded-3xl z-0"
        aria-hidden="true"
      >
        {/* Left Action (Edit) */}
        <div className="flex items-center gap-1.5 min-w-[70px]">
          {onEdit && (
            <button
              type="button"
              onClick={handleEditClick}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#D9B978]/25 text-[#D9B978] hover:bg-[#D9B978]/35 border border-[#D9B978]/40 font-bold text-xs active:scale-95 transition-all shadow-sm min-h-[40px]"
              title={editLabel}
            >
              <Edit2 size={15} />
              <span className="text-xs font-black">{editLabel}</span>
            </button>
          )}
        </div>

        {/* Right Action (Delete with inline confirm) */}
        <div className="flex items-center gap-1.5 min-w-[70px] justify-end">
          {onDelete && (
            !showDeleteConfirm ? (
              <button
                type="button"
                onClick={handleDeleteClick}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-rose-500/25 text-rose-300 hover:bg-rose-500/35 border border-rose-500/40 font-bold text-xs active:scale-95 transition-all shadow-sm min-h-[40px]"
                title={deleteLabel}
              >
                <Trash2 size={15} />
                <span className="text-xs font-black">{deleteLabel}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-rose-900/60 p-1 rounded-xl border border-rose-500/50 animate-fade">
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-rose-600 text-white font-black text-xs hover:bg-rose-500 active:scale-95 transition-all shadow-sm"
                  title={confirmDeleteText}
                >
                  <Check size={14} strokeWidth={3} />
                  <span>تأكيد</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelDelete}
                  className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs active:scale-95 transition-all"
                  title="إلغاء"
                >
                  <X size={14} />
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {/* Foreground Draggable Card */}
      <motion.div
        drag={disabled ? false : 'x'}
        dragDirectionLock={true}
        dragConstraints={{ left: -110, right: 110 }}
        dragElastic={0.06}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={{ x: swipeOffset }}
        transition={{ type: 'spring', stiffness: 800, damping: 22, mass: 0.2 }}
        onClick={handleRowClick}
        className="relative z-10 w-full cursor-grab active:cursor-grabbing touch-pan-y will-change-transform"
      >
        {children}
      </motion.div>
    </div>
  );
};
