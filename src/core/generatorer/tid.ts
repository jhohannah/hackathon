export function leggTilMinutter(iso: string, minutter: number): string {
  return new Date(new Date(iso).getTime() + minutter * 60_000).toISOString()
}

export function leggTilDager(iso: string, dager: number): string {
  return leggTilMinutter(iso, dager * 24 * 60)
}
