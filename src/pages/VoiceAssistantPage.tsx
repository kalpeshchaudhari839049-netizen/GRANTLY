import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Mic, MicOff, Search, Sparkles, Volume2 } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import type { GrantlySettings } from '../types'

interface RecognitionEvent {
  resultIndex: number
  results: ArrayLike<ArrayLike<{ transcript: string }>>
}
interface VoiceRecognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: RecognitionEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}
interface SpeechWindow extends Window {
  SpeechRecognition?: new () => VoiceRecognition
  webkitSpeechRecognition?: new () => VoiceRecognition
}

const languageOptions: { value: GrantlySettings['language']; label: string; hint: string }[] = [
  { value: 'en-US', label: 'English', hint: 'Try “Find scholarships for engineering”' },
  { value: 'hi-IN', label: 'हिन्दी', hint: 'Try “छात्रवृत्ति खोजें”' },
  { value: 'mr-IN', label: 'मराठी', hint: 'Try “शिष्यवृत्ती शोधा”' },
]

interface Props {
  language: GrantlySettings['language']
  onLanguageChange: (language: GrantlySettings['language']) => void
  onNotify: (message: string) => void
}

export default function VoiceAssistantPage({ language, onLanguageChange, onNotify }: Props) {
  const navigate = useNavigate()
  const recognition = useRef<VoiceRecognition | null>(null)
  const latestTranscript = useRef('')
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(true)
  const [transcript, setTranscript] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => () => recognition.current?.stop(), [])

  const processCommand = (rawCommand: string) => {
    const command = rawCommand.trim()
    if (!command) return
    const normalised = command.toLowerCase()
    setTranscript(command)
    if (/(dashboard|डैशबोर्ड|मुख्य पृष्ठ|मुख्यपृष्ठ)/i.test(normalised)) {
      navigate('/dashboard')
      return
    }
    if (/(application|tracker|आवेदन|अर्ज)/i.test(normalised)) {
      navigate('/applications')
      return
    }
    if (/(document|vault|दस्तावेज|कागदपत्र)/i.test(normalised)) {
      navigate('/documents')
      return
    }
    if (/(deadline|reminder|अंतिम तारीख|मुदत)/i.test(normalised)) {
      navigate('/deadlines')
      return
    }
    if (/(eligib|पात्र|योग्य)/i.test(normalised)) {
      navigate('/eligibility')
      return
    }

    const searchTerm = command
      .replace(/^(please\s+)?(find|search|show|explore)\s+(me\s+)?(scholarships?\s+)?(for\s+|about\s+)?/i, '')
      .replace(/^(छात्रवृत्ति|शिष्यवृत्ती)\s*(खोजें|दिखाएँ|शोधा|दाखवा)?\s*/i, '')
      .trim()
    navigate(`/scholarships${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''}`)
  }

  const startListening = () => {
    const speechWindow = window as SpeechWindow
    const SpeechRecognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSupported(false)
      onNotify('Voice recognition is unavailable in this browser. Use the text search below instead.')
      return
    }
    try {
      const instance = new SpeechRecognition()
      instance.lang = language
      instance.continuous = false
      instance.interimResults = true
      instance.onresult = (event) => {
        const words = Array.from({ length: event.results.length }, (_, index) => event.results[index][0]?.transcript ?? '').join(' ')
        latestTranscript.current = words
        setTranscript(words)
        if (event.results.length > 0) setQuery(words)
      }
      instance.onerror = (event) => {
        setListening(false)
        if (event.error !== 'no-speech' && event.error !== 'aborted') onNotify(`Voice input could not start (${event.error}). You can use text search instead.`)
      }
      instance.onend = () => {
        setListening(false)
        if (latestTranscript.current.trim()) processCommand(latestTranscript.current)
      }
      recognition.current = instance
      setListening(true)
      instance.start()
    } catch (error) {
      setListening(false)
      onNotify(error instanceof Error ? `Microphone error: ${error.message}` : 'Microphone access could not be started.')
    }
  }

  const selectedLanguage = languageOptions.find((option) => option.value === language) ?? languageOptions[0]

  return (
    <div className="page-stack">
      <PageHeader eyebrow="GRANTLY VOICE · DEMO" title="Talk your way to opportunity." description="Search and move around your scholarship workspace using voice or text. Voice recognition runs in your browser when supported." />
      <section className="voice-panel glass-panel">
        <div className="voice-panel-glow" />
        <div className="voice-copy">
          <span className="voice-kicker"><Sparkles size={14} /> MULTILINGUAL VOICE SEARCH</span>
          <h2>What would you like<br />to find today?</h2>
          <p>Choose your language, then ask for scholarships or say where you want to go.</p>
          <label className="voice-language">Voice language
            <select value={language} onChange={(event) => onLanguageChange(event.target.value as GrantlySettings['language'])}>
              {languageOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
        <div className="voice-control">
          <motion.button className={`voice-mic${listening ? ' is-listening' : ''}`} onClick={listening ? () => recognition.current?.stop() : startListening} whileHover={{ scale: 1.04 }} whileTap={{ scale: .96 }} aria-label={listening ? 'Stop listening' : 'Start voice search'}>
            {listening ? <MicOff size={28} /> : <Mic size={28} />}
          </motion.button>
          <strong>{listening ? 'Listening…' : supported ? 'Tap to speak' : 'Voice unavailable'}</strong>
          <span>{listening ? 'Speak clearly, then pause to search' : selectedLanguage.hint}</span>
        </div>
      </section>
      <section className="voice-results-grid">
        <div className="panel voice-transcript">
          <div className="panel-heading"><div><h2>Recognized request</h2><p>Your words stay in this browser session.</p></div><Volume2 size={18} /></div>
          <div className="transcript-box" aria-live="polite">{transcript || 'Your voice transcript will appear here.'}</div>
          <form className="voice-text-form" onSubmit={(event) => { event.preventDefault(); latestTranscript.current = query; setTranscript(query); processCommand(query) }}>
            <label className="sr-only" htmlFor="voice-text-search">Search or enter a navigation command</label>
            <input id="voice-text-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search scholarships or try “open my applications”" />
            <button className="button button-primary" type="submit"><Search size={15} /> Go</button>
          </form>
        </div>
        <div className="panel voice-shortcuts">
          <div className="panel-heading"><div><h2>Try a command</h2><p>Voice navigation is available in these demo areas.</p></div></div>
          {[
            ['Find engineering scholarships', '/scholarships?search=engineering'],
            ['Check my eligibility', '/eligibility'],
            ['Open my documents', '/documents'],
            ['Show my deadlines', '/deadlines'],
          ].map(([label, path]) => <button key={label} className="voice-shortcut" onClick={() => navigate(path)}><span>{label}</span><ArrowRight size={15} /></button>)}
          <AnimatePresence>{!supported && <motion.p className="voice-note" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>This browser does not expose speech recognition. Text search remains available.</motion.p>}</AnimatePresence>
        </div>
      </section>
    </div>
  )
}
