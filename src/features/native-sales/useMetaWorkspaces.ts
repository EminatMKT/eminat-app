'use client'
import {useEffect,useState} from 'react'
import {supabase} from '@/shared/db/supabase'
import {useApp} from '@/shared/context/AppContext'
import type {MetaOrganization} from './meta-navigation'
export function useMetaWorkspaces() {
  const {usuario}=useApp()
  const [state,setState]=useState<{userId?:string;organizations:MetaOrganization[];loading:boolean;error:boolean}>({organizations:[],loading:true,error:false})
  const userId=usuario?.id
  useEffect(()=>{
    let cancelled=false
    async function load(){
      try {
        const {data:{session}}=await supabase.auth.getSession()
        if(!session || !userId)throw new Error('AUTHENTICATION_REQUIRED')
        const response=await fetch('/api/sales-native/social/workspaces',{cache:'no-store',
          headers:{Authorization:`Bearer ${session.access_token}`}})
        if(!response.ok)throw new Error('META_ACCESS_UNAVAILABLE')
        const body=await response.json() as {data:MetaOrganization[]}
        if(!cancelled)setState({userId,organizations:body.data,loading:false,error:false})
      } catch {if(!cancelled)setState({userId,organizations:[],loading:false,error:true})}
    }
    void load()
    return()=>{cancelled=true}
  },[userId])
  return state.userId===userId ? state : {organizations:[],loading:true,error:false}
}
