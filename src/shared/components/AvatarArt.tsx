import type { CSSProperties } from 'react'

export const AVATARS = [
  { key: 'dog', label: 'Tokyo', animal: 'Perrito', background: '#F3E4D1', face: '#D69D70' },
  { key: 'cat', label: 'Berlín', animal: 'Gatito', background: '#EAE3F6', face: '#A899C7' },
  { key: 'capybara', label: 'Quito', animal: 'Capibara', background: '#E4E9D9', face: '#AD8768' },
  // Keep the stored key so existing avatars continue to work.
  { key: 'bird', label: 'París', animal: 'Corazón kawaii', background: '#FFE8EF', face: '#FF5B75' },
  { key: 'bear', label: 'Roma', animal: 'Oso', background: '#F1E5DB', face: '#AB846F' },
] as const

export type AvatarKey = typeof AVATARS[number]['key']
export const isAvatarKey = (value: unknown): value is AvatarKey =>
  typeof value === 'string' && AVATARS.some(avatar => avatar.key === value)

// Previously saved choices no longer offered in the picker use a visible default
// until the person saves one of the five current choices. No user rows are changed.
export const normalizeAvatarKey = (value: string | null | undefined): AvatarKey | null =>
  isAvatarKey(value) ? value : value === 'lizard' || value === 'seal' ? 'dog' : null

export default function AvatarArt({ avatarKey, size = 56, style }: {
  avatarKey?: string | null
  size?: number
  style?: CSSProperties
}) {
  const avatar = AVATARS.find(item => item.key === normalizeAvatarKey(avatarKey))
  if (!avatar) return null
  const { key, label, animal, background, face } = avatar
  const outline = '#3B414A'
  return <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${animal} · ${label}`}
    style={{ borderRadius: '24%', flexShrink: 0, ...style }}>
    <rect width="100" height="100" rx="24" fill={background} />
    <circle cx="82" cy="18" r="12" fill="#fff" opacity=".25" />
    {key === 'dog' && <>
      <ellipse cx="24" cy="43" rx="12" ry="25" fill="#A97859" transform="rotate(20 24 43)" />
      <ellipse cx="76" cy="43" rx="12" ry="25" fill="#A97859" transform="rotate(-20 76 43)" />
      <ellipse cx="50" cy="53" rx="31" ry="32" fill={face} />
      <ellipse cx="50" cy="67" rx="17" ry="12" fill="#F8E7D4" />
      <circle cx="50" cy="63" r="4" fill={outline} />
    </>}
    {key === 'cat' && <>
      <path d="M20 48 22 18 42 34 58 34 78 18 80 48" fill={face} />
      <path d="M27 36 28 27 36 35M64 35 72 27 73 36" fill="#DBBAD0" />
      <ellipse cx="50" cy="55" rx="31" ry="30" fill={face} />
      <path d="m46 63 4 3 4-3" stroke={outline} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M29 65 16 62M29 70 16 72M71 65 84 62M71 70 84 72" stroke={outline} strokeWidth="1.6" strokeLinecap="round" />
    </>}
    {key === 'capybara' && <>
      <circle cx="29" cy="32" r="9" fill="#8E7059" /><circle cx="71" cy="32" r="9" fill="#8E7059" />
      <ellipse cx="50" cy="55" rx="33" ry="30" fill={face} />
      <ellipse cx="50" cy="67" rx="16" ry="10" fill="#C7A98B" />
      <ellipse cx="50" cy="62" rx="5" ry="3.5" fill={outline} />
    </>}
    {key === 'bird' && <>
      <path d="M50 82C39 73 16 60 16 40c0-12 9-21 21-21 6 0 11 3 13 8 3-5 8-8 14-8 12 0 21 9 21 21 0 20-23 33-35 42Z" fill={face} />
      <path d="M25 34c2-5 6-8 11-8" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".5" />
      <circle cx="39" cy="48" r="3.5" fill="#392B3A" />
      <circle cx="61" cy="48" r="3.5" fill="#392B3A" />
      <circle cx="40" cy="47" r="1" fill="#fff" />
      <circle cx="62" cy="47" r="1" fill="#fff" />
      <ellipse cx="30" cy="56" rx="5" ry="2.5" fill="#FFADC0" />
      <ellipse cx="70" cy="56" rx="5" ry="2.5" fill="#FFADC0" />
      <path d="M43 59q7 8 14 0" fill="none" stroke="#392B3A" strokeWidth="2.5" strokeLinecap="round" />
    </>}
    {key === 'bear' && <>
      <circle cx="27" cy="32" r="12" fill={face} /><circle cx="73" cy="32" r="12" fill={face} />
      <circle cx="27" cy="32" r="6" fill="#D5B4A3" /><circle cx="73" cy="32" r="6" fill="#D5B4A3" />
      <ellipse cx="50" cy="55" rx="31" ry="30" fill={face} />
      <ellipse cx="50" cy="66" rx="13" ry="11" fill="#E5CABB" />
      <ellipse cx="50" cy="62" rx="4.5" ry="3" fill={outline} />
    </>}
    {key !== 'bird' && <>
      <circle cx="39" cy="54" r="2.7" fill={outline} />
      <circle cx="61" cy="54" r="2.7" fill={outline} />
    </>}
  </svg>
}
