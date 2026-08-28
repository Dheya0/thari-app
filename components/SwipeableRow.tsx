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

  const handleDragStart = () => {
    isDraggingRef.current = true;
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 50);

    const x = info.offset.x;
    const velocity = info.velocity.x;

    // Determine snap state based on distance and velocity
    if (x < -45 || velocity < -200) {
      // Swiped Left (reveal right actions)
      setSwipeOffset(-130);
    } else if (x > 45 || velocity > 200) {
      // Swiped Right (reveal left actions)
      setSwipeOffset(130);
    } else {
      // Snap closed
      setSwipeOffset(0);
      setShowDeleteConfirm(false);
    }
  };

  const handleRowClick = () => {
    if (isDraggingRef.current) return;

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
    <div id={`swipe-container-${id}`} className={`relative overflow-hidden select-none rounded-2xl sm:rounded-3xl ${className}`}>
      {/* Background Action Layer */}
      <div 
        className="absolute inset-0 flex items-center justify-between px-3 bg-[#0B0F14] border border-white/[0.06] rounded-2xl sm:rounded-3xl z-0"
        aria-hidden="true"
      >
        {/* Left Action (Edit) */}
        <div className="flex items-center gap-1.5">
          {onEdit && (
            <button
              type="button"
              onClick={handleEditClick}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#D9B978]/20 text-[#D9B978] hover:bg-[#D9B978]/30 border border-[#D9B978]/30 font-bold text-xs active:scale-95 transition-all shadow-sm"
              title={editLabel}
            >
              <Edit2 size={14} />
              <span className="hidden xs:inline">{editLabel}</span>
            </button>
          )}
        </div>

        {/* Right Action (Delete with inline confirm) */}
        <div className="flex items-center gap-1.5">
          {onDelete && (
            !showDeleteConfirm ? (
              <button
                type="button"
                onClick={handleDeleteClick}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#C98387]/20 text-[#C98387] hover:bg-[#C98387]/30 border border-[#C98387]/30 font-bold text-xs active:scale-95 transition-all shadow-sm"
                title={deleteLabel}
              >
                <Trash2 size={14} />
                <span className="hidden xs:inline">{deleteLabel}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-[#C98387]/30 p-1 rounded-xl border border-[#C98387]/50 animate-fade">
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#C98387] text-white font-black text-xs hover:bg-[#C98387]/90 active:scale-95 transition-all shadow-sm"
                  title={confirmDeleteText}
                >
                  <Check size={13} strokeWidth={3} />
                  <span>تأكيد</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelDelete}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs active:scale-95 transition-all"
                  title="إلغاء"
                >
                  <X size={13} />
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {/* Foreground Draggable Card */}
      <motion.div
        drag={disabled ? false : 'x'}
        dragConstraints={{ left: -140, right: 140 }}
        dragElastic={0.15}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        animate={{ x: swipeOffset }}
        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
        onClick={handleRowClick}
        className="relative z-10 w-full"
      >
        {children}
      </motion.div>
    </div>
  );
};
