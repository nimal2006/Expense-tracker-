import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MemberName, CategoryName, PaymentMode } from '../types';
import { CATEGORIES, PAYMENT_MODES, MEMBERS } from '../data/categories';
import { db } from '../services/storage';
import { parseNaturalLanguageExpense, ParsedSpeechExpense } from '../utils/speechParser';
import { getLocalDateString, formatDateDisplay } from '../utils/analytics';
import confetti from 'canvas-confetti';
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
  HelpCircle,
  Plus,
  Minus,
  Layers
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

  // 2. Date & Time (Automatic local device date detection)
  const [date, setDate] = useState<string>(() => getLocalDateString(new Date()));
  const [isChangingDate, setIsChangingDate] = useState<boolean>(false);
  const [isCustomDateSelected, setIsCustomDateSelected] = useState<boolean>(false);

  // Automatically keep date in sync with local clock (e.g. at midnight or tab switch) if user hasn't chosen custom date
  useEffect(() => {
    const syncTodayDate = () => {
      if (!isCustomDateSelected) {
        const todayStr = getLocalDateString(new Date());
        setDate(todayStr);
      }
    };

    // Check periodically every minute
    const interval = setInterval(syncTodayDate, 60000);
    window.addEventListener('focus', syncTodayDate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', syncTodayDate);
    };
  }, [isCustomDateSelected]);

  // 3. Optional Details
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [itemName, setItemName] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [place, setPlace] = useState<string>('');

  // 4. Status & Duplicate Warning
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // 5. Web Speech API Integration
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechTranscript, setSpeechTranscript] = useState<string>('');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [parsedVoicePreview, setParsedVoicePreview] = useState<ParsedSpeechExpense | null>(null);
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

  // Process text manually from quick sample phrases
  const handleSamplePhrase = (phrase: string) => {
    setSpeechTranscript(phrase);
    setSpeechError(null);
    const parsed = parseNaturalLanguageExpense(phrase);
    setParsedVoicePreview(parsed);
    applyParsedExpense(parsed);
  };

  // Auto-apply when recognition completes with a confident parse
  useEffect(() => {
    if (!isListening && speechTranscript.trim() && parsedVoicePreview) {
      applyParsedExpense(parsedVoicePreview);
    }
  }, [isListening]);

  const activeCategoryMeta = CATEGORIES.find(c => c.name === selectedCategory) || CATEGORIES[0];
  const activeMemberObj = MEMBERS.find(m => m.name === currentMember) || MEMBERS[0];

  // Quick preset amount buttons for fast one-tap selection
  const quickAmounts = [10, 20, 50, 100, 200, 500];

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
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    const res = db.addExpense({
      member: currentMember,
      amount: parseFloat(amount),
      category: selectedCategory,
      paymentMode: selectedPayment,
      date,
      time: timeStr,
      itemName: itemName.trim() || undefined,
      quantity: quantity > 0 ? quantity : 1,
      place: place.trim() || undefined
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
      setDuplicateWarning(null);

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
      className="max-w-2xl mx-auto space-y-4 sm:space-y-5"
    >
      
      {/* Top Banner Card: Logged in as [Member] */}
      <motion.div
        variants={formItemVariants}
        className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-4 rounded-3xl shadow-lg border border-indigo-800/40 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl ${activeMemberObj.avatarColor} flex items-center justify-center font-bold text-lg shadow-md`}>
            {activeMemberObj.avatarLetter}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Active Member</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <h2 className="text-base font-bold text-white leading-tight">
              Logging as {currentMember}
            </h2>
          </div>
        </div>

        {/* Date Display with Change Date button */}
        <div className="text-right">
          <div className="text-xs text-slate-300 font-medium">
            {formatDateDisplay(date)}
          </div>
          <button
            type="button"
            onClick={() => setIsChangingDate(!isChangingDate)}
            className="text-[11px] text-indigo-300 hover:text-white font-semibold underline underline-offset-2 flex items-center gap-1 mt-0.5 ml-auto cursor-pointer"
          >
            <Calendar className="w-3 h-3" />
            <span>{isChangingDate ? 'Done' : 'Change Date'}</span>
          </button>
        </div>
      </motion.div>

      {/* Date Picker if "Change Date" is clicked */}
      <AnimatePresence>
        {isChangingDate && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2.5 overflow-hidden"
          >
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Transaction Date:
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setIsCustomDateSelected(true);
                }}
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-semibold px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const today = getLocalDateString(new Date());
                  setDate(today);
                  setIsCustomDateSelected(false);
                }}
                className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 transition-colors"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setIsChangingDate(false)}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800"
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

          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={handleToggleVoice}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
              isListening
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/80 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-3.5 h-3.5" />
                <span>Stop Listening</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>Tap to Speak</span>
              </>
            )}
          </motion.button>
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

        {/* Quick Sample Voice Prompts */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <HelpCircle className="w-3 h-3" />
              Try speaking or tap a sample phrase:
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              'Spent 500 on Food via UPI',
              'Paid 120 for Tea by Cash at Toll',
              'Coolip 25 via UPI',
              'Petrol 100 via UPI in Karur',
              'Chicken Biryani 240 on Food via UPI'
            ].map((phrase) => (
              <motion.button
                key={phrase}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSamplePhrase(phrase)}
                className="text-[11px] px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800/60 dark:hover:bg-indigo-950/60 text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 border border-slate-200/80 dark:border-slate-700/60 transition-colors cursor-pointer"
              >
                &ldquo;{phrase}&rdquo;
              </motion.button>
            ))}
          </div>
        </div>
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
            <span className="absolute left-4 text-3xl sm:text-4xl font-extrabold text-slate-400 dark:text-slate-500">
              ₹
            </span>
            <input
              type="number"
              step="any"
              min="0"
              inputMode="decimal"
              autoFocus
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none tracking-tight transition-all"
            />
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            {quickAmounts.map((preset) => (
              <motion.button
                key={preset}
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => setAmount(preset.toString())}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 transition-colors cursor-pointer"
              >
                +₹{preset}
              </motion.button>
            ))}
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

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {CATEGORIES.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.iconName] || Tag;
              const isSelected = selectedCategory === cat.name;

              return (
                <motion.button
                  key={cat.name}
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 ring-2 ring-indigo-600/30 text-indigo-900 dark:text-indigo-200 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm text-white"
                    style={{ backgroundColor: cat.color }}
                  >
                    <Icon className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate">{cat.name}</div>
                  </div>
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Item suggestions for selected category */}
          {activeCategoryMeta.commonItems.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                Quick items for {selectedCategory}:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {activeCategoryMeta.commonItems.map((item) => (
                  <motion.button
                    key={item}
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                      setItemName(item);
                      setShowDetails(true);
                    }}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      itemName === item
                        ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {item}
                  </motion.button>
                ))}
              </div>
            </div>
          )}
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {PAYMENT_MODES.map((mode) => {
              const Icon = PAYMENT_ICONS[mode.iconName] || CreditCard;
              const isSelected = selectedPayment === mode.name;

              return (
                <motion.button
                  key={mode.name}
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setSelectedPayment(mode.name)}
                  className={`flex items-center justify-center gap-2 p-3 rounded-2xl border font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                    isSelected
                      ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4 stroke-[2.2]" />
                  <span>{mode.name}</span>
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
    </motion.div>
  );
};
