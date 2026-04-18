import { type KittenState } from '@renderer/types/conversation'
import styles from './Kitten.module.css'

interface KittenProps {
  state: KittenState
}

export default function Kitten({ state }: KittenProps): React.JSX.Element {
  const stateClass = styles[`state-${state}`] ?? ''

  return (
    <svg
      className={`${styles.kitten} ${stateClass}`}
      width="200"
      height="200"
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="EchoKid kitten"
    >
      {/* Tail */}
      <g className={styles['kitten-tail']}>
        <path
          d="M 155 140 Q 175 120 170 100 Q 165 80 150 95"
          fill="none"
          stroke="#F4C295"
          strokeWidth="10"
          strokeLinecap="round"
        />
      </g>

      {/* Body */}
      <g className={styles['kitten-body']}>
        <ellipse cx="100" cy="155" rx="55" ry="40" fill="#FFE4C4" />
        <ellipse cx="100" cy="155" rx="35" ry="25" fill="#FFF0D9" />
      </g>

      {/* Ears */}
      <g className={styles['kitten-ears']}>
        <g className={styles['ear-left']}>
          <path d="M 55 75 L 45 35 L 85 55 Z" fill="#FFE4C4" />
          <path d="M 58 68 L 52 42 L 78 56 Z" fill="#FFB7C5" />
        </g>
        <g className={styles['ear-right']}>
          <path d="M 145 75 L 155 35 L 115 55 Z" fill="#FFE4C4" />
          <path d="M 142 68 L 148 42 L 122 56 Z" fill="#FFB7C5" />
        </g>
      </g>

      {/* Head */}
      <g className={styles['kitten-head']}>
        <circle cx="100" cy="90" r="50" fill="#FFE4C4" />
      </g>

      {/* Blush */}
      <g className={styles['kitten-blush']}>
        <ellipse cx="65" cy="105" rx="8" ry="5" fill="#FFB7C5" opacity="0.5" />
        <ellipse cx="135" cy="105" rx="8" ry="5" fill="#FFB7C5" opacity="0.5" />
      </g>

      {/* Eyes */}
      <g className={styles['kitten-eyes']}>
        {/* Left eye */}
        <ellipse cx="75" cy="85" rx="12" ry="14" fill="#FFFFFF" />
        <ellipse className={styles.pupil} cx="75" cy="85" rx="7" ry="9" fill="#4A3728" />
        <circle cx="78" cy="81" r="3" fill="#FFFFFF" />
        {/* Right eye */}
        <ellipse cx="125" cy="85" rx="12" ry="14" fill="#FFFFFF" />
        <ellipse className={styles.pupil} cx="125" cy="85" rx="7" ry="9" fill="#4A3728" />
        <circle cx="128" cy="81" r="3" fill="#FFFFFF" />
      </g>

      {/* Nose */}
      <g className={styles['kitten-nose']}>
        <ellipse cx="100" cy="102" rx="5" ry="4" fill="#FFB7C5" />
      </g>

      {/* Mouth */}
      <g className={styles['kitten-mouth']}>
        <path
          d="M 92 108 Q 100 115 108 108"
          fill="none"
          stroke="#4A3728"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>

      {/* Whiskers */}
      <g className={styles['kitten-whiskers']}>
        <line
          x1="45"
          y1="95"
          x2="70"
          y2="100"
          stroke="#C4A882"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="42"
          y1="105"
          x2="68"
          y2="105"
          stroke="#C4A882"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="45"
          y1="115"
          x2="70"
          y2="110"
          stroke="#C4A882"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="155"
          y1="95"
          x2="130"
          y2="100"
          stroke="#C4A882"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="158"
          y1="105"
          x2="132"
          y2="105"
          stroke="#C4A882"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="155"
          y1="115"
          x2="130"
          y2="110"
          stroke="#C4A882"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>

      {/* Paws */}
      <g className={styles['kitten-paws']}>
        <ellipse cx="70" cy="185" rx="12" ry="8" fill="#FFE4C4" />
        <ellipse cx="70" cy="187" rx="7" ry="5" fill="#FFB7C5" />
        <ellipse cx="130" cy="185" rx="12" ry="8" fill="#FFE4C4" />
        <ellipse cx="130" cy="187" rx="7" ry="5" fill="#FFB7C5" />
      </g>
    </svg>
  )
}
