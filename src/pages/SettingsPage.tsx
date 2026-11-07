import { BellRing, Check, Moon, Save, Sun } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import type { GrantlySettings } from '../types'

interface Props {
  settings: GrantlySettings
  onSave: (settings: GrantlySettings) => void
  onNotify: (message: string) => void
  onTheme: () => void
  darkMode: boolean
}

export default function SettingsPage({ settings, onSave, onNotify, onTheme, darkMode }: Props) {
  const update = (patch: Partial<GrantlySettings>) => onSave({ ...settings, ...patch })
  const save = () => onNotify('Your preferences are saved in this browser.')
  return (
    <div className="page-stack">
      <PageHeader eyebrow="PREFERENCES" title="Settings" description="Tune your reminder experience, language, and workspace appearance." />
      <section className="panel settings-panel">
        <div className="panel-heading"><div><h2>Workspace preferences</h2><p>Preferences are saved locally for this demo.</p></div></div>
        <div className="settings-row"><span className="settings-icon"><BellRing size={18} /></span><div className="settings-copy"><strong>Deadline reminder window</strong><span>Show opportunities that close within this many days.</span></div><select aria-label="Deadline reminder window" value={settings.reminderDays} onChange={(event) => update({ reminderDays: Number(event.target.value) })}><option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option><option value={60}>60 days</option></select></div>
        <div className="settings-row"><span className="settings-icon"><BellRing size={18} /></span><div className="settings-copy"><strong>Deadline digest</strong><span>Include upcoming deadlines in your notification list.</span></div><button className={`toggle-control${settings.digestEnabled ? ' selected' : ''}`} role="switch" aria-checked={settings.digestEnabled} onClick={() => update({ digestEnabled: !settings.digestEnabled })}><span /></button></div>
        <div className="settings-row"><span className="settings-icon">Aa</span><div className="settings-copy"><strong>Voice assistant language</strong><span>Language used for speech recognition.</span></div><select aria-label="Voice assistant language" value={settings.language} onChange={(event) => update({ language: event.target.value as GrantlySettings['language'] })}><option value="en-US">English</option><option value="hi-IN">हिन्दी</option><option value="mr-IN">मराठी</option></select></div>
        <div className="settings-row"><span className="settings-icon">{darkMode ? <Moon size={18} /> : <Sun size={18} />}</span><div className="settings-copy"><strong>Appearance</strong><span>Switch between the light and dark workspace themes.</span></div><button className="button button-outline" onClick={onTheme}>{darkMode ? <Sun size={15} /> : <Moon size={15} />}{darkMode ? 'Light mode' : 'Dark mode'}</button></div>
        <div className="settings-row"><span className="settings-icon"><Check size={18} /></span><div className="settings-copy"><strong>Reduced motion</strong><span>Limit interface movement for a calmer experience.</span></div><button className={`toggle-control${settings.reducedMotion ? ' selected' : ''}`} role="switch" aria-checked={settings.reducedMotion} onClick={() => update({ reducedMotion: !settings.reducedMotion })}><span /></button></div>
        <div className="profile-form-footer settings-footer"><span>Demo settings do not control system or browser permissions.</span><button className="button button-primary" onClick={save}><Save size={15} /> Save preferences</button></div>
      </section>
    </div>
  )
}
