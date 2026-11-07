import { createWorker } from 'tesseract.js'
import * as pdfjs from 'pdfjs-dist'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

export interface ExtractedDocumentData {
  text: string
  suggestedType: string
  fields: Record<string, string>
}

const documentTypes = [
  { label: 'Academic marksheets', keywords: ['marksheet', 'mark sheet', 'grade sheet', 'transcript', 'percentage', 'cgpa'] },
  { label: 'Income certificate', keywords: ['income certificate', 'annual income', 'family income', 'revenue'] },
  { label: 'Identity document', keywords: ['identity card', 'date of birth', 'aadhaar', 'passport', 'identity document'] },
  { label: 'Admission documents', keywords: ['admission', 'enrolment', 'enrollment', 'student id', 'institution'] },
]

function classifyDocument(text: string): string {
  const normalised = text.toLowerCase()
  const bestMatch = documentTypes
    .map((type) => ({ ...type, score: type.keywords.filter((keyword) => normalised.includes(keyword)).length }))
    .sort((a, b) => b.score - a.score)[0]
  return bestMatch.score > 0 ? bestMatch.label : 'Other'
}

function extractFields(text: string): Record<string, string> {
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? ''
  const phone = text.match(/(?:\+?\d[\d\s()-]{7,}\d)/)?.[0]?.trim() ?? ''
  const income = text.match(/(?:annual|family|household)?\s*income[^\d₹]{0,20}(?:₹|INR|Rs\.?\s*)?([\d,]{4,})/i)?.[1]?.replaceAll(',', '') ?? ''
  const percentage = text.match(/(?:percentage|aggregate|marks|score)[^\d]{0,20}(\d{1,3}(?:\.\d{1,2})?)\s*%/i)?.[1] ?? ''
  const name = text.match(/(?:student\s*name|name\s*of\s*(?:the\s*)?student)\s*[:-]\s*([A-Za-z][A-Za-z .'-]{1,60})/i)?.[1]?.trim() ?? ''
  return {
    'Student name': name,
    Email: email,
    'Mobile number': phone,
    'Annual family income': income,
    'Academic percentage': percentage,
  }
}

async function readPdfText(file: File): Promise<{ text: string; scannedPages: HTMLCanvasElement[] }> {
  const document = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  let text = ''
  const scannedPages: HTMLCanvasElement[] = []
  for (let pageNumber = 1; pageNumber <= Math.min(document.numPages, 2); pageNumber += 1) {
    const page = await document.getPage(pageNumber)
    const content = await page.getTextContent()
    const pageText = content.items.map((item) => ('str' in item ? item.str : '')).join(' ')
    text += ` ${pageText}`
    if (pageText.trim().length < 30) {
      const viewport = page.getViewport({ scale: 1.5 })
      const canvas = window.document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      const context = canvas.getContext('2d')
      if (context) {
        await page.render({ canvas, canvasContext: context, viewport }).promise
        scannedPages.push(canvas)
      }
    }
  }
  return { text: text.trim(), scannedPages }
}

export async function scanScholarshipDocument(file: File, onProgress?: (progress: number) => void): Promise<ExtractedDocumentData> {
  let text = ''
  let images: (File | HTMLCanvasElement)[] = [file]

  if (file.type === 'application/pdf') {
    const pdf = await readPdfText(file)
    text = pdf.text
    images = pdf.scannedPages
  }

  if (text.trim().length < 30 && images.length > 0) {
    const worker = await createWorker('eng')
    try {
      const recognised: string[] = []
      for (const [index, image] of images.entries()) {
        const result = await worker.recognize(image, {}, {
          text: true,
          blocks: false,
          hocr: false,
          tsv: false,
          box: false,
          unlv: false,
          osd: false,
          pdf: false,
          imageColor: false,
          imageGrey: false,
          imageBinary: false,
          debug: false,
        })
        recognised.push(result.data.text)
        onProgress?.(Math.round(((index + 1) / images.length) * 100))
      }
      text = recognised.join('\n')
    } finally {
      await worker.terminate()
    }
  }

  const cleanedText = text.trim()
  if (!cleanedText) throw new Error('No readable text was found. Try a sharper image or a text-based PDF.')

  return { text: cleanedText.slice(0, 12000), suggestedType: classifyDocument(cleanedText), fields: extractFields(cleanedText) }
}
