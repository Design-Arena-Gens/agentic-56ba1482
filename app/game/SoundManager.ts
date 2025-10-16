export class SoundManager {
  private audioContext: AudioContext | null = null
  private enabled = true

  constructor() {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      this.audioContext = new AudioContext()
    }
  }

  private playTone(frequency: number, duration: number, volume: number = 0.1) {
    if (!this.audioContext || !this.enabled) return

    try {
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)

      oscillator.frequency.value = frequency
      oscillator.type = 'square'

      gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration)

      oscillator.start(this.audioContext.currentTime)
      oscillator.stop(this.audioContext.currentTime + duration)
    } catch (e) {
      // Silently fail if audio context is not available
    }
  }

  playBreak() {
    this.playTone(200, 0.1, 0.05)
    setTimeout(() => this.playTone(150, 0.1, 0.03), 50)
  }

  playPlace() {
    this.playTone(300, 0.08, 0.05)
  }

  playStep() {
    this.playTone(100, 0.05, 0.02)
  }

  playJump() {
    this.playTone(400, 0.1, 0.03)
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }
}
