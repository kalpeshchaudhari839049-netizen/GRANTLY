import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, FileCheck2, Plus, Search, ShieldCheck } from 'lucide-react'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import { applicationStatuses } from '../data/applicationStatuses'
import { scholarships } from '../data/scholarships'
import type { ApplicationStatus, ScholarshipApplication } from '../types'
import { formatDate } from '../utils/format'

interface ApplicationsPageProps {
  applications: ScholarshipApplication[]
  onAdd: (id: string, status?: ApplicationStatus) => void
  onUpdate: (id: string, status: ApplicationStatus) => void
}

export default function ApplicationsPage({ applications, onAdd, onUpdate }: ApplicationsPageProps) {
  const [adding, setAdding] = useState(false)
  const [newScholarship, setNewScholarship] = useState(scholarships[0].id)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>('')
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null)
  const sorted = [...applications].filter((application) => {
    const scholarship = scholarships.find((item) => item.id === application.scholarshipId)
    const matchesSearch = !search || `${scholarship?.name ?? ''} ${scholarship?.provider ?? ''}`.toLowerCase().includes(search.toLowerCase())
    return matchesSearch && (!statusFilter || application.status === statusFilter)
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  return (
    <div className="applications-page">
      <PageHeader
        eyebrow="YOUR PROGRESS, IN ONE PLACE"
        title="Application tracker"
        description="Keep an eye on every opportunity, from first draft to final decision."
        action={<button className="button button-primary" onClick={() => setAdding((open) => !open)}><Plus size={16} /> Add application</button>}
      />
      <div className="tracker-summary">
        {applicationStatuses.map((status) => (
          <div className="tracker-summary-item" key={status}>
            <span className={`summary-dot ${status.toLowerCase().replace(/\s/g, '-')}`} />
            {status}
            <strong>{applications.filter((application) => application.status === status).length}</strong>
          </div>
        ))}
      </div>
      {adding && (
        <form className="add-application-panel panel" onSubmit={(event) => {
          event.preventDefault()
          onAdd(newScholarship, 'Draft')
          setAdding(false)
        }}>
          <div><strong>Start a new application</strong><p>Add an opportunity to your personal tracker.</p></div>
          <select value={newScholarship} onChange={(event) => setNewScholarship(event.target.value)}>
            {scholarships.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <button className="button button-primary" type="submit">Add as draft <Plus size={15} /></button>
        </form>
      )}
      <div className="tracker-filters">
        <label className="tracker-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search opportunities..." aria-label="Search applications" /></label>
        <label className="tracker-status-filter">
          Filter by status
          <select aria-label="Filter applications by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ApplicationStatus | '')}>
            <option value="">All statuses</option>
            {applicationStatuses.map((status) => <option key={status}>{status}</option>)}
          </select>
        </label>
        <span>{sorted.length} shown</span>
      </div>
      <section className="panel tracker-panel">
        <div className="tracker-table-wrap">
          <table className="tracker-table">
            <thead><tr><th>Opportunity</th><th>Amount</th><th>Deadline</th><th>Last updated</th><th>Status</th><th>History</th></tr></thead>
            <tbody>
              {sorted.map((application) => {
                const item = scholarships.find((scholarship) => scholarship.id === application.scholarshipId)
                if (!item) return null
                return (
                  <Fragment key={application.id}>
                    <tr>
                      <td><div className="table-opportunity"><span className={`table-provider ${item.accent}`}>{item.provider[0]}</span><div><Link to={`/scholarships/${item.id}`}>{item.name}</Link><span>{item.provider}</span></div></div></td>
                      <td>{item.amountLabel}</td>
                      <td>{formatDate(item.deadline)}</td>
                      <td>{formatDate(application.updatedAt)}</td>
                      <td><label className={`status-select status-${application.status.toLowerCase().replace(/\s/g, '-')}`}><span>{application.status}</span><select aria-label={`Change status for ${item.name}`} value={application.status} onChange={(event) => onUpdate(application.id, event.target.value as ApplicationStatus)}>{applicationStatuses.map((status) => <option key={status}>{status}</option>)}</select><ChevronDown size={13} /></label></td>
                      <td><button className="history-toggle" aria-expanded={expandedHistory === application.id} onClick={() => setExpandedHistory((current) => current === application.id ? null : application.id)}>{expandedHistory === application.id ? 'Hide' : 'View'} history <ChevronDown size={13} /></button></td>
                    </tr>
                    {expandedHistory === application.id && (
                      <tr className="history-row"><td colSpan={6}><div className="history-timeline">{(application.history ?? [{ status: application.status, updatedAt: application.updatedAt }]).map((entry, index) => <div className="history-event" key={`${application.id}-${entry.updatedAt}-${index}`}><i /><span><strong>{entry.status}</strong><small>{formatDate(entry.updatedAt)}</small></span></div>)}</div></td></tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
          {!sorted.length && <EmptyState icon={FileCheck2} title={applications.length ? 'No applications match' : 'Your tracker is ready'} text={applications.length ? 'Try another search or clear the status filter.' : 'Add a scholarship to keep your next steps in one place.'} action={applications.length ? <button className="button button-outline" onClick={() => { setSearch(''); setStatusFilter('') }}>Clear filters</button> : <button className="button button-primary" onClick={() => setAdding(true)}>Add your first application</button>} />}
        </div>
      </section>
      <div className="notice-banner"><ShieldCheck size={16} /><span>This tracker is saved in this browser for demo purposes. It does not submit an application to a scholarship provider.</span></div>
    </div>
  )
}
