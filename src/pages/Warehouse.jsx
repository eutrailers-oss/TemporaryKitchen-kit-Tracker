import { useMemo, useRef, useState } from 'react'
import { formatDate } from '../lib/utils'

export default function Warehouse({ data, scanAsset, setJobWarehouseStatus }) {
  const jobs=useMemo(()=>data.jobs.filter(j=>!['Completed','Cancelled'].includes(j.status)).sort((a,b)=>a.start_date.localeCompare(b.start_date)),[data.jobs])
  const [jobId,setJobId]=useState(jobs[0]?.id||'')
  const [mode,setMode]=useState('load')
  const [code,setCode]=useState('')
  const [condition,setCondition]=useState('Good')
  const [notes,setNotes]=useState('')
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const inputRef=useRef(null)
  const job=data.jobs.find(j=>j.id===jobId)
  const rows=data.jobAssets.filter(x=>x.job_id===jobId)
  const loaded=rows.filter(x=>x.out_at&&!x.returned_at)
  const returned=rows.filter(x=>x.returned_at)

  async function submit(e){
    e?.preventDefault();setBusy(true);setMessage('')
    try{const asset=await scanAsset({jobId,code,mode,condition,notes});setMessage(`✓ ${asset.code} — ${mode==='load'?'loaded':'returned'}`);setCode('');setNotes('');setCondition('Good')}
    catch(err){setMessage(`⚠ ${err.message}`)}finally{setBusy(false);setTimeout(()=>inputRef.current?.focus(),50)}
  }

  return <>
    <header className="page-head"><div><h1>Warehouse</h1><p>Scan equipment as it leaves and returns.</p></div></header>
    <section className="warehouse-layout">
      <div className="panel warehouse-controls">
        <label className="field"><span>Job</span><select value={jobId} onChange={e=>setJobId(e.target.value)}><option value="">Select job</option>{jobs.map(j=><option key={j.id} value={j.id}>{j.job_no} — {j.customer_name}</option>)}</select></label>
        {job&&<div className="warehouse-job"><b>{job.job_no}</b><span>{job.customer_name}</span><small>{formatDate(job.start_date)} – {formatDate(job.end_date)} · {job.status}</small></div>}
        <div className="mode-switch"><button className={mode==='load'?'active':''} onClick={()=>setMode('load')}>Load out</button><button className={mode==='return'?'active':''} onClick={()=>setMode('return')}>Return in</button></div>
        <form onSubmit={submit} className="scan-form">
          <label className="field"><span>Scan asset QR/barcode or type code</span><input ref={inputRef} autoFocus autoComplete="off" value={code} onChange={e=>setCode(e.target.value)} placeholder="e.g. OVN-001"/></label>
          {mode==='return'&&<label className="field"><span>Condition</span><select value={condition} onChange={e=>setCondition(e.target.value)}><option>Good</option><option>Damaged</option></select></label>}
          <label className="field"><span>Notes (optional)</span><input value={notes} onChange={e=>setNotes(e.target.value)} placeholder={mode==='return'?'Damage details if needed':'Loading note'}/></label>
          <button className="primary scan-button" disabled={busy||!jobId||!code}>{busy?'Saving…':mode==='load'?'Record loaded asset':'Record returned asset'}</button>
        </form>
        {message&&<div className={`scan-message ${message.startsWith('✓')?'ok':'warn'}`}>{message}</div>}
        {job&&<div className="warehouse-actions"><button onClick={()=>setJobWarehouseStatus(jobId,'Out')}>Dispatch job</button><button onClick={()=>setJobWarehouseStatus(jobId,'Returned')} disabled={loaded.length>0}>Mark returned</button></div>}
      </div>
      <div className="panel warehouse-progress">
        <div className="panel-title"><div><h2>Live job kit</h2><p>{rows.length} allocated · {loaded.length} currently out · {returned.length} returned</p></div></div>
        {!job?<p className="empty">Select a job to begin.</p>:rows.length===0?<p className="empty">No assets allocated yet. Scanning an asset in Load out mode will add it to this job.</p>:<div className="warehouse-list">{rows.map(r=>{const a=data.assets.find(x=>x.id===r.asset_id);const state=r.returned_at?'Returned':r.out_at?'Out':'Planned';return <div key={r.id} className={`warehouse-item state-${state.toLowerCase()}`}><div><b>{a?.code||'Unknown'}</b><span>{a?.name||''}</span></div><strong>{state}</strong>{r.return_condition&&<small>{r.return_condition}</small>}</div>})}</div>}
      </div>
    </section>
  </>
}
