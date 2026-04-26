type AudioEffect = 'move' | 'rotate' | 'lock' | 'lineClear' | 'hardDrop' | 'gameOver';

interface ToneStep {
    frequency: number;
    duration: number;
    type?: OscillatorType;
    gain?: number;
}

export class AudioManager {
    private readonly audioContext: AudioContext | null;
    private readonly masterGain: GainNode | null;

    constructor(audioContext?: AudioContext | null) {
        this.audioContext = audioContext ?? null;
        this.masterGain = this.audioContext ? this.audioContext.createGain() : null;

        if (this.audioContext && this.masterGain) {
            this.masterGain.gain.value = 0.18;
            this.masterGain.connect(this.audioContext.destination);
        }
    }

    public async unlock(): Promise<void> {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    public play(effect: AudioEffect): void {
        if (!this.audioContext || !this.masterGain) {
            return;
        }

        const now = this.audioContext.currentTime;
        const pattern = this.getPattern(effect);
        let cursor = now;

        for (const step of pattern) {
            const oscillator = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            oscillator.type = step.type ?? 'square';
            oscillator.frequency.setValueAtTime(step.frequency, cursor);
            gain.gain.setValueAtTime(0.0001, cursor);
            gain.gain.exponentialRampToValueAtTime(step.gain ?? 0.25, cursor + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, cursor + step.duration);
            oscillator.connect(gain);
            gain.connect(this.masterGain);
            oscillator.start(cursor);
            oscillator.stop(cursor + step.duration);
            cursor += step.duration * 0.92;
        }
    }

    private getPattern(effect: AudioEffect): ToneStep[] {
        switch (effect) {
            case 'move':
                return [{ frequency: 320, duration: 0.04, type: 'square', gain: 0.11 }];
            case 'rotate':
                return [
                    { frequency: 480, duration: 0.03, type: 'triangle', gain: 0.12 },
                    { frequency: 720, duration: 0.05, type: 'triangle', gain: 0.1 }
                ];
            case 'lock':
                return [{ frequency: 130, duration: 0.09, type: 'sawtooth', gain: 0.15 }];
            case 'lineClear':
                return [
                    { frequency: 523.25, duration: 0.08, type: 'triangle', gain: 0.13 },
                    { frequency: 659.25, duration: 0.08, type: 'triangle', gain: 0.13 },
                    { frequency: 783.99, duration: 0.1, type: 'triangle', gain: 0.14 }
                ];
            case 'hardDrop':
                return [
                    { frequency: 260, duration: 0.04, type: 'square', gain: 0.12 },
                    { frequency: 140, duration: 0.08, type: 'sawtooth', gain: 0.14 }
                ];
            case 'gameOver':
                return [
                    { frequency: 392, duration: 0.12, type: 'sine', gain: 0.14 },
                    { frequency: 311, duration: 0.14, type: 'sine', gain: 0.13 },
                    { frequency: 196, duration: 0.2, type: 'sine', gain: 0.16 }
                ];
        }
    }
}