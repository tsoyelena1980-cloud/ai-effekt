import { useEffect, useMemo, useRef, useState } from 'react'
import { FinblockView } from './components/FinblockView'
import { Sidebar } from './components/Sidebar'
import { StatusSwitch } from './components/StatusSwitch'
import { UnitView } from './components/UnitView'
import { downloadWorkbook } from './finance/exportExcel'
import { formatMoney } from './finance/format'
import {
  calculatePortfolio,
  clampHorizon,
  createDemoState,
  STAGES,
  type AppState,
  type Settings,
  type StageId,
  type UnitId,
  type UnitInput,
  type ViewId,
} from './finance/model'
import { fetchSharedState, loadSharedState, loadState, saveSharedState, saveState } from './finance/storage'

function sameUnit(left: UnitInput, right: UnitInput): boolean {
  return (Object.keys(left) as Array<keyof UnitInput>).every((key) => left[key] === right[key])
}

function sameSettings(left: Settings, right: Settings): boolean {
  return (
    left.annualHoursPerFte === right.annualHoursPerFte &&
    left.laborReductionPercent === right.laborReductionPercent &&
    left.horizonYears === right.horizonYears &&
    left.depreciationPercent === right.depreciationPercent
  )
}

export default function App() {
  const [state, setState] = useState<AppState>(loadState)
  const [savedJson, setSavedJson] = useState(() => JSON.stringify(loadState()))
  const [view, setView] = useState<ViewId>('finblock')
  const [resetKey, setResetKey] = useState(0)
  const [exportError, setExportError] = useState<string | null>(null)
  const [savedNotice, setSavedNotice] = useState(false)
  const [remoteNotice, setRemoteNotice] = useState(false)
  const [pressed, setPressed] = useState<'reset' | 'save' | 'export' | null>(null)
  const [stageId, setStageId] = useState<'summary' | StageId>('summary')
  const [hydrated, setHydrated] = useState(false)
  const pressTimer = useRef<number | null>(null)
  const savedJsonRef = useRef(savedJson)
  const saving = useRef(false)
  const portfolio = useMemo(() => calculatePortfolio(state), [state])
  const result = stageId === 'summary' ? portfolio.summary : portfolio.stages[stageId]
  const stageInput = stageId === 'summary' ? state.stages.assistants : state.stages[stageId]

  function flash(action: 'reset' | 'save' | 'export') {
    if (pressTimer.current !== null) window.clearTimeout(pressTimer.current)
    setPressed(action)
    pressTimer.current = window.setTimeout(() => setPressed(null), 1600)
  }
  const dirty = JSON.stringify(state) !== savedJson

  useEffect(() => {
    savedJsonRef.current = savedJson
  }, [savedJson])

  useEffect(() => {
    let active = true
    loadSharedState().then((next) => {
      if (!active) return
      const json = JSON.stringify(next)
      savedJsonRef.current = json
      setState(next)
      setSavedJson(json)
      setHydrated(true)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const timer = window.setInterval(() => {
      void refreshShared()
    }, 2000)
    return () => window.clearInterval(timer)
  }, [hydrated])

  function patchSettings(patch: Partial<Settings>) {
    setState((prev) => {
      const settings = { ...prev.settings, ...patch }
      if (sameSettings(prev.settings, settings)) return prev
      const onlyHorizon = Object.keys(patch).length === 1 && patch.horizonYears !== undefined
      return { ...prev, isExample: onlyHorizon ? prev.isExample : false, settings }
    })
  }

  function patchUnit(id: UnitId, patch: Partial<UnitInput>) {
    if (stageId === 'summary') return
    const current = stageId
    setState((prev) => {
      const stage = prev.stages[current]
      const nextUnit = { ...stage.units[id], ...patch }
      if (sameUnit(stage.units[id], nextUnit)) return prev
      return {
        ...prev,
        isExample: false,
        stages: { ...prev.stages, [current]: { ...stage, units: { ...stage.units, [id]: nextUnit } } },
      }
    })
  }

  function patchShare(id: UnitId, value: number) {
    if (stageId === 'summary') return
    const current = stageId
    setState((prev) => {
      const stage = prev.stages[current]
      if (stage.capexShare[id] === value) return prev
      return {
        ...prev,
        isExample: false,
        stages: { ...prev.stages, [current]: { ...stage, capexShare: { ...stage.capexShare, [id]: value } } },
      }
    })
  }

  function patchImplemented(id: StageId, implemented: boolean) {
    setState((prev) => {
      const stage = prev.stages[id]
      if (stage.implemented === implemented) return prev
      return { ...prev, isExample: false, stages: { ...prev.stages, [id]: { ...stage, implemented } } }
    })
  }

  function patchCapex(totalCapex: number) {
    if (stageId === 'summary') return
    const current = stageId
    setState((prev) => {
      const stage = prev.stages[current]
      if (stage.totalCapex === totalCapex) return prev
      return { ...prev, isExample: false, stages: { ...prev.stages, [current]: { ...stage, totalCapex } } }
    })
  }

  function reset() {
    if (!window.confirm('Вернуть демонстрационные данные? Текущие значения будут заменены.')) return
    setState(createDemoState())
    setView('finblock')
    setResetKey((key) => key + 1)
    setExportError(null)
    flash('reset')
  }

  async function refreshShared() {
    if (saving.current) return
    const remote = await fetchSharedState()
    if (!remote || saving.current) return
    const json = JSON.stringify(remote)
    if (json === savedJsonRef.current) return
    savedJsonRef.current = json
    saveState(remote)
    setState(remote)
    setSavedJson(json)
    setResetKey((key) => key + 1)
    setSavedNotice(false)
    setRemoteNotice(true)
    setExportError(null)
  }

  async function save() {
    if (!hydrated) return
    saving.current = true
    try {
      await saveSharedState(state)
      const json = JSON.stringify(state)
      savedJsonRef.current = json
      saveState(state)
      setSavedJson(json)
      setRemoteNotice(false)
      setSavedNotice(true)
      setExportError(null)
      flash('save')
    } catch {
      setExportError('Не удалось сохранить данные для других устройств.')
    } finally {
      saving.current = false
    }
  }

  function exportFile() {
    try {
      downloadWorkbook(state, portfolio.summary)
      setExportError(null)
      flash('export')
    } catch {
      setExportError('Не удалось сформировать файл Excel.')
    }
  }

  function selectView(next: ViewId) {
    setView(next)
    if (next !== 'finblock') setStageId((current) => (current === 'summary' ? 'assistants' : current))
  }

  function openSettings() {
    setView('finblock')
    window.setTimeout(() => {
      document.getElementById('common-settings')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 30)
  }

  function openCapex() {
    setView('finblock')
    window.setTimeout(() => {
      document.getElementById('capex-shares')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 30)
  }

  return (
    <div className="min-h-screen bg-[#eef2f6] text-[#122033]">
      <header className="sticky top-0 z-30 bg-[#0b2545] text-white">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-sm font-extrabold">
              ФБ
            </div>
            <div>
              <h1 className="text-lg font-extrabold leading-tight sm:text-xl">Финблок: эффект от внедрения ИИ</h1>
              <p className="text-xs text-white/75 sm:text-sm">
                Стоимость процессов → стоимость ИИ → экономия → инвестиции → окупаемость → ROI
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={pressed === 'reset'}
              onClick={reset}
              className={`rounded-xl border px-3 py-2 text-sm font-bold shadow-sm transition active:translate-y-0.5 active:scale-95 active:bg-white active:text-[#0b2545] ${
                pressed === 'reset'
                  ? 'border-white bg-white text-[#0b2545]'
                  : 'border-white/50 bg-white/10 hover:bg-white/25'
              }`}
            >
              {pressed === 'reset' ? 'Сброшено' : 'Сбросить данные'}
            </button>
            <button
              type="button"
              data-testid="save"
              aria-pressed={pressed === 'save'}
              onClick={save}
              className={`rounded-xl px-3 py-2 text-sm font-bold shadow-sm transition active:translate-y-0.5 active:scale-95 ${
                pressed === 'save'
                  ? 'bg-white text-[#0e7a45] ring-2 ring-white'
                  : 'bg-[#12a15a] text-white hover:bg-[#18c46e] active:bg-[#086b38]'
              }`}
            >
              {pressed === 'save' ? 'Сохранено' : 'Сохранить'}
            </button>
            <button
              type="button"
              data-testid="export-excel"
              aria-pressed={pressed === 'export'}
              onClick={exportFile}
              className={`rounded-xl px-3 py-2 text-sm font-bold shadow-sm transition active:translate-y-0.5 active:scale-95 ${
                pressed === 'export'
                  ? 'bg-[#12a15a] text-white'
                  : 'bg-white text-[#0b2545] hover:bg-[#d7e8fb] active:bg-[#8eb6df]'
              }`}
            >
              {pressed === 'export' ? 'Файл готов' : 'Экспорт в Excel'}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 py-3 lg:flex-row lg:px-5">
        <Sidebar
          key={`sidebar-${resetKey}`}
          view={view}
          settings={state.settings}
          onSelect={selectView}
          onSettings={patchSettings}
        />
        <main className="min-w-0 flex-1 space-y-2" key={`main-${resetKey}`}>
          {state.isExample ? (
            <p className="rounded-xl border border-[#f2d48a] bg-[#fff8e8] px-3 py-2 text-xs leading-5 text-[#6a4b05]" data-testid="example-banner">
              Сейчас показан пример расчета, а не данные вашего банка. Замените цифры фактическими значениями. После изменения любого поля пример отключается. Все суммы — в узбекских сумах.
            </p>
          ) : (
            <p className="rounded-xl bg-white px-3 py-2 text-xs text-[#33475b] shadow-sm ring-1 ring-[#e4eaf1]">
              Расчет по введенным данным. Все суммы — в узбекских сумах.
            </p>
          )}
          {remoteNotice && !dirty ? (
            <p className="rounded-2xl bg-[#e7f6ee] px-4 py-3 text-sm font-semibold text-[#0d5c32]">
              Показаны данные, которые только что сохранили на другом устройстве.
            </p>
          ) : null}
          {savedNotice && !dirty ? (
            <p className="rounded-2xl bg-[#e7f6ee] px-4 py-3 text-sm font-semibold text-[#0d5c32]" data-testid="saved-notice">
              Данные сохранены. Они появятся на всех открытых устройствах.
            </p>
          ) : null}
          {!hydrated ? (
            <p className="rounded-xl bg-white px-3 py-2 text-xs text-[#33475b] shadow-sm ring-1 ring-[#e4eaf1]">
              Загрузка последних сохраненных данных…
            </p>
          ) : null}
          {exportError ? <p className="text-sm font-semibold text-[#b42318]">{exportError}</p> : null}
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Этапы расчета">
            {view === 'finblock' ? (
              <button
                type="button"
                role="tab"
                aria-selected={stageId === 'summary'}
                onClick={() => setStageId('summary')}
                className={`rounded-full px-3 py-1 text-xs font-bold ${stageId === 'summary' ? 'bg-[#0b2545] text-white' : 'bg-white text-[#0b2545] ring-1 ring-[#d5dee8]'}`}
              >
                Свод
              </button>
            ) : null}
            {STAGES.map((stage) => (
              <button
                key={stage.id}
                type="button"
                role="tab"
                aria-selected={stageId === stage.id}
                onClick={() => setStageId(stage.id)}
                className={`rounded-full px-3 py-1 text-xs font-bold ${stageId === stage.id ? 'bg-[#0b2545] text-white' : 'bg-white text-[#0b2545] ring-1 ring-[#d5dee8]'}`}
              >
                {stage.label}
              </button>
            ))}
          </div>
          {view !== 'finblock' && stageId !== 'summary' ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-[#e4eaf1]">
              <p className="text-xs font-semibold text-[#33475b]">
                {`${state.stages[stageId].implemented ? 'Этап входит в итог Финблока.' : 'Этап не входит в итог Финблока.'} Годовой эффект Финблока: ${formatMoney(portfolio.summary.annualEffect)}.`}
              </p>
              <StatusSwitch
                value={state.stages[stageId].implemented}
                onChange={(implemented) => patchImplemented(stageId, implemented)}
              />
            </div>
          ) : null}
          {view === 'finblock' ? (
            <FinblockView
              result={portfolio.summary}
              stageResult={stageId === 'summary' ? portfolio.summary : portfolio.stages[stageId]}
              settings={state.settings}
              stageInput={stageInput}
              editable={stageId !== 'summary'}
              stageEffects={STAGES.map((stage) => ({
                id: stage.id,
                label: stage.label,
                annualEffect: portfolio.stages[stage.id].annualEffect,
                implemented: state.stages[stage.id].implemented,
              }))}
              onHorizon={(years) => patchSettings({ horizonYears: clampHorizon(years) })}
              onCapex={patchCapex}
              onDepreciation={(depreciationPercent) => patchSettings({ depreciationPercent })}
              onShare={patchShare}
              onUnit={patchUnit}
              onSelect={selectView}
            />
          ) : (
            <UnitView
              key={`${view}-${stageId}`}
              unitId={view}
              input={stageInput.units[view]}
              result={result}
              settings={state.settings}
              onChange={(patch) => patchUnit(view, patch)}
              onOpenSettings={openSettings}
              onOpenCapex={openCapex}
              readOnly={stageId === 'summary'}
            />
          )}
        </main>
      </div>
    </div>
  )
}
