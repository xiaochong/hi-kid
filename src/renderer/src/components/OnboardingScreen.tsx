import Kitten from '@renderer/components/Kitten'
import styles from './OnboardingScreen.module.css'

interface OnboardingScreenProps {
  onStart: () => void
  aiName?: string
}

export default function OnboardingScreen({
  onStart,
  aiName = 'Kitten'
}: OnboardingScreenProps): React.JSX.Element {
  return (
    <div className={styles.container}>
      <div className={styles.kittenWrapper}>
        <Kitten state="idle" />
      </div>

      <div className={styles.content}>
        <h2 className={styles.title}>Hi, I am {aiName}!</h2>
        <p className={styles.subtitle}>Your English-speaking friend</p>

        <div className={styles.steps}>
          <div className={styles.step}>
            <span className={styles.stepIcon}>1</span>
            <span className={styles.stepText}>
              Press and hold the microphone button to talk to me
            </span>
          </div>
          <div className={styles.step}>
            <span className={styles.stepIcon}>2</span>
            <span className={styles.stepText}>
              Let go when you finish speaking, and I will reply
            </span>
          </div>
          <div className={styles.step}>
            <span className={styles.stepIcon}>3</span>
            <span className={styles.stepText}>
              You can also turn on subtitles to see our conversation
            </span>
          </div>
        </div>

        <button className={styles.startBtn} onClick={onStart} type="button">
          Start Talking
        </button>
      </div>
    </div>
  )
}
