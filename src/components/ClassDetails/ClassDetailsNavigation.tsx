
import { TabType } from '../../types'

interface ClassDetailsNavigationProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

const tabs = [
  { id: 'overview' as TabType, label: 'Visão Geral' },
  { id: 'ranking' as TabType, label: 'Ranking' },
  { id: 'indicators' as TabType, label: 'Indicadores' },
  { id: 'growth' as TabType, label: 'Crescimento' },
  { id: 'detailed-report' as TabType, label: 'Relatório Detalhado' }
]

export function ClassDetailsNavigation({ activeTab, onTabChange }: ClassDetailsNavigationProps) {
  return (
    <div className="border-b border-gray-200 mb-6">
      <div className="flex overflow-x-auto scrollbar-hide">
        <div className="flex space-x-0 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`py-3 px-4 lg:px-6 text-sm lg:text-base font-medium whitespace-nowrap border-b-2 transition-colors min-h-[48px] ${
                activeTab === tab.id
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800 border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}