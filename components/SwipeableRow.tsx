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
  const [isDragging, setIsDragging] = useState(false);
  const [dragDirection, setDragDirection] = useState<'left' | 'right' | null>(null);
  const isDraggingRef = useRef(false);
  const dragDistanceRef = useRef(0);

  const handleDragStart = () => {
    isDraggingRef.current = true;
    dragDistanceRef.current = 0;
    setIsDragging(true);
  };

  const handleDrag = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    dragDistanceRef.current = Math.abs(info.offset.x);
    if (info.offset.x > 3) {
      setDragDirection('right');
    } else if (info.offset.x < -3) {
      setDragDirection('left');
    }
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
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
        setDragDirection(null);
        return;
      }
      // If currently swiped right (offset > 0) and dragged leftwards, snap back closed
      if (swipeOffset > 0 && (x < -15 || velocity < -40)) {
        setSwipeOffset(0);
        setShowDeleteConfirm(false);
        setDragDirection(null);
        return;
      }
      // If dragged further in the same direction, stay open
      if ((swipeOffset < 0 && x < -15) || (swipeOffset > 0 && x > 15)) {
        return;
      }
    }

    // Determine snap state from closed initial position
    if (x < -10 || velocity < -30) {
      // Swiped from Right to Left (reveals right action: Edit)
      setSwipeOffset(-88);
      setDragDirection('left');
    } else if (x > 10 || velocity > 30) {
      // Swiped from Left to Right (reveals left action: Delete)
      setSwipeOffset(88);
      setDragDirection('right');
    } else {
      // Snap closed
      setSwipeOffset(0);
      setShowDeleteConfirm(false);
      setDragDirection(null);
    }
  };

  const handleRowClick = () => {
    // If was just dragging with real movement, don't trigger click
    if (isDraggingRef.current && dragDistanceRef.current > 8) return;

    if (swipeOffset !== 0) {
      // If already open, clicking closes the swipe
      setSwipeOffset(0);
      setShowDeleteConfirm(false);
      setDragDirection(null);
    } else if (onClick) {
      onClick();
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSwipeOffset(0);
    setShowDeleteConfirm(false);
    setDragDirection(null);
    if (onEdit) onEdit();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSwipeOffset(0);
    setShowDeleteConfirm(false);
    setDragDirection(null);
    if (onDelete) onDelete();
  };

  const showRightEdit = (swipeOffset < 0) || (isDragging && dragDirection === 'left');
  const showLeftDelete = (swipeOffset > 0) || (isDragging && dragDirection === 'right');

  return (
    <div 
      id={`swipe-container-${id}`} 
      className={`relative overflow-hidden select-none rounded-2xl sm:rounded-3xl touch-pan-y bg-[#0A0D10] h-full ${className}`}
    >
      {/* Right Action Layer (Edit) - Revealed when swiping from Right to Left (x < 0) */}
      <div 
        className={`absolute top-0 bottom-0 right-0 w-[88px] flex items-center justify-center z-0 bg-[#161D26] border-l border-white/5 rounded-r-2xl sm:rounded-r-3xl transition-opacity duration-150 ${
          showRightEdit ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!showRightEdit}
      >
        {onEdit && (
          <button
            type="button"
            onClick={handleEditClick}
            className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-[#D9B978] text-[#0A0D10] font-black text-xs active:scale-95 transition-all shadow-md"
            title={editLabel}
          >
            <Edit2 size={14} />
            <span className="text-xs font-black">{editLabel}</span>
          </button>
        )}
      </div>

      {/* Left Action Layer (Delete) - Revealed when swiping from Left to Right (x > 0) */}
      <div 
        className={`absolute top-0 bottom-0 left-0 w-[88px] flex items-center justify-center z-0 bg-[#161D26] border-r border-white/5 rounded-l-2xl sm:rounded-l-3xl transition-all duration-150 ${
          showLeftDelete ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!showLeftDelete}
      >
        {onDelete && (
          <button
            type="button"
            onClick={handleDeleteClick}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[#C98387] to-[#B3686D] text-white font-black text-xs active:scale-95 transition-all shadow-md shadow-[#C98387]/20"
            title={deleteLabel}
          >
            <Trash2 size={14} />
            <span className="text-xs font-black">{deleteLabel}</span>
          </button>
        )}
      </div>

      {/* Foreground Draggable Card */}
      <motion.div
        drag={disabled ? false : 'x'}
        dragDirectionLock={true}
        dragConstraints={{ left: -88, right: showDeleteConfirm ? 116 : 88 }}
        dragElastic={0.05}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={{ x: swipeOffset }}
        transition={{ type: 'spring', stiffness: 800, damping: 24, mass: 0.2 }}
        onClick={handleRowClick}
        className="relative z-10 w-full cursor-grab active:cursor-grabbing touch-pan-y will-change-transform bg-[#11161C] rounded-2xl sm:rounded-3xl shadow-sm"
      >
        {children}
      </motion.div>
    </div>
  );
};
