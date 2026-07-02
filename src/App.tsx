import { useState } from 'react'
import type { CatalogItem } from './types'
import { StoreProvider, useStore } from './store'
import { FeedScreen } from './screens/FeedScreen'
import { SearchScreen } from './screens/SearchScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { FriendsScreen } from './screens/FriendsScreen'
import { AuthScreen } from './screens/AuthScreen'
import { RankFlow } from './components/RankFlow'

type Tab = 'feed' | 'friends' | 'search' | 'profile'

function Shell() {
  const { profile, incoming } = useStore()
  const [tab, setTab] = useState<Tab>('feed')
  const [rankTarget, setRankTarget] = useState<CatalogItem | null>(null)
  const [viewingUserId, setViewingUserId] = useState<string | null>(null)

  function openProfile(id: string) {
    setViewingUserId(id === profile?.id ? null : id)
    setTab('profile')
  }

  function goTab(next: Tab) {
    if (next === 'profile') setViewingUserId(null)
    setTab(next)
  }

  return (
    <div className="phone">
      <main className="content">
        {tab === 'feed' && <FeedScreen onOpenProfile={openProfile} />}
        {tab === 'friends' && <FriendsScreen onOpenProfile={openProfile} />}
        {tab === 'search' && <SearchScreen onRank={setRankTarget} />}
        {tab === 'profile' && (
          <ProfileScreen
            userId={viewingUserId ?? profile!.id}
            onRank={setRankTarget}
            onOpenProfile={openProfile}
            onBack={viewingUserId ? () => { setViewingUserId(null); setTab('feed') } : undefined}
          />
        )}
      </main>

      <nav className="tab-bar">
        <TabButton icon="🏠" label="Feed" active={tab === 'feed'} onClick={() => goTab('feed')} />
        <TabButton
          icon="👥" label="Friends" active={tab === 'friends'}
          badge={incoming.length} onClick={() => goTab('friends')}
        />
        <button className="tab-add" onClick={() => goTab('search')} aria-label="Rank">
          <span>+</span>
        </button>
        <TabButton icon="👤" label="Profile" active={tab === 'profile' && !viewingUserId} onClick={() => goTab('profile')} />
      </nav>

      {rankTarget && <RankFlow item={rankTarget} onClose={() => setRankTarget(null)} />}
    </div>
  )
}

function TabButton({
  icon, label, active, onClick, badge = 0,
}: {
  icon: string; label: string; active: boolean; onClick: () => void; badge?: number
}) {
  return (
    <button className={`tab-btn${active ? ' active' : ''}`} onClick={onClick}>
      <span className="tab-icon">
        {icon}
        {badge > 0 && <span className="tab-badge">{badge}</span>}
      </span>
      <span className="tab-label">{label}</span>
    </button>
  )
}

function Gate() {
  const { configured, ready, session } = useStore()
  if (!configured) return <ConfigNeeded />
  if (!ready) {
    return (
      <div className="phone center-screen">
        <span className="spinner big" />
      </div>
    )
  }
  if (!session) return <div className="phone"><AuthScreen /></div>
  return <Shell />
}

function ConfigNeeded() {
  return (
    <div className="phone center-screen">
      <div className="auth-card">
        <h1 className="logo auth-logo">Tempo</h1>
        <p className="config-msg">
          This build isn't connected to a database yet. Add your Supabase
          <code> VITE_SUPABASE_URL </code> and <code> VITE_SUPABASE_ANON_KEY </code>
          (see <code>SETUP-SUPABASE.md</code>), then rebuild.
        </p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Gate />
    </StoreProvider>
  )
}
