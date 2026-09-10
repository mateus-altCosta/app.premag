const TETO = 300 * 1024

/** Reduz a captura para caber no teto de 300 KB (JPEG). */
export async function comprimirJpeg(origem: Blob, maxPx = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(origem)
  const escala = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * escala))
  const h = Math.max(1, Math.round(bitmap.height * escala))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponível')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  for (const q of [0.6, 0.5, 0.4, 0.32, 0.24]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', q))
    if (blob && blob.size <= TETO) return blob
    if (blob && q === 0.24) return blob
  }
  throw new Error('Não foi possível comprimir a foto.')
}
