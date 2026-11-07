/** Единая модель эффекта ИИ в Финблоке. Новое направление добавляется в UNIT_IDS, UNITS и исходные данные. */

export const UNIT_IDS = ['dbu', 'ifrs', 'fm', 'alm'] as const

export type UnitId = (typeof UNIT_IDS)[number]
export type ViewId = 'finblock' | UnitId

export const STAGE_IDS = ['assistants', 'anomalies', 'reporting'] as const
export type StageId = (typeof STAGE_IDS)[number]

export const STAGES: readonly { id: StageId; label: string }[] = [
  { id: 'assistants', label: '1 этап. AI assistants' },
  { id: 'anomalies', label: '2 этап. ML модели для поиска аномалий' },
  { id: 'reporting', label: '3 этап. AI Reporting Agent' },
]

export interface UnitMeta {
  id: UnitId
  code: string
  name: string
  menu: string
}

export const UNITS: readonly UnitMeta[] = [
  {
    id: 'dbu',
    code: 'ДБУ',
    name: 'Департамент бухгалтерского учета',
    menu: 'ДБУ — Департамент бухгалтерского учета',
  },
  {
    id: 'ifrs',
    code: 'МСФО',
    name: 'Международные стандарты финансовой отчетности',
    menu: 'МСФО — Международные стандарты финансовой отчетности',
  },
  {
    id: 'fm',
    code: 'ФМ',
    name: 'Финансовый менеджмент',
    menu: 'ФМ — Финансовый менеджмент',
  },
  {
    id: 'alm',
    code: 'ALM',
    name: 'Управление активами и пассивами',
    menu: 'ALM — Управление активами и пассивами',
  },
]

export interface UnitInput {
  fteMonthlyCost: number
  operationsPerMonth: number
  minutesPerOperation: number
  aiSharePercent: number
  aiCostPerOperation: number
  aiOpexAnnual: number
}

export interface Settings {
  annualHoursPerFte: number
  laborReductionPercent: number
  horizonYears: number
  depreciationPercent: number
}

export interface StageInput {
  implemented: boolean
  totalCapex: number
  capexShare: Record<UnitId, number>
  units: Record<UnitId, UnitInput>
}

export interface AppState {
  isExample: boolean
  settings: Settings
  stages: Record<StageId, StageInput>
}

/** Рабочих дней в месяце и часов в дне для стоимости одного часа. */
export const WORK_DAYS_PER_MONTH = 22
export const HOURS_PER_WORK_DAY = 8

export interface UnitResult {
  laborHours: number
  hourCost: number
  fteNeed: number
  processCost: number
  aiOperations: number
  aiProcessingCost: number
  aiTotalCost: number
  remainingStaffCost: number
  costAfterAi: number
  operatingAnnualEffect: number
  annualDepreciation: number
  annualEffect: number
  monthlyEffect: number
  reductionPercent: number | null
  allocatedCapex: number
}

export interface PortfolioResult {
  summary: FinblockResult
  stages: Record<StageId, FinblockResult>
}

export interface FinblockResult {
  hoursValid: boolean
  capexShareSum: number
  capexSharesValid: boolean
  processCost: number
  aiTotalCost: number
  remainingStaffCost: number
  costAfterAi: number
  operatingAnnualEffect: number
  depreciationPercent: number
  annualDepreciation: number
  annualEffect: number
  monthlyEffect: number
  reductionPercent: number | null
  totalCapex: number
  paybackMonths: number | null
  roiPercent: number | null
  units: Record<UnitId, UnitResult>
}

const DEMO_UNITS: Record<UnitId, UnitInput> = {
  dbu: {
    fteMonthlyCost: 12_500_000,
    operationsPerMonth: 32_000,
    minutesPerOperation: 20,
    aiSharePercent: 60,
    aiCostPerOperation: 2_000,
    aiOpexAnnual: 400_000_000,
  },
  ifrs: {
    fteMonthlyCost: 16_000_000,
    operationsPerMonth: 100_000 / 12,
    minutesPerOperation: 24,
    aiSharePercent: 45,
    aiCostPerOperation: 5_000,
    aiOpexAnnual: 180_000_000,
  },
  fm: {
    fteMonthlyCost: 15_000_000,
    operationsPerMonth: 16_000,
    minutesPerOperation: 20,
    aiSharePercent: 50,
    aiCostPerOperation: 3_000,
    aiOpexAnnual: 250_000_000,
  },
  alm: {
    fteMonthlyCost: 20_000_000,
    operationsPerMonth: 64_000 / 12,
    minutesPerOperation: 30,
    aiSharePercent: 40,
    aiCostPerOperation: 4_000,
    aiOpexAnnual: 200_000_000,
  },
}

function zeroUnit(): UnitInput {
  return {
    fteMonthlyCost: 0,
    operationsPerMonth: 0,
    minutesPerOperation: 0,
    aiSharePercent: 0,
    aiCostPerOperation: 0,
    aiOpexAnnual: 0,
  }
}

export function emptyStageInput(): StageInput {
  return {
    implemented: false,
    totalCapex: 0,
    capexShare: { dbu: 40, ifrs: 20, fm: 25, alm: 15 },
    units: {
      dbu: zeroUnit(),
      ifrs: zeroUnit(),
      fm: zeroUnit(),
      alm: zeroUnit(),
    },
  }
}

export function createDemoState(): AppState {
  return {
    isExample: true,
    settings: {
      annualHoursPerFte: WORK_DAYS_PER_MONTH * HOURS_PER_WORK_DAY * 12,
      laborReductionPercent: 100,
      horizonYears: 5,
      depreciationPercent: 20,
    },
    stages: {
      assistants: {
        implemented: true,
        totalCapex: 12_000_000_000,
        capexShare: { dbu: 40, ifrs: 20, fm: 25, alm: 15 },
        units: {
          dbu: { ...DEMO_UNITS.dbu },
          ifrs: { ...DEMO_UNITS.ifrs },
          fm: { ...DEMO_UNITS.fm },
          alm: { ...DEMO_UNITS.alm },
        },
      },
      anomalies: emptyStageInput(),
      reporting: emptyStageInput(),
    },
  }
}

export function unitMeta(id: UnitId): UnitMeta {
  const found = UNITS.find((unit) => unit.id === id)
  if (!found) throw new Error(`Неизвестное направление: ${id}`)
  return found
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

function money(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value)
}

function tenths(percent: number): number {
  return Math.round(clamp(percent, 0, 100) * 10)
}

function emptyUnit(): UnitResult {
  return {
    laborHours: 0,
    hourCost: 0,
    fteNeed: 0,
    processCost: 0,
    aiOperations: 0,
    aiProcessingCost: 0,
    aiTotalCost: 0,
    remainingStaffCost: 0,
    costAfterAi: 0,
    operatingAnnualEffect: 0,
    annualDepreciation: 0,
    annualEffect: 0,
    monthlyEffect: 0,
    reductionPercent: null,
    allocatedCapex: 0,
  }
}

export function blankFinblockResult(depreciationPercent: number): FinblockResult {
  return {
    hoursValid: true,
    capexShareSum: 100,
    capexSharesValid: true,
    processCost: 0,
    aiTotalCost: 0,
    remainingStaffCost: 0,
    costAfterAi: 0,
    operatingAnnualEffect: 0,
    depreciationPercent,
    annualDepreciation: 0,
    annualEffect: 0,
    monthlyEffect: 0,
    reductionPercent: null,
    totalCapex: 0,
    paybackMonths: null,
    roiPercent: null,
    units: {
      dbu: emptyUnit(),
      ifrs: emptyUnit(),
      fm: emptyUnit(),
      alm: emptyUnit(),
    },
  }
}

export function clampHorizon(years: number): number {
  if (!Number.isFinite(years)) return 5
  return Math.min(5, Math.max(1, Math.round(years)))
}

function calculateUnit(input: UnitInput, settings: Settings, allocatedCapex: number): UnitResult {
  const monthly = Math.max(0, input.fteMonthlyCost)
  const operations = Math.max(0, input.operationsPerMonth) * 12
  const minutes = Math.max(0, input.minutesPerOperation)
  const shareTenths = tenths(input.aiSharePercent)
  const coefTenths = tenths(settings.laborReductionPercent)
  const aiUnitCost = Math.max(0, input.aiCostPerOperation)
  const opex = money(Math.max(0, input.aiOpexAnnual))
  const hourDivisor = WORK_DAYS_PER_MONTH * HOURS_PER_WORK_DAY
  const laborHours = (operations * minutes) / 60
  const hourCost = monthly / hourDivisor
  const fteNeed = laborHours / (hourDivisor * 12)
  const processCost = money(laborHours * hourCost)
  const aiOperations = (operations * shareTenths) / 1000
  const aiProcessingCost = money((operations * shareTenths * aiUnitCost) / 1000)
  const aiTotalCost = aiProcessingCost + opex
  const keptTenths = 1000 * 1000 - shareTenths * coefTenths
  const remainingStaffCost = money((processCost * keptTenths) / 1_000_000)
  const costAfterAi = remainingStaffCost + aiTotalCost
  const operatingAnnualEffect = processCost - costAfterAi
  const annualDepreciation = money((money(allocatedCapex) * tenths(settings.depreciationPercent)) / 1000)
  const annualEffect = operatingAnnualEffect - annualDepreciation
  const monthlyEffect = annualEffect / 12
  const reductionPercent = processCost === 0 ? null : (operatingAnnualEffect / processCost) * 100

  return {
    laborHours,
    hourCost,
    fteNeed,
    processCost,
    aiOperations,
    aiProcessingCost,
    aiTotalCost,
    remainingStaffCost,
    costAfterAi,
    operatingAnnualEffect,
    annualDepreciation,
    annualEffect,
    monthlyEffect,
    reductionPercent,
    allocatedCapex: money(allocatedCapex),
  }
}

function combineUnits(parts: UnitResult[]): UnitResult {
  const combined = emptyUnit()
  for (const part of parts) {
    combined.laborHours += part.laborHours
    combined.fteNeed += part.fteNeed
    combined.processCost += part.processCost
    combined.aiOperations += part.aiOperations
    combined.aiProcessingCost += part.aiProcessingCost
    combined.aiTotalCost += part.aiTotalCost
    combined.remainingStaffCost += part.remainingStaffCost
    combined.costAfterAi += part.costAfterAi
    combined.operatingAnnualEffect += part.operatingAnnualEffect
    combined.annualDepreciation += part.annualDepreciation
    combined.annualEffect += part.annualEffect
    combined.allocatedCapex += part.allocatedCapex
  }
  const rates = parts.map((part) => part.hourCost).filter((rate) => rate > 0)
  combined.hourCost = rates.length > 0 && rates.every((rate) => rate === rates[0]) ? rates[0] : 0
  combined.monthlyEffect = combined.annualEffect / 12
  combined.reductionPercent =
    combined.processCost === 0 ? null : (combined.operatingAnnualEffect / combined.processCost) * 100
  return combined
}

export function calculateStage(stage: StageInput, settings: Settings): FinblockResult {
  const capexShareSum = UNIT_IDS.reduce((sum, id) => {
    const share = stage.capexShare[id]
    return sum + (Number.isFinite(share) ? share : 0)
  }, 0)
  const capexSharesValid = Math.abs(capexShareSum - 100) <= 0.05
  const totalCapex = money(Math.max(0, stage.totalCapex))
  const horizonYears = clampHorizon(settings.horizonYears)

  const units = {
    dbu: emptyUnit(),
    ifrs: emptyUnit(),
    fm: emptyUnit(),
    alm: emptyUnit(),
  }

  for (const id of UNIT_IDS) {
    const share = clamp(stage.capexShare[id], 0, 100)
    units[id] = calculateUnit(stage.units[id], settings, (totalCapex * share) / 100)
  }

  const processCost = UNIT_IDS.reduce((sum, id) => sum + units[id].processCost, 0)
  const aiTotalCost = UNIT_IDS.reduce((sum, id) => sum + units[id].aiTotalCost, 0)
  const remainingStaffCost = UNIT_IDS.reduce((sum, id) => sum + units[id].remainingStaffCost, 0)
  const costAfterAi = remainingStaffCost + aiTotalCost
  const operatingAnnualEffect = processCost - costAfterAi
  const depreciationPercent = clamp(settings.depreciationPercent, 0, 100)
  const annualDepreciation = money((totalCapex * tenths(depreciationPercent)) / 1000)
  const annualEffect = operatingAnnualEffect - annualDepreciation
  const monthlyEffect = annualEffect / 12
  const reductionPercent = processCost === 0 ? null : (operatingAnnualEffect / processCost) * 100
  const paybackMonths = operatingAnnualEffect <= 0 ? null : (totalCapex / operatingAnnualEffect) * 12
  const roiPercent =
    totalCapex === 0 ? null : ((operatingAnnualEffect * horizonYears - totalCapex) / totalCapex) * 100

  return {
    hoursValid: true,
    capexShareSum,
    capexSharesValid,
    processCost,
    aiTotalCost,
    remainingStaffCost,
    costAfterAi,
    operatingAnnualEffect,
    depreciationPercent,
    annualDepreciation,
    annualEffect,
    monthlyEffect,
    reductionPercent,
    totalCapex,
    paybackMonths,
    roiPercent,
    units,
  }
}

export function calculatePortfolio(state: AppState): PortfolioResult {
  const stages = {
    assistants: calculateStage(state.stages.assistants, state.settings),
    anomalies: calculateStage(state.stages.anomalies, state.settings),
    reporting: calculateStage(state.stages.reporting, state.settings),
  }
  const parts = STAGE_IDS.filter((id) => state.stages[id].implemented).map((id) => stages[id])
  const horizonYears = clampHorizon(state.settings.horizonYears)
  const units = {
    dbu: combineUnits(parts.map((part) => part.units.dbu)),
    ifrs: combineUnits(parts.map((part) => part.units.ifrs)),
    fm: combineUnits(parts.map((part) => part.units.fm)),
    alm: combineUnits(parts.map((part) => part.units.alm)),
  }
  const processCost = parts.reduce((sum, part) => sum + part.processCost, 0)
  const aiTotalCost = parts.reduce((sum, part) => sum + part.aiTotalCost, 0)
  const remainingStaffCost = parts.reduce((sum, part) => sum + part.remainingStaffCost, 0)
  const costAfterAi = remainingStaffCost + aiTotalCost
  const operatingAnnualEffect = processCost - costAfterAi
  const annualDepreciation = parts.reduce((sum, part) => sum + part.annualDepreciation, 0)
  const annualEffect = operatingAnnualEffect - annualDepreciation
  const totalCapex = parts.reduce((sum, part) => sum + part.totalCapex, 0)
  const summary: FinblockResult = {
    hoursValid: true,
    capexShareSum: 100,
    capexSharesValid: parts.length === 0 || parts.every((part) => part.capexSharesValid),
    processCost,
    aiTotalCost,
    remainingStaffCost,
    costAfterAi,
    operatingAnnualEffect,
    depreciationPercent: clamp(state.settings.depreciationPercent, 0, 100),
    annualDepreciation,
    annualEffect,
    monthlyEffect: annualEffect / 12,
    reductionPercent: processCost === 0 ? null : (operatingAnnualEffect / processCost) * 100,
    totalCapex,
    paybackMonths: operatingAnnualEffect <= 0 ? null : (totalCapex / operatingAnnualEffect) * 12,
    roiPercent: totalCapex === 0 ? null : ((operatingAnnualEffect * horizonYears - totalCapex) / totalCapex) * 100,
    units,
  }
  return { summary, stages }
}

export function calculateFinblock(state: AppState): FinblockResult {
  return calculatePortfolio(state).summary
}
