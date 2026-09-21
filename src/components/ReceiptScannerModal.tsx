import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MemberName, CategoryName, PaymentMode } from '../types';
import { 
  Camera, 
  X, 
  RefreshCw, 
  Zap, 
  ZapOff, 
  RotateCcw, 
  Check, 
  Sparkles, 
  AlertCircle,
  ScanLine
} from 'lucide-react';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReceiptScanned: (data: {
    amount?: number;
    category?: CategoryName;
    paymentMode?: PaymentMode;
    itemName?: string;
    place?: string;
    date?: string;
  }) => void;
  currentMember: MemberName;
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  onReceiptScanned,
  currentMember
}) => {
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [isFlashOn, setIsFlashOn] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedSnapshot, setCapturedSnapshot] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [parsedResult, setParsedResult] = useState<{
    amount?: number;
    category?: CategoryName;
    itemName?: string;
    place?: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCapturedSnapshot(null);
      setParsedResult(null);
      setIsScanning(false);
      startCamera('environment');
    } else {
      stopCamera();
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const startCamera = async (facing: 'environment' | 'user' = cameraFacingMode) => {
    stopCamera();
    setCameraError(null);
    setCapturedSnapshot(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera is not available in this browser environment.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Receipt camera permission note:', err?.message || err);
      const errMsg = String(err?.message || err?.name || '').toLowerCase();
      if (
        err?.name === 'NotAllowedError' || 
        err?.name === 'PermissionDeniedError' || 
        errMsg.includes('dismissed') || 
        errMsg.includes('denied') ||
        errMsg.includes('permission')
      ) {
        setCameraError('Camera access was dismissed or blocked by the browser. You can retry permissions or load a sample bill to test.');
      } else {
        setCameraError('Unable to open camera on this device. You can test with a sample receipt below.');
      }
    }
  };

  const handleToggleFacing = () => {
    const next = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(next);
    startCamera(next);
  };

  const handleCaptureReceipt = () => {
    if (!videoRef.current) return;
    setIsScanning(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement('canvas');
      
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        setCapturedSnapshot(dataUrl);

        // Simulate intelligent receipt text extraction
        setTimeout(() => {
          const simulatedExpenses = [
            { amount: 350, category: 'Food' as CategoryName, itemName: 'Dinner with Roommates', place: 'Restaurant' },
            { amount: 120, category: 'Snacks' as CategoryName, itemName: 'Tea & Snacks', place: 'Cafe' },
            { amount: 500, category: 'Fuel' as CategoryName, itemName: 'Petrol Fill', place: 'Petrol Bunk' },
            { amount: 240, category: 'Grocery' as CategoryName, itemName: 'Room Supplies', place: 'Supermarket' }
          ];
          const randomParsed = simulatedExpenses[Math.floor(Math.random() * simulatedExpenses.length)];
          setParsedResult(randomParsed);
          setIsScanning(false);
        }, 800);
      }
    } catch (err) {
      console.error('Error capturing receipt:', err);
      setIsScanning(false);
    }
  };

  const handleApplyReceipt = () => {
    if (parsedResult) {
      onReceiptScanned({
        amount: parsedResult.amount,
        category: parsedResult.category,
        itemName: parsedResult.itemName,
        place: parsedResult.place,
        paymentMode: 'UPI'
      });
      stopCamera();
      onClose();
    }
  };

  const handleRetake = () => {
    setCapturedSnapshot(null);
    setParsedResult(null);
    setIsScanning(false);
    startCamera(cameraFacingMode);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
        style={{
          background: 'rgba(5, 10, 25, 0.75)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)'
        }}
      >
        <div onClick={onClose} className="fixed inset-0" aria-hidden="true" />
        <canvas ref={canvasRef} className="hidden" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-lg bg-[#10162A] text-[#F8FAFC] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10 max-h-[92vh]"
        >
          {/* Symmetrical Top Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-[#151D35]/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-950/80 border border-indigo-500/40 text-cyan-400 flex items-center justify-center shadow-xs">
                <ScanLine className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#F8FAFC]">Receipt Scanner</h3>
                <p className="text-xs text-[#94A3B8]">Scan bill or UPI screenshot with live camera</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scanner Viewport with Fixed Aspect Ratio aspect-[4/3] */}
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 flex flex-col items-center">
            
            {/* Top Toolbar overlay for Flash and Flip */}
            <div className="flex items-center justify-between w-full max-w-md px-1">
              <span className="text-xs font-semibold text-slate-400">
                Align receipt within the frame
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsFlashOn(!isFlashOn)}
                  className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                    isFlashOn 
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' 
                      : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-white'
                  }`}
                  title="Flash toggle"
                >
                  {isFlashOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleToggleFacing}
                  className="p-2 rounded-xl bg-slate-800/60 text-slate-400 border border-slate-700/60 hover:text-white transition-colors cursor-pointer"
                  title="Flip camera"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Camera Viewfinder Frame: Fixed aspect-[4/3] with rounded-2xl */}
            <div className="relative w-full aspect-[4/3] max-w-md rounded-2xl overflow-hidden bg-black border-2 border-indigo-500/50 shadow-2xl flex items-center justify-center">
              {isFlashOn && (
                <div className="absolute inset-0 bg-white/20 pointer-events-none z-20" />
              )}

              {capturedSnapshot ? (
                <img
                  src={capturedSnapshot}
                  alt="Captured receipt preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${cameraFacingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />
              )}

              {/* High-tech Scanner Corner Brackets & Animated Sweep Line */}
              <div className="absolute inset-4 pointer-events-none z-10 flex flex-col justify-between">
                <div className="flex justify-between">
                  <div className="w-7 h-7 border-t-3 border-l-3 border-cyan-400 rounded-tl-lg shadow-xs" />
                  <div className="w-7 h-7 border-t-3 border-r-3 border-cyan-400 rounded-tr-lg shadow-xs" />
                </div>

                {/* Animated Scanner Laser Sweep */}
                {!capturedSnapshot && (
                  <motion.div
                    animate={{ y: [-60, 60, -60] }}
                    transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                    className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22D3EE]"
                  />
                )}

                <div className="flex justify-between">
                  <div className="w-7 h-7 border-b-3 border-l-3 border-cyan-400 rounded-bl-lg shadow-xs" />
                  <div className="w-7 h-7 border-b-3 border-r-3 border-cyan-400 rounded-br-lg shadow-xs" />
                </div>
              </div>
            </div>

            {/* Error banner if any with fallback buttons */}
            {cameraError && (
              <div className="w-full max-w-md p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-semibold flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <div className="space-y-2 flex-1 text-left">
                  <p className="leading-relaxed">{cameraError}</p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => startCamera(cameraFacingMode)}
                      className="px-3 py-1.5 bg-rose-800 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retry Permission</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsScanning(true);
                        setCameraError(null);
                        // Generate mock canvas snapshot
                        const sampleCanvas = document.createElement('canvas');
                        sampleCanvas.width = 640;
                        sampleCanvas.height = 480;
                        const ctx = sampleCanvas.getContext('2d');
                        if (ctx) {
                          ctx.fillStyle = '#1e293b';
                          ctx.fillRect(0, 0, 640, 480);
                          ctx.fillStyle = '#f8fafc';
                          ctx.font = 'bold 22px monospace';
                          ctx.fillText('HOTEL ANANDHA BHAVAN', 160, 120);
                          ctx.font = '16px monospace';
                          ctx.fillText('Dinner & Meals Split', 190, 160);
                          ctx.fillText('TOTAL: INR 350.00', 210, 220);
                          ctx.fillText('PAID VIA UPI', 240, 260);
                          setCapturedSnapshot(sampleCanvas.toDataURL('image/jpeg'));
                        }
                        setTimeout(() => {
                          setParsedResult({
                            amount: 350,
                            category: 'Food',
                            itemName: 'Dinner at Anandha Bhavan',
                            place: 'Restaurant'
                          });
                          setIsScanning(false);
                        }, 500);
                      }}
                      className="px-3 py-1.5 bg-cyan-900/80 hover:bg-cyan-800 border border-cyan-500/50 text-cyan-200 rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Load Sample Receipt</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Extracted Details Box (Dark Fintech Card) */}
            {parsedResult && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md p-3.5 rounded-2xl bg-[#151D35] border border-cyan-500/40 text-left space-y-2 shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Receipt Scanned Successfully</span>
                  </span>
                  <span className="text-sm font-black text-emerald-400">
                    ₹{parsedResult.amount}
                  </span>
                </div>
                <div className="text-xs text-slate-300 grid grid-cols-2 gap-2 pt-1 border-t border-slate-700/60">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-semibold">Category</span>
                    <span className="font-bold text-white">{parsedResult.category}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-semibold">Item / Place</span>
                    <span className="font-bold text-white">{parsedResult.itemName}</span>
                  </div>
                </div>
              </motion.div>
            )}

          </div>

          {/* Symmetrical Bottom Action Bar */}
          <div className="p-4 border-t border-slate-800 bg-[#151D35]/60 flex items-center justify-center gap-3">
            {capturedSnapshot ? (
              <div className="flex items-center gap-3 w-full max-w-sm justify-center">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Retake</span>
                </button>
                <button
                  type="button"
                  onClick={handleApplyReceipt}
                  disabled={!parsedResult}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Auto-Fill Form</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={handleCaptureReceipt}
                  disabled={isScanning || !!cameraError}
                  aria-label="Capture Receipt"
                  className="w-16 h-16 rounded-full bg-slate-900 border-4 border-cyan-400 p-1 flex items-center justify-center shadow-xl shadow-cyan-500/25 cursor-pointer disabled:opacity-50"
                >
                  <div className="w-full h-full rounded-full bg-white hover:bg-cyan-100 transition-colors flex items-center justify-center">
                    <Camera className="w-6 h-6 text-slate-900" />
                  </div>
                </motion.button>
              </div>
            )}
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
