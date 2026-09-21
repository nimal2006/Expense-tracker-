import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Upload, CheckCircle2, AlertCircle, X, Sparkles, Filter, RefreshCw } from 'lucide-react';
import { Expense, MemberName } from '../types';
import { extractTextFromPdf, parseExpensesFromText } from '../utils/pdfParser';
import { db, generateExpenseSignature } from '../services/storage';

interface PdfImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMember: MemberName;
  onExpensesMerged: () => void;
}

const PdfImporterContent: React.FC<Omit<PdfImporterModalProps, 'isOpen'>> = ({
  onClose,
  currentMember,
  onExpensesMerged
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [extractedExpenses, setExtractedExpenses] = useState<Expense[]>([]);
  const [duplicateCount, setDuplicateCount] = useState<number>(0);
  const [targetMember, setTargetMember] = useState<MemberName>(currentMember);
  const [pastedText, setPastedText] = useState<string>('');
  const [mode, setMode] = useState<'file' | 'text'>('file');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const processText = (text: string) => {
    const parsed = parseExpensesFromText(text, targetMember);
    const existingSigs = new Set(db.getAllExpenses().map(generateExpenseSignature));
    
    let dups = 0;
    const uniques = parsed.filter(item => {
      const sig = generateExpenseSignature(item);
      if (existingSigs.has(sig)) {
        dups++;
        return false;
      }
      return true;
    });

    setExtractedExpenses(uniques);
    setDuplicateCount(dups);
    if (uniques.length === 0 && dups === 0) {
      setStatusMessage('No valid expense rows detected in the provided input.');
    } else {
      setStatusMessage(`Found ${uniques.length + dups} transaction(s): ${uniques.length} new unique entry(ies), ${dups} duplicate(s) filtered out.`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setIsLoading(true);
    setStatusMessage('Parsing PDF statement...');

    try {
      if (uploadedFile.type === 'application/pdf' || uploadedFile.name.endsWith('.pdf')) {
        const text = await extractTextFromPdf(uploadedFile);
        processText(text);
      } else {
        const text = await uploadedFile.text();
        processText(text);
      }
    } catch (err) {
      console.error('Failed to parse PDF file:', err);
      setStatusMessage('Failed to extract PDF text. Try pasting statement text directly.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextSubmit = () => {
    if (!pastedText.trim()) return;
    setIsLoading(true);
    try {
      processText(pastedText);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmMerge = () => {
    if (extractedExpenses.length === 0) return;

    const res = db.addExpensesBatch(extractedExpenses);
    onExpensesMerged();
    setStatusMessage(`Successfully merged ${res.addedCount} new transaction(s) into database!`);
    setTimeout(() => {
      onClose();
      setExtractedExpenses([]);
      setFile(null);
      setPastedText('');
      setStatusMessage(null);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-[#10162A] w-full max-w-2xl rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#151D35]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-950/60 text-cyan-300 border border-cyan-800/50 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F8FAFC]">Import & Merge Statement</h3>
              <p className="text-xs text-[#94A3B8]">
                Parse PDF/Text statements & merge with August 2026 dataset
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          
          {/* Target Member Selector */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Default Member for Statement:</span>
            <select
              value={targetMember}
              onChange={(e) => setTargetMember(e.target.value as MemberName)}
              className="text-xs font-bold py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Etti">Etti</option>
              <option value="Nimal">Nimal</option>
              <option value="Dharan">Dharan</option>
              <option value="Sanjai">Sanjai</option>
              <option value="Santhosh">Santhosh</option>
              <option value="Sujhay">Sujhay</option>
            </select>
          </div>

          {/* Mode Switcher */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode('file')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                mode === 'file'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              Upload PDF File
            </button>
            <button
              onClick={() => setMode('text')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                mode === 'text'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              Paste Statement Text
            </button>
          </div>

          {mode === 'file' ? (
            <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-3xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/20">
              <Upload className="w-8 h-8 text-indigo-500 mb-2" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {file ? file.name : 'Click or drop PDF bank statement here'}
              </span>
              <span className="text-[11px] text-slate-400 mt-1">
                Supports .pdf statements, GPay logs, or bank export files
              </span>
              <input
                type="file"
                accept=".pdf,.txt,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          ) : (
            <div className="space-y-2">
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste transaction lines from bank statement or PDF here..."
                rows={5}
                className="w-full p-3 text-xs rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleTextSubmit}
                disabled={!pastedText.trim() || isLoading}
                className="w-full py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Parse Statement Text</span>
              </button>
            </div>
          )}

          {/* Status Message */}
          {statusMessage && (
            <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Preview Extracted Expenses */}
          {extractedExpenses.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Extracted Unique Transactions ({extractedExpenses.length})</span>
                {duplicateCount > 0 && (
                  <span className="text-amber-600 dark:text-amber-400 text-[11px] font-medium">
                    {duplicateCount} duplicate(s) skipped
                  </span>
                )}
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {extractedExpenses.map((exp, idx) => (
                  <div
                    key={`import-tx-${exp.date}-${exp.itemName || exp.category}-${idx}`}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {exp.itemName || exp.category}
                      </span>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2">
                        <span>{exp.date}</span>
                        <span>•</span>
                        <span>{exp.category}</span>
                        <span>•</span>
                        <span>{exp.paymentMode}</span>
                      </div>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      ₹{exp.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmMerge}
            disabled={extractedExpenses.length === 0 || isLoading}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Confirm & Merge {extractedExpenses.length} Entries</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export const PdfImporterModal: React.FC<PdfImporterModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <PdfImporterContent {...props} />;
};

