import { NumberField } from './NumberField'
import {
  formatMoney,
  formatPayback,
  formatPercent,
  formatReduction,
  formatRoi,
  yearWord,
} from '../finance/format'
import { finblockNarrative } from '../finance/narrative'
import { UNITS, type FinblockResult, type Settings, type StageId, type StageInput, type UnitId, type UnitInput, type ViewId } from '../finance/model'

type Tone = 'good' | 'bad' | 'neutral'

type FinblockViewProps = {
  result: FinblockResult
  stageResult: FinblockResult
  settings: Settings
  stageInput: StageInput
  editable: boolean
  stageEffects: ReadonlyArray<{ id: StageId; label: string; annualEffect: number; ownEffect: number; implemented: boolean }>
  onHorizon: (years: number) => void
  onCapex: (value: number) => void
  onDepreciation: (value: number) => void
  onShare: (id: UnitId, value: number) => void
  onUnit: (id: UnitId, patch: Partial<UnitInput>) => void
  onSelect: (view: ViewId) => void
}

function toneClass(tone: Tone, solid: boolean): string {
  if (solid) {
    if (tone === 'good') return 'bg-[#0e7a45] text-white'
    if (tone === 'bad') return 'bg-[#b42318] text-white'
    return 'bg-[#3d5166] text-white'
  }
  if (tone === 'good') return 'bg-[#e7f6ee] text-[#0d5c32]'
  if (tone === 'bad') return 'bg-[#fdecec] text-[#8f1d14]'
  return 'bg-white text-[#122033]'
}

function effectTone(value: number): Tone {
  if (value > 0) return 'good'
  if (value < 0) return 'bad'
  return 'neutral'
}

export function FinblockView({
  result,
  stageResult,
  settings,
  stageInput,
  editable,
  stageEffects,
  onHorizon,
  onCapex,
  onDepreciation,
  onShare,
  onUnit,
  onSelect,
}: FinblockViewProps) {
  const horizon = settings.horizonYears
  const roiTone: Tone =
    result.roiPercent === null ? 'neutral' : result.roiPercent > 0 ? 'good' : result.roiPercent < 0 ? 'bad' : 'neutral'
  const paybackTone: Tone = result.paybackMonths === null ? 'bad' : 'good'
  const savingTone = effectTone(result.annualEffect)
  const reductionLabel =
    result.reductionPercent === null
      ? 'Снижение расходов'
      : result.reductionPercent < 0
        ? 'Рост расходов'
        : 'Снижение расходов'

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold text-[#0b2545]">Результат Финблока</h2>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[#33475b]">Горизонт ROI</span>
          {[1, 2, 3, 4, 5].map((year) => (
            <button
              key={year}
              type="button"
              aria-pressed={horizon === year}
              data-testid={`horizon-${year}`}
              onClick={() => onHorizon(year)}
              className={`h-7 min-w-7 rounded-full px-2 text-xs font-bold ${
                horizon === year ? 'bg-[#0b2545] text-white' : 'bg-white text-[#0b2545] ring-1 ring-[#d5dee8]'
              }`}
            >
              {year}
            </button>
          ))}
          <span className="text-xs text-[#5c6b7e]">{yearWord(horizon)}</span>
        </div>
      </div>

      {!result.hoursValid ? (
        <p className="rounded-xl bg-[#fdecec] px-4 py-2 text-sm font-semibold text-[#8f1d14]">
          Укажите годовой фонд рабочего времени больше нуля. Без него стоимость процессов не рассчитывается.
        </p>
      ) : (
        <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5" aria-live="polite">
          <article className={`rounded-xl px-3 py-2 shadow-sm ${toneClass(roiTone, true)}`}>
            <p className="text-xs font-semibold opacity-90">ROI ({horizon} {yearWord(horizon)})</p>
            <p className="mt-1 text-xl font-extrabold tabular-nums" data-testid="kpi-roi">{formatRoi(result.roiPercent)}</p>
          </article>
          <article className={`rounded-xl px-3 py-2 shadow-sm ${toneClass(paybackTone, true)}`}>
            <p className="text-xs font-semibold opacity-90">Окупаемость</p>
            <p className="mt-1 text-xl font-extrabold tabular-nums" data-testid="kpi-payback">{formatPayback(result.paybackMonths)}</p>
          </article>
          <article className={`rounded-xl px-3 py-2 shadow-sm ${toneClass(savingTone, true)}`}>
            <p className="text-xs font-semibold opacity-90">Месячный эффект</p>
            <p className="mt-1 text-lg font-extrabold tabular-nums" data-testid="kpi-month">{formatMoney(result.monthlyEffect)}</p>
            <p className="sr-only" data-testid="monthly-effect">{formatMoney(result.monthlyEffect)}</p>
          </article>
          <article className={`rounded-xl px-3 py-2 shadow-sm ${toneClass(savingTone, true)}`}>
            <p className="text-xs font-semibold opacity-90">Годовой эффект</p>
            <p className="mt-1 text-lg font-extrabold tabular-nums" data-testid="kpi-effect">{formatMoney(result.annualEffect)}</p>
            <p className="sr-only" data-testid="annual-effect">{formatMoney(result.annualEffect)}</p>
          </article>
          <article className={`rounded-xl px-3 py-2 shadow-sm ${result.reductionPercent !== null && result.reductionPercent < 0 ? 'bg-[#b42318] text-white' : 'bg-[#0e7a45] text-white'}`}>
            <p className="text-xs font-semibold opacity-90">{reductionLabel}</p>
            <p className="mt-1 text-xl font-extrabold tabular-nums" data-testid="compare-reduction">{formatReduction(result.reductionPercent)}</p>
          </article>
        </section>
      )}

      {result.hoursValid ? (
        <>
          <section className="grid gap-2 md:grid-cols-3">
            <div className="rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-[#e4eaf1]">
              <p className="text-xs font-semibold text-[#5c6b7e]">До внедрения ИИ</p>
              <p className="text-lg font-extrabold tabular-nums text-[#0b2545]" data-testid="compare-before">{formatMoney(result.processCost)}</p>
            </div>
            <div className="rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-[#e4eaf1]">
              <p className="text-xs font-semibold text-[#5c6b7e]">После внедрения ИИ</p>
              <p className="text-lg font-extrabold tabular-nums text-[#0b2545]" data-testid="compare-after">{formatMoney(result.costAfterAi)}</p>
            </div>
            <div className={`rounded-xl px-3 py-2 shadow-sm ring-1 ring-black/5 ${toneClass(savingTone, false)}`}>
              <p className="text-xs font-semibold">Амортизация {formatPercent(result.depreciationPercent)}</p>
              <p className="text-sm font-bold tabular-nums" data-testid="annual-depreciation">
                {`${formatMoney(result.annualDepreciation)} в год`}
              </p>
              <p className="text-xs">
                {`До амортизации ${formatMoney(result.operatingAnnualEffect)}: по этой сумме считаются окупаемость и ROI.`}
              </p>
            </div>
          </section>

          <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {UNITS.map((unit) => {
              const effect = result.units[unit.id].annualEffect
              const tone = effectTone(effect)
              return (
                <button
                  key={unit.id}
                  type="button"
                  onClick={() => onSelect(unit.id)}
                  className="rounded-xl bg-white px-3 py-2 text-left shadow-sm ring-1 ring-[#e4eaf1] hover:ring-[#1d4e89]"
                >
                  <span className="block text-sm font-extrabold text-[#0b2545]">{unit.code}</span>
                  <span className={`block text-xs font-bold tabular-nums ${tone === 'bad' ? 'text-[#b42318]' : 'text-[#0e7a45]'}`}>
                    {formatMoney(result.units[unit.id].monthlyEffect)} / мес.
                  </span>
                  <span className={`block text-sm font-extrabold tabular-nums ${tone === 'bad' ? 'text-[#b42318]' : 'text-[#0e7a45]'}`}>
                    {formatMoney(effect)} / год
                  </span>
                </button>
              )
            })}
          </section>
        </>
      ) : null}

      {!editable ? (
        <section className="grid gap-2 sm:grid-cols-3">
          {stageEffects.map((part) => (
            <div key={part.id} className={`rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-[#e4eaf1] ${part.implemented ? '' : 'opacity-70'}`}>
              <p className="text-xs font-semibold text-[#5c6b7e]">{part.label}</p>
              <p className="text-sm font-extrabold tabular-nums text-[#0b2545]">{formatMoney(part.annualEffect)} / год</p>
              {!part.implemented ? (
                <p className="text-xs text-[#5c6b7e]">{`Расчет этапа ${formatMoney(part.ownEffect)}. В итог не входит.`}</p>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      <section id="capex-shares" className="rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-[#e4eaf1]">
        <div className="grid gap-2 lg:grid-cols-6">
          {editable ? (
            <NumberField
              compact
              testId="total-capex"
              label="Общий CAPEX, сум"
              value={stageInput.totalCapex}
              decimals={0}
              suffix="сум"
              onChange={onCapex}
            />
          ) : (
            <div>
              <p className="text-xs font-semibold text-[#5c6b7e]">CAPEX реализованных этапов, сум</p>
              <p className="text-sm font-extrabold tabular-nums text-[#0b2545]">{formatMoney(result.totalCapex)}</p>
            </div>
          )}
          <NumberField
            compact
            testId="depreciation-rate"
            label="Амортизация CAPEX, %"
            value={settings.depreciationPercent}
            min={0}
            max={100}
            decimals={1}
            suffix="%"
            onChange={onDepreciation}
          />
          {editable
            ? UNITS.map((unit) => (
                <NumberField
                  key={unit.id}
                  compact
                  testId={`share-${unit.id}`}
                  label={`${unit.code}, %`}
                  value={stageInput.capexShare[unit.id]}
                  min={0}
                  max={100}
                  decimals={1}
                  suffix="%"
                  onChange={(value) => onShare(unit.id, value)}
                />
              ))
            : null}
        </div>
        {editable ? (
          <p
            className={`mt-2 rounded-lg px-3 py-1.5 text-xs font-semibold ${stageResult.capexSharesValid ? 'bg-[#e7f6ee] text-[#0d5c32]' : 'bg-[#fdecec] text-[#8f1d14]'}`}
            data-testid="capex-sum"
          >
            {`Сумма долей: ${formatPercent(stageResult.capexShareSum)}. ${
              stageResult.capexSharesValid
                ? 'Распределение корректно. CAPEX учитывается в окупаемости один раз.'
                : 'Нужно ровно 100%. Сводный CAPEX при этом все равно один.'
            }`}
          </p>
        ) : (
          <p className="mt-2 text-xs text-[#5c6b7e]">В итог входят только этапы со статусом «Реализовано». Амортизация общая для их CAPEX.</p>
        )}
      </section>

      {editable ? (
        <section className="grid gap-2 xl:grid-cols-4">
          {UNITS.map((unit) => {
            const input = stageInput.units[unit.id]
            return (
              <div key={unit.id} className="rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-[#e4eaf1]">
                <h3 className="text-sm font-extrabold text-[#0b2545]">{unit.code}</h3>
                <div className="mt-2 space-y-2">
                  <NumberField compact label="FTE в месяц, сум" value={input.fteMonthlyCost} decimals={0} suffix="сум" onChange={(fteMonthlyCost) => onUnit(unit.id, { fteMonthlyCost })} />
                  <NumberField compact label="Операций в месяц" value={input.operationsPerMonth} decimals={2} suffix="опер." onChange={(operationsPerMonth) => onUnit(unit.id, { operationsPerMonth })} />
                  <NumberField compact label="Минут на операцию" value={input.minutesPerOperation} decimals={1} suffix="мин" onChange={(minutesPerOperation) => onUnit(unit.id, { minutesPerOperation })} />
                  <NumberField compact label="Доля ИИ, %" value={input.aiSharePercent} min={0} max={100} decimals={1} suffix="%" onChange={(aiSharePercent) => onUnit(unit.id, { aiSharePercent })} />
                  <NumberField compact label="Стоимость операции ИИ, сум" value={input.aiCostPerOperation} decimals={0} suffix="сум" onChange={(aiCostPerOperation) => onUnit(unit.id, { aiCostPerOperation })} />
                  <NumberField compact label="OPEX ИИ в год, сум" value={input.aiOpexAnnual} decimals={0} suffix="сум" onChange={(aiOpexAnnual) => onUnit(unit.id, { aiOpexAnnual })} />
                </div>
              </div>
            )
          })}
        </section>
      ) : null}

      <p className="rounded-xl bg-white px-3 py-2 text-sm leading-5 text-[#122033] shadow-sm ring-1 ring-[#e4eaf1]" data-testid="conclusion">
        {finblockNarrative(result, horizon)}
      </p>
    </div>
  )
}
