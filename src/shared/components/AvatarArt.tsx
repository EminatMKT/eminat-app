import type { CSSProperties } from 'react'

export const AVATARS = [
  { key: 'dog', label: 'Perrito', background: '#F3E4D1', face: '#D69D70' },
  { key: 'cat', label: 'Gatito', background: '#EAE3F6', face: '#A899C7' },
  { key: 'capybara', label: 'Capibara', background: '#E4E9D9', face: '#AD8768' },
  { key: 'bird', label: 'Ave', background: '#DCECF4', face: '#78A9BE' },
  { key: 'lizard', label: 'Lagarto', background: '#E0EFD9', face: '#85B890' },
  { key: 'bear', label: 'Oso', background: '#F1E5DB', face: '#AB846F' },
  { key: 'seal', label: 'Foca', background: '#DDE9ED', face: '#829FAC' },
] as const

export type AvatarKey = typeof AVATARS[number]['key']
export const isAvatarKey = (value: unknown): value is AvatarKey =>
  typeof value === 'string' && AVATARS.some(avatar => avatar.key === value)

export default function AvatarArt({ avatarKey, size = 56, style }: {
  avatarKey?: string | null
  size?: number
  style?: CSSProperties
}) {
  const avatar = AVATARS.find(item => item.key === avatarKey)
  if (!avatar) return null
  const { key, label, background, face } = avatar
  const outline = '#3B414A'
  return <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={label}
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
      <path d="M27 27 Q24 10 36 18L42 28M40 25 Q43 10 52 20" fill="#58899D" />
      <ellipse cx="50" cy="54" rx="30" ry="32" fill={face} />
      <path d="m43 63 7 7 7-7z" fill="#EAB467" />
      <ellipse cx="50" cy="80" rx="15" ry="4" fill="#A5CAD7" />
    </>}
    {key === 'lizard' && <>
      <path d="M20 50 Q18 31 30 29 L38 23 45 27 54 21 61 27 70 25 Q82 35 80 53 Q79 82 50 83 Q21 82 20 50" fill={face} />
      <circle cx="36" cy="43" r="8" fill="#D9EBD4" /><circle cx="64" cy="43" r="8" fill="#D9EBD4" />
      <circle cx="38" cy="44" r="3" fill={outline} /><circle cx="62" cy="44" r="3" fill={outline} />
      <path d="M43 67 Q50 72 57 67" stroke={outline} strokeWidth="2" fill="none" strokeLinecap="round" />
    </>}
    {key === 'bear' && <>
      <circle cx="27" cy="32" r="12" fill={face} /><circle cx="73" cy="32" r="12" fill={face} />
      <circle cx="27" cy="32" r="6" fill="#D5B4A3" /><circle cx="73" cy="32" r="6" fill="#D5B4A3" />
      <ellipse cx="50" cy="55" rx="31" ry="30" fill={face} />
      <ellipse cx="50" cy="66" rx="13" ry="11" fill="#E5CABB" />
      <ellipse cx="50" cy="62" rx="4.5" ry="3" fill={outline} />
    </>}
    {key === 'seal' && <>
      <ellipse cx="50" cy="57" rx="33" ry="29" fill={face} />
      <ellipse cx="50" cy="70" rx="18" ry="10" fill="#C2D4D9" />
      <ellipse cx="50" cy="63" rx="4" ry="3" fill={outline} />
      <path d="M30 65 17 61M30 70 17 72M70 65 83 61M70 70 83 72" stroke={outline} strokeWidth="1.5" strokeLinecap="round" />
    </>}
    {key !== 'lizard' && <>
      <circle cx="39" cy={key === 'bird' ? 51 : 54} r="2.7" fill={outline} />
      <circle cx="61" cy={key === 'bird' ? 51 : 54} r="2.7" fill={outline} />
    </>}
  </svg>
}
