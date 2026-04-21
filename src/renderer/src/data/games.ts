export interface GameConfig {
  id: string
  name: string
  icon: string
  description: string
  rules: string
}

export const TRY_SAYING_TOPICS = [
  { label: 'Tell me a joke', text: 'Tell me a joke' },
  { label: 'What do you like?', text: 'What do you like?' },
  { label: "Let's talk about animals", text: "Let's talk about animals" },
  { label: 'Do you like games?', text: 'Do you like games?' },
  { label: "What's your favorite food?", text: "What's your favorite food?" }
]

export const GAMES: GameConfig[] = [
  {
    id: 'animal-chain',
    name: 'Animal Name Chain',
    icon: '🦁',
    description: 'Take turns saying animal names. Repeat or get stuck and you lose!',
    rules: `Let's play Animal Name Chain! We take turns saying the name of an animal in English. You cannot repeat an animal that has already been said. If you cannot think of a new animal, you lose!

Please use simple, colloquial, child-friendly English. Speak as if talking to a young child learning English. Keep sentences short and encouraging.

You go first. Start by saying "Let's play! I'm thinking of..." and name an animal.`
  },
  {
    id: 'word-chain',
    name: 'Word Chain',
    icon: '🔗',
    description:
      'Build a chain of English words where each new word starts with the last letter of the previous word.',
    rules: `Let's play Word Chain! We take turns saying English words. Each new word must start with the last letter of the previous word. You cannot repeat words. Only real English words count!

Please use simple, colloquial, child-friendly English. Speak as if talking to a young child learning English. Keep sentences short and encouraging.

You go first. Start by saying a simple English word like "cat". Then wait for my word.`
  },
  {
    id: 'sentence-builder',
    name: 'Sentence Builder',
    icon: '🧱',
    description: 'Take turns adding 1-3 words to build a fun story together.',
    rules: `Let's play Sentence Builder! We take turns adding 1 to 3 words to build a sentence or story together. We keep adding words to make the story longer and funnier. If someone adds words that make the grammar really wrong, they lose!

Please use simple, colloquial, child-friendly English. Speak as if talking to a young child learning English. Keep sentences short and encouraging.

You go first. Start the story with 1-3 words like "Once upon a..." and then wait for me to add more words.`
  },
  {
    id: 'fill-blank',
    name: 'Fill in the Blank',
    icon: '✏️',
    description:
      'I give you an English sentence with a blank and three choices. Pick the right one!',
    rules: `Let's play Fill in the Blank! I will give you an English sentence with one blank space (___). I will also give you 3 word choices. You pick the word that fits best in the blank. Then I will tell you if you are right and give you the next question.

Please use simple, colloquial, child-friendly English. Speak as if talking to a young child learning English. Keep sentences short and encouraging.

You go first. Give me a sentence with a blank and 3 choices. For example: "The cat is ___ . A) running B) apple C) blue". Then wait for my answer.`
  },
  {
    id: 'simple-math',
    name: 'Simple Math',
    icon: '🔢',
    description:
      'Answer simple math questions in English. Addition, subtraction, multiplication, and division!',
    rules: `Let's play Simple Math! I will ask you simple math questions like "What is 5 plus 3?" You answer in English. The answer should be a positive number that is 100 or less. I will tell you if you are right and give you the next question.

Please use simple, colloquial, child-friendly English. Speak as if talking to a young child learning English. Keep sentences short and encouraging.

You go first. Ask me a simple math question like "What is 7 plus 2?" Then wait for my answer in English.`
  },
  {
    id: 'number-bomb',
    name: 'Number Bomb',
    icon: '💣',
    description:
      'Guess a secret number between 1 and 100. Too high or too low? Avoid the bomb number!',
    rules: `Let's play Number Bomb! I am thinking of a secret number between 1 and 100. We take turns guessing a number. After each guess, I will say "higher" or "lower" to help you get closer. The person who guesses the exact secret number loses — that's the bomb!

Please use simple, colloquial, child-friendly English. Speak as if talking to a young child learning English. Keep sentences short and encouraging.

You go first. Make your first guess by saying a number between 1 and 100.`
  },
  {
    id: 'simon-says',
    name: 'Simon Says',
    icon: '👂',
    description: 'I give action commands. Only follow if I say "Simon says..."!',
    rules: `Let's play Simon Says! I will give you action commands in English, like "Simon says touch your nose" or just "Jump up!" You should ONLY do the action if I say "Simon says" before it. If I don't say "Simon says" and you do the action, you lose a point!

Please use simple, colloquial, child-friendly English. Speak as if talking to a young child learning English. Keep sentences short and encouraging.

You go first. Give me an action command. Sometimes say "Simon says..." before it, and sometimes don't. Then wait for me to tell you if I followed correctly.`
  },
  {
    id: 'riddles',
    name: 'Riddles',
    icon: '❓',
    description: 'I give you English riddles. Can you guess the answer?',
    rules: `Let's play Riddles! I will give you riddles in English and you try to guess the answer. I will tell you if you are right or give you a small hint if you need help. We can take turns — sometimes you guess my riddle, sometimes I guess yours!

Please use simple, colloquial, child-friendly English. Speak as if talking to a young child learning English. Keep sentences short and encouraging.

You go first. Ask me an easy English riddle like "What has keys but can't open locks?" Then wait for my answer.`
  },
  {
    id: 'describe-guess',
    name: 'Describe & Guess',
    icon: '🔍',
    description: 'I describe something in 3-5 English sentences. Can you guess what it is?',
    rules: `Let's play Describe & Guess! I will describe a common thing or animal using 3 to 5 short sentences in English. You try to guess what it is. I will tell you if you are right! We take turns — sometimes I describe and you guess, sometimes you describe and I guess.

Please use simple, colloquial, child-friendly English. Speak as if talking to a young child learning English. Keep sentences short and encouraging.

You go first. Describe something easy in 3-5 English sentences. For example, describe a cat, a car, or the sun. Then wait for me to guess.`
  },
  {
    id: 'quick-quiz',
    name: 'Quick Q&A',
    icon: '⚡',
    description: 'Answer 5 quick English knowledge questions as fast as you can!',
    rules: `Let's play Quick Q&A! I will ask you 5 quick questions in English about things you know, like "What color is the sky?" or "How many legs does a dog have?" You answer as best you can. After 5 questions, we see how many you got right!

Please use simple, colloquial, child-friendly English. Speak as if talking to a young child learning English. Keep sentences short and encouraging.

You go first. Ask me the first question in English. Something easy and fun! Then wait for my answer.`
  },
  {
    id: 'word-battle',
    name: 'Word Category Battle',
    icon: '🏆',
    description: 'Name as many words in a category as you can. How many can you get?',
    rules: `Let's play Word Category Battle! I will say an English category like "fruits" or "colors" or "animals". Then we take turns saying words in that category in English. We keep going until someone cannot think of a new word. The person who says the most words wins!

Please use simple, colloquial, child-friendly English. Speak as if talking to a young child learning English. Keep sentences short and encouraging.

You go first. Pick a fun category and say it, like "Let's do animals!" Then say your first animal word and wait for me to say one back.`
  }
]
