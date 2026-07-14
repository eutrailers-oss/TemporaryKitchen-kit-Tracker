import { parseCsv } from '../lib/utils'
export default function Admin({ data, importAssets, refresh }) {
  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const rows = parseCsv(await file.text())
    await importAssets(rows)
    e.target.value = ''
  }
  return <><header className="page-head"><div><h1>Admin</h1><p>Import assets and check the shared database.</p></div><button onClick={refresh}>Refresh all data</button></header>
  <section className="panel admin-grid"><div><h2>Asset CSV import</h2><p>Export the Excel asset list as CSV. Existing codes are updated and new codes are added. Nothing is deleted.</p><label className="file-button">Choose CSV<input type="file" accept=".csv,text/csv" onChange={handleFile}/></label><p className="hint">Recommended headers: code, old_code, name, category, status, condition, location, serial, replacement_value, notes</p></div><div><h2>Database totals</h2><ul><li>{data.assets.length} assets</li><li>{data.jobs.length} jobs</li><li>{data.customers.length} customers</li><li>{data.damage.length} damage records</li></ul></div></section></>
}
