import type { Scholarship, StudentProfile } from '../types'

export interface EligibilityMatch {
  scholarship: Scholarship
  score: number
  eligible: boolean
  reasons: string[]
  missing: string[]
}

const formatIncome = (amount: number) => `₹${new Intl.NumberFormat('en-IN').format(amount)}`

export function matchScholarships(profile: StudentProfile, opportunities: Scholarship[]): EligibilityMatch[] {
  return opportunities.map((scholarship) => {
    const courseMatches = scholarship.courses.includes('Any course')
      || scholarship.courses.some((course) => profile.course.toLowerCase().includes(course.toLowerCase())
        || course.toLowerCase().includes(profile.course.toLowerCase()))
    const checks = [
      {
        pass: scholarship.levels.includes(profile.educationLevel),
        reason: `Education level matches (${profile.educationLevel})`,
        missing: `Education level needs to be ${scholarship.levels.join(' or ')}`,
      },
      {
        pass: courseMatches,
        reason: `Course matches (${profile.course})`,
        missing: `Course should be related to ${scholarship.courses.filter((course) => course !== 'Any course').join(', ') || 'any field'}`,
      },
      {
        pass: profile.familyIncome <= scholarship.maxIncome,
        reason: `Income is within the sample threshold (${formatIncome(scholarship.maxIncome)})`,
        missing: `Sample income threshold is up to ${formatIncome(scholarship.maxIncome)}`,
      },
      {
        pass: profile.percentage >= scholarship.minPercentage,
        reason: `Academic score meets the sample minimum (${scholarship.minPercentage}%)`,
        missing: `Academic score should be at least ${scholarship.minPercentage}%`,
      },
      {
        pass: scholarship.locations.includes('All India')
          || scholarship.locations.some((location) => profile.location.toLowerCase().includes(location.toLowerCase())),
        reason: 'Location is supported',
        missing: `Location should be ${scholarship.locations.join(' or ')}`,
      },
    ]
    const reasons = checks.filter((check) => check.pass).map((check) => check.reason)
    const missing = checks.filter((check) => !check.pass).map((check) => check.missing)
    return {
      scholarship,
      score: Math.round((reasons.length / checks.length) * 100),
      eligible: missing.length === 0,
      reasons,
      missing,
    }
  }).sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score)
}
