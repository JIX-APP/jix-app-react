/**
 * محرك مؤثرات صوتية احترافي لهدايا JIX الأسطورية باستخدام Web Audio API
 */
class JixAudioEngine {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // صوت سيارة سوبركار (هدير محرك وتسارع)
  playSupercarSound() {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';

    osc.frequency.setValueAtTime(45, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.5);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.8);
    osc.frequency.exponentialRampToValueAtTime(280, now + 1.8);
    osc.frequency.exponentialRampToValueAtTime(380, now + 2.4);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 2.8);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 2.8);
  }

  // صوت خيل (صهيل وخطوات)
  playHorseSound() {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';

    osc.frequency.setValueAtTime(500, now);
    osc.frequency.linearRampToValueAtTime(1100, now + 0.3);
    osc.frequency.linearRampToValueAtTime(750, now + 0.7);
    osc.frequency.linearRampToValueAtTime(950, now + 1.1);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.8);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.8);
  }

  // صوت صقر
  playFalconSound() {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';

    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(2800, now + 0.2);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.9);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.4);
  }

  playGiftEffect(giftId: string) {
    if (giftId.includes('car') || giftId.includes('supercar')) {
      this.playSupercarSound();
    } else if (giftId.includes('horse')) {
      this.playHorseSound();
    } else if (giftId.includes('falcon')) {
      this.playFalconSound();
    }
  }
}

export const jixAudio = new JixAudioEngine();
