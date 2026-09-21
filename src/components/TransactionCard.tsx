import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { Expense, MemberName } from '../types';
import { useMemberAvatars } from '../hooks/useMemberAvatars';
import { formatExactCurrency, getTransactionDisplay } from '../utils/analytics';
import { TransactionSubtitle } from './TransactionSubtitle';
import { Edit2, Trash2 } from 'lucide-react';

interface TransactionCardProps {
  item: Expense;
  index: number;
  currentMember: MemberName;
  isSelected?: boolean;
  isDeleting?: boolean;
  onSelect?: (item: Expense) => void;
  onEdit?: (item: Expense) => void;
  onDelete?: (item: Expense) => void;
  onDenialToast?: (message: string) => void;
}

export const TransactionCard: React.FC<TransactionCardProps> = ({
  item,
  index,
  currentMember,
  isSelected = false,
  isDeleting = false,
  onSelect,
  onEdit,
  onDelete,
  onDenialToast,
}) => {
  const { getMember } = useMemberAvatars();
  const memberObj = getMember(item.member);
  const isOwner = item.member === currentMember;
  const display = getTransactionDisplay(item);
  const cardRef = useRef<HTMLDivElement>(null);

  // Swipe-to-delete state
  const [isSwipedOpen, setIsSwipedOpen] = useState<boolean>(false);
  const x = useMotionValue(0);
  const deleteBtnOpacity = useTransform(x, [0, -40, -85], [0, 0.6, 1]);
  const deleteBtnScale = useTransform(x, [0, -40, -85], [0.8, 0.9, 1]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    cardRef.current.style.setProperty('--mouse-x', `${mouseX}px`);
    cardRef.current.style.setProperty('--mouse-y', `${mouseY}px`);
  };

  const handleActionClick = (e: React.MouseEvent, action: 'edit' | 'delete') => {
    e.stopPropagation();
    e.preventDefault();

    if (!isOwner) {
      if (onDenialToast) {
        onDenialToast(`Only ${item.member} can edit or delete this entry`);
      }
      return;
    }

    if (action === 'edit' && onEdit) {
      onEdit(item);
    } else if (action === 'delete' && onDelete) {
      onDelete(item);
    }
  };

  const handleSwipeDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!isOwner) {
      if (onDenialToast) {
        onDenialToast(`Only ${item.member} can delete this entry`);
      }
      setIsSwipedOpen(false);
      return;
    }

    if (onDelete) {
      onDelete(item);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={
        isDeleting
          ? { opacity: 0, scale: 0.92, y: -6, filter: 'blur(4px)', maxHeight: 0, marginBottom: 0 }
          : { opacity: 1, y: 0, scale: 1 }
      }
      exit={{ opacity: 0, scale: 0.9, height: 0 }}
      transition={
        isDeleting
          ? { duration: 0.32, ease: [0.16, 1, 0.3, 1] }
          : { duration: 0.28, delay: Math.min(index * 0.03, 0.3), ease: [0.16, 1, 0.3, 1] }
      }
      className="relative overflow-hidden rounded-2xl select-none"
    >
      {/* Background Revealed Swipe-to-Delete Action */}
      <div className="absolute inset-y-0 right-0 w-[90px] flex items-center justify-center bg-rose-600 dark:bg-rose-600 rounded-2xl z-0 pl-1">
        <motion.button
          type="button"
          style={{ opacity: deleteBtnOpacity, scale: deleteBtnScale }}
          onClick={handleSwipeDeleteClick}
          aria-label={`Delete ${display.title}`}
          title={isOwner ? 'Delete transaction' : `Only ${item.member} can delete this entry`}
          className="w-full h-full flex flex-col items-center justify-center gap-1 text-white cursor-pointer hover:bg-rose-700 active:scale-95 transition-all"
        >
          <Trash2 className="w-5 h-5 text-white stroke-[2.2]" />
          <span className="text-[11px] font-bold text-white uppercase tracking-wider">Delete</span>
        </motion.button>
      </div>

      {/* Draggable Foreground Transaction Card */}
      <motion.div
        ref={cardRef}
        id={`transaction-card-${item.id}`}
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -85, right: 0 }}
        dragElastic={0.12}
        onDragEnd={(_, info) => {
          if (info.offset.x < -35 || info.velocity.x < -250) {
            setIsSwipedOpen(true);
          } else {
            setIsSwipedOpen(false);
          }
        }}
        animate={{ x: isSwipedOpen ? -85 : 0 }}
        transition={{ type: 'spring', stiffness: 450, damping: 35 }}
        onMouseMove={handleMouseMove}
        role="button"
        tabIndex={0}
        aria-pressed={isSelected}
        onClick={() => {
          if (isSwipedOpen) {
            setIsSwipedOpen(false);
          } else if (onSelect) {
            onSelect(item);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (isSwipedOpen) {
              setIsSwipedOpen(false);
            } else if (onSelect) {
              onSelect(item);
            }
          }
        }}
        className={`group relative flex items-center justify-between gap-3 p-3.5 rounded-2xl cursor-pointer select-none transition-colors duration-200 ease-out overflow-hidden border z-10 ${
          isDeleting
            ? 'deleting-card-anim border-rose-500/90 shadow-[0_0_20px_rgba(244,63,94,0.5)]'
            : isSelected
            ? 'bg-indigo-50/95 dark:bg-[#151D35] border-cyan-400/80 shadow-md ring-1 ring-cyan-400/50'
            : 'bg-white dark:bg-[#11192D] hover:bg-slate-50 dark:hover:bg-[#16213D] border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-cyan-500/40 dark:hover:border-cyan-400/50 hover:shadow-[0_8px_24px_rgba(34,211,238,0.08),0_2px_10px_rgba(124,92,252,0.06)]'
        } active:cursor-grabbing`}
      >
        {/* 1. Subtle Cursor-following Radial Spotlight */}
        <div
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
          style={{
            background:
              'radial-gradient(280px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(34, 211, 238, 0.10), rgba(124, 92, 252, 0.04) 40%, transparent 65%)',
          }}
        />

        {/* 2. Top-edge subtle shimmer on hover */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/0 to-transparent group-hover:via-cyan-400/40 transition-all duration-300" />

        {/* 3. Left Section: Avatar Circle with Hover Glow Ring */}
        <div className="relative shrink-0">
          <div
            className={`w-10 h-10 rounded-full ${memberObj.avatarColor} text-white flex items-center justify-center font-bold text-sm shadow-xs overflow-hidden transition-all duration-300 ring-2 ring-transparent group-hover:ring-cyan-400/70 group-hover:shadow-[0_0_12px_rgba(34,211,238,0.4)]`}
            title={`Paid by ${item.member}`}
          >
            {memberObj.avatarUrl ? (
              <img
                src={memberObj.avatarUrl}
                alt={memberObj.name}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              memberObj.avatarLetter
            )}
          </div>
        </div>

        {/* 4. Middle Section: Title & Subtitle */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5 relative z-[2]">
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate tracking-tight group-hover:text-cyan-900 dark:group-hover:text-white transition-colors">
            {display.title}
          </span>
          <div className="min-w-0">
            <TransactionSubtitle expense={item} />
          </div>
        </div>

        {/* 5. Right Section: Amount & Micro-interaction Actions */}
        <div className="shrink-0 flex items-center justify-end gap-2.5 text-right pl-2 relative z-[2]">
          <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums tracking-tight group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
            {formatExactCurrency(item.amount)}
          </div>

          <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => handleActionClick(e, 'edit')}
              title={isOwner ? 'Edit transaction' : `Only ${item.member} can edit this entry`}
              className={`p-1.5 rounded-lg transition-all duration-200 ${
                isOwner
                  ? 'cursor-pointer text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-cyan-950/40 hover:-translate-y-0.5 active:scale-90 hover:shadow-[0_0_10px_rgba(34,211,238,0.25)]'
                  : 'cursor-not-allowed opacity-30 text-slate-400 dark:text-slate-600'
              }`}
            >
              <Edit2 className="w-3.5 h-3.5 transition-transform duration-200 group-hover/btn:scale-110" />
            </button>
            <button
              type="button"
              onClick={(e) => handleActionClick(e, 'delete')}
              title={isOwner ? 'Delete transaction' : `Only ${item.member} can delete this entry`}
              className={`p-1.5 rounded-lg transition-all duration-200 ${
                isOwner
                  ? 'cursor-pointer text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:-translate-y-0.5 active:scale-90 hover:shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                  : 'cursor-not-allowed opacity-30 text-slate-400 dark:text-slate-600'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5 transition-transform duration-200 group-hover/btn:scale-110" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
