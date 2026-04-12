import { useState } from 'react'
import { DraggableGridExample } from './components/DraggableGridExample'
import { GhostGridExample } from './components/GhostGridExample'
import { VirtualizedGridExample } from './components/VirtualizedGridExample'
import './App.css'

type ExampleTab = 'basic' | 'draggable' | 'virtualized'

function App() {
  const [activeTab, setActiveTab] = useState<ExampleTab>('basic')

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎯 ghost-gl React Examples</h1>
        <nav className="tabs">
          <button
            type="button"
            className={activeTab === 'basic' ? 'active' : ''}
            onClick={() => setActiveTab('basic')}
          >
            Basic Grid
          </button>
          <button
            type="button"
            className={activeTab === 'draggable' ? 'active' : ''}
            onClick={() => setActiveTab('draggable')}
          >
            Draggable
          </button>
          <button
            type="button"
            className={activeTab === 'virtualized' ? 'active' : ''}
            onClick={() => setActiveTab('virtualized')}
          >
            Virtualized
          </button>
        </nav>
      </header>

      <main className="app-main">
        {activeTab === 'basic' && <GhostGridExample />}
        {activeTab === 'draggable' && <DraggableGridExample />}
        {activeTab === 'virtualized' && <VirtualizedGridExample />}
      </main>
    </div>
  )
}

export default App
