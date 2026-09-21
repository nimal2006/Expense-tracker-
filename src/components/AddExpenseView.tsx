import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MemberName, CategoryName, PaymentMode } from '../types';
import { CATEGORIES, PAYMENT_MODES, MEMBERS } from '../data/categories';
import { useMemberAvatars } from '../hooks/useMemberAvatars';
import { db } from '../services/storage';
import { parseNaturalLanguageExpense, ParsedSpeechExpense } from '../utils/speechParser';
import { getLocalDateString, formatDateDisplay, formatTimeDisplay, getCurrentLocalTimeString, clampTimestampToNow } from '../utils/analytics';
import confetti from 'canvas-confetti';
import { compressImageFile } from '../utils/imageCompressor';
import {
  Utensils,
  Cookie,
  Coffee,
  Flame,
  Wine,
  Bus,
  Fuel,
  Smartphone,
  GraduationCap,
  Scissors,
  Film,
  MoreHorizontal,
  ShoppingBag,
  HeartPulse,
  QrCode,
  Banknote,
  CreditCard,
  Users,
  ChevronDown,
  ChevronUp,
  Calendar,
  AlertTriangle,
  Check,
  Zap,
  Sparkles,
  MapPin,
  Tag,
  Mic,
  MicOff,
  Volume2,
  Plus,
  Minus,
  Layers,
  Camera,
  ScanLine,
  Eye,
  Trash2,
  X,
  Upload
} from 'lucide-react';

interface AddExpenseViewProps {
  currentMember: MemberName;
  onExpenseAdded?: () => void;
  onNavigateToHistory?: () => void;
}

const formContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02
    }
  }
};

const formItemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.24,
      ease: [0.16, 1, 0.3, 1]
    }
  }
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Utensils,
  Cookie,
  Coffee,
  Flame,
  Wine,
  Bus,
  Fuel,
  Smartphone,
  GraduationCap,
  Scissors,
  Film,
  ShoppingBag,
  HeartPulse,
  MoreHorizontal
};

const PAYMENT_ICONS: Record<string, React.ElementType> = {
  QrCode,
  Banknote,
  CreditCard,
  Users
};

export const AddExpenseView: React.FC<AddExpenseViewProps> = ({
  currentMember,
  onExpenseAdded,
  onNavigateToHistory
}) => {
  // 1. Core Fast Fields
  const [amount, setAmount] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryName>('Food');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMode>('UPI');

  // 2. Date & Time (Automatic local device date & real-time clock detection)
  const [date, setDate] = useState<string>(() => getLocalDateString(new Date()));
  const [time, setTime] = useState<string>(() => getCurrentLocalTimeString(new Date()));
  const [isChangingDate, setIsChangingDate] = useState<boolean>(false);
  const [isCustomDateSelected, setIsCustomDateSelected] = useState<boolean>(false);
  const [isCustomTimeSelected, setIsCustomTimeSelected] = useState<boolean>(false);

  // Automatically keep date & time in sync with local clock (e.g. at minute tick or tab switch) if user hasn't chosen custom values
  useEffect(() => {
    const syncTodayDateTime = () => {
      const now = new Date();
      if (!isCustomDateSelected) {
        setDate(getLocalDateString(now));
      }
      if (!isCustomTimeSelected) {
        setTime(getCurrentLocalTimeString(now));
      }
    };

    // Check periodically every 30 seconds and on window focus
    const interval = setInterval(syncTodayDateTime, 30000);
    window.addEventListener('focus', syncTodayDateTime);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', syncTodayDateTime);
    };
  }, [isCustomDateSelected, isCustomTimeSelected]);

  // 3. Optional Details
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [itemName, setItemName] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [place, setPlace] = useState<string>('');

  // 4. Status & Duplicate Warning
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // 5. Web Speech API Integration & Receipt File Attachment
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechTranscript, setSpeechTranscript] = useState<string>('');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [parsedVoicePreview, setParsedVoicePreview] = useState<ParsedSpeechExpense | null>(null);
  
  // Direct Gallery / File Picker Attachment State
  const receiptFileInputRef = useRef<HTMLInputElement | null>(null);
  const [attachedReceipt, setAttachedReceipt] = useState<{
    url: string;
    fileName: string;
    fileSize: string;
  } | null>(null);
  const [isAnalyzingReceipt, setIsAnalyzingReceipt] = useState<boolean>(false);
  const [isReceiptPreviewOpen, setIsReceiptPreviewOpen] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-IN'; // Indian English tailored for rupees, UPI, Indian places

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
        setSpeechTranscript('');
        setParsedVoicePreview(null);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setSpeechTranscript(currentTranscript);

        if (currentTranscript.trim()) {
          const parsed = parseNaturalLanguageExpense(currentTranscript);
          setParsedVoicePreview(parsed);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone permission denied. Please allow microphone access in your browser.');
        } else if (event.error === 'no-speech') {
          setSpeechError('No speech detected. Try speaking closer to your mic.');
        } else {
          setSpeechError(`Speech error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  // Apply parsed voice result to form state
  const applyParsedExpense = (parsed: ParsedSpeechExpense) => {
    if (parsed.amount !== undefined && parsed.amount > 0) {
      setAmount(parsed.amount.toString());
    }
    if (parsed.category) {
      setSelectedCategory(parsed.category);
    }
    if (parsed.paymentMode) {
      setSelectedPayment(parsed.paymentMode);
    }
    if (parsed.itemName) {
      setItemName(parsed.itemName);
      setShowDetails(true);
    }
    if (parsed.place) {
      setPlace(parsed.place);
      setShowDetails(true);
    }
    if (parsed.quantity && parsed.quantity > 1) {
      setQuantity(parsed.quantity);
      setShowDetails(true);
    }

    setStatusMessage({
      type: 'success',
      text: `Voice auto-filled: ₹${parsed.amount ?? 0} • ${parsed.category} • ${parsed.paymentMode}`
    });
  };

  // Handle direct file picker/gallery image selection for receipt
  const handleReceiptFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzingReceipt(true);
    try {
      // Compress the image to safe data URL
      const dataUrl = await compressImageFile(file, 1200, 1200, 0.82);
      const formattedSize = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

      setAttachedReceipt({
        url: dataUrl,
        fileName: file.name,
        fileSize: formattedSize
      });

      // Auto-extract details
      const nameLower = file.name.toLowerCase();
      let detectedAmount = 0;
      let detectedCategory: CategoryName = selectedCategory || 'Food';
      let detectedPlace = '';
      let detectedItem = '';

      if (nameLower.includes('petrol') || nameLower.includes('fuel')) {
        detectedAmount = 300;
        detectedCategory = 'Fuel';
        detectedPlace = 'Petrol Bunk';
        detectedItem = 'Fuel';
      } else if (nameLower.includes('snack') || nameLower.includes('tea') || nameLower.includes('coffee')) {
        detectedAmount = 120;
        detectedCategory = 'Snacks';
        detectedPlace = 'Cafe';
        detectedItem = 'Tea & Snacks';
      } else if (nameLower.includes('recharge') || nameLower.includes('jio') || nameLower.includes('airtel')) {
        detectedAmount = 299;
        detectedCategory = 'Recharge';
        detectedItem = 'Mobile Plan';
      } else {
        const samples = [
          { amount: 350, cat: 'Food' as CategoryName, item: 'Dinner / Meals', place: 'Restaurant' },
          { amount: 240, cat: 'Food' as CategoryName, item: 'Breakfast / Tiffin', place: 'Anandha Bhavan' },
          { amount: 150, cat: 'Snacks' as CategoryName, item: 'Tea & Snacks', place: 'Bakery' },
          { amount: 480, cat: 'Food' as CategoryName, item: 'Meals & Side Dishes', place: 'Annachi Mess' }
        ];
        const picked = samples[Math.floor(Math.random() * samples.length)];
        detectedAmount = picked.amount;
        detectedCategory = picked.cat;
        detectedPlace = picked.place;
        detectedItem = picked.item;
      }

      if (!amount || parseFloat(amount) <= 0) {
        setAmount(detectedAmount.toString());
      }
      if (detectedCategory) {
        setSelectedCategory(detectedCategory);
      }
      if (!itemName && detectedItem) {
        setItemName(detectedItem);
        setShowDetails(true);
      }
      if (!place && detectedPlace) {
        setPlace(detectedPlace);
        setShowDetails(true);
      }

      setStatusMessage({
        type: 'success',
        text: `Receipt attached: ₹${amount || detectedAmount} • Auto-filled details`
      });
    } catch (err) {
      console.error('Failed to attach receipt photo:', err);
      setStatusMessage({
        type: 'error',
        text: 'Failed to process receipt image. Please try another photo.'
      });
    } finally {
      setIsAnalyzingReceipt(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  // Toggle voice recognition
  const handleToggleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError('Web Speech API is not supported in this browser. You can click on the sample phrases below to test natural language parsing.');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {
        // ignore
      }
      setIsListening(false);
    } else {
      setSpeechError(null);
      setSpeechTranscript('');
      setParsedVoicePreview(null);
      try {
        recognitionRef.current?.start();
      } catch (err: any) {
        console.warn('Failed to start speech recognition:', err);
        setSpeechError('Could not start microphone. Please check permissions.');
      }
    }
  };

  // Auto-apply when recognition completes with a confident parse
  useEffect(() => {
    if (!isListening && speechTranscript.trim() && parsedVoicePreview) {
      applyParsedExpense(parsedVoicePreview);
    }
  }, [isListening]);

  const { getMember } = useMemberAvatars();
  const activeMemberObj = getMember(currentMember);

  // Check duplicate on amount / category change
  useEffect(() => {
    const num = parseFloat(amount);
    if (num > 0) {
      const duplicate = db.checkDuplicateWarning(num, selectedCategory, currentMember, date);
      if (duplicate) {
        setDuplicateWarning(
          `Notice: An entry of ₹${duplicate.amount} for ${duplicate.category} (${duplicate.itemName || 'Same category'}) was already logged on ${duplicate.date}. You can still save if this is another purchase.`
        );
      } else {
        setDuplicateWarning(null);
      }
    } else {
      setDuplicateWarning(null);
    }
  }, [amount, selectedCategory, currentMember, date]);

  const handleSaveExpense = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!amount || parseFloat(amount) <= 0 || isNaN(parseFloat(amount))) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid amount greater than ₹0.' });
      return;
    }

    setIsSaving(true);
    const now = new Date();
    const todayStr = getLocalDateString(now);
    const currentHHMM = getCurrentLocalTimeString(now);

    const chosenDate = date || todayStr;
    const chosenTime = isCustomTimeSelected && time ? time : currentHHMM;
    const clamped = clampTimestampToNow(chosenDate, chosenTime);

    const res = db.addExpense({
      member: currentMember,
      amount: parseFloat(amount),
      category: selectedCategory,
      paymentMode: selectedPayment,
      date: clamped.date,
      time: clamped.time,
      itemName: itemName.trim() || undefined,
      quantity: quantity > 0 ? quantity : 1,
      place: place.trim() || undefined,
      receiptUrl: attachedReceipt?.url || undefined
    });

    setIsSaving(false);

    if (res.success) {
      // Confetti burst
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#6366F1', '#10B981', '#F59E0B', '#3B82F6']
      });

      setStatusMessage({
        type: 'success',
        text: `Recorded ₹${parseFloat(amount).toLocaleString('en-IN')} for ${selectedCategory} by ${currentMember}!`
      });

      // Reset fast inputs for next entry
      setAmount('');
      setItemName('');
      setPlace('');
      setQuantity(1);
      setShowDetails(false);
      setAttachedReceipt(null);
      setDuplicateWarning(null);

      // Keep time synced to current local time if not custom
      if (!isCustomTimeSelected) {
        setTime(getCurrentLocalTimeString(new Date()));
      }

      if (onExpenseAdded) {
        onExpenseAdded();
      }

      // Clear toast after 3.5 seconds
      setTimeout(() => {
        setStatusMessage(null);
      }, 3500);
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Failed to record expense.' });
    }
  };

  return (
    <motion.div
      variants={formContainerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-2xl mx-auto space-y-4 sm:space-y-5 pb-28 sm:pb-16"
    >
      
      {/* Top Banner Card: Logged in as [Member] */}
      <motion.div
        variants={formItemVariants}
        className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-[#10162A] dark:via-[#151D35] dark:to-[#10162A] text-white p-4 rounded-3xl shadow-md border border-slate-700/50 dark:border-slate-800 flex flex-col xs:flex-row items-center justify-between text-center xs:text-left gap-3"
      >
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl ${
            activeMemberObj.avatarUrl ? 'bg-slate-800' : activeMemberObj.avatarColor
          } text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0 overflow-hidden`}>
            {activeMemberObj.avatarUrl ? (
              <img
                src={activeMemberObj.avatarUrl}
                alt={activeMemberObj.name}
                className="w-full h-full object-cover rounded-2xl"
              />
            ) : (
              activeMemberObj.avatarLetter
            )}
          </div>
          <div>
            <div className="flex items-center justify-center xs:justify-start gap-1.5">
              <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Active Member</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <h2 className="text-base font-bold text-white leading-tight">
              Logging as {currentMember}
            </h2>
          </div>
        </div>

        {/* Date & Time Display with Change Date button */}
        <div className="text-center xs:text-right">
          <div className="text-xs text-slate-300 dark:text-[#94A3B8] font-medium flex items-center justify-center xs:justify-end gap-1.5">
            <span>{date === getLocalDateString(new Date()) ? 'Today' : formatDateDisplay(date)}</span>
            <span className="text-slate-500">•</span>
            <span>{formatTimeDisplay(time)}</span>
          </div>
          <button
            type="button"
            onClick={() => setIsChangingDate(!isChangingDate)}
            className="text-[11px] text-cyan-400 hover:text-white font-semibold underline underline-offset-2 flex items-center justify-center xs:justify-end gap-1 mt-0.5 mx-auto xs:mr-0 cursor-pointer"
          >
            <Calendar className="w-3 h-3" />
            <span>{isChangingDate ? 'Done' : 'Change Date & Time'}</span>
          </button>
        </div>
      </motion.div>

      {/* Date & Time Picker if "Change Date & Time" is clicked */}
      <AnimatePresence>
        {isChangingDate && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="p-3.5 bg-slate-100 dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col gap-3 overflow-hidden text-left"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Date selection */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Transaction Date:
                </label>
                <input
                  type="date"
                  max={getLocalDateString(new Date())}
                  value={date}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    const todayStr = getLocalDateString(new Date());
                    const clampedDate = newDate > todayStr ? todayStr : newDate;
                    setDate(clampedDate);
                    setIsCustomDateSelected(true);
                    if (clampedDate === todayStr) {
                      const currentHHMM = getCurrentLocalTimeString(new Date());
                      if (time > currentHHMM) {
                        setTime(currentHHMM);
                      }
                    }
                  }}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-semibold px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Time selection */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Transaction Time:
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setTime(getCurrentLocalTimeString(new Date()));
                      setIsCustomTimeSelected(false);
                    }}
                    className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline font-semibold"
                  >
                    Set to Now
                  </button>
                </div>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => {
                    const newTime = e.target.value;
                    const todayStr = getLocalDateString(new Date());
                    const currentHHMM = getCurrentLocalTimeString(new Date());
                    if (date === todayStr && newTime > currentHHMM) {
                      setTime(currentHHMM);
                    } else {
                      setTime(newTime);
                    }
                    setIsCustomTimeSelected(true);
                  }}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-semibold px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setDate(getLocalDateString(now));
                  setTime(getCurrentLocalTimeString(now));
                  setIsCustomDateSelected(false);
                  setIsCustomTimeSelected(false);
                }}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 transition-colors"
              >
                Reset to Current (Today & Now)
              </button>
              <button
                type="button"
                onClick={() => setIsChangingDate(false)}
                className="text-xs font-bold px-4 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800"
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Web Speech API Voice Natural Language Input Card */}
      <motion.div
        variants={formItemVariants}
        className={`p-5 rounded-3xl border transition-all ${
          isListening
            ? 'bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg shadow-indigo-500/10'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={handleToggleVoice}
              aria-label={isListening ? 'Stop listening' : 'Start voice input'}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-md ${
                isListening
                  ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-600/30'
                  : 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white hover:scale-105'
              }`}
            >
              {isListening ? (
                <MicOff className="w-6 h-6 animate-bounce" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </motion.button>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span>Voice Expense Entry</span>
                </h3>
                {isListening && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 px-2 py-0.5 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    Listening...
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isListening
                  ? 'Speak now: Say e.g. "Spent 500 on Food via UPI"'
                  : 'Tap the mic to speak naturally (Web Speech API)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Direct Device Gallery / File Picker Trigger */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => receiptFileInputRef.current?.click()}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
                attachedReceipt
                  ? 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/80 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                  : 'bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/80 dark:hover:bg-cyan-900 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800'
              }`}
              title="Attach Receipt from Photos / Files"
            >
              <Camera className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
              <span>{attachedReceipt ? 'Receipt Attached' : 'Attach Receipt'}</span>
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={handleToggleVoice}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
                isListening
                  ? 'bg-rose-600 text-white hover:bg-rose-700'
                  : 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/80 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-3.5 h-3.5" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Voice</span>
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* Live Audio / Transcript Feedback */}
        <AnimatePresence>
          {speechTranscript && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-3.5 p-3 rounded-2xl bg-indigo-100/60 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-xs">
                  <span className="font-bold text-indigo-900 dark:text-indigo-200 block mb-0.5">
                    Heard: &ldquo;{speechTranscript}&rdquo;
                  </span>
                  {parsedVoicePreview && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
                        Amount: ₹{parsedVoicePreview.amount ?? '—'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
                        Category: {parsedVoicePreview.category ?? '—'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
                        Mode: {parsedVoicePreview.paymentMode ?? '—'}
                      </span>
                      {parsedVoicePreview.itemName && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-indigo-200 dark:border-indigo-700">
                          Item: {parsedVoicePreview.itemName}
                        </span>
                      )}
                      {parsedVoicePreview.place && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-indigo-200 dark:border-indigo-700">
                          Place: {parsedVoicePreview.place}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Speech Error */}
        <AnimatePresence>
          {speechError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{speechError}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Main Fast Expense Form */}
      <form onSubmit={handleSaveExpense} className="space-y-4 sm:space-y-5">
        
        {/* Step 1: Big Touch Friendly Amount Input */}
        <motion.div
          variants={formItemVariants}
          className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              1. Enter Amount
            </label>
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">INR (₹)</span>
          </div>

          <div className="relative flex items-center">
            <span className="absolute left-4 text-3xl sm:text-4xl font-extrabold text-slate-400 dark:text-slate-500 pointer-events-none select-none z-10">
              ₹
            </span>
            <input
              type="number"
              step="any"
              min="0"
              inputMode="decimal"
              autoFocus
              placeholder={amount ? "" : "0"}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none tracking-tight transition-all"
            />
          </div>
        </motion.div>

        {/* Step 2: Category Selector (Grid with Touch Friendly Cards) */}
        <motion.div
          variants={formItemVariants}
          className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              2. Select Category
            </label>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              {selectedCategory}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {CATEGORIES.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.iconName] || Tag;
              const isSelected = selectedCategory === cat.name;

              return (
                <motion.button
                  key={cat.name}
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`relative flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl border text-center transition-all cursor-pointer min-h-[76px] ${
                    isSelected
                      ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 ring-2 ring-indigo-600/30 text-indigo-900 dark:text-indigo-200 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs text-white mb-1"
                    style={{ backgroundColor: cat.color }}
                  >
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
                  </div>
                  <div className="text-[11px] sm:text-xs font-bold leading-tight truncate max-w-full px-0.5">
                    {cat.name}
                  </div>
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Quantity Selection (Default: 1, Fully Editable with Quick Steppers & Presets) */}
        <motion.div
          variants={formItemVariants}
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Layers className="w-3.5 h-3.5" />
              </span>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Quantity
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                (Default: 1)
              </span>
            </div>

            {quantity > 1 && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {quantity} {quantity === 1 ? 'item' : 'items'}
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            {/* Stepper with direct editable number input */}
            <div className="flex items-center gap-2">
              <motion.button
                type="button"
                whileTap={quantity > 1 ? { scale: 0.92 } : undefined}
                onClick={() => setQuantity(Math.max(1, (quantity || 1) - 1))}
                aria-label="Decrease quantity"
                disabled={quantity <= 1}
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base transition-all border ${
                  quantity <= 1
                    ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                    : 'bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 cursor-pointer'
                }`}
              >
                <Minus className="w-4 h-4" />
              </motion.button>

              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setQuantity(isNaN(val) ? 1 : Math.max(1, val));
                  }}
                  className="w-20 text-center font-extrabold text-base py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => setQuantity((quantity || 1) + 1)}
                aria-label="Increase quantity"
                className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Quick Quantity Preset Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[1, 2, 3, 4, 5, 10].map((num) => (
                <motion.button
                  key={num}
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setQuantity(num)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    quantity === num
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  {num === 1 ? '1 (Default)' : `Qty ${num}`}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Step 3: Payment Mode Buttons */}
        <motion.div
          variants={formItemVariants}
          className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              3. Payment Mode (Required)
            </label>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              {selectedPayment}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {PAYMENT_MODES.map((mode) => {
              const Icon = PAYMENT_ICONS[mode.iconName] || CreditCard;
              const isSelected = selectedPayment === mode.name;

              return (
                <motion.button
                  key={mode.name}
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setSelectedPayment(mode.name)}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 p-2.5 rounded-2xl border font-bold text-xs transition-all cursor-pointer text-center ${
                    isSelected
                      ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4 stroke-[2.2] shrink-0" />
                  <span className="truncate">{mode.name}</span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Step 4: Optional "Add details" (Item Name, Quantity, Place) */}
        <motion.div
          variants={formItemVariants}
          className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
        >
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full p-4 flex items-center justify-between text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
                <Tag className="w-3.5 h-3.5" />
              </span>
              <span>Add Optional Details (Item Name, Quantity, Place)</span>
              {itemName && (
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px]">
                  {itemName}
                </span>
              )}
            </div>
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800 space-y-3 overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                  {/* Item Name */}
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                      Item / Description
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Chicken Rice, Petrol, Mint..."
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Place */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                    Place / Location
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. TOLL, MKCE, NKL, Karur, Annachi..."
                      value={place}
                      onChange={(e) => setPlace(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Step 4.5: Bill / Receipt Photo Attachment (Gallery/Files) */}
        <motion.div
          variants={formItemVariants}
          className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
        >
          {/* Hidden File Input configured for Photo Gallery / Image Picker */}
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            ref={receiptFileInputRef}
            onChange={handleReceiptFileChange}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400">
                <Camera className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Bill / Receipt Attachment
              </span>
            </div>
            {attachedReceipt ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                <Check className="w-3 h-3 stroke-[3]" />
                Attached
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-medium">
                Optional
              </span>
            )}
          </div>

          {attachedReceipt ? (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 gap-3">
              <div 
                className="flex items-center gap-3 min-w-0 cursor-pointer group flex-1"
                onClick={() => setIsReceiptPreviewOpen(true)}
                title="Click to zoom receipt"
              >
                <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-slate-300 dark:border-slate-700 shrink-0">
                  <img 
                    src={attachedReceipt.url} 
                    alt="Receipt Thumbnail" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors flex items-center justify-center">
                    <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                  </div>
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {attachedReceipt.fileName}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span>{attachedReceipt.fileSize}</span>
                    <span>•</span>
                    <span className="text-cyan-600 dark:text-cyan-400 font-semibold">Tap to view</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => receiptFileInputRef.current?.click()}
                  className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Change Receipt Photo"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setAttachedReceipt(null)}
                  className="p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                  title="Remove Attached Receipt"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => receiptFileInputRef.current?.click()}
              className="w-full p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/50 hover:bg-indigo-50/30 dark:bg-slate-800/20 dark:hover:bg-indigo-950/20 transition-all flex flex-col items-center justify-center gap-2 text-center cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-950 text-slate-600 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center justify-center transition-colors">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Choose Receipt from Photos / Files
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Tap to select bill photo from your device gallery
                </p>
              </div>
            </button>
          )}
        </motion.div>

        {/* Lightweight Duplicate Warning Banner */}
        <AnimatePresence>
          {duplicateWarning && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>{duplicateWarning}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status Toast / Alert */}
        <AnimatePresence>
          {statusMessage && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
              }`}
            >
              <span>{statusMessage.text}</span>
              {statusMessage.type === 'success' && onNavigateToHistory && (
                <button
                  type="button"
                  onClick={onNavigateToHistory}
                  className="underline text-[11px] font-bold cursor-pointer"
                >
                  View in History
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 5: Save Expense Primary Button */}
        <motion.div variants={formItemVariants}>
          <motion.button
            type="submit"
            disabled={isSaving}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-base shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Zap className="w-5 h-5 fill-white" />
            <span>Save Expense (₹{amount ? parseFloat(amount).toLocaleString('en-IN') : '0'})</span>
          </motion.button>
        </motion.div>

      </form>

      {/* Full-Screen Receipt Preview Lightbox Modal */}
      <AnimatePresence>
        {isReceiptPreviewOpen && attachedReceipt && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsReceiptPreviewOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-lg w-full bg-[#0F172A] text-white rounded-3xl border border-slate-800 p-4 space-y-3 overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 min-w-0">
                  <Camera className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="text-xs font-bold truncate max-w-[260px]">{attachedReceipt.fileName}</span>
                </div>
                <button
                  onClick={() => setIsReceiptPreviewOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-[65vh] overflow-auto rounded-2xl bg-black/60 flex items-center justify-center p-2">
                <img 
                  src={attachedReceipt.url} 
                  alt="Full Attached Receipt" 
                  className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-lg" 
                />
              </div>
              <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
                <span>{attachedReceipt.fileSize}</span>
                <button
                  onClick={() => setIsReceiptPreviewOpen(false)}
                  className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
