import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchApplications, updateApplication } from './api.js'
import './App.css'

const ACCESS_CODE = '12344564'
const UNLOCK_STORAGE = 'techgeeks_unlocked'

const API_KEY = import.meta.env.VITE_APP_KEY || ''

const MAX_TEAMS = 2

const TEAMS = [
  { value: 'dev', label: 'التطوير', color: '#3B82F6' },
  { value: 'design', label: 'التصميم', color: '#EC4899' },
  { value: 'managment', label: 'التسيير', color: '#F97316' },
  { value: 'media', label: 'الميديا', color: '#22C55E' },
]

const STATUS = [
  { value: 'pending', label: 'قيد المراجعة', cls: 'pending' },
  { value: 'accepted', label: 'مقبول', cls: 'accepted' },
  { value: 'rejected', label: 'مرفوض', cls: 'rejected' },
]

function Logo({ className = 'logo-mark' }) {
  return (
    <svg className={className} viewBox="0 0 100 60" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="brand" x1="0" y1="0" x2="100" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F97316" />
          <stop offset="0.5" stopColor="#EC4899" />
          <stop offset="1" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
      <path
        d="M50 12C30 12 10 12 10 30C10 48 30 48 50 48C70 48 90 48 90 30C90 12 70 12 50 12Z"
        stroke="url(#brand)"
        strokeWidth="11"
        strokeLinecap="round"
      />
      <circle cx="24" cy="30" r="6" fill="#F97316" />
      <circle cx="76" cy="30" r="6" fill="#3B82F6" />
    </svg>
  )
}

function parseList(value) {
  if (!value) return []
  if (Array.isArray(value)) return value.map(String)
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed.map(String)
  } catch {
    /* not json */
  }
  return String(value)
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((s) => s.trim().replace(/^"|"$/g, ''))
    .filter(Boolean)
}

function teamsOf(row) {
  const t = row.teams
  if (!t) return []
  if (Array.isArray(t)) return t.map(String).filter(Boolean)
  try {
    const parsed = JSON.parse(t)
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean)
  } catch {
    /* plain string */
  }
  return String(t) ? [String(t)] : []
}

function statusOf(row) {
  if (row.accepted === true) return 'accepted'
  if (row.accepted === false) return 'rejected'
  return 'pending'
}

function FilterChip({ active, onClick, children }) {
  return (
    <button type="button" className={`chip${active ? ' active' : ''}`} onClick={onClick}>
      {children}
    </button>
  )
}

function TeamEditor({ value, onChange, disabled }) {
  const selected = teamsOf({ teams: value })
  const available = TEAMS.filter((t) => !selected.includes(t.value))

  function toggle(team) {
    const exists = selected.includes(team)
    if (exists) {
      onChange(selected.filter((t) => t !== team))
    } else if (selected.length < MAX_TEAMS) {
      onChange([...selected, team])
    }
  }

  return (
    <div className="teams-cell">
      {selected.map((team) => {
        const meta = TEAMS.find((t) => t.value === team)
        return (
          <span className="team-chip" key={team}>
            <span className="dot" style={{ background: meta?.color || '#cbd5e1' }} />
            {meta?.label || team}
            <button
              type="button"
              aria-label={`إزالة ${meta?.label || team}`}
              onClick={() => toggle(team)}
              disabled={disabled}
            >
              ×
            </button>
          </span>
        )
      })}
      {!selected.length && <span className="no-team">بدون فريق</span>}
      {available.length > 0 && selected.length < MAX_TEAMS && (
        <select
          className="team-add"
          value=""
          onChange={(e) => e.target.value && toggle(e.target.value)}
          disabled={disabled}
        >
          <option value="">+ إضافة فريق</option>
          {available.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      )}
    </div>
  )
}

function NoteEditor({ value, onSave, disabled }) {
  const [status, setStatus] = useState('idle')
  const inputRef = useRef(null)
  const savedRef = useRef(value || '')

  async function commit() {
    const current = inputRef.current?.value ?? ''
    if (current === (savedRef.current || '')) return
    setStatus('saving')
    try {
      await onSave(current)
      savedRef.current = current
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 1500)
    } catch {
      setStatus('idle')
    }
  }

  return (
    <div className="note-cell">
      <input
        key={value ?? ''}
        ref={inputRef}
        type="text"
        defaultValue={value || ''}
        placeholder="أضف ملاحظة…"
        disabled={disabled}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            inputRef.current?.blur()
          }
        }}
      />
      {status === 'saving' && <span className="note-status">…</span>}
      {status === 'saved' && <span className="note-status ok">تم</span>}
    </div>
  )
}

function Gate({ onUnlock }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  function submit(e) {
    e.preventDefault()
    if (code.trim() === ACCESS_CODE) {
      localStorage.setItem(UNLOCK_STORAGE, '1')
      onUnlock()
    } else {
      setError('كود الدخول غير صحيح، حاول مرة أخرى.')
    }
  }

  return (
    <div className="gate">
      <div className="gate-card">
        <Logo className="logo-mark gate-logo" />
        <h1>TechGeeks</h1>
        <p className="muted">لوحة إدارة طلبات الانضمام</p>
        <form onSubmit={submit}>
          <label htmlFor="access-code">أدخل كود الدخول</label>
          <input
            id="access-code"
            type="password"
            inputMode="numeric"
            value={code}
            onChange={(e) => { setCode(e.target.value); setError('') }}
            placeholder="••••••••"
            autoFocus
          />
          {error && <span className="gate-error">{error}</span>}
          <button type="submit" className="btn primary gate-btn">دخول</button>
        </form>
      </div>
    </div>
  )
}

function Dashboard({ onLock }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [pendingIds, setPendingIds] = useState({})
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  const notify = useCallback((message, type = 'success') => {
    setToast({ message, type })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3200)
  }, [])

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      const data = await fetchApplications(API_KEY)
      setRows(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    async function run() {
      await Promise.resolve()
      if (!active) return
      setLoading(true)
      try {
        const data = await fetchApplications(API_KEY)
        if (active) {
          setRows(data || [])
          setError('')
        }
      } catch (err) {
        if (active) setError(err.message)
      } finally {
        if (active) setLoading(false)
      }
    }

    run()
    return () => {
      active = false
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      const matchQuery =
        !q ||
        String(r.full_name || '').toLowerCase().includes(q) ||
        String(r.email || '').toLowerCase().includes(q)
      const matchFilter = filter === 'all' || statusOf(r) === filter
      return matchQuery && matchFilter
    })
  }, [rows, query, filter])

  const stats = useMemo(() => {
    const s = { total: rows.length, accepted: 0, rejected: 0, pending: 0 }
    rows.forEach((r) => {
      s[statusOf(r)] += 1
    })
    return s
  }, [rows])

  async function handleUpdate(id, patch, options = {}) {
    setPendingIds((p) => ({ ...p, [id]: true }))
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
    try {
      await updateApplication(API_KEY, id, patch)
      if (!options.silent) notify('تم حفظ التعديل بنجاح')
    } catch (err) {
      notify(err.message, 'error')
      refresh()
    } finally {
      setPendingIds((p) => {
        const next = { ...p }
        delete next[id]
        return next
      })
    }
  }

  function handleStatus(id, value) {
    const accepted = value === 'pending' ? null : value === 'accepted'
    handleUpdate(id, { accepted })
  }

  function handleTeams(id, teams) {
    if (teams.length > MAX_TEAMS) {
      notify(`يمكن الانضمام إلى ${MAX_TEAMS} فرق كحد أقصى`, 'error')
      return
    }
    handleUpdate(id, { teams })
  }

  function handleNote(id, note) {
    return handleUpdate(id, { note }, { silent: true })
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <Logo />
          <div className="brand-text">
            <h1>TechGeeks</h1>
            <span>COMPUTER SCIENCE CLUB</span>
          </div>
        </div>
        <div className="top-actions">
          <button type="button" className="btn ghost" onClick={refresh} disabled={loading}>
            {loading ? 'جارٍ التحميل…' : 'تحديث'}
          </button>
          <button type="button" className="btn ghost" onClick={onLock}>
            تسجيل الخروج
          </button>
        </div>
      </header>

      <main className="content">
        <section className="hero">
          <div>
            <h2>إدارة طلبات الانضمام</h2>
            <p>تابع طلبات أعضاء النادي وحدّد حالة القبول والفريق أو الفريقان المنضم إليهما.</p>
          </div>
        </section>

        <section className="stats">
          <article className="stat">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">إجمالي الطلبات</span>
          </article>
          <article className="stat accepted">
            <span className="stat-value">{stats.accepted}</span>
            <span className="stat-label">مقبول</span>
          </article>
          <article className="stat pending">
            <span className="stat-value">{stats.pending}</span>
            <span className="stat-label">قيد المراجعة</span>
          </article>
          <article className="stat rejected">
            <span className="stat-value">{stats.rejected}</span>
            <span className="stat-label">مرفوض</span>
          </article>
        </section>

        <section className="toolbar">
          <label className="search">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث بالاسم أو البريد الإلكتروني…"
            />
          </label>
          <div className="chips">
            <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>الكل</FilterChip>
            <FilterChip active={filter === 'accepted'} onClick={() => setFilter('accepted')}>مقبول</FilterChip>
            <FilterChip active={filter === 'pending'} onClick={() => setFilter('pending')}>قيد المراجعة</FilterChip>
            <FilterChip active={filter === 'rejected'} onClick={() => setFilter('rejected')}>مرفوض</FilterChip>
          </div>
        </section>

        {error && <div className="alert error">{error}</div>}

        <section className="table-card">
          {filtered.length === 0 && !loading ? (
            <div className="empty">
              {query || filter !== 'all' ? 'لا توجد نتائج مطابقة للبحث.' : 'لا توجد طلبات بعد.'}
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th className="num">#</th>
                    <th>الاسم الكامل</th>
                    <th>البريد الإلكتروني</th>
                    <th>التخصص</th>
                    <th>السنة الدراسية</th>
                    <th>الدافع</th>
                    <th>الاهتمامات</th>
                    <th>المهارات</th>
                    <th>حالة القبول</th>
                    <th>الفرق</th>
                    <th>ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.id} className={pendingIds[row.id] ? 'saving' : ''}>
                      <td className="num">{row.id}</td>
                      <td className="name">{row.full_name || '—'}</td>
                      <td className="email">{row.email || '—'}</td>
                      <td>{row.major || '—'}</td>
                      <td>{row.academic_year || '—'}</td>
                      <td className="truncate" title={row.motivation || ''}>{row.motivation || '—'}</td>
                      <td>
                        <div className="tags">
                          {parseList(row.interests).length
                            ? parseList(row.interests).map((t) => <span key={t} className="tag">{t}</span>)
                            : '—'}
                        </div>
                      </td>
                      <td className="truncate" title={row.skills || ''}>{row.skills || '—'}</td>
                      <td>
                        <div className="select-wrap status">
                          <span className={`dot ${statusOf(row)}`} />
                          <select
                            value={statusOf(row)}
                            onChange={(e) => handleStatus(row.id, e.target.value)}
                            disabled={pendingIds[row.id]}
                          >
                            {STATUS.map((s) => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="teams-col">
                        <TeamEditor
                          value={teamsOf(row)}
                          onChange={(teams) => handleTeams(row.id, teams)}
                          disabled={pendingIds[row.id]}
                        />
                      </td>
                      <td className="note-col">
                        <NoteEditor
                          value={row.note}
                          onSave={(note) => handleNote(row.id, note)}
                          disabled={pendingIds[row.id]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <footer className="table-foot">
            عرض {filtered.length} من أصل {rows.length} طلب
          </footer>
        </section>
      </main>

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  )
}

export default function App() {
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem(UNLOCK_STORAGE) === '1')

  if (!unlocked) {
    return <Gate onUnlock={() => setUnlocked(true)} />
  }

  function lock() {
    localStorage.removeItem(UNLOCK_STORAGE)
    setUnlocked(false)
  }

  return <Dashboard onLock={lock} />
}
