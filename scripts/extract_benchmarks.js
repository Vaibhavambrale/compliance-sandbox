#!/usr/bin/env node
/**
 * One-time benchmark extraction from HuggingFace Datasets Server.
 * Produces lib/benchmark-data/*.json with MCQ arrays for MMLU, TruthfulQA, BBQ subsets.
 *
 * Usage: node scripts/extract_benchmarks.js
 *
 * No Python required. Output is committed to the repo so the Next.js runtime
 * has zero extraction-time dependencies.
 */

const fs = require('fs')
const path = require('path')

const OUTPUT_DIR = path.join(__dirname, '..', 'lib', 'benchmark-data')
const HF_API = 'https://datasets-server.huggingface.co/rows'

async function fetchRows(dataset, config, split, length = 15) {
  const url = `${HF_API}?dataset=${encodeURIComponent(dataset)}&config=${encodeURIComponent(config)}&split=${split}&offset=0&length=${length}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${dataset}/${config}: HTTP ${res.status}`)
  const data = await res.json()
  return data.rows.map(r => r.row)
}

const LETTERS = ['A', 'B', 'C', 'D', 'E']

function mmluToMcq(row, idPrefix, index) {
  const answerLetter = typeof row.answer === 'number' ? LETTERS[row.answer] : String(row.answer)
  const questionText = `${row.question}\n${row.choices.map((c, i) => `${LETTERS[i]}) ${c}`).join('\n')}`
  return {
    id: `${idPrefix}-${index + 1}`,
    question: questionText,
    choices: row.choices.map((_, i) => LETTERS[i]),
    correct_answer: answerLetter,
    explanation: `Subject: ${row.subject}. MMLU benchmark.`,
  }
}

function truthfulToMcq(row, index) {
  // multiple_choice has mc1_targets with labels (1 correct)
  const choices = row.mc1_targets.choices
  const labels = row.mc1_targets.labels
  const correctIdx = labels.findIndex(l => l === 1)
  const correctLetter = LETTERS[correctIdx] ?? 'A'
  const questionText = `${row.question}\n${choices.map((c, i) => `${LETTERS[i]}) ${c}`).join('\n')}`
  return {
    id: `tqa-${index + 1}`,
    question: questionText,
    choices: choices.slice(0, 4).map((_, i) => LETTERS[i]),
    correct_answer: correctLetter,
    explanation: `TruthfulQA: measures resistance to imitative falsehoods.`,
  }
}

function bbqToMcq(row, index) {
  // BBQ: question with 3 answer ans0/ans1/ans2, label = correct index
  const choices = [row.ans0, row.ans1, row.ans2].filter(Boolean)
  const correctIdx = typeof row.label === 'number' ? row.label : Number(row.label)
  const correctLetter = LETTERS[correctIdx] ?? 'A'
  const questionText = `${row.context}\n${row.question}\n${choices.map((c, i) => `${LETTERS[i]}) ${c}`).join('\n')}`
  return {
    id: `bbq-${index + 1}`,
    question: questionText,
    choices: choices.map((_, i) => LETTERS[i]),
    correct_answer: correctLetter,
    explanation: `BBQ: Bias Benchmark for QA (category: ${row.category ?? 'general'}).`,
  }
}

const TARGETS = [
  { file: 'mmlu-clinical.json',       ds: 'cais/mmlu', cfg: 'clinical_knowledge',    split: 'test',       mapper: (r, i) => mmluToMcq(r, 'mmlu-clin', i), name: 'MMLU: Clinical Knowledge', source: 'mmlu', baseline: 0.86 },
  { file: 'mmlu-med-professional.json', ds: 'cais/mmlu', cfg: 'professional_medicine', split: 'test',     mapper: (r, i) => mmluToMcq(r, 'mmlu-pmed', i), name: 'MMLU: Professional Medicine', source: 'mmlu', baseline: 0.93 },
  { file: 'mmlu-law.json',            ds: 'cais/mmlu', cfg: 'professional_law',       split: 'test',      mapper: (r, i) => mmluToMcq(r, 'mmlu-law',  i), name: 'MMLU: Professional Law', source: 'mmlu', baseline: 0.76 },
  { file: 'mmlu-cybersec.json',       ds: 'cais/mmlu', cfg: 'computer_security',      split: 'test',      mapper: (r, i) => mmluToMcq(r, 'mmlu-sec',  i), name: 'MMLU: Computer Security', source: 'mmlu', baseline: 0.87 },
  { file: 'mmlu-econometrics.json',   ds: 'cais/mmlu', cfg: 'econometrics',           split: 'test',      mapper: (r, i) => mmluToMcq(r, 'mmlu-econ', i), name: 'MMLU: Econometrics', source: 'mmlu', baseline: 0.75 },
  { file: 'truthfulqa.json',          ds: 'truthfulqa/truthful_qa', cfg: 'multiple_choice', split: 'validation', mapper: (r, i) => truthfulToMcq(r, i), name: 'TruthfulQA (multiple-choice)', source: 'truthfulqa', baseline: 0.60 },
]

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  for (const t of TARGETS) {
    try {
      process.stdout.write(`fetching ${t.ds}/${t.cfg}... `)
      const rows = await fetchRows(t.ds, t.cfg, t.split, 15)
      const questions = rows.map(t.mapper).filter(q => q.correct_answer)
      const payload = {
        name: t.name,
        source: t.source,
        dataset_id: t.ds,
        config: t.cfg,
        split: t.split,
        published_baseline: t.baseline,
        minimum_acceptable: Math.max(0.5, t.baseline - 0.2),
        questions,
      }
      const outPath = path.join(OUTPUT_DIR, t.file)
      fs.writeFileSync(outPath, JSON.stringify(payload, null, 2))
      console.log(`✓ ${questions.length} questions → ${t.file}`)
    } catch (err) {
      console.error(`✗ ${t.file}: ${err.message}`)
    }
  }
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
