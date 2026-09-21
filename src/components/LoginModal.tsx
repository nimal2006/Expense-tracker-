import React, { useState } from 'react';
import { MemberName, Member } from '../types';
import { useMemberAvatars } from '../hooks/useMemberAvatars';
import { db } from '../services/storage';
import { AppLogo } from './AppLogo';
import { Check, ArrowRight, X, Camera } from 'lucide-react';
import { MemberAvatarModal } from './MemberAvatarModal';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMember: MemberName;
  onSelectMember: (member: MemberName) => void;
  isInitialSetup?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  currentMember,
  onSelectMember,
  isInitialSetup = false
}) => {
  const { members } = useMemberAvatars();
  const [selectedUser, setSelectedUser] = useState<MemberName>(currentMember);
  const [editingAvatarMember, setEditingAvatarMember] = useState<Member | null>(null);

  if (!isOpen) return null;

  const handleUserClick = (name: MemberName) => {
    setSelectedUser(name);
  };

  const handleConfirmLogin = (name?: MemberName) => {
    const userToSet = name || selectedUser;
    onSelectMember(userToSet);
    db.setCurrentUser(userToSet);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 min-h-screen flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto">
        <div className="bg-[#10162A] border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-6 my-auto">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AppLogo size={42} className="rounded-xl shadow-md" alt="Friends Tr$cker" />
              <div>
                <h3 className="text-lg font-bold text-[#F8FAFC]">
                  {isInitialSetup ? 'Who is using this app?' : 'Select Your Profile'}
                </h3>
                <p className="text-xs text-[#94A3B8]">
                  {isInitialSetup ? 'Choose your name to start tracking shared expenses' : 'Tap your name for instant one-tap entry'}
                </p>
              </div>
            </div>
            {!isInitialSetup && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Member Profile Selection Tiles (Balanced Responsive Grid) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {members.map((member) => {
              const isSelected = selectedUser === member.name;
              const isCurrent = member.name === currentMember;
              return (
                <button
                  key={member.id}
                  onClick={() => handleUserClick(member.name)}
                  onDoubleClick={() => handleConfirmLogin(member.name)}
                  className={`flex flex-col items-center justify-between p-3.5 rounded-2xl border text-center transition-all relative cursor-pointer min-h-[116px] ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-950/40 ring-2 ring-indigo-500/30 shadow-md shadow-indigo-500/10'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-800/30 hover:bg-slate-800/50'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] shadow-sm">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                  
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-xl ${
                      member.avatarUrl ? 'bg-slate-800' : member.avatarColor
                    } flex items-center justify-center font-bold text-base shadow-sm shrink-0 mx-auto overflow-hidden`}>
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        member.avatarLetter
                      )}
                    </div>
                    {isCurrent && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingAvatarMember(member);
                        }}
                        title="Change profile photo"
                        className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Camera className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>

                  <div className="w-full mt-2.5">
                    <div className="text-xs sm:text-sm font-bold text-white truncate">
                      {member.name}
                    </div>
                    <div className="mt-1">
                      <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full leading-tight truncate max-w-full ${
                        isCurrent
                          ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {isCurrent ? 'Active Profile' : 'Roommate'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Primary Action Button: "Continue as [User]" */}
          <div className="pt-2">
            <button
              onClick={() => handleConfirmLogin()}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 text-sm transition-all cursor-pointer"
            >
              <span>Continue as {selectedUser}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>

      {/* Profile Photo Update Modal */}
      {editingAvatarMember && (
        <MemberAvatarModal
          isOpen={!!editingAvatarMember}
          onClose={() => setEditingAvatarMember(null)}
          member={editingAvatarMember}
          currentMember={currentMember}
        />
      )}
    </>
  );
};

