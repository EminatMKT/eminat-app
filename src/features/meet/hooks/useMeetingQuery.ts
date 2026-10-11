'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/shared/db/supabase'
import { getTasks } from '@/features/meet/lib/services/task-api'
import type { ServiceError } from '@/features/meet/lib/services/errors'
import { classifyServiceError, partialError } from '@/features/meet/lib/services/errors'
import {
  getMeetingById,
  type MeetingWithCompany,
} from '@/features/meet/lib/services/meetings'
import {
  findBusinessUserId,
  listParticipantsByMeeting,
  listProfiles,
} from '@/features/meet/lib/services/participants'
import { listTopicsByMeeting } from '@/features/meet/lib/services/topics'
import { getTaskOrganization } from '@/features/meet/lib/services/organization'
import type {
  CanonicalTaskRecord,
  ParticipantRecord,
  Profile,
  TaskOrganization,
  TopicRecord,
} from '@/features/meet/lib/types'

export type MeetingQueryStatus =
  | 'loading'
  | 'ready'
  | 'empty'
  | 'not_found'
  | 'unavailable'
  | 'unauthorized'
  | 'expired_session'
  | 'network_error'
  | 'partial_error'

export type ActivityLinkState =
  | { status: 'available'; activity: CanonicalTaskRecord }
  | { status: 'unresolved'; activity: null }
  | { status: 'inaccessible'; activity: null }

export interface MeetingQueryState {
  status: MeetingQueryStatus
  meeting: MeetingWithCompany | null
  topics: TopicRecord[]
  profiles: Profile[]
  participants: ParticipantRecord[]
  activities: CanonicalTaskRecord[]
  activityLinks: Record<string, ActivityLinkState>
  businessUserId: string | null
  organization: TaskOrganization
  error: ServiceError | null
  partialErrors: ServiceError[]
  issues: {
    topics: ServiceError | null
    profiles: ServiceError | null
    participants: ServiceError | null
    activities: ServiceError | null
    businessUser: ServiceError | null
    organization: ServiceError | null
  }
}

export function deriveMeetingCapabilities(
  meeting: MeetingWithCompany | null,
  issues: MeetingQueryState['issues'],
  businessUserId: string | null
) {
  const canMutateTopics = Boolean(meeting && !issues.topics)
  const canCreateActivity = Boolean(
    canMutateTopics &&
      !issues.profiles &&
      !issues.activities &&
      !issues.businessUser &&
      !issues.organization &&
      businessUserId
  )
  return {
    canMutateTopics,
    canCreateActivity,
    canFinalize: canCreateActivity,
    canManageParticipants: Boolean(
      meeting && !issues.participants && !issues.profiles
    ),
  }
}

const emptyIssues: MeetingQueryState['issues'] = {
  topics: null,
  profiles: null,
  participants: null,
  activities: null,
  businessUser: null,
  organization: null,
}

const initialState: MeetingQueryState = {
  status: 'loading',
  meeting: null,
  topics: [],
  profiles: [],
  participants: [],
  activities: [],
  activityLinks: {},
  businessUserId: null,
  organization: { companies: [], departments: [], teams: [], users: [], assignees: [] },
  error: null,
  partialErrors: [],
  issues: emptyIssues,
}

export function statusForError(error: ServiceError): MeetingQueryStatus {
  switch (error.kind) {
    case 'not_found':
      return 'not_found'
    case 'session':
    case 'unauthorized':
    case 'rls':
      return 'unauthorized'
    case 'expired_session':
      return 'expired_session'
    case 'indeterminate':
      return 'unavailable'
    case 'network':
      return 'network_error'
    default:
      return 'partial_error'
  }
}

export function buildActivityLinks(
  requestedIds: string[],
  activities: CanonicalTaskRecord[],
  querySucceeded: boolean
): Record<string, ActivityLinkState> {
  const activitiesById = new Map(
    activities.map((activity) => [activity.id, activity])
  )
  return Object.fromEntries(
    requestedIds.map((activityId) => {
      const activity = activitiesById.get(activityId)
      return [
        activityId,
        activity
          ? { status: 'available' as const, activity }
          : querySucceeded
            ? { status: 'unresolved' as const, activity: null }
            : { status: 'inaccessible' as const, activity: null },
      ]
    })
  )
}

export function useMeetingQuery(meetingId: string) {
  const [state, setState] = useState<MeetingQueryState>(initialState)
  const [requestVersion, setRequestVersion] = useState(0)
  const retry = useCallback(() => setRequestVersion((value) => value + 1), [])

  useEffect(() => {
    let active = true
    setState(initialState)

    async function load() {
      try {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession()
        if (!active) return
        if (sessionError) {
          const error = classifyServiceError(sessionError)
          setState({ ...initialState, status: statusForError(error), error })
          return
        }
        if (!sessionData.session) {
          setState({
            ...initialState,
            status: 'expired_session',
            error: {
              kind: 'expired_session',
              message: 'La sesión no está disponible o expiró.',
            },
          })
          return
        }

        const meetingResult = await getMeetingById(meetingId)
        if (!active) return
        if (meetingResult.ok === false) {
          setState({
            ...initialState,
            status: statusForError(meetingResult.error),
            error: meetingResult.error,
          })
          return
        }

        const [
          topicsResult,
          profilesResult,
          participantsResult,
          organizationResult,
        ] =
          await Promise.all([
            listTopicsByMeeting(meetingId),
            listProfiles(),
            listParticipantsByMeeting(meetingId),
            getTaskOrganization(),
          ])
        if (!active) return

        const partialErrors: ServiceError[] = []
        const issues = { ...emptyIssues }
        const topics = topicsResult.ok ? topicsResult.data : []
        const profiles = profilesResult.ok ? profilesResult.data : []
        const participants = participantsResult.ok ? participantsResult.data : []
        const organization = organizationResult.ok
          ? organizationResult.data
          : initialState.organization
        if (topicsResult.ok === false) {
          issues.topics = topicsResult.error
          partialErrors.push(topicsResult.error)
        }
        if (profilesResult.ok === false) {
          issues.profiles = profilesResult.error
          partialErrors.push(profilesResult.error)
        }
        if (participantsResult.ok === false) {
          issues.participants = participantsResult.error
          partialErrors.push(participantsResult.error)
        }
        if (organizationResult.ok === false) {
          issues.organization = organizationResult.error
          partialErrors.push(organizationResult.error)
        }

        const activityIds = topics
          .map((topic) => topic.actividad_id)
          .filter((id): id is string => Boolean(id))
        let activitiesResult:
          | { ok: true; data: CanonicalTaskRecord[] }
          | { ok: false; error: ServiceError }
        try {
          activitiesResult = { ok: true, data: await getTasks(activityIds) }
        } catch (caught) {
          activitiesResult = { ok: false, error: classifyServiceError(caught) }
        }
        if (!active) return
        const activities = activitiesResult.ok ? activitiesResult.data : []
        if (activitiesResult.ok === false) {
          issues.activities = activitiesResult.error
          partialErrors.push(activitiesResult.error)
        }

        let businessUserId: string | null = null
        if (meetingResult.data.user_id) {
          const businessUserResult = await findBusinessUserId(
            meetingResult.data.user_id
          )
          if (!active) return
          if (businessUserResult.ok === true) businessUserId = businessUserResult.data
          else {
            issues.businessUser = businessUserResult.error
            partialErrors.push(businessUserResult.error)
          }
        }

        const activityLinks = buildActivityLinks(
          activityIds,
          activities,
          activitiesResult.ok
        )

        if (activityIds.some((id) => activityLinks[id]?.status === 'unresolved')) {
          partialErrors.push(
            partialError(
              'Una o más Activities vinculadas no resolvieron. El vínculo puede estar roto o la fila puede estar oculta por RLS (NOT VERIFIED).'
            )
          )
        }

        setState({
          status: partialErrors.length
            ? 'partial_error'
            : topics.length === 0
              ? 'empty'
              : 'ready',
          meeting: meetingResult.data,
          topics,
          profiles,
          participants,
          activities,
          activityLinks,
          businessUserId,
          organization,
          error: null,
          partialErrors,
          issues,
        })
      } catch (caught) {
        if (!active) return
        const error = classifyServiceError(caught)
        setState({ ...initialState, status: statusForError(error), error })
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [meetingId, requestVersion])

  // TASK es la fuente canónica. Refresca sin reiniciar la página para reflejar
  // cambios hechos desde app.stratixsolutions.us y conservar borradores locales.
  useEffect(() => {
    const ids = state.topics.map((topic) => topic.actividad_id).filter((id): id is string => Boolean(id))
    if (!ids.length) return
    let active = true
    const refreshTasks = async () => {
      try {
        const activities = await getTasks(ids)
        if (!active) return
        const activityLinks = buildActivityLinks(ids, activities, true)
        setState((current) => ({ ...current, activities, activityLinks }))
      } catch {
        // La carga principal conserva el error visible; un refresh accesorio no
        // borra datos canónicos previamente disponibles.
      }
    }
    const onVisibility = () => { if (document.visibilityState === 'visible') void refreshTasks() }
    window.addEventListener('focus', refreshTasks)
    document.addEventListener('visibilitychange', onVisibility)
    const timer = window.setInterval(refreshTasks, 30000)
    return () => {
      active = false
      window.removeEventListener('focus', refreshTasks)
      document.removeEventListener('visibilitychange', onVisibility)
      window.clearInterval(timer)
    }
  }, [state.topics])

  const appendTopic = useCallback((topic: TopicRecord) => {
    setState((current) => ({
      ...current,
      topics: [...current.topics, topic],
      status: current.status === 'empty' ? 'ready' : current.status,
    }))
  }, [])
  const removeTopic = useCallback((topicId: string) => {
    setState((current) => ({
      ...current,
      topics: current.topics.filter((topic) => topic.id !== topicId),
    }))
  }, [])
  const replaceTopic = useCallback((topic: TopicRecord) => {
    setState((current) => ({
      ...current,
      topics: current.topics.map((item) =>
        item.id === topic.id ? topic : item
      ),
    }))
  }, [])
  const replaceTopics = useCallback((topics: TopicRecord[]) => {
    setState((current) => ({ ...current, topics }))
  }, [])
  const linkTopicActivity = useCallback(
    (topicId: string, activity: CanonicalTaskRecord) => {
      setState((current) => ({
        ...current,
        topics: current.topics.map((topic) =>
          topic.id === topicId
            ? { ...topic, actividad_id: activity.id }
            : topic
        ),
        activities: [
          ...current.activities.filter((item) => item.id !== activity.id),
          activity,
        ],
        activityLinks: {
          ...current.activityLinks,
          [activity.id]: { status: 'available', activity },
        },
      }))
    },
    []
  )
  const replaceActivity = useCallback((activity: CanonicalTaskRecord) => {
    setState((current) => ({
      ...current,
      activities: current.activities.map((item) =>
        item.id === activity.id ? activity : item
      ),
      activityLinks: {
        ...current.activityLinks,
        [activity.id]: { status: 'available', activity },
      },
    }))
  }, [])
  const patchMeeting = useCallback((patch: Partial<MeetingWithCompany>) => {
    setState((current) => ({
      ...current,
      meeting: current.meeting ? { ...current.meeting, ...patch } : null,
    }))
  }, [])

  const capabilities = deriveMeetingCapabilities(
    state.meeting,
    state.issues,
    state.businessUserId
  )

  return {
    ...state,
    retry,
    appendTopic,
    removeTopic,
    replaceTopic,
    replaceTopics,
    linkTopicActivity,
    replaceActivity,
    patchMeeting,
    capabilities,
  }
}
