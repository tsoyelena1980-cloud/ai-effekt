import { NumberField } from './NumberField'
import { formatMoney, formatPercent, formatQuantity, formatReduction } from '../finance/format'
import { unitNarrative } from '../finance/narrative'
import {
  unitMeta,
  type FinblockResult,
  type Settings,
  type UnitId,
  type UnitInput,
} from '../finance/model'

type UnitViewProps = {
  unitId: UnitId
  input: UnitInput
  result: FinblockResult
  settings: Settings
  onChange: (patch: Partial<UnitInput>) => void
  onOpenSettings: () => void
  onOpenCapex: () => void
  readOnly?: boolean
}

export function UnitView({ unitId, input, result, settings, onChange, onOpenSettings, onOpenCapex, readOnly = false }: UnitViewProps) {
  const meta = unitMeta(unitId)
  const figures = result.units[unitId]
  const negative = figures.annualEffect < 0

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold text-[#0b2545]">{meta.menu}</h2>
        <button type="button" onClick={onOpenSettings} className="text-sm font-bold text-[#1d4e89]">
          Общие настройки
        </button>
      </div>
      <p className="text-xs text-[#5c6b7e]">
        {`Стоимость 1 часа = стоимость FTE / 22 / 8. Коэффициент сокращения трудозатрат: ${formatPercent(settings.laborReductionPercent)}.`}
      </p>

      <div className="grid items-start gap-2 xl:grid-cols-2">
      {readOnly ? (
        <p className="rounded-xl bg-white px-3 py-2 text-xs text-[#5c6b7e] shadow-sm ring-1 ring-[#e4eaf1]">
          Показана сумма реализованных этапов. Поля для ввода открываются на вкладке этапа.
        </p>
      ) : (
      <div className="space-y-2">
      <section className="rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-[#e4eaf1]">
        <h2 className="text-sm font-extrabold text-[#0b2545]">1. Исходные данные</h2>
        <div className="mt-2 grid gap-2">
          <NumberField
            compact
            testId="fte-cost"
            label="Средняя стоимость 1 FTE в месяц, сум"
            value={input.fteMonthlyCost}
            decimals={0}
            suffix="сум"
            onChange={(fteMonthlyCost) => onChange({ fteMonthlyCost })}
          />
          <NumberField
            compact
            testId="operations"
            label="Количество операций в месяц"
            value={input.operationsPerMonth}
            decimals={2}
            suffix="опер."
            onChange={(operationsPerMonth) => onChange({ operationsPerMonth })}
          />
          <NumberField
            compact
            testId="minutes"
            label="Среднее время обработки одной операции, минут"
            value={input.minutesPerOperation}
            decimals={1}
            suffix="мин"
            onChange={(minutesPerOperation) => onChange({ minutesPerOperation })}
          />
        </div>
        <div className="mt-2 rounded-xl bg-[#e5f3fc] px-3 py-2" data-testid="process-cost">
          <p className="text-xs font-semibold text-[#0b3a5b]">Итого стоимость процесса в год, сум</p>
          <p className="text-xl font-extrabold tabular-nums text-[#0b2545]">
            {result.hoursValid ? formatMoney(figures.processCost) : 'Не рассчитывается'}
          </p>
          <p className="text-xs text-[#24577a]">
            {`Трудозатраты ${formatQuantity(figures.laborHours, 1)} ч.`}
          </p>
        </div>
      </section>

      <section className="rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-[#e4eaf1]">
        <h2 className="text-sm font-extrabold text-[#0b2545]">2. Калькулятор стоимости ИИ</h2>
        <div className="mt-2 grid gap-2">
          <NumberField
            compact
            testId="ai-share"
            label="Доля операций, которые будет выполнять ИИ, %"
            value={input.aiSharePercent}
            min={0}
            max={100}
            decimals={1}
            suffix="%"
            onChange={(aiSharePercent) => onChange({ aiSharePercent })}
          />
          <NumberField
            compact
            testId="ai-unit-cost"
            label="Стоимость одной операции ИИ, сум"
            value={input.aiCostPerOperation}
            decimals={0}
            suffix="сум"
            onChange={(aiCostPerOperation) => onChange({ aiCostPerOperation })}
          />
          <NumberField
            compact
            testId="ai-opex"
            label="Годовые расходы на поддержку ИИ (OPEX), сум"
            value={input.aiOpexAnnual}
            decimals={0}
            suffix="сум"
            onChange={(aiOpexAnnual) => onChange({ aiOpexAnnual })}
          />
        </div>
        <div className="mt-2 rounded-xl bg-[#f3e8ff] px-3 py-2" data-testid="ai-cost">
          <p className="text-xs font-semibold text-[#4c1d95]">Итого стоимость ИИ в год, сум</p>
          <p className="text-xl font-extrabold tabular-nums text-[#3b0764]">{formatMoney(figures.aiTotalCost)}</p>
          <p className="text-xs text-[#5b21b6]">
            {`Операций ИИ в год: ${formatQuantity(figures.aiOperations, 1)}. Обработка: ${formatMoney(figures.aiProcessingCost)}. Поддержка: ${formatMoney(input.aiOpexAnnual)}.`}
          </p>
        </div>
      </section>
      </div>
      )}

      <div className="space-y-2">
      <section className="rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-[#e4eaf1]">
        <h2 className="text-sm font-extrabold text-[#0b2545]">CAPEX, отнесенный на направление</h2>
        {result.capexSharesValid ? (
          <p className="text-xl font-extrabold tabular-nums text-[#0b2545]" data-testid="allocated-capex">
            {formatMoney(figures.allocatedCapex)}
          </p>
        ) : (
          <p className="mt-2 text-sm font-semibold text-[#b42318]" data-testid="allocated-capex">
            Распределение некорректно: сумма долей не равна 100%.
          </p>
        )}
        <p className="text-xs leading-4 text-[#5c6b7e]">
          Это аналитическая доля общего бюджета. Она не прибавляется к годовым расходам и не увеличивает CAPEX Финблока.
        </p>
        <button type="button" onClick={onOpenCapex} className="mt-2 text-sm font-bold text-[#1d4e89]">
          Изменить общий CAPEX и доли
        </button>
      </section>

      <section className="rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-[#e4eaf1]">
        <h2 className="text-sm font-extrabold text-[#0b2545]">3. Расходы после внедрения ИИ</h2>
        {result.hoursValid ? (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl bg-[#f4f7fb] px-3 py-2">
              <p className="text-xs font-semibold text-[#5c6b7e]">Оставшиеся расходы на сотрудников</p>
              <p className="text-lg font-extrabold tabular-nums text-[#0b2545]" data-testid="remaining-staff">
                {formatMoney(figures.remainingStaffCost)}
              </p>
            </div>
            <div className="rounded-xl bg-[#f4f7fb] px-3 py-2">
              <p className="text-xs font-semibold text-[#5c6b7e]">Общие годовые расходы после внедрения ИИ</p>
              <p className="text-lg font-extrabold tabular-nums text-[#0b2545]" data-testid="cost-after">
                {formatMoney(figures.costAfterAi)}
              </p>
            </div>
          </div>
        ) : null}
        {result.hoursValid ? (
          <div className={`mt-2 rounded-xl px-3 py-2 ${negative ? 'bg-[#fdecec]' : 'bg-[#e7f6ee]'}`}>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold">Месячный эффект</p>
                <p className={`text-lg font-extrabold tabular-nums ${negative ? 'text-[#b42318]' : 'text-[#0e7a45]'}`} data-testid="unit-month">
                  {formatMoney(figures.monthlyEffect)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold">Годовой эффект</p>
                <p className={`text-lg font-extrabold tabular-nums ${negative ? 'text-[#b42318]' : 'text-[#0e7a45]'}`} data-testid="unit-effect">
                  {formatMoney(figures.annualEffect)}
                </p>
              </div>
            </div>
            <p className="mt-1 text-xs">
              {`После амортизации доли CAPEX: ${formatMoney(figures.annualDepreciation)} в год. До амортизации: ${formatMoney(figures.operatingAnnualEffect)} в год.`}
              {figures.reductionPercent === null
                ? ' Снижение расходов не рассчитывается: текущая стоимость процесса равна нулю.'
                : ` Снижение расходов до амортизации: ${formatReduction(figures.reductionPercent)}.`}
            </p>
          </div>
        ) : (
          <p className="mt-2 rounded-xl bg-[#fdecec] px-3 py-2 text-xs font-semibold text-[#8f1d14]">
            Годовой эффект направления не рассчитывается, пока фонд рабочего времени равен нулю.
          </p>
        )}
      </section>

      <p className="rounded-xl bg-white px-3 py-2 text-sm leading-5 shadow-sm ring-1 ring-[#e4eaf1]" data-testid="unit-conclusion">
          {result.hoursValid
            ? unitNarrative(meta, figures, result.capexSharesValid)
            : `По направлению ${meta.code} эффект пока не рассчитывается: укажите годовой фонд рабочего времени больше нуля. Стоимость ИИ уже можно смотреть отдельно — ${formatMoney(figures.aiTotalCost)} в год.`}
      </p>
      </div>
      </div>
    </div>
  )
}
