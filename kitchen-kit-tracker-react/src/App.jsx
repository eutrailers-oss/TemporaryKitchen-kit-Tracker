import { useCallback, useEffect, useState } from 'react'
import Layout from './components/Layout'
import { loadData } from './lib/api'
import { configurationError, supabase } from './lib/supabase'
import Login from './features/Login'
import Dashboard from './features/Dashboard'
import Jobs from './features/Jobs'
import Assets from './features/Assets'
import Customers from './features/Customers'
import Damage from './features/Damage'
import Admin from './features/Admin'

const emptyData={assets:[],jobs:[],job_assets:[],customers:[],damage_logs:[]}
export default function App(){const[session,setSession]=useState(null),[data,setData]=useState(emptyData),[active,setActive]=useState('Dashboard'),[loading,setLoading]=useState(true),[error,setError]=useState(''),[externalJob,setExternalJob]=useState(null)
const refresh=useCallback(async()=>{setLoading(true);setError('');try{setData(await loadData())}catch(e){setError(e.message)}finally{setLoading(false)}},[])
useEffect(()=>{if(configurationError){setLoading(false);return}supabase.auth.getSession().then(({data:{session}})=>{setSession(session);if(session)refresh();else setLoading(false)});const{data:listener}=supabase.auth.onAuthStateChange((_event,next)=>{setSession(next);if(next)refresh();else setData(emptyData)});return()=>listener.subscription.unsubscribe()},[refresh])
if(configurationError)return <div className="configuration-card"><h1>Kitchen Kit Tracker</h1><p>Supabase environment variables are missing.</p><code>VITE_SUPABASE_URL<br/>VITE_SUPABASE_ANON_KEY</code><p>Add them in Netlify → Site configuration → Environment variables, then redeploy.</p></div>
if(!session)return <Login/>
const page=()=>{if(active==='Dashboard')return <Dashboard data={data} onJob={(job)=>{setExternalJob(job);setActive('Jobs')}}/>;if(active==='Jobs')return <Jobs data={data} refresh={refresh} externalJob={externalJob} clearExternalJob={()=>setExternalJob(null)}/>;if(active==='Assets')return <Assets data={data} refresh={refresh}/>;if(active==='Customers')return <Customers data={data} refresh={refresh}/>;if(active==='Damage')return <Damage data={data} refresh={refresh}/>;return <Admin data={data} refresh={refresh}/>}
return <Layout active={active} setActive={setActive} user={session.user} onSignOut={()=>supabase.auth.signOut()}>{error&&<div className="error-banner">{error}</div>}{loading?<div className="loading">Loading shared data…</div>:page()}</Layout>}
