import { STRING } from './constants'

/** Whether a payload value is a string (payloads are JSON: anything can arrive). */
export default function isText(value: unknown): value is string {
  return typeof value === STRING
}
