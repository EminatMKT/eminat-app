import type { TopicRecord } from '@/features/meet/lib/types'

export function canDeleteTopic(topic: TopicRecord): boolean {
  return !topic.actividad_id
}

export function isConfirmedTopicActivityLink(
  linkedTopic: { actividad_id: string | null } | null,
  activityId: string
): boolean {
  return linkedTopic?.actividad_id === activityId
}
