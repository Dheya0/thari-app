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
  const [isDragging, setIsDragging] = useState(false);
  const [dragDirection, setDragDirection] = useState<'left' | 'right' | null>(null);
  
  const isDraggingRef = useRef(false);
  const dragDistanceRef = useRef(0);
  const dragEndTimeRef = useRef(0);

  // If component re-mounts or ID changes, reset swipe offset safely
  useEffect(() => {
    setSwipeOffset(0);
    setDragDirection(null);
  }, [id]);

  const handleDragStart = () => {
    isDraggingRef.current = true;
    dragDistanceRef.current = 0;
    setIsDragging(true);
  };

  const handleDrag = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    dragDistanceRef.current = Math.abs(info.offset.x);
    if (info.offset.x > 5) {
      setDragDirection('right');
    } else if (info.offset.x < -5) {
      setDragDirection('left');
    }
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    dragEndTimeRef.current = Date.now();
    
    // Maintain dragging flag for 350ms to swallow trailing synthetic clicks on mobile
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 350);

    const x = info.offset.x;
    const velocity = info.velocity.x;

    if (swipeOffset !== 0) {
      // If currently open on Edit (offset < 0) and dragged rightwards, snap closed
      if (swipeOffset < 0 && (x > 15 || velocity > 35)) {
        setSwipeOffset(0);
        setDragDirection(null);
        return;
      }
      // If currently open on Delete (offset > 0) and dragged leftwards, snap closed
      if (swipeOffset > 0 && (x < -15 || velocity < -35)) {
        setSwipeOffset(0);
        setDragDirection(null);
        return;
      }
      // If user pulled further in the open direction, keep it open
      if ((swipeOffset < 0 && x < -10) || (swipeOffset > 0 && x > 10)) {
        return;
      }
    }

    // Determine snap state from closed initial position
    // Swipe left (x < -18 or fast flick) reveals Edit on the right
    if (x < -18 || velocity < -35) {
      setSwipeOffset(-92);
      setDragDirection('left');
    } 
    // Swipe right (x > 18 or fast flick) reveals Delete on the left
    else if (x > 18 || velocity > 35) {
      setSwipeOffset(92);
      setDragDirection('right');
    } 
    // Otherwise snap closed
    else {
      setSwipeOffset(0);
      setDragDirection(null);
    }
  };

  const handleRowClick = () => {
    // If a touch drag completed recently or significant drag movement happened, ignore click
    if (Date.now() - dragEndTimeRef.current < 350 || dragDistanceRef.current > 8) {
      return;
    }

    if (swipeOffset !== 0) {
      // If already open, tapping closes the revealed actions
      setSwipeOffset(0);
      setDragDirection(null);
    } else if (onClick) {
      onClick();
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSwipeOffset(0);
    setDragDirection(null);
    if (onEdit) onEdit();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSwipeOffset(0);
    setDragDirection(null);
    if (onDelete) onDelete();
  };

  const showRightEdit = (swipeOffset < 0) || (isDragging && dragDirection === 'left');
  const showLeftDelete = (swipeOffset > 0) || (isDragging && dragDirection === 'right');

  return (
    <div 
      id={`swipe-container-${id}`} 
      className={`relative overflow-hidden select-none rounded-2xl sm:rounded-3xl bg-[#0A0D10] h-full ${className}`}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Right Action Layer (Edit) - Revealed when swiping left (offset < 0) */}
      <div 
        className={`absolute top-0 bottom-0 right-0 w-[92px] flex items-center justify-center z-0 bg-[#161D26] border-l border-white/10 rounded-r-2xl sm:rounded-r-3xl transition-opacity duration-200 ${
          showRightEdit ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!showRightEdit}
      >
        {onEdit && (
          <button
            type="button"
            onClick={handleEditClick}
            className="flex flex-col items-center justify-center gap-1 w-full h-full text-[#D9B978] hover:bg-[#D9B978]/15 active:scale-95 transition-all cursor-pointer font-bold"
            title={editLabel}
          >
            <div className="w-8 h-8 rounded-full bg-[#D9B978] text-[#0A0D10] flex items-center justify-center shadow-md">
              <Edit2 size={15} strokeWidth={2.5} />
            </div>
            <span className="text-[11px] font-black">{editLabel}</span>
          </button>
        )}
      </div>

      {/* Left Action Layer (Delete) - Revealed when swiping right (offset > 0) */}
      <div 
        className={`absolute top-0 bottom-0 left-0 w-[92px] flex items-center justify-center z-0 bg-[#1F1517] border-r border-[#C98387]/20 rounded-l-2xl sm:rounded-l-3xl transition-all duration-200 ${
          showLeftDelete ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!showLeftDelete}
      >
        {onDelete && (
          <button
            type="button"
            onClick={handleDeleteClick}
            className="flex flex-col items-center justify-center gap-1 w-full h-full text-[#C98387] hover:bg-[#C98387]/15 active:scale-95 transition-all cursor-pointer font-bold"
            title={deleteLabel}
          >
            <div className="w-8 h-8 rounded-full bg-[#C98387] text-white flex items-center justify-center shadow-md">
              <Trash2 size={15} strokeWidth={2.5} />
            </div>
            <span className="text-[11px] font-black">{deleteLabel}</span>
          </button>
        )}
      </div>

      {/* Foreground Draggable Card */}
      <motion.div
        drag={disabled ? false : 'x'}
        dragDirectionLock={false}
        dragConstraints={{ left: -92, right: 92 }}
        dragElastic={0.18}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={{ x: swipeOffset }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        onClick={handleRowClick}
        className="relative z-10 w-full cursor-grab active:cursor-grabbing will-change-transform bg-[#11161C] rounded-2xl sm:rounded-3xl shadow-sm"
        style={{ touchAction: 'pan-y' }}
      >
        {children}
      </motion.div>
    </div>
  );
};
