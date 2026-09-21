import { MemberName } from '../types';
import { db } from '../services/storage';

export const STORAGE_KEY_MEMBER_AVATARS = 'friends_expense_member_avatars_v1';
export const MEMBER_AVATAR_CHANGED_EVENT = 'friends_expense_avatar_changed';

export interface PresetAvatar {
  id: string;
  label: string;
  category: 'Realistic' | '3D Style' | 'Illustrated';
  url: string;
}

export const PRESET_AVATARS: PresetAvatar[] = [
  // Realistic Portraits
  {
    id: 'preset-real-1',
    label: 'Modern 1',
    category: 'Realistic',
    url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=256&h=256&auto=format&fit=crop&crop=face&q=80'
  },
  {
    id: 'preset-real-2',
    label: 'Modern 2',
    category: 'Realistic',
    url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=256&h=256&auto=format&fit=crop&crop=face&q=80'
  },
  {
    id: 'preset-real-3',
    label: 'Cool Shades',
    category: 'Realistic',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&h=256&auto=format&fit=crop&crop=face&q=80'
  },
  {
    id: 'preset-real-4',
    label: 'Creative',
    category: 'Realistic',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=256&h=256&auto=format&fit=crop&crop=face&q=80'
  },
  {
    id: 'preset-real-5',
    label: 'Professional',
    category: 'Realistic',
    url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=256&h=256&auto=format&fit=crop&crop=face&q=80'
  },
  {
    id: 'preset-real-6',
    label: 'Casual',
    category: 'Realistic',
    url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=256&h=256&auto=format&fit=crop&crop=face&q=80'
  },
  {
    id: 'preset-real-7',
    label: 'Smile',
    category: 'Realistic',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=256&h=256&auto=format&fit=crop&crop=face&q=80'
  },
  {
    id: 'preset-real-8',
    label: 'Explorer',
    category: 'Realistic',
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=256&h=256&auto=format&fit=crop&crop=face&q=80'
  },
  // 3D & Playful Avatars
  {
    id: 'preset-3d-1',
    label: 'Cyber Boy',
    category: '3D Style',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Nimal&backgroundColor=b6e3f4'
  },
  {
    id: 'preset-3d-2',
    label: 'Tech Explorer',
    category: '3D Style',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Dharan&backgroundColor=c0aede'
  },
  {
    id: 'preset-3d-3',
    label: 'Robo Buddy',
    category: '3D Style',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Sanjai&backgroundColor=d1d4f9'
  },
  {
    id: 'preset-3d-4',
    label: 'Neon Spark',
    category: '3D Style',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Etti&backgroundColor=ffd5dc'
  },
  {
    id: 'preset-3d-5',
    label: 'Gamer Pulse',
    category: '3D Style',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Santhosh&backgroundColor=ffdfbf'
  },
  {
    id: 'preset-3d-6',
    label: 'Rocket Pilot',
    category: '3D Style',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Sujhay&backgroundColor=d5f4e6'
  },
  // Illustrated Personas
  {
    id: 'preset-ill-1',
    label: 'Hero Indigo',
    category: 'Illustrated',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Nimal&backgroundColor=b6e3f4'
  },
  {
    id: 'preset-ill-2',
    label: 'Hero Emerald',
    category: 'Illustrated',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Etti&backgroundColor=c0aede'
  },
  {
    id: 'preset-ill-3',
    label: 'Hero Amber',
    category: 'Illustrated',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Dharan&backgroundColor=ffd5dc'
  },
  {
    id: 'preset-ill-4',
    label: 'Hero Blue',
    category: 'Illustrated',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sanjai&backgroundColor=d1d4f9'
  },
  {
    id: 'preset-ill-5',
    label: 'Hero Rose',
    category: 'Illustrated',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Santhosh&backgroundColor=ffdfbf'
  },
  {
    id: 'preset-ill-6',
    label: 'Hero Cyan',
    category: 'Illustrated',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sujhay&backgroundColor=d5f4e6'
  }
];

export function getStoredAvatars(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MEMBER_AVATARS);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (e) {
    console.warn('Failed to parse stored avatars:', e);
    return {};
  }
}

export function getMemberAvatar(name: MemberName): string | undefined {
  const map = getStoredAvatars();
  return map[name] || undefined;
}

export function setMemberAvatar(name: MemberName, avatarUrl?: string): void {
  db.setMemberAvatar(name, avatarUrl);
}

export function removeMemberAvatar(name: MemberName): void {
  db.setMemberAvatar(name, undefined);
}

/**
 * Compresses and center-crops an uploaded image file into a square base64 JPEG data URL.
 * Keeps file payload tiny (~15-30KB) to avoid memory or storage limits.
 */
export function compressAndCropImage(
  file: File,
  targetDimension: number = 256,
  quality: number = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not an image.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to parse image data.'));
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = targetDimension;
          canvas.height = targetDimension;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return reject(new Error('Could not initialize 2D canvas context.'));
          }

          // Calculate center crop (cover)
          const srcW = img.width;
          const srcH = img.height;
          const minDim = Math.min(srcW, srcH);
          const srcX = (srcW - minDim) / 2;
          const srcY = (srcH - minDim) / 2;

          // Fill with clean background if transparency exists
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, targetDimension, targetDimension);

          ctx.drawImage(
            img,
            srcX,
            srcY,
            minDim,
            minDim,
            0,
            0,
            targetDimension,
            targetDimension
          );

          // Export as compressed JPEG
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
