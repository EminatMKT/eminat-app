import { TABLE_COLUMNS, TABLE_STYLE } from './constants'

export default function tableSection(headers: string, rows: string): string {
  const content = `<table style="${TABLE_STYLE}"><colgroup>${TABLE_COLUMNS}</colgroup>`
    + `<thead><tr style="background:#f8f8fa">${headers}</tr></thead>`
    + `<tbody>${rows}</tbody></table>`
  const html = content

  return html
}

// Wraps the header and activity rows in the report's fixed-layout table.
