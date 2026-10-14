import { toPng } from 'html-to-image'

function filnavn(navn: string): string {
  const rent = navn
    .toLowerCase()
    .replace(/[æ]/g, 'ae')
    .replace(/[ø]/g, 'o')
    .replace(/[å]/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return `${rent || 'turnering'}.png`
}

/** Eksporterer et element (f.eks. braketten og tabellen) som PNG og laster det ned. */
export async function eksporterSomBilde(node: HTMLElement, turneringsnavn: string): Promise<void> {
  node.classList.add('eksporterer')
  try {
    // La nettleseren legge ut den utvidede visningen før vi tar bildet.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const bakgrunn = getComputedStyle(document.body).backgroundColor
    const dataUrl = await toPng(node, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: bakgrunn,
      width: node.scrollWidth,
      height: node.scrollHeight,
      filter: (n) => !(n instanceof HTMLElement && n.classList.contains('skjul-ved-eksport')),
    })
    const a = document.createElement('a')
    a.download = filnavn(turneringsnavn)
    a.href = dataUrl
    a.click()
  } finally {
    node.classList.remove('eksporterer')
  }
}
