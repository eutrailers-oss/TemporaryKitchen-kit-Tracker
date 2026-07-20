import { useEffect, useMemo, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { formatDate } from '../lib/utils'

function normaliseScannedValue(value){
  const text=String(value||'').trim()
  if(!text) return ''
  try{
    const url=new URL(text)
    return (url.searchParams.get('code')||url.searchParams.get('asset')||text).trim()
  }catch{return text}
}

export default function Warehouse({ data, scanAsset, setJobWarehouseStatus }) {
  const jobs=useMemo(()=>data.jobs.filter(j=>!['Completed','Cancelled'].includes(j.status)).sort((a,b)=>a.start_date.localeCompare(b.start_date)),[data.jobs])
  const [jobId,setJobId]=useState(jobs[0]?.id||'')
  const [mode,setMode]=useState('load')
  const [code,setCode]=useState('')
  const [condition,setCondition]=useState('Good')
  const [notes,setNotes]=useState('')
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [scanning,setScanning]=useState(false)
  const [cameraError,setCameraError]=useState('')
  const inputRef=useRef(null)
  const videoRef=useRef(null)
  const scannerRef=useRef(null)
  const controlsRef=useRef(null)
  const scanLockRef=useRef(false)
  const job=data.jobs.find(j=>j.id===jobId)
  const rows=data.jobAssets.filter(x=>x.job_id===jobId)
  const loaded=rows.filter(x=>x.out_at&&!x.returned_at)
  const returned=rows.filter(x=>x.returned_at)

  const categoryProgress=useMemo(()=>{
    const map=new Map()
    rows.forEach(r=>{
      const asset=data.assets.find(a=>a.id===r.asset_id)
      const category=asset?.category||'Unknown'
      const current=map.get(category)||{category,required:0,loaded:0,missing:0}
      current.required+=1
      if(r.out_at&&!r.returned_at) current.loaded+=1
      map.set(category,current)
    })
    return [...map.values()].map(x=>({...x,missing:x.required-x.loaded})).sort((a,b)=>a.category.localeCompare(b.category))
  },[rows,data.assets])
  const allLoaded=rows.length>0&&rows.every(r=>r.out_at&&!r.returned_at)

  useEffect(()=>()=>stopScanner(),[])
  useEffect(()=>{stopScanner();setMessage('')},[jobId,mode])

  async function processCode(raw){
    const clean=normaliseScannedValue(raw).toUpperCase()
    if(!clean||scanLockRef.current) return
    scanLockRef.current=true
    setBusy(true);setMessage('')
    try{
      const result=await scanAsset({jobId,code:clean,mode,condition,notes})
      const asset=result.asset||result
      const text=result.substitutedFrom
        ? `✓ ${asset.code} loaded — replaced ${result.substitutedFrom}`
        : `✓ ${asset.code} — ${mode==='load'?'loaded':'returned'}`
      setMessage(text);setCode('');setNotes('');setCondition('Good')
      navigator.vibrate?.(120)
    }catch(err){setMessage(`⚠ ${err.message}`);navigator.vibrate?.([80,60,80])}
    finally{setBusy(false);setTimeout(()=>{scanLockRef.current=false;inputRef.current?.focus()},500)}
  }

  async function submit(e){e?.preventDefault();await processCode(code)}

  async function startScanner(){
    setCameraError('')
    if(!jobId){setMessage('⚠ Select a job first.');return}
    try{
      setScanning(true)
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))
      if(!videoRef.current) throw new Error('Camera view could not be started.')
      const reader=new BrowserMultiFormatReader()
      scannerRef.current=reader
      controlsRef.current=await reader.decodeFromVideoDevice(undefined,videoRef.current,async(result,error)=>{
        if(result&&!scanLockRef.current) await processCode(result.getText())
        if(error&&error.name!=='NotFoundException') setCameraError(error.message||'Scanner error')
      })
    }catch(err){setCameraError(err?.message||'Unable to open the camera.');stopScanner()}
  }

  function stopScanner(){
    controlsRef.current?.stop?.()
    controlsRef.current=null
    scannerRef.current?.reset?.()
    scannerRef.current=null
    setScanning(false)
  }

  async function updateStatus(status){
    setBusy(true);setMessage('')
    try{await setJobWarehouseStatus(jobId,status);setMessage(`✓ Job marked ${status}`)}
    catch(err){setMessage(`⚠ ${err.message}`)}finally{setBusy(false)}
  }

  return <>
    <header className="page-head"><div><h1>Warehouse</h1><p>Scan equipment, validate the kit and record the exact assets leaving the yard.</p></div></header>
    <section className="warehouse-layout">
      <div className="panel warehouse-controls">
        <label className="field"><span>Job</span><select value={jobId} onChange={e=>setJobId(e.target.value)}><option value="">Select job</option>{jobs.map(j=><option key={j.id} value={j.id}>{j.job_no} — {j.customer_name}</option>)}</select></label>
        {job&&<div className="warehouse-job"><b>{job.job_no}</b><span>{job.customer_name}</span><small>{formatDate(job.start_date)} – {formatDate(job.end_date)} · {job.status}</small></div>}
        <div className="mode-switch"><button className={mode==='load'?'active':''} onClick={()=>setMode('load')}>Load out</button><button className={mode==='return'?'active':''} onClick={()=>setMode('return')}>Return in</button></div>

        <div className="camera-actions"><button type="button" className={scanning?'danger':''} onClick={scanning?stopScanner:startScanner}>{scanning?'Stop camera':'📷 Scan QR / barcode'}</button></div>
        {scanning&&<div className="scanner-view"><video ref={videoRef} playsInline muted/><div className="scanner-target"/><span>Point the camera at the asset label</span></div>}
        {cameraError&&<div className="scan-message warn">{cameraError}</div>}

        <form onSubmit={submit} className="scan-form">
          <label className="field"><span>Asset code (manual fallback)</span><input ref={inputRef} autoFocus autoComplete="off" value={code} onChange={e=>setCode(e.target.value)} placeholder="e.g. FRY-002"/></label>
          {mode==='return'&&<label className="field"><span>Condition</span><select value={condition} onChange={e=>setCondition(e.target.value)}><option>Good</option><option>Damaged</option></select></label>}
          <label className="field"><span>Notes (optional)</span><input value={notes} onChange={e=>setNotes(e.target.value)} placeholder={mode==='return'?'Damage details if needed':'Loading note'}/></label>
          <button className="primary scan-button" disabled={busy||!jobId||!code}>{busy?'Saving…':mode==='load'?'Record loaded asset':'Record returned asset'}</button>
        </form>
        {message&&<div className={`scan-message ${message.startsWith('✓')?'ok':'warn'}`}>{message}</div>}
        {job&&<div className="warehouse-actions"><button className="primary" onClick={()=>updateStatus('Out')} disabled={busy||!allLoaded}>Dispatch job</button><button onClick={()=>updateStatus('Returned')} disabled={busy||loaded.length>0}>Mark returned</button></div>}
        {job&&!allLoaded&&mode==='load'&&<p className="dispatch-hint">Dispatch remains locked until every planned item is loaded.</p>}
      </div>
      <div className="panel warehouse-progress">
        <div className="panel-title"><div><h2>Loading check</h2><p>{rows.length} planned · {loaded.length} loaded · {returned.length} returned</p></div>{allLoaded&&<span className="complete-pill">Ready to dispatch</span>}</div>
        {!job?<p className="empty">Select a job to begin.</p>:rows.length===0?<p className="empty">No assets are planned for this job. Add the required assets in Jobs before loading.</p>:<>
          <div className="category-progress">{categoryProgress.map(item=><div className={`category-row ${item.missing===0?'complete':'incomplete'}`} key={item.category}><div><b>{item.category}</b><span>{item.loaded} / {item.required} loaded</span></div><strong>{item.missing===0?'✓':`${item.missing} missing`}</strong><div className="progress-track"><i style={{width:`${Math.round(item.loaded/item.required*100)}%`}}/></div></div>)}</div>
          <h3 className="kit-title">Exact asset list</h3>
          <div className="warehouse-list">{rows.map(r=>{const a=data.assets.find(x=>x.id===r.asset_id);const state=r.returned_at?'Returned':r.out_at?'Out':'Planned';return <div key={r.id} className={`warehouse-item state-${state.toLowerCase()}`}><div><b>{a?.code||'Unknown'}</b><span>{a?.name||''} · {a?.category||''}</span></div><strong>{state}</strong>{r.notes&&<small>{r.notes}</small>}</div>})}</div>
        </>}
      </div>
    </section>
  </>
}
