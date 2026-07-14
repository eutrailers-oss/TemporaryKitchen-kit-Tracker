import { useEffect, useMemo, useState } from 'react'
import Modal from '../components/Modal'
import { saveJob } from '../lib/api'
import { ACTIVE_JOB_STATUSES, overlaps, shortDate, today } from '../lib/utils'

const blankJob = (jobs) => ({ job_no: `TK-${new Date().getFullYear()}-${String(jobs.length + 1).padStart(4, '0')}`, customer_id: '', customer_name: '', site: '', contact_name: '', contact_phone: '', start_date: today(), end_date: today(), status: 'Quoted', value: '', notes: '' })
export default function Jobs({ data, refresh, externalJob, clearExternalJob }) {
  const [editing, setEditing] = useState(externalJob || null)
  const [selected, setSelected] = useState([])
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const open = (job) => { setEditing({ ...(job || blankJob(data.jobs)) }); setSelected(job ? data.job_assets.filter((item) => item.job_id === job.id).map((item) => item.asset_id) : []) }
  useEffect(() => {
    if (!externalJob) return
    setEditing({ ...externalJob })
    setSelected(data.job_assets.filter((item) => item.job_id === externalJob.id).map((item) => item.asset_id))
    clearExternalJob()
  }, [externalJob, data.job_assets, clearExternalJob])
  const unavailable = useMemo(() => new Set(data.job_assets.filter((item) => {
    const job = data.jobs.find((candidate) => candidate.id === item.job_id)
    return job && job.id !== editing?.id && ACTIVE_JOB_STATUSES.includes(job.status) && editing && overlaps(job.start_date, job.end_date, editing.start_date, editing.end_date)
  }).map((item) => item.asset_id)), [data, editing])
  const submit = async () => {
    if (!editing.customer_name.trim()) return alert('Customer name is required.')
    if (editing.end_date < editing.start_date) return alert('End date cannot be before start date.')
    setSaving(true)
    try { await saveJob(editing, selected); setEditing(null); await refresh() } catch (error) { alert(error.message) } finally { setSaving(false) }
  }
  return <section className="panel"><div className="panel-heading"><div><h2>Jobs</h2><p>Create jobs, allocate assets and update hire status.</p></div><button className="primary" onClick={() => open(null)}>New job</button></div>
    <div className="table-wrap"><table><thead><tr><th>Job</th><th>Customer</th><th>Site</th><th>Dates</th><th>Assets</th><th>Status</th></tr></thead><tbody>{data.jobs.sort((a,b)=>b.start_date.localeCompare(a.start_date)).map((job) => <tr key={job.id} onClick={() => open(job)}><td>{job.job_no}</td><td>{job.customer_name}</td><td>{job.site || '—'}</td><td>{shortDate(job.start_date)}–{shortDate(job.end_date)}</td><td>{data.job_assets.filter((item) => item.job_id === job.id).length}</td><td><span className={`badge ${job.status.toLowerCase()}`}>{job.status}</span></td></tr>)}</tbody></table></div>
    {editing && <Modal title={editing.id ? `Edit ${editing.job_no}` : 'New job'} onClose={() => setEditing(null)} actions={<><button onClick={() => setEditing(null)}>Cancel</button><button className="primary" disabled={saving} onClick={submit}>{saving ? 'Saving…' : 'Save job'}</button></>}>
      <div className="form-grid">
        <label>Job number<input value={editing.job_no} onChange={(e)=>setEditing({...editing,job_no:e.target.value})}/></label>
        <label>Customer<select value={editing.customer_id || ''} onChange={(e)=>{const customer=data.customers.find(c=>c.id===e.target.value);setEditing({...editing,customer_id:e.target.value,customer_name:customer?.name||editing.customer_name,contact_name:customer?.contact_name||editing.contact_name,contact_phone:customer?.phone||editing.contact_phone})}}><option value="">No linked customer</option>{data.customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Customer name<input value={editing.customer_name} onChange={(e)=>setEditing({...editing,customer_name:e.target.value})}/></label>
        <label>Site / venue<input value={editing.site || ''} onChange={(e)=>setEditing({...editing,site:e.target.value})}/></label>
        <label>Start<input type="date" value={editing.start_date} onChange={(e)=>setEditing({...editing,start_date:e.target.value})}/></label>
        <label>End<input type="date" value={editing.end_date} onChange={(e)=>setEditing({...editing,end_date:e.target.value})}/></label>
        <label>Status<select value={editing.status} onChange={(e)=>setEditing({...editing,status:e.target.value})}>{['Quoted','Confirmed','Out','Returned','Completed','Cancelled'].map(s=><option key={s}>{s}</option>)}</select></label>
        <label>Value (£)<input type="number" value={editing.value ?? ''} onChange={(e)=>setEditing({...editing,value:e.target.value})}/></label>
        <label className="full">Notes<textarea value={editing.notes || ''} onChange={(e)=>setEditing({...editing,notes:e.target.value})}/></label>
      </div>
      <div className="asset-picker-heading"><h3>Allocate assets <span>{selected.length} selected</span></h3><input placeholder="Search assets" value={search} onChange={(e)=>setSearch(e.target.value)} /></div>
      <div className="asset-picker">{data.assets.filter((a)=>(`${a.code} ${a.name} ${a.category}`).toLowerCase().includes(search.toLowerCase())).map((asset) => {const isSelected=selected.includes(asset.id);const blocked=unavailable.has(asset.id)&&!isSelected;return <button type="button" key={asset.id} disabled={blocked} className={`${isSelected?'selected ':''}${blocked?'blocked':''}`} onClick={()=>setSelected(isSelected?selected.filter(id=>id!==asset.id):[...selected,asset.id])}><strong>{asset.code}</strong><span>{asset.name}</span></button>})}</div>
    </Modal>}
  </section>
}
