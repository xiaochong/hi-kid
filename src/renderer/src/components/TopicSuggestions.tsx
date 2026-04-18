import styles from './TopicSuggestions.module.css'

interface TopicSuggestionsProps {
  onTopicClick: (topic: string) => void
}

const TOPICS = [
  'Tell me a joke',
  'What do you like?',
  'Let\'s talk about animals',
  'Do you like games?',
  'What\'s your favorite food?'
]

export default function TopicSuggestions({ onTopicClick }: TopicSuggestionsProps): React.JSX.Element {
  return (
    <div className={styles.container}>
      <span className={styles.hint}>Try saying:</span>
      <div className={styles.chips}>
        {TOPICS.map((topic) => (
          <button
            key={topic}
            className={styles.chip}
            onClick={() => onTopicClick(topic)}
            type="button"
          >
            {topic}
          </button>
        ))}
      </div>
    </div>
  )
}
