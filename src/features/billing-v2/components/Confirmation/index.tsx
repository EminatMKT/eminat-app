import s from './index.module.css'

type Props = {
  /** What landed, in words, or null while there is nothing to say. */
  text: string | null
}

export default function Confirmation({ text }: Props) {
  return <p role="status" aria-live="polite" className={s.line}>{text}</p>
}

// A polite live region that is always on the page, so a screen reader announces the text that
// arrives in it; empty, it takes no room. Only the confirmation of a write that landed goes here.
