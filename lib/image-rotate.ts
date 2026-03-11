/**
 * Rotates an image using the Canvas API.
 * @param imageUrl - URL of the image (blob URL, object URL, or remote URL)
 * @param degrees - Rotation angle: 90 (clockwise), -90 (counter-clockwise), or 180
 * @returns A JPEG Blob of the rotated image
 */
export async function rotateImage(
  imageUrl: string,
  degrees: 90 | -90 | 180
): Promise<Blob> {
  const img = await loadImage(imageUrl)

  const radians = (degrees * Math.PI) / 180
  const swap = degrees === 90 || degrees === -90

  const canvas = document.createElement('canvas')
  canvas.width = swap ? img.naturalHeight : img.naturalWidth
  canvas.height = swap ? img.naturalWidth : img.naturalHeight

  const ctx = canvas.getContext('2d')!
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate(radians)
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas toBlob returned null'))
      },
      'image/jpeg',
      0.92
    )
  })
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = url
  })
}
