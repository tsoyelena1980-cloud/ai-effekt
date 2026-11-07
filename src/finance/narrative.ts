import {
  formatMoney,
  formatPayback,
  formatPercent,
  formatReduction,
  formatRoi,
  yearWord,
} from './format'
import type { FinblockResult, UnitMeta, UnitResult } from './model'

export const METHODOLOGY: readonly string[] = [
  'Годовой эффект принимается постоянным и начинается с первого месяца.',
  'Количество операций вводится за месяц и для годового расчета умножается на 12.',
  'Стоимость 1 часа = средняя стоимость 1 FTE в месяц / 22 / 8. Годовая стоимость процесса = трудозатраты в часах × стоимость 1 часа.',
  'CAPEX — разовые инвестиции во внедрение. Они не смешиваются с OPEX.',
  'Годовая амортизация = общий CAPEX × норма амортизации. Месячный эффект = годовой эффект / 12.',
  'Окупаемость и ROI считаются по эффекту до амортизации, чтобы CAPEX не вычитался второй раз. Месячный и годовой эффект на экране показаны уже после амортизации.',
  'OPEX — ежегодная поддержка, лицензии и обслуживание ИИ. Эти расходы входят в стоимость ИИ каждый год.',
  'На уровне Финблока общий CAPEX учитывается в окупаемости и ROI один раз, даже если платформа обслуживает все направления.',
  'Доли CAPEX между ДБУ, МСФО, ФМ и ALM нужны только для аналитики по направлениям. Их сумма должна быть 100%.',
  'Оставшиеся расходы на сотрудников = текущая стоимость процесса × (1 − доля операций ИИ × коэффициент сокращения трудозатрат).',
  'Если текущая стоимость процесса равна нулю, процент снижения расходов не рассчитывается.',
  'Если годовой эффект равен нулю или отрицательный, проект не окупается. Если CAPEX равен нулю, ROI не определяется.',
  'Закупки в расчет не входят.',
]

export function finblockNarrative(result: FinblockResult, horizonYears: number): string {
  if (!result.hoursValid) {
    return 'Расчет остановлен: укажите годовой фонд рабочего времени одного сотрудника больше нуля. Пока фонд не задан, стоимость процессов, экономия, окупаемость и ROI не считаются.'
  }

  const before = formatMoney(result.processCost)
  const after = formatMoney(result.costAfterAi)
  const effect = formatMoney(result.annualEffect)
  const monthly = formatMoney(result.monthlyEffect)
  const depreciation = formatMoney(result.annualDepreciation)
  const capex = formatMoney(result.totalCapex)
  const period = `${horizonYears} ${yearWord(horizonYears)}`
  const effectLine = `После амортизации ${formatPercent(result.depreciationPercent)} годовой эффект — ${effect}, месячный — ${monthly}. Годовая амортизация CAPEX — ${depreciation}.`

  if (result.operatingAnnualEffect < 0) {
    return `При указанных данных внедрение ИИ в процессы Финблока экономически неэффективно. Текущие годовые расходы — ${before}, после внедрения — ${after}. ${effectLine} Общие инвестиции — ${capex}. Проект не окупается.`
  }

  if (result.operatingAnnualEffect === 0) {
    return `Текущие годовые расходы Финблока (${before}) равны расходам после внедрения ИИ. Экономия до амортизации отсутствует, поэтому проект не окупается. ${effectLine} Общие инвестиции — ${capex}.`
  }

  const reduction =
    result.reductionPercent === null
      ? ''
      : ` Снижение расходов — ${formatReduction(result.reductionPercent)}.`

  if (result.totalCapex === 0) {
    return `Внедрение ИИ в процессы Финблока позволяет сократить ежегодные операционные расходы с ${before} до ${after}.${reduction} ${effectLine} Первоначальные инвестиции равны нулю, поэтому ROI не определяется, а срок окупаемости — 0 мес.`
  }

  return `Внедрение ИИ в процессы Финблока позволяет сократить ежегодные операционные расходы с ${before} до ${after}.${reduction} ${effectLine} При инвестициях ${capex} проект окупается за ${formatPayback(result.paybackMonths)} и обеспечивает ROI ${formatRoi(result.roiPercent)} за ${period}. Окупаемость считается по эффекту до амортизации.`
}

export function unitNarrative(
  meta: UnitMeta,
  unit: UnitResult,
  sharesValid: boolean,
): string {
  const before = formatMoney(unit.processCost)
  const after = formatMoney(unit.costAfterAi)
  const effect = `${formatMoney(unit.monthlyEffect)} в месяц и ${formatMoney(unit.annualEffect)} в год`
  const capexNote = sharesValid
    ? `Для аналитики на направление отнесено ${formatMoney(unit.allocatedCapex)} общего CAPEX.`
    : 'Доли CAPEX в сумме не равны 100%, поэтому отнесение инвестиций на направление сейчас некорректно.'
  const tail = `${capexNote} Окупаемость и ROI считаются по Финблоку в целом, чтобы общий CAPEX не учитывался повторно.`

  if (unit.processCost === 0 && unit.annualEffect < 0) {
    return `По направлению ${meta.code} текущая стоимость процесса равна нулю, а расходы на ИИ составляют ${formatMoney(unit.aiTotalCost)}. Эффект после амортизации отрицательный: ${effect}. ${tail}`
  }

  if (unit.annualEffect < 0) {
    return `По направлению ${meta.code} внедрение ИИ при этих данных увеличивает расходы: сейчас ${before} в год, после внедрения ${after}. Эффект после амортизации отрицательный — ${effect}. ${tail}`
  }

  if (unit.annualEffect === 0) {
    return `По направлению ${meta.code} эффект после амортизации равен нулю. Текущие годовые расходы — ${before}. ${tail}`
  }

  const reduction =
    unit.reductionPercent === null ? '' : ` Снижение расходов — ${formatPercent(unit.reductionPercent)}.`
  return `По направлению ${meta.code} текущие годовые расходы составляют ${before}. После внедрения ИИ — ${after}.${reduction} Эффект после амортизации — ${effect}. ${tail}`
}
