import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, Eye, FileCheck2, FileText, FolderOpen, Search, ShieldCheck, Trash2, Upload, X } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import type { ManagedDocument } from '../types'

interface Props {
  documents: ManagedDocument[]
  sessionFiles: Record<string, File>
  onUpload: (file: File, type: string) => string
  onDelete: (id: string) => void
  onUpdateStatus: (id: string, status: ManagedDocument['status']) => void
}

const categories = ['All documents', 'Income certificate', 'Academic marksheets', 'Identity document', 'Admission documents', 'Other']
const maxBytes = 10 * 1024 * 1024
const acceptedTypes = ['application/pdf', 'image/jpeg', 'image/png']

export default function DocumentVaultPage({ documents, sessionFiles, onUpload, onDelete, onUpdateStatus }: Props) {
  const [category, setCategory] = useState('All documents')
  const [query, setQuery] = useState('')
  const [previewId, setPreviewId] = useState('')
  const [error, setError] = useState('')
  const previewDocument = documents.find((document) => document.id === previewId)
  const previewFile = previewId ? sessionFiles[previewId] : undefined
  const previewUrl = useMemo(() => previewFile ? URL.createObjectURL(previewFile) : '', [previewFile])
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  const visibleDocuments = documents.filter((document) => {
    const matchesCategory = category === 'All documents' || (document.category || document.type) === category || document.type === category
    return matchesCategory && document.name.toLowerCase().includes(query.toLowerCase())
  })

  const upload = (file?: File) => {
    if (!file) return
    setError('')
    if (!acceptedTypes.includes(file.type)) { setError('Choose a PDF, JPG, or PNG file.'); return }
    if (file.size > maxBytes) { setError('This file is larger than 10 MB. Choose a smaller file.'); return }
    const type = categories.slice(1).find((item) => file.name.toLowerCase().includes(item.split(' ')[0].toLowerCase())) ?? 'Other'
    onUpload(file, type)
  }

  const download = (id: string, name: string) => {
    const file = sessionFiles[id]
    if (!file) return
    const url = URL.createObjectURL(file)
    const anchor = window.document.createElement('a')
    anchor.href = url
    anchor.download = name
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const formatSize = (size: number) => size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`

  return (
    <div className="page-stack">
      <PageHeader eyebrow="SESSION-ONLY FILES" title="Smart document vault" description="Organize document metadata, preview files in this tab, and keep a checklist. File contents are deliberately not persisted after you leave." action={<label className="button button-primary vault-upload-button"><Upload size={15} /> Add document<input className="sr-only" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event) => { upload(event.target.files?.[0]); event.currentTarget.value = '' }} /></label>} />
      <div className="vault-security-banner"><ShieldCheck size={18} /><span><strong>Private by design.</strong> Files and extracted information remain in memory only. Metadata is saved locally, and documents are never represented as officially verified.</span></div>
      {error && <p className="form-error vault-error" role="alert">{error}</p>}
      <section className="panel vault-panel">
        <div className="vault-toolbar"><label className="vault-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search document names" /></label><label className="vault-category">Category<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label></div>
        <div className="vault-count">{visibleDocuments.length} {visibleDocuments.length === 1 ? 'document' : 'documents'}</div>
        {visibleDocuments.length ? <div className="vault-grid">{visibleDocuments.map((document) => {
          const available = Boolean(sessionFiles[document.id])
          return <motion.article key={document.id} className="vault-card" layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="vault-card-top"><span className="vault-file-icon"><FileText size={20} /></span><button className="vault-delete" aria-label={`Delete ${document.name}`} onClick={() => { onDelete(document.id); if (previewId === document.id) setPreviewId('') }}><Trash2 size={15} /></button></div>
            <strong className="vault-file-name" title={document.name}>{document.name}</strong>
            <span className="vault-file-meta">{document.category || document.type} · {formatSize(document.size)}</span>
            <div className="vault-status-line"><span className={`document-status ${document.status === 'Ready' ? 'ready' : ''}`}><i />{document.status}</span><small>Not officially verified</small></div>
            <div className="vault-card-actions"><button disabled={!available} className="button button-outline" onClick={() => setPreviewId(document.id)}><Eye size={14} /> Preview</button><button className="button button-outline" disabled={!available} onClick={() => download(document.id, document.name)}><Download size={14} /> {available ? 'Download' : 'Session ended'}</button></div>
            <button className="link-button vault-status-toggle" onClick={() => onUpdateStatus(document.id, document.status === 'Ready' ? 'Needs review' : 'Ready')}><FileCheck2 size={13} /> Mark {document.status === 'Ready' ? 'needs review' : 'ready'}</button>
          </motion.article>
        })}</div> : <EmptyState icon={FolderOpen} title={documents.length ? 'No matching documents' : 'Your vault is ready'} text={documents.length ? 'Try another search or category.' : 'Add document metadata or scan a file to start your private checklist.'} />}
      </section>
      <AnimatePresence>
        {previewDocument && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewId('') }}><motion.section className="document-preview-modal" role="dialog" aria-modal="true" aria-label={`Preview ${previewDocument.name}`} initial={{ opacity: 0, y: 14, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }}>
          <div className="panel-heading"><div><h2>{previewDocument.name}</h2><p>Private session preview · Not officially verified</p></div><button className="icon-button" onClick={() => setPreviewId('')} aria-label="Close preview"><X size={17} /></button></div>
          {previewFile && previewUrl ? previewFile.type === 'application/pdf' ? <iframe className="document-preview-frame" title={`Preview of ${previewDocument.name}`} src={previewUrl} /> : <img className="document-preview-image" src={previewUrl} alt={`Preview of ${previewDocument.name}`} /> : <div className="preview-unavailable"><FolderOpen size={22} /><strong>File unavailable in this session</strong><span>Metadata was retained, but file contents are intentionally cleared after refresh or sign-out.</span></div>}
        </motion.section></motion.div>}
      </AnimatePresence>
    </div>
  )
}
