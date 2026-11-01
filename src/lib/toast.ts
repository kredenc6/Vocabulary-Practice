/** Message body only, including spaces and punctuation; labels/actions don't count. */
export const MAX_TOAST_MESSAGE_LENGTH = 200;

export function toastMessageLength(message: string): number {
  return Array.from(message).length;
}

/** 1–40: 5s, 41–80: 6s, 81–120: 7s, 121–160: 8s, 161–200: 9s. */
export function toastDuration(message: string): number {
  const length = toastMessageLength(message);
  return (5 + Math.min(4, Math.max(0, Math.floor((length - 1) / 40)))) * 1000;
}
