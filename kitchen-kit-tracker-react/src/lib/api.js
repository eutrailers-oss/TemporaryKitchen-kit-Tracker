import { supabase } from './supabase'
import { normaliseUuid } from './utils'

export async function loadData() {
  const tables = ['assets', 'jobs', 'job_assets', 'customers', 'damage_logs']
  const results = await Promise.all(tables.map((table) => supabase.from(table).select('*')))
  const error = results.find((result) => result.error)?.error
  if (error) throw error
  return Object.fromEntries(tables.map((table, index) => [table, results[index].data || []]))
}

export async function saveJob(job, assetIds) {
  const payload = { ...job, customer_id: normaliseUuid(job.customer_id), value: job.value === '' ? null : Number(job.value) }
  const response = job.id
    ? await supabase.from('jobs').update(payload).eq('id', job.id).select().single()
    : await supabase.from('jobs').insert(payload).select().single()
  if (response.error) throw response.error
  const jobId = response.data.id
  const removed = await supabase.from('job_assets').delete().eq('job_id', jobId)
  if (removed.error) throw removed.error
  if (assetIds.length) {
    const inserted = await supabase.from('job_assets').insert(assetIds.map((asset_id) => ({ job_id: jobId, asset_id })))
    if (inserted.error) throw inserted.error
  }
  return response.data
}

export async function saveCustomer(customer) {
  const response = customer.id
    ? await supabase.from('customers').update(customer).eq('id', customer.id).select().single()
    : await supabase.from('customers').insert(customer).select().single()
  if (response.error) throw response.error
  return response.data
}

export async function saveAsset(asset) {
  const payload = { ...asset, replacement_value: asset.replacement_value === '' ? null : Number(asset.replacement_value) }
  const response = asset.id
    ? await supabase.from('assets').update(payload).eq('id', asset.id).select().single()
    : await supabase.from('assets').insert(payload).select().single()
  if (response.error) throw response.error
  return response.data
}

export async function saveDamage(damage) {
  const payload = { ...damage, job_id: normaliseUuid(damage.job_id), repair_cost: damage.repair_cost === '' ? null : Number(damage.repair_cost) }
  const response = damage.id
    ? await supabase.from('damage_logs').update(payload).eq('id', damage.id).select().single()
    : await supabase.from('damage_logs').insert(payload).select().single()
  if (response.error) throw response.error
  return response.data
}

export async function importAssets(rows) {
  const unique = new Map()
  for (const row of rows) {
    const code = (row.code || row.asset_code || row['Asset Code'] || '').trim()
    if (!code) continue
    unique.set(code, {
      code,
      old_code: row.old_code || row['Old Code'] || null,
      name: row.name || row.asset || row['Asset'] || row['Asset Name'] || 'Unnamed asset',
      category: row.category || row['Category'] || 'Other',
      status: row.status || row['Status'] || 'Available',
      condition: row.condition || row['Condition'] || 'Good',
      location: row.location || row['Location'] || 'Yard',
      serial: row.serial || row['Serial'] || null,
      replacement_value: row.replacement_value || row['Replacement Value'] || null,
      notes: row.notes || row['Notes'] || null,
    })
  }
  const payload = [...unique.values()]
  if (!payload.length) throw new Error('No recognisable asset rows were found. Include a code column.')
  const response = await supabase.from('assets').upsert(payload, { onConflict: 'code' })
  if (response.error) throw response.error
  return payload.length
}
