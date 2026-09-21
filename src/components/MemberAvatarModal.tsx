import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MemberName, Member } from '../types';
import { setMemberAvatar } from '../utils/memberAvatars';
import { 
  Camera, 
  X, 
  AlertCircle,
  Loader2
} from 'lucide-react';

interface MemberAvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member;
  currentMember?: MemberName;
  onAvatarUpdated?: (memberName: MemberName, newUrl?: string) => void;
}

export const MemberAvatarModal: React.FC<MemberAvatarModalProps> = ({
  isOpen,
  onClose,
  member,
  currentMember,
  onAvatarUpdated
}) => {
  // Permission guard: allow the active logged-in member to edit their own profile photo
  const isAuthorized = !currentMember || member.name === currentMember;

  // View Mode: 'profile' (Screen 1 & 3) | 'crop' (Screen 2)
  const [viewMode, setViewMode] = useState<'profile' | 'crop'>('profile');

  // Selected avatar or cropped image URL preview
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Hidden File Input Ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Raw Image File Data for Cropping Screen
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [rawImageDimensions, setRawImageDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Cropper Interactive State (Pan & Zoom)
  const [cropScale, setCropScale] = useState<number>(1);
  const [minScale, setMinScale] = useState<number>(1);
  const [cropOffset, setCropOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Refs for drag & pinch math
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const offsetStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pinchStartDistRef = useRef<number | null>(null);
  const scaleStartRef = useRef<number>(1);
  const cropContainerRef = useRef<HTMLDivElement | null>(null);
  const cropImageRef = useRef<HTMLImageElement | null>(null);

  // Circular Crop Diameter (in px)
  const CROP_SIZE = 260;

  // Reset state on modal open
  useEffect(() => {
    if (isOpen) {
      setViewMode('profile');
      setErrorMessage(null);
      setIsDirty(false);
      setIsSaving(false);
      setSelectedPhoto(member.avatarUrl || null);
      setRawImageSrc(null);
    }
  }, [isOpen, member]);

  // Handle image file selection from native gallery/file picker
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image MIME type & extensions
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const fileName = file.name.toLowerCase();
    const isValidExt = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png') || fileName.endsWith('.webp');

    if (!validTypes.includes(file.type) && !isValidExt) {
      setErrorMessage('Please choose a valid image (JPG, PNG, or WEBP).');
      if (e.target) e.target.value = '';
      return;
    }

    setErrorMessage(null);

    const reader = new FileReader();
    reader.onerror = () => {
      setErrorMessage('Failed to read image file. Please try another image.');
      if (e.target) e.target.value = '';
    };

    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) return;

      const img = new Image();
      img.onload = () => {
        setRawImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        setRawImageSrc(result);

        // Calculate initial cover scale so image fills the crop circle
        const baseScale = Math.max(CROP_SIZE / img.naturalWidth, CROP_SIZE / img.naturalHeight);
        setMinScale(baseScale);
        setCropScale(baseScale);
        setCropOffset({ x: 0, y: 0 });

        // Switch to Screen 2: Crop Photo
        setViewMode('crop');
      };
      img.onerror = () => {
        setErrorMessage('Failed to load image for cropping.');
      };
      img.src = result;
    };

    reader.readAsDataURL(file);

    // Reset input value so re-selecting the same file works
    if (e.target) e.target.value = '';
  };

  // Trigger file input dialog
  const handleTriggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  // Clamp offset to ensure image continues to cover the circle
  const clampOffset = useCallback((x: number, y: number, scale: number) => {
    if (!rawImageDimensions.width || !rawImageDimensions.height) return { x, y };

    const renderedW = rawImageDimensions.width * scale;
    const renderedH = rawImageDimensions.height * scale;

    const maxOffsetX = Math.max(0, (renderedW - CROP_SIZE) / 2);
    const maxOffsetY = Math.max(0, (renderedH - CROP_SIZE) / 2);

    return {
      x: Math.min(maxOffsetX, Math.max(-maxOffsetX, x)),
      y: Math.min(maxOffsetY, Math.max(-maxOffsetY, y))
    };
  }, [rawImageDimensions, CROP_SIZE]);

  // Mouse & Touch Handlers for Dragging inside Crop Screen
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    offsetStartRef.current = { ...cropOffset };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const newOffset = clampOffset(
      offsetStartRef.current.x + dx,
      offsetStartRef.current.y + dy,
      cropScale
    );
    setCropOffset(newOffset);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom handler on Desktop
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newScale = Math.min(minScale * 4, Math.max(minScale, cropScale * zoomFactor));
    setCropScale(newScale);
    setCropOffset(prev => clampOffset(prev.x, prev.y, newScale));
  };

  // Touch handlers for Mobile Pan & Pinch-to-Zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      offsetStartRef.current = { ...cropOffset };
      pinchStartDistRef.current = null;
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      pinchStartDistRef.current = dist;
      scaleStartRef.current = cropScale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      const newOffset = clampOffset(
        offsetStartRef.current.x + dx,
        offsetStartRef.current.y + dy,
        cropScale
      );
      setCropOffset(newOffset);
    } else if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const ratio = dist / pinchStartDistRef.current;
      const newScale = Math.min(minScale * 4, Math.max(minScale, scaleStartRef.current * ratio));
      setCropScale(newScale);
      setCropOffset(prev => clampOffset(prev.x, prev.y, newScale));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    pinchStartDistRef.current = null;
  };

  // Apply Crop: renders circular crop to square 512x512 canvas output
  const handleApplyCrop = () => {
    if (!rawImageSrc || !rawImageDimensions.width || !rawImageDimensions.height) return;

    try {
      const canvas = document.createElement('canvas');
      const TARGET_DIMENSION = 512;
      canvas.width = TARGET_DIMENSION;
      canvas.height = TARGET_DIMENSION;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const img = new Image();
      img.onload = () => {
        // Calculate the bounding box in source image pixels corresponding to CROP_SIZE
        const renderedW = rawImageDimensions.width * cropScale;
        const renderedH = rawImageDimensions.height * cropScale;

        // The center of the crop circle relative to rendered image center:
        const cropCenterX = (renderedW / 2) - cropOffset.x;
        const cropCenterY = (renderedH / 2) - cropOffset.y;

        // In original source image scale:
        const srcCropCenterX = cropCenterX / cropScale;
        const srcCropCenterY = cropCenterY / cropScale;
        const srcCropSize = CROP_SIZE / cropScale;

        const srcX = srcCropCenterX - (srcCropSize / 2);
        const srcY = srcCropCenterY - (srcCropSize / 2);

        // Draw cropped area to target canvas
        ctx.drawImage(
          img,
          srcX,
          srcY,
          srcCropSize,
          srcCropSize,
          0,
          0,
          TARGET_DIMENSION,
          TARGET_DIMENSION
        );

        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setSelectedPhoto(croppedDataUrl);
        setIsDirty(true);
        setViewMode('profile');
      };
      img.src = rawImageSrc;
    } catch (err) {
      console.error('Failed to crop image:', err);
      setErrorMessage('Failed to apply crop. Please try again.');
    }
  };

  // Cancel Crop: returns to Screen 1 without saving
  const handleCancelCrop = () => {
    setViewMode('profile');
    setRawImageSrc(null);
  };

  // Final Done: Save profile avatar
  const handleSaveProfilePhoto = async () => {
    if (!isDirty || !selectedPhoto) return;

    setIsSaving(true);
    try {
      setMemberAvatar(member.name, selectedPhoto);
      if (onAvatarUpdated) {
        onAvatarUpdated(member.name, selectedPhoto);
      }
      onClose();
    } catch (err) {
      console.error('Failed to save profile avatar:', err);
      setErrorMessage('Failed to save profile photo.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  // If unauthorized member attempts to edit someone else's avatar
  if (!isAuthorized) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
          />
          <div className="relative bg-white dark:bg-[#10162A] rounded-3xl p-6 shadow-2xl max-w-sm text-center border border-slate-200 dark:border-slate-800">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC] mb-1">
              Access Restricted
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] mb-4">
              You can only update your own profile photo ({currentMember}).
            </p>
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-indigo-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        style={{
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)'
        }}
      >
        {/* Backdrop dismiss on click outside */}
        <div 
          onClick={onClose} 
          className="fixed inset-0 no-print" 
          aria-hidden="true" 
        />

        {/* Hidden Native File Input (Direct Gallery / Photos Picker) */}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/jpg"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* Clean Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 20 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative w-full max-w-[460px] bg-white dark:bg-[#10162A] text-slate-900 dark:text-[#F8FAFC] border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-[32px] sm:rounded-[32px] shadow-[0_24px_64px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col z-10 my-0 sm:my-auto"
          style={{ willChange: 'transform, opacity' }}
        >
          {viewMode === 'profile' ? (
            /* ========================================================== */
            /* SCREEN 1 & 3: MINIMAL CHANGE PROFILE PHOTO VIEW           */
            /* ========================================================== */
            <div className="flex flex-col p-6 sm:p-7 space-y-6">
              
              {/* Header: [ X ]    Change profile photo    Done */}
              <div className="flex items-center justify-between">
                {/* Left: Close X Button */}
                <button
                  type="button"
                  onClick={onClose}
                  id="btn-close-profile-photo-modal"
                  aria-label="Close modal"
                  className="p-2 -ml-2 rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 active:scale-95 transition-all cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center"
                >
                  <X className="w-5 h-5 stroke-[2.2]" />
                </button>

                {/* Center: Title */}
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#F8FAFC] tracking-tight">
                  Change profile photo
                </h2>

                {/* Right: Done Action */}
                <button
                  type="button"
                  onClick={handleSaveProfilePhoto}
                  disabled={!isDirty || isSaving}
                  id="btn-done-profile-photo"
                  aria-label="Save profile photo"
                  className={`text-sm font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                    isDirty
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30 cursor-pointer active:scale-95'
                      : 'text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60'
                  }`}
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Done</span>
                </button>
              </div>

              {/* Error Alert Banner if any */}
              {errorMessage && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 text-rose-600 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Centered Large Circular Profile Photo & Overlapping Camera Button */}
              <div className="flex flex-col items-center justify-center py-6">
                <div className="relative">
                  {/* Large Circular Profile Photo Frame */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25 }}
                    className="w-[210px] h-[210px] sm:w-[230px] sm:h-[230px] rounded-full border-[5px] border-slate-100 dark:border-slate-800 shadow-[0_12px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)] overflow-hidden bg-slate-100 dark:bg-[#151D35] flex items-center justify-center select-none"
                  >
                    {selectedPhoto ? (
                      <img
                        src={selectedPhoto}
                        alt={`${member.name}'s profile`}
                        className="w-full h-full object-cover rounded-full"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div className={`w-full h-full ${member.avatarColor} text-white flex flex-col items-center justify-center font-bold text-6xl select-none`}>
                        <span>{member.avatarLetter}</span>
                      </div>
                    )}
                  </motion.div>

                  {/* Circular Camera Button Overlapping Bottom-Right Edge */}
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={handleTriggerFilePicker}
                    id="btn-profile-camera-trigger"
                    aria-label="Choose photo from device gallery"
                    title="Choose photo from gallery"
                    className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 w-[54px] h-[54px] rounded-full bg-[#0F172A] dark:bg-[#1E293B] text-white flex items-center justify-center shadow-lg shadow-black/30 hover:shadow-black/50 transition-all cursor-pointer z-10 border-3 border-white dark:border-[#10162A]"
                  >
                    <Camera className="w-6 h-6 text-white stroke-[2.2]" />
                  </motion.button>
                </div>
              </div>

            </div>
          ) : (
            /* ========================================================== */
            /* SCREEN 2: DEDICATED CIRCULAR IMAGE CROP INTERFACE         */
            /* ========================================================== */
            <div className="flex flex-col select-none overflow-hidden">
              
              {/* Header: [ X ]              Crop Photo              */}
              <div className="flex items-center justify-between px-6 pt-5 pb-3">
                <button
                  type="button"
                  onClick={handleCancelCrop}
                  id="btn-cancel-crop-header"
                  aria-label="Cancel Crop"
                  className="p-2 -ml-2 rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 active:scale-95 transition-all cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center"
                >
                  <X className="w-5 h-5 stroke-[2.2]" />
                </button>

                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#F8FAFC] tracking-tight">
                  Crop Photo
                </h2>

                <div className="w-[38px]" />
              </div>

              {/* Crop Canvas/Gesture Container */}
              <div 
                ref={cropContainerRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="relative w-full h-[320px] sm:h-[350px] bg-black flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing touch-none"
              >
                {/* Moving Image Behind Crop Mask */}
                {rawImageSrc && (
                  <img
                    ref={cropImageRef}
                    src={rawImageSrc}
                    alt="Crop Source"
                    draggable={false}
                    className="absolute max-w-none pointer-events-none transition-transform duration-75 ease-out"
                    style={{
                      width: `${rawImageDimensions.width * cropScale}px`,
                      height: `${rawImageDimensions.height * cropScale}px`,
                      transform: `translate(${cropOffset.x}px, ${cropOffset.y}px)`,
                      willChange: 'transform'
                    }}
                  />
                )}

                {/* Dark Translucent Mask with Circular Cutout (1:1 Aspect Ratio) */}
                <div 
                  className="pointer-events-none absolute inset-0"
                  style={{
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)',
                    width: `${CROP_SIZE}px`,
                    height: `${CROP_SIZE}px`,
                    margin: 'auto',
                    borderRadius: '50%',
                    border: '2px solid rgba(255, 255, 255, 0.85)'
                  }}
                />
              </div>

              {/* Crop Controls at Bottom: Cancel | Done */}
              <div className="flex items-center justify-between px-6 py-5 bg-white dark:bg-[#10162A] gap-3">
                <button
                  type="button"
                  onClick={handleCancelCrop}
                  id="btn-cancel-crop-bottom"
                  className="flex-1 py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.98] transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleApplyCrop}
                  id="btn-apply-crop-bottom"
                  className="flex-1 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 active:scale-[0.98] transition-all cursor-pointer text-center"
                >
                  Done
                </button>
              </div>

            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
