import { useEffect, useMemo, useState } from 'react'
import { hasSupabaseConfig, supabase } from './lib/supabase'
import { ACTIVE_JOB_STATUSES, isoDate, overlap, uuidOrNull } from './lib/utils'
import Layout from './components/Layout'
import Modal from './components/Modal'
import Dashboard from './pages/Dashboard'
import Jobs from './pages/Jobs'
import Assets from './pages/Assets'
import Customers from './pages/Customers'
import Damage from './pages/Damage'
import Admin from './pages/Admin'
import Warehouse from './pages/Warehouse'

const emptyData = { assets: [], jobs: [], jobAssets: [], customers: [], damage: [] }

function Field({label, children}) { return <label className="field"><span>{label}</span>{children}</label> }
function Input({label,...props}) { return <Field label={label}><input {...props}/></Field> }
function Select({label,children,...props}) { return <Field label={label}><select {...props}>{children}</select></Field> }
function Textarea({label,...props}) { return <Field label={label}><textarea {...props}/></Field> }

export default function App() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [page, setPage] = useState('dashboard')
  const [data, setData] = useState(emptyData)
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null)
  const [notice, setNotice] = useState('')

  useEffect(()=>{
    if (!supabase) { setAuthReady(true); return }
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setAuthReady(true)})
    const {data:sub}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s))
    return ()=>sub.subscription.unsubscribe()
  },[])
  useEffect(()=>{ if(session) loadAll() },[session])

  async function loadAll() {
    setLoading(true)
    const [assets,jobs,jobAssets,customers,damage] = await Promise.all([
      supabase.from('assets').select('*'), supabase.from('jobs').select('*'), supabase.from('job_assets').select('*'), supabase.from('customers').select('*'), supabase.from('damage_logs').select('*'),
    ])
    const error = [assets,jobs,jobAssets,customers,damage].find(x=>x.error)?.error
    if (error) setNotice(error.message)
    else setData({assets:assets.data||[],jobs:jobs.data||[],jobAssets:jobAssets.data||[],customers:customers.data||[],damage:damage.data||[]})
    setLoading(false)
  }
  function flash(message) { setNotice(message); setTimeout(()=>setNotice(''),3500) }
  async function log(message,type='change') { await supabase.from('activity_log').insert({event_type:type,message,user_email:session?.user?.email||''}) }

  async function saveCustomer(form, id) {
    const payload = {name:form.name.trim(),contact_name:form.contact_name||null,email:form.email||null,phone:form.phone||null,billing_address:form.billing_address||null,notes:form.notes||null}
    if(!payload.name) throw new Error('Customer name is required.')
    const q=id?supabase.from('customers').update(payload).eq('id',id):supabase.from('customers').insert(payload)
    const {error}=await q; if(error) throw error
    await log(`${id?'Updated':'Created'} customer ${payload.name}`,'customer'); await loadAll(); setModal(null); flash('Customer saved')
  }
  function openCustomer(id) {
    const c=id?data.customers.find(x=>x.id===id):{name:'',contact_name:'',email:'',phone:'',billing_address:'',notes:''}
    setModal({type:'customer',id,form:{...c}})
  }

  async function saveAsset(form,id) {
    const payload={code:form.code.trim().toUpperCase(),old_code:form.old_code||null,name:form.name.trim(),category:form.category.trim()||'Other',status:form.status,condition:form.condition,location:form.location||'Yard',serial:form.serial||null,replacement_value:form.replacement_value===''?null:Number(form.replacement_value),notes:form.notes||null}
    if(!payload.code||!payload.name) throw new Error('Code and asset name are required.')
    const q=id?supabase.from('assets').update(payload).eq('id',id):supabase.from('assets').insert(payload)
    const {error}=await q; if(error) throw error
    await log(`${id?'Updated':'Created'} asset ${payload.code}`,'asset'); await loadAll(); setModal(null); flash('Asset saved')
  }
  function openAsset(id) {
    const a=id?data.assets.find(x=>x.id===id):{code:'',old_code:'',name:'',category:'',status:'Available',condition:'Good',location:'Yard',serial:'',replacement_value:'',notes:''}
    setModal({type:'asset',id,form:{...a}})
  }

  function nextJobNo() {
    const year=new Date().getFullYear(); const nums=data.jobs.map(j=>Number(String(j.job_no).match(/(\d+)$/)?.[1]||0)); return `TK-${year}-${String(Math.max(0,...nums)+1).padStart(4,'0')}`
  }
  function openJob(id) {
    const j=id?data.jobs.find(x=>x.id===id):{job_no:nextJobNo(),customer_id:'',customer_name:'',site:'',contact_name:'',contact_phone:'',start_date:isoDate(),end_date:isoDate(),status:'Quoted',value:'',notes:''}
    const selected=id?data.jobAssets.filter(x=>x.job_id===id).map(x=>x.asset_id):[]
    setModal({type:'job',id,form:{...j},selected})
  }
  function isAssetFree(assetId,start,end,ignoreJobId) {
    return !data.jobAssets.some(ja=>{
      if(ja.asset_id!==assetId) return false
      const j=data.jobs.find(x=>x.id===ja.job_id)
      return j && j.id!==ignoreJobId && ACTIVE_JOB_STATUSES.includes(j.status) && overlap(start,end,j.start_date,j.end_date)
    })
  }
  async function saveJob(form,id,selected) {
    const payload={job_no:form.job_no.trim(),customer_id:uuidOrNull(form.customer_id),customer_name:form.customer_name.trim(),site:form.site||null,contact_name:form.contact_name||null,contact_phone:form.contact_phone||null,start_date:form.start_date,end_date:form.end_date,status:form.status,value:form.value===''?null:Number(form.value),notes:form.notes||null}
    if(!payload.job_no||!payload.customer_name) throw new Error('Job number and customer are required.')
    if(payload.end_date<payload.start_date) throw new Error('End date cannot be before start date.')
    const clashes=selected.filter(assetId=>!isAssetFree(assetId,payload.start_date,payload.end_date,id))
    if(clashes.length) throw new Error(`${clashes.length} selected asset(s) clash with another active job.`)
    const result=id?await supabase.from('jobs').update(payload).eq('id',id).select().single():await supabase.from('jobs').insert(payload).select().single()
    if(result.error) throw result.error
    const jobId=id||result.data.id
    const existing=data.jobAssets.filter(x=>x.job_id===jobId)
    const locked=new Set(existing.filter(x=>x.out_at&&!x.returned_at).map(x=>x.asset_id))
    const attemptedRemoval=[...locked].filter(assetId=>!selected.includes(assetId))
    if(attemptedRemoval.length) throw new Error('Return loaded assets before removing them from this job.')
    const removable=existing.filter(x=>!selected.includes(x.asset_id)&&(!x.out_at||x.returned_at)).map(x=>x.id)
    if(removable.length){const del=await supabase.from('job_assets').delete().in('id',removable);if(del.error)throw del.error}
    const existingIds=new Set(existing.map(x=>x.asset_id))
    const additions=selected.filter(assetId=>!existingIds.has(assetId))
    if(additions.length){const ins=await supabase.from('job_assets').insert(additions.map(asset_id=>({job_id:jobId,asset_id})));if(ins.error)throw ins.error}
    await log(`${id?'Updated':'Created'} job ${payload.job_no} with ${selected.length} assets`,'job')
    await loadAll(); setModal(null); flash('Job saved')
  }

  function openDamage(id) {
    const d=id?data.damage.find(x=>x.id===id):{asset_id:'',job_id:'',reported_date:isoDate(),reported_by:session?.user?.email||'',severity:'Medium',status:'Open',repair_cost:'',notes:''}
    setModal({type:'damage',id,form:{...d}})
  }
  async function saveDamage(form,id) {
    const payload={asset_id:uuidOrNull(form.asset_id),job_id:uuidOrNull(form.job_id),reported_date:form.reported_date,reported_by:form.reported_by||null,severity:form.severity,status:form.status,repair_cost:form.repair_cost===''?null:Number(form.repair_cost),notes:form.notes||null}
    if(!payload.asset_id) throw new Error('Select an asset.')
    const q=id?supabase.from('damage_logs').update(payload).eq('id',id):supabase.from('damage_logs').insert(payload)
    const {error}=await q;if(error)throw error
    const condition=['Open','In Repair'].includes(payload.status)?(payload.status==='In Repair'?'In Repair':'Damaged'):'Good'
    await supabase.from('assets').update({condition,status:condition==='In Repair'?'In Repair':'Available'}).eq('id',payload.asset_id)
    await log(`${id?'Updated':'Logged'} damage record`,'damage');await loadAll();setModal(null);flash('Damage saved')
  }

  async function scanAsset({jobId, code, mode, condition='Good', notes=''}) {
    const raw=String(code||'').trim()
    let clean=raw.toUpperCase()
    try {
      const scannedUrl=new URL(raw)
      clean=(scannedUrl.searchParams.get('code')||scannedUrl.searchParams.get('asset')||raw).trim().toUpperCase()
    } catch {}
    if(!jobId) throw new Error('Select a job first.')
    if(!clean) throw new Error('Scan or enter an asset code.')
    const asset=data.assets.find(a=>String(a.code||'').toUpperCase()===clean||String(a.old_code||'').toUpperCase()===clean||String(a.id||'').toUpperCase()===clean)
    if(!asset) throw new Error(`Asset ${clean} was not found.`)
    const job=data.jobs.find(j=>j.id===jobId)
    if(!job) throw new Error('Job was not found.')
    const rows=data.jobAssets.filter(x=>x.job_id===jobId)
    const row=rows.find(x=>x.asset_id===asset.id)

    if(mode==='load') {
      if(asset.condition!=='Good'||['In Repair','Lost','Retired'].includes(asset.status)) throw new Error(`${asset.code} is ${asset.condition||asset.status} and cannot be loaded.`)
      const other=data.jobAssets.find(x=>x.asset_id===asset.id&&x.job_id!==jobId&&x.out_at&&!x.returned_at)
      if(other){const otherJob=data.jobs.find(j=>j.id===other.job_id);throw new Error(`${asset.code} is already out on ${otherJob?.job_no||'another job'}.`)}
      if(row?.out_at&&!row?.returned_at) throw new Error(`${asset.code} is already loaded on this job.`)

      const now=new Date().toISOString()
      let action='loaded'
      let replacedAsset=null
      if(row){
        const {error}=await supabase.from('job_assets').update({out_at:now,returned_at:null,return_condition:null,notes:notes||row.notes||null}).eq('id',row.id);if(error)throw error
      } else if(rows.length) {
        const category=String(asset.category||'').trim().toLowerCase()
        const substituteRow=rows.find(r=>{
          if(r.out_at&&!r.returned_at) return false
          const planned=data.assets.find(a=>a.id===r.asset_id)
          return String(planned?.category||'').trim().toLowerCase()===category
        })
        if(!substituteRow) {
          const required=[...new Set(rows.map(r=>data.assets.find(a=>a.id===r.asset_id)?.category).filter(Boolean))]
          throw new Error(`${asset.code} is the wrong item for this job. Required types: ${required.join(', ')||'none'}.`)
        }
        replacedAsset=data.assets.find(a=>a.id===substituteRow.asset_id)||null
        const {error}=await supabase.from('job_assets').update({asset_id:asset.id,out_at:now,returned_at:null,return_condition:null,notes:notes||substituteRow.notes||null}).eq('id',substituteRow.id);if(error)throw error
        action='substituted'
      } else {
        const {error}=await supabase.from('job_assets').insert({job_id:jobId,asset_id:asset.id,out_at:now,notes:notes||null});if(error)throw error
      }
      const {error:assetError}=await supabase.from('assets').update({status:'On Hire'}).eq('id',asset.id);if(assetError)throw assetError
      await log(action==='substituted'?`Substituted ${replacedAsset?.code||'planned asset'} with ${asset.code} on ${job.job_no}`:`Loaded ${asset.code} onto ${job.job_no}`,'warehouse')
      await loadAll(); flash(action==='substituted'?`${asset.code} substituted and loaded`:`${asset.code} loaded`); return {asset,action,replacedAsset}
    }

    if(!row||!row.out_at||row.returned_at) throw new Error(`${asset.code} is not currently out on this job.`)
    const now=new Date().toISOString()
    const {error}=await supabase.from('job_assets').update({returned_at:now,return_condition:condition,notes:notes||row.notes||null}).eq('id',row.id);if(error)throw error
    const damaged=condition==='Damaged'
    const {error:assetError}=await supabase.from('assets').update({status:damaged?'In Repair':'Available',condition:damaged?'Damaged':'Good'}).eq('id',asset.id);if(assetError)throw assetError
    if(damaged){const {error:damageError}=await supabase.from('damage_logs').insert({asset_id:asset.id,job_id:jobId,reported_date:isoDate(),reported_by:session?.user?.email||null,severity:'Medium',status:'Open',notes:notes||'Damage recorded during return'});if(damageError)throw damageError}
    await log(`Returned ${asset.code} from ${job.job_no}${damaged?' as damaged':''}`,'warehouse')
    await loadAll(); flash(`${asset.code} returned`); return {asset,action:'returned'}
  }

  async function setJobWarehouseStatus(jobId,status){
    const job=data.jobs.find(j=>j.id===jobId); if(!job) throw new Error('Job not found.')
    const rows=data.jobAssets.filter(x=>x.job_id===jobId)
    if(status==='Out'&&(!rows.length||rows.some(x=>!x.out_at||x.returned_at))) throw new Error('The full kit must be loaded before dispatch.')
    if(status==='Returned'&&rows.some(x=>x.out_at&&!x.returned_at)) throw new Error('Return every loaded asset before marking the job returned.')
    const {error}=await supabase.from('jobs').update({status}).eq('id',jobId);if(error)throw error
    await log(`${job.job_no} marked ${status}`,'warehouse');await loadAll();flash(`Job marked ${status}`)
  }

  async function importAssets(rows) {
    const byCode=new Map()
    rows.forEach(r=>{const code=(r.code||r.asset_code||'').trim().toUpperCase();if(code)byCode.set(code,{code,old_code:r.old_code||null,name:(r.name||r.asset||r.asset_name||code).trim(),category:(r.category||r.type||'Other').trim(),status:r.status||'Available',condition:r.condition||'Good',location:r.location||'Yard',serial:r.serial||null,replacement_value:r.replacement_value||null,notes:r.notes||null})})
    const payload=[...byCode.values()]
    if(!payload.length){flash('No valid asset rows found');return}
    const {error}=await supabase.from('assets').upsert(payload,{onConflict:'code'});if(error){flash(error.message);return}
    await log(`Imported ${payload.length} asset rows`,'import');await loadAll();flash(`${payload.length} asset rows imported`)
  }

  if(!hasSupabaseConfig) return <div className="center-card"><h1>Kitchen Kit Tracker</h1><p>Supabase environment variables are missing.</p><code>VITE_SUPABASE_URL<br/>VITE_SUPABASE_ANON_KEY</code></div>
  if(!authReady) return <div className="loading">Loading…</div>
  if(!session) return <Login />

  const pageProps={data,openJob,openAsset,openCustomer,openDamage,setPage,importAssets,refresh:loadAll,scanAsset,setJobWarehouseStatus}
  return <Layout page={page} setPage={setPage} user={session.user} signOut={()=>supabase.auth.signOut()}>
    {loading&&<div className="top-loading">Refreshing…</div>}
    {notice&&<div className="notice">{notice}</div>}
    {page==='dashboard'&&<Dashboard {...pageProps}/>} {page==='jobs'&&<Jobs {...pageProps}/>} {page==='assets'&&<Assets {...pageProps}/>} {page==='customers'&&<Customers {...pageProps}/>} {page==='damage'&&<Damage {...pageProps}/>} {page==='warehouse'&&<Warehouse {...pageProps}/>} {page==='admin'&&<Admin {...pageProps}/>} 
    {modal&&<EditorModal modal={modal} setModal={setModal} data={data} saveCustomer={saveCustomer} saveAsset={saveAsset} saveJob={saveJob} saveDamage={saveDamage} isAssetFree={isAssetFree}/>} 
  </Layout>
}

function Login(){
  const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false)
  async function submit(e){e.preventDefault();setBusy(true);setError('');const {error}=await supabase.auth.signInWithPassword({email,password});if(error)setError(error.message);setBusy(false)}
  return <div className="login-page"><form className="login-card" onSubmit={submit}><div className="brand-mark large">KK</div><h1>Kitchen Kit Tracker</h1><p>Sign in to the shared hire system.</p>{error&&<div className="form-error">{error}</div>}<Input label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/><Input label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/><button className="primary wide" disabled={busy}>{busy?'Signing in…':'Sign in'}</button></form></div>
}

function EditorModal({modal,setModal,data,saveCustomer,saveAsset,saveJob,saveDamage,isAssetFree}){
  const [form,setForm]=useState(modal.form);const [selected,setSelected]=useState(modal.selected||[]);const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [search,setSearch]=useState('')
  const set=(key,value)=>setForm(f=>({...f,[key]:value}))
  async function save(){setBusy(true);setError('');try{if(modal.type==='customer')await saveCustomer(form,modal.id);if(modal.type==='asset')await saveAsset(form,modal.id);if(modal.type==='job')await saveJob(form,modal.id,selected);if(modal.type==='damage')await saveDamage(form,modal.id)}catch(e){setError(e.message)}finally{setBusy(false)}}
  const actions=<><button onClick={()=>setModal(null)}>Cancel</button><button className="primary" disabled={busy} onClick={save}>{busy?'Saving…':'Save'}</button></>
  if(modal.type==='customer')return <Modal title={modal.id?'Edit customer':'New customer'} onClose={()=>setModal(null)} actions={actions}><div className="form-grid"><Input label="Company name" value={form.name} onChange={e=>set('name',e.target.value)}/><Input label="Contact name" value={form.contact_name||''} onChange={e=>set('contact_name',e.target.value)}/><Input label="Email" value={form.email||''} onChange={e=>set('email',e.target.value)}/><Input label="Phone" value={form.phone||''} onChange={e=>set('phone',e.target.value)}/><Textarea label="Billing address" value={form.billing_address||''} onChange={e=>set('billing_address',e.target.value)}/><Textarea label="Notes" value={form.notes||''} onChange={e=>set('notes',e.target.value)}/></div>{error&&<div className="form-error">{error}</div>}</Modal>
  if(modal.type==='asset')return <Modal title={modal.id?'Edit asset':'New asset'} onClose={()=>setModal(null)} actions={actions}><div className="form-grid"><Input label="Asset code" value={form.code} onChange={e=>set('code',e.target.value)}/><Input label="Old code" value={form.old_code||''} onChange={e=>set('old_code',e.target.value)}/><Input label="Asset name" value={form.name} onChange={e=>set('name',e.target.value)}/><Input label="Category" value={form.category} onChange={e=>set('category',e.target.value)}/><Select label="Status" value={form.status} onChange={e=>set('status',e.target.value)}>{['Available','On Hire','In Repair','Lost','Retired'].map(x=><option key={x}>{x}</option>)}</Select><Select label="Condition" value={form.condition} onChange={e=>set('condition',e.target.value)}>{['Good','Damaged','In Repair','Lost','Retired'].map(x=><option key={x}>{x}</option>)}</Select><Input label="Location" value={form.location||''} onChange={e=>set('location',e.target.value)}/><Input label="Serial" value={form.serial||''} onChange={e=>set('serial',e.target.value)}/><Input label="Replacement value" type="number" value={form.replacement_value??''} onChange={e=>set('replacement_value',e.target.value)}/><Textarea label="Notes" value={form.notes||''} onChange={e=>set('notes',e.target.value)}/></div>{modal.id&&<div className="qr-box"><img alt="Asset QR" src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`${location.origin}/?asset=${modal.id}`)}`}/><span>QR for {form.code}</span></div>}{error&&<div className="form-error">{error}</div>}</Modal>
  if(modal.type==='damage')return <Modal title={modal.id?'Edit damage':'Log damage'} onClose={()=>setModal(null)} actions={actions}><div className="form-grid"><Select label="Asset" value={form.asset_id||''} onChange={e=>set('asset_id',e.target.value)}><option value="">Select asset</option>{data.assets.map(a=><option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}</Select><Select label="Related job" value={form.job_id||''} onChange={e=>set('job_id',e.target.value)}><option value="">No job</option>{data.jobs.map(j=><option key={j.id} value={j.id}>{j.job_no} — {j.customer_name}</option>)}</Select><Input label="Reported date" type="date" value={form.reported_date} onChange={e=>set('reported_date',e.target.value)}/><Input label="Reported by" value={form.reported_by||''} onChange={e=>set('reported_by',e.target.value)}/><Select label="Severity" value={form.severity} onChange={e=>set('severity',e.target.value)}>{['Low','Medium','High'].map(x=><option key={x}>{x}</option>)}</Select><Select label="Status" value={form.status} onChange={e=>set('status',e.target.value)}>{['Open','In Repair','Repaired','Charged','Written Off'].map(x=><option key={x}>{x}</option>)}</Select><Input label="Repair cost" type="number" value={form.repair_cost??''} onChange={e=>set('repair_cost',e.target.value)}/><Textarea label="Notes" value={form.notes||''} onChange={e=>set('notes',e.target.value)}/></div>{error&&<div className="form-error">{error}</div>}</Modal>
  const filtered=data.assets.filter(a=>(`${a.code} ${a.name} ${a.category}`).toLowerCase().includes(search.toLowerCase()))
  return <Modal title={modal.id?'Edit job':'New job'} onClose={()=>setModal(null)} actions={actions}><div className="form-grid"><Input label="Job number" value={form.job_no} onChange={e=>set('job_no',e.target.value)}/><Select label="Customer record" value={form.customer_id||''} onChange={e=>{const c=data.customers.find(x=>x.id===e.target.value);set('customer_id',e.target.value);if(c)setForm(f=>({...f,customer_id:c.id,customer_name:c.name,contact_name:c.contact_name||'',contact_phone:c.phone||''}))}}><option value="">No linked customer</option>{data.customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</Select><Input label="Customer name" value={form.customer_name} onChange={e=>set('customer_name',e.target.value)}/><Input label="Site / venue" value={form.site||''} onChange={e=>set('site',e.target.value)}/><Input label="Contact name" value={form.contact_name||''} onChange={e=>set('contact_name',e.target.value)}/><Input label="Contact phone" value={form.contact_phone||''} onChange={e=>set('contact_phone',e.target.value)}/><Input label="Start date" type="date" value={form.start_date} onChange={e=>set('start_date',e.target.value)}/><Input label="End date" type="date" value={form.end_date} onChange={e=>set('end_date',e.target.value)}/><Select label="Status" value={form.status} onChange={e=>set('status',e.target.value)}>{['Quoted','Confirmed','Out','Returned','Completed','Cancelled'].map(x=><option key={x}>{x}</option>)}</Select><Input label="Value" type="number" value={form.value??''} onChange={e=>set('value',e.target.value)}/><Textarea label="Notes" value={form.notes||''} onChange={e=>set('notes',e.target.value)}/></div><div className="allocation-head"><div><h3>Assign assets</h3><p>{selected.length} selected. Unavailable assets cannot be selected.</p></div><input placeholder="Search equipment" value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="asset-picker">{filtered.map(a=>{const free=isAssetFree(a.id,form.start_date,form.end_date,modal.id);const chosen=selected.includes(a.id);const usable=a.condition==='Good'&& !['Lost','Retired','In Repair'].includes(a.status);return <button type="button" key={a.id} disabled={!chosen&&(!free||!usable)} className={`${chosen?'selected':''} ${!free?'clash':''}`} onClick={()=>setSelected(s=>chosen?s.filter(x=>x!==a.id):[...s,a.id])}><b>{a.code}</b><span>{a.name}</span><small>{!usable?a.condition:free?'Available':'Booked'}</small></button>})}</div>{error&&<div className="form-error">{error}</div>}</Modal>
}
