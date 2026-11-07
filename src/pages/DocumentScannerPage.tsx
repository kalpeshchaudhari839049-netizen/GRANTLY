import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Check, FileImage, FileText, ScanLine, ShieldAlert, Sparkles, Upload } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import type { ExtractedDocumentData } from '../services/documentScanner'

const maxBytes = 10 * 1024 * 1024
const supportedTypes = ['application/pdf', 'image/jpeg', 'image/png']

interface Props {
  onSaveDocument: (file: File, type: string) => string
  onNotify: (message: string) => void
}

export default function DocumentScannerPage({ onSaveDocument, onNotify }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ExtractedDocumentData | null>(null)
  const [progress, setProgress] = useState(0)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const selectFile = (selected?: File) => {
    if (!selected) return
    setResult(null)
    setError('')
    setSaved(false)
    if (!supportedTypes.includes(selected.type)) {
      setFile(null)
      setError('Choose a PDF, JPG, or PNG file.')
      return
    }
    if (selected.size > maxBytes) {
      setFile(null)
      setError('This file is larger than 10 MB. Choose a smaller file.')
      return
    }
    setFile(selected)
  }

  const scan = async () => {
    if (!file) return
    setScanning(true)
    setError('')
    setProgress(0)
    try {
      const { scanScholarshipDocument } = await import('../services/documentScanner')
      setResult(await scanScholarshipDocument(file, setProgress))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The document could not be scanned. Please try again.')
    } finally {
      setScanning(false)
    }
  }

  const save = () => {
    if (!file || !result) return
    onSaveDocument(file, result.suggestedType)
    setSaved(true)
    onNotify('Document saved to your session-only vault. Extracted personal information was not stored.')
  }

  const updateField = (field: string, value: string) => {
    setResult((current) => current ? { ...current, fields: { ...current.fields, [field]: value } } : current)
  }

  return (
    <div className="page-stack">
      <PageHeader eyebrow="PRIVATE, BROWSER-BASED OCR" title="Document AI scanner" description="Extract editable text from a document and organize it for your checklist. Processing happens in your browser; no official verification is performed." />
      <div className="scanner-layout">
        <section className="panel scanner-upload-panel">
          <div className="panel-heading"><div><h2>Choose a document</h2><p>PDF, JPG, or PNG · up to 10 MB</p></div><span className="scanner-icon"><ScanLine size={20} /></span></div>
          <label className="scanner-dropzone">
            <input className="sr-only" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event) => { selectFile(event.target.files?.[0]); event.currentTarget.value = '' }} />
            <span className="scanner-upload-icon"><Upload size={23} /></span>
            <strong>{file?.name ?? 'Select a file to scan'}</strong>
            <span>{file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB · Ready to process` : 'Your file remains on this device during this session.'}</span>
          </label>
          <div className="scanner-actions"><button className="button button-primary" disabled={!file || scanning} onClick={scan}>{scanning ? <><span className="loading-dot" /> Scanning…</> : <><Sparkles size={15} /> Scan document</>}</button>{file && <button className="button button-outline" onClick={() => { setFile(null); setResult(null); setError(''); setSaved(false) }}>Clear</button>}</div>
          {scanning && <div className="scanner-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div>}
          {error && <div className="scanner-error" role="alert"><AlertCircle size={16} />{error}</div>}
          <div className="scanner-privacy"><ShieldAlert size={18} /><div><strong>Session-only processing</strong><span>Uploaded bytes and extracted details are not saved to LocalStorage or sent to a server. Only a file metadata entry is added to your vault if you choose to save it.</span></div></div>
        </section>
        <section className="panel scanner-results-panel">
          <div className="panel-heading"><div><h2>Review extracted details</h2><p>Correct anything that OCR misread before you continue.</p></div><FileText size={19} /></div>
          <AnimatePresence mode="wait">
            {scanning ? <motion.div key="scanning" className="scanner-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><span className="scanner-spinner"><ScanLine size={22} /></span><strong>Reading your document</strong><span>Text extraction runs locally in this tab.</span></motion.div>
              : result ? <motion.div key="result" className="extraction-result" initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="scanner-classification"><span className="scanner-icon"><FileImage size={17} /></span><div><small>SUGGESTED CATEGORY</small><strong>{result.suggestedType}</strong></div><span className="status-pill">Review required</span></div>
                <div className="extracted-fields">{Object.entries(result.fields).map(([field, value]) => <label className="field-label" key={field}>{field}<input value={value} onChange={(event) => updateField(field, event.target.value)} placeholder="Not detected — enter manually" /></label>)}</div>
                <details className="ocr-text-details"><summary>Show extracted text</summary><pre>{result.text}</pre></details>
                <div className="scanner-verification-note"><ShieldAlert size={15} /><span>OCR is a best-effort suggestion. This document is <strong>not officially verified</strong>.</span></div>
                <button className="button button-primary full-button" disabled={saved} onClick={save}>{saved ? <><Check size={15} /> Added to document vault</> : 'Save document metadata to vault'}</button>
              </motion.div>
              : <motion.div key="empty" className="scanner-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><span className="scanner-empty-icon"><ScanLine size={24} /></span><strong>No scan to review yet</strong><span>Choose a document, then start a local scan to preview editable extracted fields.</span></motion.div>}
          </AnimatePresence>
        </section>
      </div>
    </div>
  )
}
