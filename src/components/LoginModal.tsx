import React, { useState } from 'react';
import { MemberName } from '../types';
import { MEMBERS } from '../data/categories';
import { db } from '../services/storage';
import { UserCheck, KeyRound, Shield, Check, ArrowRight, X } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMember: MemberName;
  onSelectMember: (member: MemberName) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  currentMember,
  onSelectMember
}) => {
  const [selectedUser, setSelectedUser] = useState<MemberName>(currentMember);
  const [pinInput, setPinInput] = useState('');
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [pinError, setPinError] = useState('');

  if (!isOpen) return null;

  const handleUserClick = (name: MemberName) => {
    setSelectedUser(name);
    setPinError('');
    setPinInput('');
  };

  const handleConfirmLogin = () => {
    const savedPin = db.getUserPin(selectedUser);
    if (savedPin && savedPin !== pinInput) {
      setPinError('Incorrect 4-digit PIN. Please try again or reset.');
      return;
    }

    onSelectMember(selectedUser);
    db.setCurrentUser(selectedUser);
    onClose();
  };

  const handleSavePin = () => {
    if (newPin.length !== 4 || isNaN(Number(newPin))) {
      setPinError('Please enter a 4-digit numeric PIN.');
      return;
    }
    db.setUserPin(selectedUser, newPin);
    setShowPinSetup(false);
    setNewPin('');
    setPinError('');
    onSelectMember(selectedUser);
    db.setCurrentUser(selectedUser);
    onClose();
  };

  const savedPin = db.getUserPin(selectedUser);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Select Your Profile</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tap your name for instant one-tap entry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Friends Tap Grid */}
        <div className="grid grid-cols-2 gap-3">
          {MEMBERS.map((member) => {
            const isSelected = selectedUser === member.name;
            return (
              <button
                key={member.id}
                onClick={() => handleUserClick(member.name)}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all relative ${
                  isSelected
                    ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-600/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl ${member.avatarColor} flex items-center justify-center font-bold text-base shadow-sm shrink-0`}>
                  {member.avatarLetter}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {member.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {member.name === currentMember ? 'Current Active' : 'Friend'}
                  </div>
                </div>
                {isSelected && (
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* PIN verification if user set one */}
        {savedPin && !showPinSetup && (
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-500" /> Enter 4-Digit PIN for {selectedUser}
              </span>
              <button
                onClick={() => {
                  db.setUserPin(selectedUser, '');
                  setPinInput('');
                  setPinError('');
                }}
                className="text-slate-400 hover:text-rose-500 text-[11px]"
              >
                Remove PIN
              </button>
            </div>
            <input
              type="password"
              maxLength={4}
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value.replace(/\D/g, ''));
                setPinError('');
              }}
              placeholder="••••"
              className="w-full text-center tracking-[0.6em] text-2xl font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        )}

        {/* Optional PIN Setup View */}
        {showPinSetup ? (
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-500" /> Set 4-Digit PIN for {selectedUser}
              </span>
              <button
                onClick={() => setShowPinSetup(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[11px]"
              >
                Cancel
              </button>
            </div>
            <input
              type="password"
              maxLength={4}
              value={newPin}
              onChange={(e) => {
                setNewPin(e.target.value.replace(/\D/g, ''));
                setPinError('');
              }}
              placeholder="Set 4 Digits"
              className="w-full text-center tracking-[0.4em] text-xl font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button
              onClick={handleSavePin}
              className="w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors"
            >
              Save PIN & Continue
            </button>
          </div>
        ) : (
          !savedPin && (
            <div className="flex justify-center">
              <button
                onClick={() => setShowPinSetup(true)}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Optionally protect {selectedUser}'s profile with a PIN</span>
              </button>
            </div>
          )
        )}

        {pinError && (
          <div className="text-xs text-rose-500 text-center font-medium bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60">
            {pinError}
          </div>
        )}

        {/* Primary Action Button: "Continue as [User]" */}
        <button
          onClick={handleConfirmLogin}
          className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 text-sm transition-all"
        >
          <span>Continue as {selectedUser}</span>
          <ArrowRight className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
};
