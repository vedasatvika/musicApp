import { useState } from 'react'
import type { CatalogItem } from './types'
import { StoreProvider, useStore } from './store'
import { FeedScreen } from './screens/FeedScreen'
import { SearchScreen } from './screens/SearchScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { RankFlow } from './components/RankFlow'

type Tab = 'feed' | 'search' | 'profile'

function Shell() {
  const { currentUser } = useStore()
  const [tab, setTab] = useState<Tab>('feed')
  const [rankTarget, setRankTarget] = useState<CatalogItem | null>(null)
  // When set, the profile tab shows this friend instead of the current user.
  const [viewingUserId, setViewingUserId] = useState<string | null>(null)

  function openProfile(id: string) {
    setViewingUserId(id === currentUser.id ? null : id)
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
        {tab === 'search' && <SearchScreen onRank={setRankTarget} />}
        {tab === 'profile' && (
          <ProfileScreen
            userId={viewingUserId ?? currentUser.id}
            onRank={setRankTarget}
            onBack={viewingUserId ? () => { setViewingUserId(null); setTab('feed') } : undefined}
          />
        )}
      </main>

      <nav className="tab-bar">
        <TabButton icon="🏠" label="Feed" active={tab === 'feed'} onClick={() => goTab('feed')} />
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
  icon,
  label,
  active,
  onClick,
}: {
  icon: string
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button className={`tab-btn${active ? ' active' : ''}`} onClick={onClick}>
      <span className="tab-icon">{icon}</span>
      <span className="tab-label">{label}</span>
    </button>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
