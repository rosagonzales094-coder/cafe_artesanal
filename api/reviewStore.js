import fs from 'node:fs/promises'
import path from 'node:path'

const storePath = path.resolve(process.cwd(), 'api', 'data', 'reviews.json')

async function ensureStoreFile() {
  try {
    await fs.access(storePath)
  } catch {
    await fs.mkdir(path.dirname(storePath), { recursive: true })
    await fs.writeFile(storePath, '[]', 'utf8')
  }
}

async function readReviews() {
  await ensureStoreFile()
  const raw = await fs.readFile(storePath, 'utf8')

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeReviews(reviews) {
  await ensureStoreFile()
  await fs.writeFile(storePath, JSON.stringify(reviews, null, 2), 'utf8')
}

export async function getAllReviews() {
  return readReviews()
}

export async function addReview(review) {
  const reviews = await readReviews()
  const nextId = reviews.reduce(
    (max, currentReview) => Math.max(max, Number(currentReview.id_review) || 0),
    0,
  )
  const normalized = {
    ...review,
    id_review: Number(review.id_review) || nextId + 1,
    id_usuario: Number(review.id_usuario),
    id_cliente: Number(review.id_cliente),
    id_producto: review.id_producto == null ? null : Number(review.id_producto),
    rating: Number(review.rating),
    scope: String(review.scope || '').trim().toUpperCase(),
    comment: String(review.comment || '').trim(),
    author_name: String(review.author_name || '').trim(),
    usuario: String(review.usuario || '').trim(),
  }

  reviews.push(normalized)
  await writeReviews(reviews)
  return normalized
}
