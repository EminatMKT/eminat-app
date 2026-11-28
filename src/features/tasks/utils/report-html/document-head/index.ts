import { PRINT_STYLES } from './constants'

export default function documentHead(title: string): string {
  const html = `<!DOCTYPE html><html><head><title>${title}</title>`
    + `<style>${PRINT_STYLES}</style></head><body>`
  return html
}

// Starts the printable report document with its title and page styles.
