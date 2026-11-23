'use client'
import {useEffect,useState} from 'react'
import {useApp} from '@/shared/context/AppContext'
import {readMetaWorkspaces,type MetaOrganization} from './meta-navigation'
import {sessionFetch} from './session-fetch'
export function useMetaWorkspaces() {
  const {usuario}=useApp()
  const [state,setState]=useState<{userId?:string;organizations:MetaOrganization[];loading:boolean;error:boolean}>({organizations:[],loading:true,error:false})
  const userId=usuario?.id
  useEffect(()=>{
    let cancelled=false
    async function load(){
      try {
        if(!userId)throw new Error('AUTHENTICATION_REQUIRED')
        const body=await sessionFetch('social/workspaces')
        const organizations=readMetaWorkspaces(body)
        if(!cancelled)setState({userId,organizations,loading:false,error:false})
      } catch {if(!cancelled)setState({userId,organizations:[],loading:false,error:true})}
    }
    void load()
    return()=>{cancelled=true}
  },[userId])
  return state.userId===userId ? state : {organizations:[],loading:true,error:false}
}
