import { useState, useEffect, useCallback } from 'react';
import { Member, MemberName } from '../types';
import { MEMBERS } from '../data/categories';
import { 
  getStoredAvatars, 
  MEMBER_AVATAR_CHANGED_EVENT, 
  setMemberAvatar, 
  removeMemberAvatar 
} from '../utils/memberAvatars';

export function useMemberAvatars() {
  const [avatars, setAvatars] = useState<Record<string, string>>(() => getStoredAvatars());

  useEffect(() => {
    const handleAvatarChange = () => {
      setAvatars(getStoredAvatars());
    };

    window.addEventListener(MEMBER_AVATAR_CHANGED_EVENT, handleAvatarChange);
    window.addEventListener('storage', handleAvatarChange);

    return () => {
      window.removeEventListener(MEMBER_AVATAR_CHANGED_EVENT, handleAvatarChange);
      window.removeEventListener('storage', handleAvatarChange);
    };
  }, []);

  const getAvatar = useCallback((name: MemberName): string | undefined => {
    return avatars[name];
  }, [avatars]);

  const getMember = useCallback((name: MemberName): Member => {
    const base = MEMBERS.find(m => m.name === name) || MEMBERS[0];
    return {
      ...base,
      avatarUrl: avatars[name] || undefined
    };
  }, [avatars]);

  const membersWithAvatars: Member[] = MEMBERS.map(m => ({
    ...m,
    avatarUrl: avatars[m.name] || undefined
  }));

  const updateAvatar = useCallback((name: MemberName, avatarUrl?: string) => {
    setMemberAvatar(name, avatarUrl);
    setAvatars(getStoredAvatars());
  }, []);

  const clearAvatar = useCallback((name: MemberName) => {
    removeMemberAvatar(name);
    setAvatars(getStoredAvatars());
  }, []);

  return {
    avatars,
    getAvatar,
    getMember,
    members: membersWithAvatars,
    updateAvatar,
    clearAvatar
  };
}
