// Browser download helpers for Blobs returned by the API (PDFs, CSVs).

// Opens a Blob in a new browser tab (e.g. a generated PDF). The object URL is revoked
// after a delay so the new tab has time to load it before the URL is freed.
export const openInNewTab = (blob: Blob): void => {
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

// Triggers a file download of a Blob with the given filename via a temporary anchor.
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
