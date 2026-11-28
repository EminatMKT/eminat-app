import { useEffect, useState } from 'react'
import type { Row } from '@/features/tasks/components/reporte/WorkerReport/types'
import fetchWorkerTasks from '../fetch-tasks'
import type { FetchState, SetFetchState } from '../types'
import { ABORT_ERROR_NAME } from '../constants'

const INITIAL_FETCH_STATE: FetchState = { tasks: [], error: '', loading: true }

function successState(tasks: Row[]): FetchState {
  return { tasks, error: '', loading: false }
}

function onFetchSuccess(setState: SetFetchState) {
  return (tasks: Row[]) => setState(successState(tasks))
}

function failureState(prev: FetchState, message: string): FetchState {
  return { ...prev, error: message, loading: false }
}

function onFetchFailure(setState: SetFetchState) {
  return (err: Error) => {
    if (err.name === ABORT_ERROR_NAME) return
    setState(prev => failureState(prev, err.message))
  }
}

function runFetchOnce(month: string, signal: AbortSignal, setState: SetFetchState) {
  setState(prev => ({ ...prev, loading: true }))
  fetchWorkerTasks(month, signal)
    .then(onFetchSuccess(setState))
    .catch(onFetchFailure(setState))
}

function runFetch(userId: string | undefined, month: string, setState: SetFetchState) {
  return () => {
    if (!userId) return undefined
    const controller = new AbortController()

    runFetchOnce(month, controller.signal, setState)

    return () => controller.abort()
  }
}

export default function useFetchState(userId: string | undefined, month: string): FetchState {
  const [state, setState] = useState<FetchState>(INITIAL_FETCH_STATE)

  useEffect(runFetch(userId, month, setState), [userId, month])

  return state
}

// Owns the fetch effect and its single piece of state for the worker report; fetchWorkerTasks
// does the request here, this only wires it to an abortable effect, a loading flag, and the
// success/failure updates.
