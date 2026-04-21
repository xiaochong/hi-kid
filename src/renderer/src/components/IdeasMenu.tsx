import { useState } from 'react'
import { type GameConfig } from '@renderer/data/games'
import { TRY_SAYING_TOPICS, GAMES } from '@renderer/data/games'
import styles from './IdeasMenu.module.css'

interface IdeasMenuProps {
  onTopicClick: (text: string) => void
  onGameStart: (game: GameConfig) => void
}

export default function IdeasMenu({
  onTopicClick,
  onGameStart
}: IdeasMenuProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'topics' | 'games'>('topics')
  const [confirmingGame, setConfirmingGame] = useState<GameConfig | null>(null)
  const [isStarting, setIsStarting] = useState(false)

  const handleGameClick = (game: GameConfig): void => {
    setConfirmingGame(game)
  }

  const handleStartGame = (): void => {
    if (!confirmingGame || isStarting) return
    setIsStarting(true)
    onGameStart(confirmingGame)
  }

  const handleBack = (): void => {
    setConfirmingGame(null)
    setIsStarting(false)
  }

  return (
    <div className={styles.container}>
      <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${activeTab === 'topics' ? styles.tabActive : ''}`}
          onClick={() => {
            setActiveTab('topics')
            setConfirmingGame(null)
          }}
          type="button"
        >
          Try Saying
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'games' ? styles.tabActiveGames : ''}`}
          onClick={() => {
            setActiveTab('games')
            setConfirmingGame(null)
          }}
          type="button"
        >
          Speaking Games
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'topics' && (
          <div className={styles.topicsPanel}>
            <span className={styles.hint}>Try saying:</span>
            <div className={styles.chips}>
              {TRY_SAYING_TOPICS.map((topic) => (
                <button
                  key={topic.label}
                  className={styles.chip}
                  onClick={() => onTopicClick(topic.text)}
                  type="button"
                >
                  {topic.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'games' && !confirmingGame && (
          <div className={styles.gamesPanel}>
            <span className={styles.hint}>Pick a game:</span>
            <div className={styles.gameList}>
              {GAMES.map((game) => (
                <button
                  key={game.id}
                  className={styles.gameItem}
                  onClick={() => handleGameClick(game)}
                  type="button"
                >
                  <span className={styles.gameName}>
                    <span className={styles.gameIcon} aria-hidden="true">
                      {game.icon}
                    </span>
                    {game.name}
                  </span>
                  <span className={styles.gameDesc}>{game.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'games' && confirmingGame && (
          <div className={styles.confirmCard}>
            <button
              className={styles.backButton}
              onClick={handleBack}
              type="button"
              aria-label="Back to game list"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>
            <h3 className={styles.gameTitle}>
              <span className={styles.gameIconLarge} aria-hidden="true">
                {confirmingGame.icon}
              </span>
              {confirmingGame.name}
            </h3>
            <p className={styles.gameDescription}>{confirmingGame.description}</p>
            <div className={styles.rulesBox}>
              <span className={styles.rulesLabel}>How to play:</span>
              <p className={styles.rulesText}>{confirmingGame.rules}</p>
            </div>
            <div className={styles.confirmActions}>
              <button
                className={styles.startButton}
                onClick={handleStartGame}
                disabled={isStarting}
                type="button"
              >
                {isStarting ? 'Starting...' : 'Start'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
