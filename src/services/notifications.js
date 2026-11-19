/**
 * Real-time Notification & Audio Chime Service
 * Provides audio chime, sound settings persistence, and Web Audio API synthesis.
 */

const SOUND_PREF_KEY = 'ta_portal_notification_sound_enabled';

/**
 * Check if sound is enabled (defaults to true)
 */
export function isSoundEnabled() {
  try {
    const val = localStorage.getItem(SOUND_PREF_KEY);
    return val !== 'false';
  } catch (e) {
    return true;
  }
}

/**
 * Set sound enabled preference
 */
export function setSoundEnabled(enabled) {
  try {
    localStorage.setItem(SOUND_PREF_KEY, enabled ? 'true' : 'false');
  } catch (e) {
    console.warn('Could not save sound preference:', e);
  }
}

/**
 * Play a high-fidelity glass harmonic chime using Web Audio API
 * No external mp3 or network request needed - works 100% offline & instantaneous!
 */
export function playNotificationSound() {
  if (!isSoundEnabled()) return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Tone 1: E5 (659.25 Hz) - bright harmonic chime
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.20, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.38);

    // Tone 2: B5 (987.77 Hz) - elevated melodic finish
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.10);

    gain2.gain.setValueAtTime(0, now + 0.10);
    gain2.gain.linearRampToValueAtTime(0.25, now + 0.13);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.10);
    osc2.stop(now + 0.68);

    // Optional haptic vibration for mobile users
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([60, 40, 80]);
    }
  } catch (err) {
    console.info('Audio chime playback notice:', err);
  }
}

/**
 * Request Desktop Push Notification permission (optional enhancement)
 */
export async function requestDesktopNotificationPermission() {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'default') {
      try {
        return await Notification.requestPermission();
      } catch (e) {
        return 'denied';
      }
    }
    return Notification.permission;
  }
  return 'unsupported';
}

/**
 * Dispatch desktop push notification if allowed
 */
export function showDesktopNotification(title, body) {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
      });
    } catch (e) {
      console.info('Desktop notification error:', e);
    }
  }
}
