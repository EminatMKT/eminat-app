'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/shared/db/supabase'
import {
  MEETING_MODALITY_OPTIONS,
  MEETING_TYPE_OPTIONS,
  meetingModalityLabel,
  meetingTypeLabel,
  type Company,
  type Meeting,
  type MeetingModality,
  type MeetingType,
  type Profile,
} from '@/features/meet/lib/types'
import { recordMeetingEvent } from '@/features/meet/lib/services/meeting-history'
import { ensureMeetingActivity } from '@/features/meet/lib/services/meeting-activity'
import { getTaskCatalogs } from '@/features/meet/lib/services/task-api'
import { usePreferences } from '@/features/meet/lib/preferences'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand'

export default function NewMeetingPage() {
  const router = useRouter()
  const { locale } = usePreferences()
  const copy = locale === 'es' ? {
    title: 'Nueva reunión', intro: 'Define los datos de la sesión y sus convocados.', name: 'Nombre de la reunión', namePlaceholder: 'Ej. Reunión semanal de operaciones', company: 'Empresa', selectCompany: 'Selecciona una empresa', type: 'Tipo de reunión', selectType: 'Selecciona un tipo', objective: 'Objetivo', objectivePlaceholder: '¿Qué se busca lograr en esta reunión?', date: 'Fecha', modality: 'Modalidad', start: 'Hora de inicio', end: 'Hora de fin', location: 'Lugar', video: 'Enlace de la videollamada', room: 'Sala / dirección', people: 'Convocados', invitees: 'convocados', search: 'Buscar por nombre…', loadingUsers: 'Cargando usuarios…', noUsers: 'No hay usuarios que coincidan.', invitee: 'Convocado', creating: 'Creando…', create: 'Crear reunión', cancel: 'Cancelar', created: 'Reunión creada', loading: 'Cargando…',
  } : {
    title: 'New meeting', intro: 'Set up the session details and invitees.', name: 'Meeting name', namePlaceholder: 'e.g. Weekly operations meeting', company: 'Company', selectCompany: 'Select a company', type: 'Meeting type', selectType: 'Select a type', objective: 'Objective', objectivePlaceholder: 'What should this meeting accomplish?', date: 'Date', modality: 'Format', start: 'Start time', end: 'End time', location: 'Location', video: 'Video call link', room: 'Room / address', people: 'Invitees', invitees: 'invitees', search: 'Search by name…', loadingUsers: 'Loading users…', noUsers: 'No matching users.', invitee: 'Invited', creating: 'Creating…', create: 'Create meeting', cancel: 'Cancel', created: 'Meeting created', loading: 'Loading…',
  }

  // Catálogos desde el CRM
  const [companies, setCompanies] = useState<Company[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loadingCatalogs, setLoadingCatalogs] = useState(true)

  // Campos del formulario
  const [name, setName] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [meetingType, setMeetingType] = useState<MeetingType | ''>('')
  const [objective, setObjective] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [modality, setModality] = useState<MeetingModality>('presencial')
  const [startTime, setStartTime] = useState(() =>
    new Date().toTimeString().slice(0, 5)
  )
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState('')
  const [inviteeIds, setInviteeIds] = useState<string[]>([])
  const [participantSearch, setParticipantSearch] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadCatalogs() {
      try {
        const [catalogs, { data: p, error: profilesError }] = await Promise.all([
          getTaskCatalogs(),
          supabase
            .from('usuarios')
            .select('id, nombre_display, nombre, apellido')
            .order('nombre'),
        ])
        if (profilesError) throw profilesError
        setCompanies((catalogs.companies as Company[]) ?? [])
        setProfiles((p as Profile[]) ?? [])
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'No se pudieron cargar los catálogos.')
      } finally {
        setLoadingCatalogs(false)
      }
    }
    void loadCatalogs()
  }, [])

  const profileName = (p: Profile) =>
    p.nombre_display || `${p.nombre ?? ''} ${p.apellido ?? ''}`.trim() || p.id

  const filteredProfiles = useMemo(() => {
    const q = participantSearch.trim().toLowerCase()
    if (!q) return profiles
    return profiles.filter((p) => profileName(p).toLowerCase().includes(q))
  }, [profiles, participantSearch])

  function toggleInvitee(id: string) {
    setInviteeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !companyId) return
    if (endTime && endTime < startTime) {
      setError('La hora de fin no puede ser anterior a la hora de inicio.')
      return
    }
    setSaving(true)
    setError(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      setError(locale === 'es' ? 'La sesión expiró.' : 'Your session expired.')
      return
    }
    const company = companies.find((item) => item.id === companyId)
    const { data: creatorProfile } = await supabase
      .from('usuarios')
      .select('id, nombre_display, nombre, apellido')
      .eq('auth_id', user.id)
      .maybeSingle()
    if (!company?.codigo || !creatorProfile?.id) {
      setSaving(false)
      setError(locale === 'es' ? 'No se pudo identificar la empresa o el responsable en StratixCRM.' : 'The company or assignee could not be identified in StratixCRM.')
      return
    }

    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .insert({
        title: name.trim(),
        company_id: companyId || null,
        meeting_type: meetingType || null,
        objective: objective.trim() || null,
        modality,
        location: location.trim() || null,
        meeting_date: date,
        start_time: startTime,
        end_time: endTime || null,
        participants: [],
        status: 'activa',
        user_id: user?.id,
      })
      .select()
      .single()

    if (meetingError || !meeting) {
      setSaving(false)
      setError(meetingError?.message ?? 'No se pudo crear la reunión.')
      return
    }

    // Relación N:N de convocados con perfiles identificables.
    if (inviteeIds.length > 0) {
      const rows = inviteeIds.map((profile_id) => ({
        meeting_id: (meeting as Meeting).id,
        profile_id,
      }))
      const { error: partError } = await supabase
        .from('meeting_participants')
        .insert(rows)
      if (partError) {
        setSaving(false)
        setError(
          `Reunión creada, pero falló al guardar convocados: ${partError.message}`
        )
        return
      }
    }

    await recordMeetingEvent(
      (meeting as Meeting).id,
      'meeting_created',
      `${copy.created}: ${(meeting as Meeting).title}`
    )
    try {
      const linked = await ensureMeetingActivity({
        meeting: meeting as Meeting,
        creatorProfileId: creatorProfile.id,
        creatorAuthId: user.id,
        companyCode: company.codigo,
      })
      await recordMeetingEvent(
        (meeting as Meeting).id,
        'task_created',
        `${locale === 'es' ? 'Activity de reunión creada en StratixCRM' : 'Meeting Activity created in StratixCRM'}: ${(meeting as Meeting).title}`,
        { activity_id: linked.activity.id, topic_id: linked.topic.id, kind: 'meeting_activity' }
      )
    } catch {
      router.push(`/meetings/${(meeting as Meeting).id}?crmLink=failed`)
      return
    }
    router.push(`/meetings/${(meeting as Meeting).id}`)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">{copy.title}</h1>
      <p className="mt-1 text-sm text-gray-500">
        {copy.intro}
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        {/* Nombre */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {copy.name}
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder={copy.namePlaceholder}
            className={inputClass}
          />
        </div>

        {/* Empresa + Tipo */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {copy.company}
            </label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className={inputClass}
              disabled={loadingCatalogs}
            >
              <option value="">
                {loadingCatalogs ? copy.loading : copy.selectCompany}
              </option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {copy.type}
            </label>
            <select
              value={meetingType}
              onChange={(e) => setMeetingType(e.target.value as MeetingType)}
              className={inputClass}
            >
              <option value="">{copy.selectType}</option>
              {MEETING_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {meetingTypeLabel(t, locale)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Objetivo */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {copy.objective}
          </label>
          <textarea
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            rows={2}
            placeholder={copy.objectivePlaceholder}
            className={inputClass}
          />
        </div>

        {/* Fecha + Modalidad */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {copy.date}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {copy.modality}
            </label>
            <select
              value={modality}
              onChange={(e) => setModality(e.target.value as MeetingModality)}
              className={inputClass}
            >
              {MEETING_MODALITY_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {meetingModalityLabel(m, locale)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Hora inicio + fin */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {copy.start}
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {copy.end}
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {/* Lugar */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {copy.location}
          </label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={
              modality === 'virtual'
                ? copy.video
                : copy.room
            }
            className={inputClass}
          />
        </div>

        {/* La asistencia se registra dentro de la reunión; aquí sólo se convoca. */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              {copy.people}
            </label>
            <span className="text-xs text-gray-400">
              {inviteeIds.length} {copy.invitees}
            </span>
          </div>
          <input
            value={participantSearch}
            onChange={(e) => setParticipantSearch(e.target.value)}
            placeholder={copy.search}
            className={`${inputClass} mb-2`}
          />
          <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200">
            {loadingCatalogs ? (
              <p className="p-3 text-sm text-gray-400">{copy.loadingUsers}</p>
            ) : filteredProfiles.length === 0 ? (
              <p className="p-3 text-sm text-gray-400">
                {copy.noUsers}
              </p>
            ) : (
              filteredProfiles.map((p) => (
                <div
                  key={p.id}
                  className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-gray-100 px-3 py-2 text-sm last:border-b-0 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <span className="text-gray-900">{profileName(p)}</span>
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={inviteeIds.includes(p.id)}
                      onChange={() => toggleInvitee(p.id)}
                      className="rounded border-gray-300 text-brand focus:ring-brand"
                    />
                    {copy.invitee}
                  </label>
                </div>
              ))
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {saving ? copy.creating : copy.create}
          </button>
          <button
            type="button"
            onClick={() => router.push('/meetings')}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            {copy.cancel}
          </button>
        </div>
      </form>
    </div>
  )
}
