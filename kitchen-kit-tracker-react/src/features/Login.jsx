import { useState } from 'react'
import { supabase } from '../lib/supabase'
export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const submit = async (event) => {
    event.preventDefault(); setMessage('Signing in…')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setMessage(error ? error.message : '')
  }
  return <div className="login-page"><form className="login-card" onSubmit={submit}>
    <h1>Kitchen Kit Tracker</h1><p>Sign in to the shared hire system.</p>
    <label>Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
    <label>Password<input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
    <button className="primary" type="submit">Sign in</button>{message && <p className="form-message">{message}</p>}
  </form></div>
}
