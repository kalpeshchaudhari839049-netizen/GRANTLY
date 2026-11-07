import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Save, UserRound } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import type { StudentProfile } from '../types'

const profileSchema = z.object({
  name: z.string().min(2, 'Enter at least 2 characters.'),
  email: z.string().email('Enter a valid email address.'),
  educationLevel: z.enum(['Undergraduate', 'Postgraduate', 'Doctoral', 'High school']),
  course: z.string().min(2, 'Enter your course.'),
  year: z.string().min(1, 'Enter your year of study.'),
  graduationYear: z.string().min(4, 'Enter your graduation year.'),
  location: z.string().min(2, 'Enter your location.'),
  category: z.string(),
  familyIncome: z.coerce.number().min(0, 'Income cannot be negative.'),
  percentage: z.coerce.number().min(0).max(100, 'Percentage must be 100 or lower.'),
})
type ProfileInput = z.input<typeof profileSchema>
type ProfileValues = z.output<typeof profileSchema>

interface Props {
  profile: StudentProfile
  onSave: (profile: StudentProfile) => void
  onNotify: (message: string) => void
}

export default function ProfilePage({ profile, onSave, onNotify }: Props) {
  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<ProfileInput, unknown, ProfileValues>({ resolver: zodResolver(profileSchema), defaultValues: profile })
  const save = handleSubmit((values) => {
    onSave(values)
    onNotify('Your profile and scholarship matching preferences are up to date.')
  })
  const fields: { name: keyof ProfileValues; label: string; type?: string }[] = [
    { name: 'name', label: 'Full name' }, { name: 'email', label: 'Email', type: 'email' },
    { name: 'educationLevel', label: 'Education level' }, { name: 'course', label: 'Course' },
    { name: 'year', label: 'Year of study' }, { name: 'graduationYear', label: 'Graduation year' },
    { name: 'location', label: 'Location' }, { name: 'category', label: 'Optional category' },
    { name: 'familyIncome', label: 'Annual family income (₹)', type: 'number' },
    { name: 'percentage', label: 'Academic percentage', type: 'number' },
  ]
  return (
    <div className="page-stack">
      <PageHeader eyebrow="PERSONALIZATION" title="Your student profile" description="Keep your details current to get more relevant scholarship matches. This demo stores profile preferences in this browser." />
      <form className="panel profile-form" onSubmit={save}>
        <div className="panel-heading"><div className="profile-form-title"><span className="notification-icon profile"><UserRound size={18} /></span><div><h2>Student information</h2><p>Used only to personalize your demo recommendations.</p></div></div><span className="profile-demo-badge">Demo profile</span></div>
        <div className="profile-grid">
          {fields.map((field) => <label key={field.name} className="field-label">{field.label}
            {field.name === 'educationLevel' ? <select {...register(field.name)}><option>Undergraduate</option><option>Postgraduate</option><option>Doctoral</option><option>High school</option></select>
              : <input type={field.type ?? 'text'} {...register(field.name)} />}
            {errors[field.name]?.message && <small className="form-error">{errors[field.name]?.message}</small>}
          </label>)}
        </div>
        <div className="profile-form-footer"><span>Updating your profile may change eligibility matches.</span><button className="button button-primary" disabled={!isDirty} type="submit"><Save size={15} /> Save profile</button></div>
      </form>
    </div>
  )
}
