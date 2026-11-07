import { scholarships } from '../data/scholarships'
import type { StudentProfile } from '../types'
import { matchScholarships } from './eligibility'

const prettyDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

export function getDemoAssistantReply(question: string, profile: StudentProfile, savedCount: number): string {
  const text = question.toLowerCase()
  if (text.includes('document')) return 'A good starting checklist can include academic marksheets, admission proof, an identity document, and—where relevant—an income certificate. Requirements vary by opportunity, so always confirm the official provider checklist before sharing anything.'
  if (text.includes('apply') || text.includes('steps') || text.includes('application')) return 'A calm way to get started: 1) Open an opportunity and read its requirements. 2) Verify dates and instructions with the provider. 3) Prepare only the requested documents. 4) Submit through the provider’s official application channel. 5) Keep your status up to date in Grantly’s demo tracker.'
  if (text.includes('eligib') || text.includes('match')) {
    const matchingCount = matchScholarships(profile, scholarships).filter((match) => match.score >= 60).length
    return `Based on the profile you’ve shared (${profile.educationLevel} · ${profile.course}), ${matchingCount} sample opportunities currently score at least 60% against the demo criteria. Your saved list has ${savedCount}. Try the Eligibility Check for a transparent comparison—it’s not a guarantee of approval.`
  }
  if (text.includes('deadline') || text.includes('date')) {
    const nearest = [...scholarships].sort((a, b) => a.deadline.localeCompare(b.deadline))[0]
    return `The nearest sample deadline is ${prettyDate(nearest.deadline)} for ${nearest.name}. You can turn on a browser-local reminder in the Deadlines section.`
  }
  if (text.includes('hello') || text.includes('hi ') || text.includes('hey')) return 'Hello! I’m here to make the scholarship search feel a little less overwhelming. Want to look at your matches, documents, or application steps?'
  return 'That’s a thoughtful question. In this demo I can help with profile matching, document checklists, deadlines, and application steps. For official criteria, application links, or award decisions, please confirm directly with the scholarship provider.'
}
