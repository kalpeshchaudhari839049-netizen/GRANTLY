import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ArrowDownRight, ArrowUpRight, Calculator, CircleHelp, IndianRupee, PiggyBank, Wallet } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import PageHeader from '../components/PageHeader'
import { scholarships } from '../data/scholarships'
import { usePersistentState } from '../hooks/usePersistentState'
import type { ScholarshipApplication } from '../types'

const plannerSchema = z.object({
  tuition: z.coerce.number().min(0).max(100000000),
  living: z.coerce.number().min(0).max(100000000),
  books: z.coerce.number().min(0).max(100000000),
  other: z.coerce.number().min(0).max(100000000),
  savings: z.coerce.number().min(0).max(100000000),
  otherFunding: z.coerce.number().min(0).max(100000000),
})
type PlannerInput = z.input<typeof plannerSchema>
type PlannerValues = z.output<typeof plannerSchema>
const defaultPlan: PlannerValues = { tuition: 120000, living: 60000, books: 12000, other: 18000, savings: 25000, otherFunding: 0 }
const formatMoney = (value: number) => `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)}`
const chartColors = ['#7b6ce0', '#55a6e8', '#62c6b5', '#efa664']

interface Props {
  applications: ScholarshipApplication[]
  onNotify: (message: string) => void
}

export default function FinancialPlannerPage({ applications, onNotify }: Props) {
  const [savedPlan, setSavedPlan] = usePersistentState<PlannerValues>('grantly-financial-plan', defaultPlan)
  const { register, watch, handleSubmit, formState: { errors } } = useForm<PlannerInput, unknown, PlannerValues>({ resolver: zodResolver(plannerSchema), defaultValues: savedPlan })
  const values = watch()
  const totalExpenses = Number(values.tuition || 0) + Number(values.living || 0) + Number(values.books || 0) + Number(values.other || 0)
  const confirmedAwards = applications
    .filter((application) => application.status === 'Approved')
    .reduce((total, application) => total + (scholarships.find((scholarship) => scholarship.id === application.scholarshipId)?.amount ?? 0), 0)
  const totalFunding = Number(values.savings || 0) + Number(values.otherFunding || 0) + confirmedAwards
  const fundingGap = Math.max(0, totalExpenses - totalFunding)
  const covered = totalExpenses > 0 ? Math.min(100, Math.round(totalFunding / totalExpenses * 100)) : 0
  const chartData = [
    { name: 'Tuition', value: Number(values.tuition || 0) },
    { name: 'Living', value: Number(values.living || 0) },
    { name: 'Books & supplies', value: Number(values.books || 0) },
    { name: 'Other', value: Number(values.other || 0) },
  ].filter((item) => item.value > 0)
  const fields: { name: keyof PlannerValues; label: string }[] = [
    { name: 'tuition', label: 'Tuition & fees' },
    { name: 'living', label: 'Living costs' },
    { name: 'books', label: 'Books & supplies' },
    { name: 'other', label: 'Other expenses' },
    { name: 'savings', label: 'Savings available' },
    { name: 'otherFunding', label: 'Other confirmed funding' },
  ]

  return (
    <div className="page-stack">
      <PageHeader eyebrow="PLAN WITH CLARITY" title="Education funding planner" description="Estimate your annual education costs and compare them with confirmed funding. This is a planning aid, not a financial guarantee." />
      <div className="planner-summary-grid">
        <article className="planner-stat"><span className="planner-stat-icon expenses"><Calculator size={18} /></span><small>ESTIMATED EXPENSES</small><strong>{formatMoney(totalExpenses)}</strong><span>Annual education costs</span></article>
        <article className="planner-stat"><span className="planner-stat-icon funding"><PiggyBank size={18} /></span><small>CONFIRMED FUNDING</small><strong>{formatMoney(totalFunding)}</strong><span>Includes approved demo awards</span></article>
        <article className="planner-stat"><span className="planner-stat-icon gap"><ArrowDownRight size={18} /></span><small>ESTIMATED FUNDING GAP</small><strong>{formatMoney(fundingGap)}</strong><span>{covered}% of expenses covered in this estimate</span></article>
      </div>
      <div className="planner-layout">
        <section className="panel planner-input-panel">
          <div className="panel-heading"><div><h2>Build your estimate</h2><p>Change any amount; results update instantly.</p></div><Wallet size={19} /></div>
          <form onSubmit={handleSubmit((data) => {
            setSavedPlan(data)
            onNotify('Your education funding estimate was saved in this browser.')
          })}>
            <div className="planner-form-grid">{fields.map((field) => <label className="field-label" key={field.name}>{field.label}<span className="money-input"><IndianRupee size={13} /><input type="number" min="0" step="1000" {...register(field.name)} /></span>{errors[field.name]?.message && <small className="form-error">{errors[field.name]?.message}</small>}</label>)}</div>
            <button type="submit" className="button button-primary"><Wallet size={15} /> Save estimate</button>
          </form>
          <div className="planner-approved-note"><ArrowUpRight size={15} /><span>{confirmedAwards > 0 ? `${formatMoney(confirmedAwards)} from approved demo application${applications.filter((application) => application.status === 'Approved').length === 1 ? '' : 's'} included.` : 'No approved demo awards are included yet. Update an application status to Approved in your tracker to see it reflected here.'}</span></div>
        </section>
        <section className="panel planner-chart-panel">
          <div className="panel-heading"><div><h2>Expense breakdown</h2><p>Estimated annual cost distribution</p></div></div>
          {chartData.length ? <div className="planner-chart-wrap"><ResponsiveContainer width="100%" height={235}><PieChart><Pie data={chartData} dataKey="value" nameKey="name" innerRadius={66} outerRadius={94} paddingAngle={4} stroke="none">{chartData.map((item, index) => <Cell key={item.name} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip formatter={(value) => formatMoney(Number(value))} /></PieChart></ResponsiveContainer><div className="planner-chart-center"><strong>{formatMoney(totalExpenses)}</strong><span>Total / year</span></div></div> : <div className="planner-chart-empty"><CircleHelp size={20} /><span>Enter an expense amount to see the breakdown.</span></div>}
          <div className="planner-legend">{chartData.map((item, index) => <div key={item.name}><i style={{ background: chartColors[index % chartColors.length] }} /><span>{item.name}</span><strong>{formatMoney(item.value)}</strong></div>)}</div>
        </section>
      </div>
      <div className="planner-disclaimer"><CircleHelp size={15} /><span>Scholarship amounts shown elsewhere in GRANTLY are illustrative sample data. Only awards you mark as <strong>Approved</strong> are counted here, and no funding outcome is guaranteed.</span></div>
    </div>
  )
}
