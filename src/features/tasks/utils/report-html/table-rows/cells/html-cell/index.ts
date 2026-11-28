export default function cell(style: string, content: string): string {
  const html = `<td style="${style}">${content}</td>`

  return html
}

// Wraps a value in a styled <td>, shared by every table-row cell builder.
