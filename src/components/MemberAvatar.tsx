import React from 'react';
import { Member } from '../types';

interface MemberAvatarProps {
  member: Pick<Member, 'name' | 'avatarColor' | 'avatarLetter' | 'avatarUrl'>;
  className?: string;
  sizeClassName?: string;
  altText?: string;
}

export const MemberAvatar: React.FC<MemberAvatarProps> = ({
  member,
  className = '',
  sizeClassName = 'w-10 h-10 text-sm',
  altText
}) => {
  return (
    <div
      className={`shrink-0 rounded-full flex items-center justify-center font-bold overflow-hidden select-none shadow-xs ${sizeClassName} ${
        member.avatarUrl ? 'bg-slate-100 dark:bg-slate-800' : member.avatarColor
      } ${className}`}
      title={`Member: ${member.name}`}
    >
      {member.avatarUrl ? (
        <img
          src={member.avatarUrl}
          alt={altText || member.name}
          className="w-full h-full object-cover rounded-full"
          loading="lazy"
        />
      ) : (
        <span>{member.avatarLetter}</span>
      )}
    </div>
  );
};
