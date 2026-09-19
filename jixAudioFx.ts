/**
 * محرك مؤثرات صوتية احترافي لهدايا JIX باستخدام Web Audio API
 * صوت مختلف لكل مستوى ندرة (5 مستويات) بدل صوت واحد لكل هدية
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

  // نغمة بسيطة وسريعة - للهدايا العادية (common)
  playCommonSound() {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';

    osc.frequency.setValueAtTime(700, now);
    osc.frequency.exponentialRampToValueAtTime(1100, now + 0.15);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  // رنّة جرس لطيفة - للهدايا النادرة (rare)
  playRareSound() {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    [880, 1108, 1318].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(0.01, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.22, now + i * 0.08 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.5);
    });
  }

  // وتر صاعد قوي - للهدايا الملحمية (epic)
  playEpicSound() {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';

    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.6);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.2);
  }

  // هدير + صيحة - للهدايا الأسطورية (legendary) - نفس أصوات السوبركار/الخيل/الصقر القديمة
  playLegendarySound(archetype: string) {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    if (archetype === 'car') {
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
    } else if (archetype === 'horse') {
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
    } else {
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
  }

  // فانفار كامل (أوتار متعددة + طبلة) - للهدايا الخرافية (mythic)
  playMythicSound() {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // طبلة افتتاحية
    const kick = ctx.createOscillator();
    const kickGain = ctx.createGain();
    kick.type = 'sine';
    kick.frequency.setValueAtTime(150, now);
    kick.frequency.exponentialRampToValueAtTime(40, now + 0.15);
    kickGain.gain.setValueAtTime(0.4, now);
    kickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    kick.connect(kickGain);
    kickGain.connect(ctx.destination);
    kick.start(now);
    kick.stop(now + 0.2);

    // فانفار أوتار متصاعدة
    [523, 659, 784, 1046].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      const start = now + 0.1 + i * 0.12;
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.01, start);
      gain.gain.linearRampToValueAtTime(0.28, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.9);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.9);
    });
  }

  // يشغّل الصوت المناسب حسب مستوى ندرة الهدية
  playGiftEffect(giftId: string, rarity?: string, archetype?: string) {
    switch (rarity) {
      case 'common':
        this.playCommonSound();
        break;
      case 'rare':
        this.playRareSound();
        break;
      case 'epic':
        this.playEpicSound();
        break;
      case 'legendary':
        this.playLegendarySound(archetype || 'gem');
        break;
      case 'mythic':
        this.playMythicSound();
        break;
      default:
        // توافق مع الاستدعاءات القديمة اللي تمرر giftId بس بدون rarity
        if (giftId.includes('car') || giftId.includes('supercar')) this.playLegendarySound('car');
        else if (giftId.includes('horse')) this.playLegendarySound('horse');
        else if (giftId.includes('falcon')) this.playRareSound();
        else this.playCommonSound();
    }
  }
}

export const jixAudio = new JixAudioEngine();
