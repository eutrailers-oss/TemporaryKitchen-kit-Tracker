import { useEffect, useMemo, useRef, useState } from 'react'
import { formatDate } from '../lib/utils'

function CameraScanner({ active, onScan, onClose }) {
  const videoRef=useRef(null)
  const controlsRef=useRef(null)
  const lastRef=useRef({value:'',at:0})
  const onScanRef=useRef(onScan)
  const [error,setError]=useState('')
  const [starting,setStarting]=useState(false)

  useEffect(()=>{onScanRef.current=onScan},[onScan])
  useEffect(()=>{
    if(!active) return
    let cancelled=false
    setError('')
    setStarting(true)

    async function start(){
      try{
        if(!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access is not available in this browser.')
        const {BrowserMultiFormatReader}=await import('@zxing/browser')
        if(cancelled) return
        const reader=new BrowserMultiFormatReader()
        controlsRef.current=await reader.decodeFromConstraints(
          {video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false},
          videoRef.current,
          (result,scanError)=>{
            if(cancelled||!result) return
            const value=result.getText()?.trim()
            const now=Date.now()
            if(value&&(lastRef.current.value!==value||now-lastRef.current.at>2500)){
              lastRef.current={value,at:now}
              navigator.vibrate?.(120)
              onScanRef.current(value)
            }
          }
        )
      }catch(e){
        if(!cancelled) setError(e?.message||'Unable to open the camera. Check camera permission and try again.')
      }finally{
        if(!cancelled) setStarting(false)
      }
    }

    start()
    return ()=>{
      cancelled=true
      controlsRef.current?.stop?.()
      controlsRef.current=null
      const stream=videoRef.current?.srcObject
      stream?.getTracks?.().forEach(track=>track.stop())
    }
  },[active])

  if(!active) return null
  return <div className="scanner-card">
    <div className="scanner-head"><strong>Scan asset label</strong><button type="button" onClick={onClose}>Close camera</button></div>
    {error?<div className="scan-message warn">{error}<br/><small>You can still type the asset code below.</small></div>:<>
      <video ref={videoRef} muted playsInline/>
      <div className="scanner-guide"><span></span></div>
      <p>{starting?'Opening camera…':'Hold the QR code or barcode inside the frame. Each successful scan is recorded automatically.'}</p>
    </>}
  </div>
}

export default function Warehouse({ data, scanAsset, setJobWarehouseStatus }) {
  const jobs=useMemo(()=>data.jobs.filter(j=>!['Completed','Cancelled'].includes(j.status)).sort((a,b)=>a.start_date.localeCompare(b.start_date)),[data.jobs])
  const [jobId,setJobId]=useState(jobs[0]?.id||'')
  const [mode,setMode]=useState('load')
  const [code,setCode]=useState('')
  const [condition,setCondition]=useState('Good')
  const [notes,setNotes]=useState('')
  const [busy,setBusy]=useState(false)
  const [camera,setCamera]=useState(false)
  const [message,setMessage]=useState('')
  const inputRef=useRef(null)
  const job=data.jobs.find(j=>j.id===jobId)
  const rows=data.jobAssets.filter(x=>x.job_id===jobId)
  const loaded=rows.filter(x=>x.out_at&&!x.returned_at)
  const returned=rows.filter(x=>x.returned_at)
  const complete=rows.length>0&&rows.every(x=>x.out_at&&!x.returned_at)

  const progress=useMemo(()=>{
    const groups=new Map()
    rows.forEach(r=>{
      const asset=data.assets.find(a=>a.id===r.asset_id)
      const category=asset?.category||'Other'
      const item=groups.get(category)||{category,required:0,loaded:0,missing:[]}
      item.required+=1
      if(r.out_at&&!r.returned_at)item.loaded+=1
      else item.missing.push(asset?.code||'Unknown')
      groups.set(category,item)
    })
    return [...groups.values()].sort((a,b)=>a.category.localeCompare(b.category))
  },[rows,data.assets])

  useEffect(()=>{if(!jobId&&jobs[0])setJobId(jobs[0].id)},[jobs,jobId])

  async function submit(e,scannedCode){
    e?.preventDefault()
    if(busy)return
    const value=String(scannedCode??code).trim()
    setBusy(true);setMessage('')
    try{
      const result=await scanAsset({jobId,code:value,mode,condition,notes})
      const asset=result.asset
      const text=result.action==='substituted'
        ?`✓ ${asset.code} loaded — replaced ${result.replacedAsset?.code||'planned item'}`
        :`✓ ${asset.code} — ${mode==='load'?'loaded':'returned'}`
      setMessage(text);setCode('');setNotes('');setCondition('Good')
    }catch(err){setMessage(`⚠ ${err.message}`)}finally{setBusy(false);setTimeout(()=>inputRef.current?.focus(),50)}
  }

  async function updateStatus(status){
    setBusy(true);setMessage('')
    try{await setJobWarehouseStatus(jobId,status);setMessage(status==='Out'?'✓ Job dispatched':'✓ Job marked returned')}
    catch(err){setMessage(`⚠ ${err.message}`)}finally{setBusy(false)}
  }

  return <>
    <header className="page-head"><div><h1>Warehouse</h1><p>Scan the exact equipment leaving and returning to the yard.</p></div></header>
    <section className="warehouse-layout">
      <div className="panel warehouse-controls">
        <label className="field"><span>Job</span><select value={jobId} onChange={e=>{setJobId(e.target.value);setMessage('')}}><option value="">Select job</option>{jobs.map(j=><option key={j.id} value={j.id}>{j.job_no} — {j.customer_name}</option>)}</select></label>
        {job&&<div className="warehouse-job"><b>{job.job_no}</b><span>{job.customer_name}</span><small>{formatDate(job.start_date)} – {formatDate(job.end_date)} · {job.status}</small></div>}
        <div className="mode-switch"><button type="button" className={mode==='load'?'active':''} onClick={()=>{setMode('load');setCamera(false)}}>Load out</button><button type="button" className={mode==='return'?'active':''} onClick={()=>{setMode('return');setCamera(false)}}>Return in</button></div>
        <button type="button" className="camera-button" disabled={!jobId} onClick={()=>setCamera(v=>!v)}>📷 {camera?'Stop camera':'Scan QR / barcode'}</button>
        <CameraScanner active={camera&&Boolean(jobId)} onClose={()=>setCamera(false)} onScan={value=>submit(null,value)}/>
        <form onSubmit={submit} className="scan-form">
          <label className="field"><span>Asset code (manual fallback)</span><input ref={inputRef} autoFocus autoComplete="off" value={code} onChange={e=>setCode(e.target.value)} placeholder="e.g. OVN-001"/></label>
          {mode==='return'&&<label className="field"><span>Condition</span><select value={condition} onChange={e=>setCondition(e.target.value)}><option>Good</option><option>Damaged</option></select></label>}
          <label className="field"><span>Notes (optional)</span><input value={notes} onChange={e=>setNotes(e.target.value)} placeholder={mode==='return'?'Damage details if needed':'Loading note'}/></label>
          <button className="primary scan-button" disabled={busy||!jobId||!code}>{busy?'Saving…':mode==='load'?'Record loaded asset':'Record returned asset'}</button>
        </form>
        {message&&<div className={`scan-message ${message.startsWith('✓')?'ok':'warn'}`}>{message}</div>}
        {job&&<div className="warehouse-actions"><button className="primary" onClick={()=>updateStatus('Out')} disabled={busy||!complete}>Dispatch job</button><button onClick={()=>updateStatus('Returned')} disabled={busy||loaded.length>0||!rows.length}>Mark returned</button></div>}
        {job&&!complete&&rows.length>0&&<p className="dispatch-note">Dispatch is locked until every planned item has been loaded.</p>}
      </div>
      <div className="panel warehouse-progress">
        <div className="panel-title"><div><h2>Loading progress</h2><p>{rows.length} required · {loaded.length} loaded · {returned.length} returned</p></div>{complete&&<span className="complete-pill">Ready to dispatch</span>}</div>
        {!job?<p className="empty">Select a job to begin.</p>:rows.length===0?<p className="empty">No assets are planned for this job. Add the required equipment to the job before loading.</p>:<>
          <div className="category-progress">{progress.map(g=><div key={g.category} className={g.loaded===g.required?'complete':''}><div><b>{g.category}</b><strong>{g.loaded} / {g.required}</strong></div><progress max={g.required} value={g.loaded}/>{g.missing.length>0&&<small>Missing: {g.missing.join(', ')}</small>}</div>)}</div>
          <h3 className="kit-heading">Exact job asset list</h3>
          <div className="warehouse-list">{rows.map(r=>{const a=data.assets.find(x=>x.id===r.asset_id);const state=r.returned_at?'Returned':r.out_at?'Out':'Planned';return <div key={r.id} className={`warehouse-item state-${state.toLowerCase()}`}><div><b>{a?.code||'Unknown'}</b><span>{a?.name||''} · {a?.category||'Other'}</span></div><strong>{state}</strong>{r.return_condition&&<small>{r.return_condition}</small>}</div>})}</div>
        </>}
      </div>
    </section>
  </>
}
