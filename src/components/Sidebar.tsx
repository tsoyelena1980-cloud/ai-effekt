import { NumberField } from './NumberField'
import { UNITS, type Settings, type ViewId } from '../finance/model'

type SidebarProps = {
  view: ViewId
  settings: Settings
  onSelect: (view: ViewId) => void
  onSettings: (patch: Partial<Settings>) => void
}

const items: Array<{ id: ViewId; title: string; text: string }> = [
  { id: 'finblock', title: 'Финблок (в целом)', text: 'Свод четырех направлений' },
  ...UNITS.map((unit) => ({ id: unit.id, title: unit.menu, text: unit.name })),
]

export function Sidebar({ view, settings, onSelect, onSettings }: SidebarProps) {
  return (
    <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-5.5rem)] lg:w-64 lg:shrink-0 lg:overflow-auto">
      <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0" aria-label="Направления Финблока">
        {items.map((item) => {
          const active = view === item.id
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => onSelect(item.id)}
              className={`min-w-48 rounded-xl px-3 py-2 text-left lg:min-w-0 ${
                active
                  ? 'bg-[#0b2545] text-white shadow-md'
                  : 'bg-white text-[#122033] shadow-sm ring-1 ring-[#e4eaf1] hover:ring-[#b7d0ea]'
              }`}
            >
              <span className="block text-sm font-extrabold leading-5">{item.title}</span>
              <span className={`mt-1 block text-xs leading-4 ${active ? 'text-white/75' : 'text-[#5c6b7e]'}`}>
                {item.id === 'finblock' ? item.text : 'Свои данные и расчет'}
              </span>
            </button>
          )
        })}
      </nav>

      <section id="common-settings" className="mt-2 rounded-xl bg-white p-3 shadow-sm ring-1 ring-[#e4eaf1]">
        <h2 className="text-sm font-extrabold text-[#0b2545]">Общие настройки</h2>
        <div className="mt-2 space-y-2">
          <p className="rounded-xl bg-[#f4f7fb] px-3 py-2 text-xs leading-5 text-[#33475b]" data-testid="hour-rate-rule">
            Стоимость 1 часа = средняя стоимость 1 FTE в месяц / 22 / 8.
          </p>
          <NumberField
            compact
            testId="labor-coefficient"
            label="Коэффициент фактического сокращения трудозатрат, %"
            hint="100% означает, что трудозатраты снижаются на всю долю операций, переданных ИИ."
            value={settings.laborReductionPercent}
            min={0}
            max={100}
            decimals={1}
            suffix="%"
            onChange={(laborReductionPercent) => onSettings({ laborReductionPercent })}
          />
        </div>
      </section>
    </aside>
  )
}
