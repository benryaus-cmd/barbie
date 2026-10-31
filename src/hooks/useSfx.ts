import { useCallback, useEffect, useRef } from 'react';
import { useAudioContext } from '@aippy/runtime/audio';
import * as Tone from 'tone';

type SfxKind = 'tap' | 'jump' | 'hit' | 'points' | 'pet' | 'fanfare';

export type Sfx = Record<SfxKind, () => void>;

export function useSfx(enabled = true): Sfx {
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const { getAudioContext, unlock } = useAudioContext();
  const ready = useRef(false);
  const chime = useRef<Tone.PolySynth | null>(null);
  const perc = useRef<Tone.MembraneSynth | null>(null);
  const glide = useRef<Tone.Synth | null>(null);

  const init = useCallback(async () => {
    if (ready.current) return true;
    const ctx = getAudioContext();
    if (!ctx) return false;
    await unlock();
    Tone.setContext(ctx);
    await Tone.start();
    if (!chime.current) {
      const synth = new Tone.PolySynth(Tone.Synth);
      synth.set({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.004, decay: 0.16, sustain: 0.05, release: 0.24 },
      });
      synth.volume.value = -11;
      synth.toDestination();
      chime.current = synth;
    }
    if (!perc.current) {
      const drum = new Tone.MembraneSynth({ pitchDecay: 0.02, octaves: 2 });
      drum.volume.value = -13;
      drum.toDestination();
      perc.current = drum;
    }
    if (!glide.current) {
      const sweep = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.04, release: 0.16 },
      });
      sweep.volume.value = -9;
      sweep.toDestination();
      glide.current = sweep;
    }
    ready.current = true;
    return true;
  }, [getAudioContext, unlock]);

  const trigger = useCallback(
    async (kind: SfxKind) => {
      if (!enabledRef.current || !(await init()) || !enabledRef.current) return;
      const bell = chime.current;
      const drum = perc.current;
      const sweep = glide.current;
      if (!bell || !drum || !sweep) return;
      const now = Tone.now();
      if (kind === 'tap') {
        bell.triggerAttackRelease('C6', '32n', now);
      } else if (kind === 'jump') {
        sweep.frequency.setValueAtTime(340, now);
        sweep.frequency.exponentialRampToValueAtTime(880, now + 0.18);
        sweep.triggerAttack(now);
        sweep.triggerRelease(now + 0.2);
      } else if (kind === 'hit') {
        drum.triggerAttackRelease('C3', '32n', now);
        bell.triggerAttackRelease('G5', '32n', now);
      } else if (kind === 'points') {
        ['C5', 'E5', 'G5'].forEach((note, i) => {
          bell.triggerAttackRelease(note, '32n', now + i * 0.07);
        });
      } else if (kind === 'pet') {
        bell.triggerAttackRelease('E5', '16n', now);
        bell.triggerAttackRelease('A5', '16n', now + 0.09);
      } else {
        ['C5', 'E5', 'G5'].forEach((note, i) => {
          bell.triggerAttackRelease(note, '16n', now + i * 0.09);
        });
        bell.triggerAttackRelease(['C6', 'E6'], '8n', now + 0.32);
      }
    },
    [init]
  );

  useEffect(() => () => {
    chime.current?.dispose();
    perc.current?.dispose();
    glide.current?.dispose();
    chime.current = null;
    perc.current = null;
    glide.current = null;
    ready.current = false;
  }, []);

  return {
    tap: () => void trigger('tap'),
    jump: () => void trigger('jump'),
    hit: () => void trigger('hit'),
    points: () => void trigger('points'),
    pet: () => void trigger('pet'),
    fanfare: () => void trigger('fanfare'),
  };
}