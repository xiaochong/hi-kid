/* =========================================
   HiKid Landing Page i18n
   Language toggle: ZH / EN
   ========================================= */

const translations = {
  zh: {
    // Nav
    nav_features: '功能亮点',
    nav_install: '安装说明',
    nav_config: '配置',
    nav_download: '下载',

    // Hero
    hero_badge: '完全免费 · 开源 · 离线运行',
    hero_title: 'HiKid',
    hero_tagline: '你的 AI 英语小伙伴',
    hero_subtitle: '专为非英语国家儿童设计的桌面应用，让练习英语口语变得像聊天一样轻松有趣。',
    hero_cta: '立即下载',
    hero_github: 'GitHub',

    // Features
    features_title: '为什么选择 HiKid？',
    feature1_title: '开口就能聊',
    feature1_desc: '不需要打字，直接对着麦克风说话，AI 就能听懂并回复你。',
    feature2_title: '隐私安全',
    feature2_desc: '对话、语音和模型全部在本地运行，不上传任何数据到云端。',
    feature3_title: '无需联网',
    feature3_desc: '录音、识别、合成和对话全部通过本地流水线完成，没有网络也能用。',
    feature4_title: '可爱界面',
    feature4_desc: '灵感来自《动物森友会》的卡通风格，孩子们一定会喜欢。',
    feature5_title: '聪明又耐心',
    feature5_desc: '聊什么都行，说得慢或说得简单都没关系，AI 会耐心地陪你练习。',
    feature6_title: '讲故事、玩游戏',
    feature6_desc: '不只是对话练习，还可以听故事、玩单词游戏，让学习不再枯燥。',

    // Install
    install_title: '简单三步，开始对话',
    step1_title: '下载 dmg',
    step1_desc: '从 GitHub Releases 下载最新版本的 HiKid 安装包。',
    step2_title: '拖拽安装',
    step2_desc: '打开 dmg 文件，将 HiKid 图标拖入 Applications 文件夹。',
    step3_title: '一键启动',
    step3_desc: '第一次打开时，HiKid 会自动检测并下载所需依赖，无需手动配置。',
    install_note:
      '首次启动 macOS 可能会阻止未签名应用。如遇提示，在终端运行 xattr -cr /Applications/HiKid.app 即可解决。',

    // Config
    config_title: 'AI 后端配置',
    config_default_title: '默认：Ollama 本地运行',
    config_default_desc:
      'HiKid 默认连接本地 Ollama 服务，使用 qwen3:0.6b 模型。所有对话完全在本地进行，无需 API Key。',
    config_custom_title: '自定义：其他 LLM 后端',
    config_custom_desc: '你也可以在应用设置中配置自己的 LLM 后端，支持任何兼容 OpenAI API 的服务。',
    config_item1: 'API Endpoint 地址',
    config_item2: '模型名称',
    config_item3: 'API Key',

    // Download
    download_title: '准备好开始了吗？',
    download_subtitle: '下载 HiKid，和 AI 一起练习英语吧！',
    download_requirements: 'macOS 12.0+ · Apple Silicon',
    download_btn: '下载 macOS 版',

    // Footer
    footer_made: 'Made with love for kids around the world'
  },

  en: {
    // Nav
    nav_features: 'Features',
    nav_install: 'Install',
    nav_config: 'Config',
    nav_download: 'Download',

    // Hero
    hero_badge: 'Free Forever · Open Source · Offline',
    hero_title: 'HiKid',
    hero_tagline: 'Your AI English Pal',
    hero_subtitle:
      'A desktop app designed for kids in non-English-speaking countries to practice speaking English as easily as having a chat.',
    hero_cta: 'Download Now',
    hero_github: 'GitHub',

    // Features
    features_title: 'Why HiKid?',
    feature1_title: 'Just Start Talking',
    feature1_desc: 'No typing needed — speak into the mic and the AI understands and replies.',
    feature2_title: 'Privacy First',
    feature2_desc:
      'All conversations, voice, and models run locally. Nothing is uploaded to the cloud.',
    feature3_title: 'Works Offline',
    feature3_desc:
      'Recording, recognition, synthesis, and dialogue all run through a local pipeline.',
    feature4_title: 'Cute Interface',
    feature4_desc: 'Animal Crossing-inspired cartoon style that kids will love.',
    feature5_title: 'Smart & Patient',
    feature5_desc:
      'Talk about anything. Speak slowly or simply — the AI patiently practices with you.',
    feature6_title: 'Stories & Games',
    feature6_desc: 'More than conversation practice — listen to stories and play word games.',

    // Install
    install_title: 'Get Started in 3 Steps',
    step1_title: 'Download the dmg',
    step1_desc: 'Grab the latest HiKid installer from GitHub Releases.',
    step2_title: 'Drag to Install',
    step2_desc: 'Open the dmg and drag HiKid into your Applications folder.',
    step3_title: 'Launch & Go',
    step3_desc: 'On first launch HiKid auto-detects and downloads any missing dependencies.',
    install_note:
      'macOS may block unsigned apps on first launch. If prompted, run xattr -cr /Applications/HiKid.app in Terminal.',

    // Config
    config_title: 'AI Backend',
    config_default_title: 'Default: Ollama Local',
    config_default_desc:
      'HiKid connects to a local Ollama service using the qwen3:0.6b model by default. All conversations run entirely offline — no API key needed.',
    config_custom_title: 'Custom: Other LLM Backends',
    config_custom_desc:
      'You can also configure your own LLM backend in the app settings. Any OpenAI-compatible API is supported.',
    config_item1: 'API Endpoint URL',
    config_item2: 'Model Name',
    config_item3: 'API Key',

    // Download
    download_title: 'Ready to Start?',
    download_subtitle: 'Download HiKid and practice English with AI!',
    download_requirements: 'macOS 12.0+ · Apple Silicon',
    download_btn: 'Download for macOS',

    // Footer
    footer_made: 'Made with love for kids around the world'
  }
}

let currentLang = 'zh'

/** @returns {void} */
function setLang(lang) {
  if (!translations[lang]) return
  currentLang = lang

  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n')
    const text = translations[lang][key]
    if (text !== undefined) {
      el.textContent = text
    }
  })

  const currentEl = document.getElementById('langCurrent')
  const nextEl = document.getElementById('langNext')
  if (currentEl && nextEl) {
    currentEl.textContent = lang === 'zh' ? 'ZH' : 'EN'
    nextEl.textContent = lang === 'zh' ? 'EN' : 'ZH'
  }

  try {
    sessionStorage.setItem('hikid-lang', lang)
  } catch {
    /* ignore */
  }
}

/** @returns {void} */
function toggleLang() {
  setLang(currentLang === 'zh' ? 'en' : 'zh')
}

/** @returns {void} */
function initLang() {
  let saved = null
  try {
    saved = sessionStorage.getItem('hikid-lang')
  } catch {
    /* ignore */
  }

  if (saved && translations[saved]) {
    setLang(saved)
    return
  }

  const nav = navigator.language || navigator.userLanguage || ''
  if (nav.startsWith('zh')) {
    setLang('zh')
  } else {
    setLang('en')
  }
}

// Bind toggle button
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('langToggle')
  if (btn) {
    btn.addEventListener('click', toggleLang)
  }
  initLang()
})
