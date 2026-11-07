export type EducationLevel = 'Undergraduate' | 'Postgraduate' | 'Doctoral' | 'High school'
export type ApplicationStatus = 'Draft' | 'Applied' | 'Under Review' | 'Approved' | 'Rejected'

export interface Scholarship {
  id: string
  name: string
  provider: string
  description: string
  amount: number
  amountLabel: string
  deadline: string
  levels: EducationLevel[]
  courses: string[]
  categories: string[]
  locations: string[]
  maxIncome: number
  minPercentage: number
  benefits: string[]
  requirements: string[]
  documents: string[]
  accent: string
  featured?: boolean
}

export interface StudentProfile {
  name: string
  email: string
  educationLevel: EducationLevel
  course: string
  year: string
  graduationYear: string
  location: string
  category: string
  familyIncome: number
  percentage: number
}

export interface ScholarshipApplication {
  id: string
  scholarshipId: string
  status: ApplicationStatus
  updatedAt: string
  history?: { status: ApplicationStatus; updatedAt: string }[]
}

export interface ManagedDocument {
  id: string
  name: string
  type: string
  category: string
  size: number
  status: 'Ready' | 'Needs review'
  addedAt: string
  verificationStatus: 'Not verified'
}

export interface GrantlySettings {
  reminderDays: number
  digestEnabled: boolean
  language: 'en-US' | 'hi-IN' | 'mr-IN'
  reducedMotion: boolean
}

export interface ScholarshipNotification {
  id: string
  title: string
  message: string
  date: string
  kind: 'deadline' | 'application' | 'profile'
  read: boolean
  href: string
}
