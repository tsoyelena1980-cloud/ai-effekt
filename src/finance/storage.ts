import {
  STAGE_IDS,
  UNIT_IDS,
  createDemoState,
  emptyStageInput,
  type AppState,
  type Settings,
  type StageId,
  type StageInput,
  type UnitId,
  type UnitInput,
} from './model'

const STORAGE_KEY = 'finblok-ai-effect-v2'

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function readUnit(value: unknown): UnitInput | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const unit: UnitInput = {
    fteMonthlyCost: Number(row.fteMonthlyCost),
    operationsPerMonth: Number(row.operationsPerMonth),
    minutesPerOperation: Number(row.minutesPerOperation),
    aiSharePercent: Number(row.aiSharePercent),
    aiCostPerOperation: Number(row.aiCostPerOperation),
    aiOpexAnnual: Number(row.aiOpexAnnual),
  }
  return Object.values(unit).every(isNumber) ? unit : null
}

function readUnits(value: unknown): Record<UnitId, UnitInput> | null {
  if (!value || typeof value !== 'object') return null
  const units = {} as Record<UnitId, UnitInput>
  for (const id of UNIT_IDS) {
    const unit = readUnit((value as Record<string, unknown>)[id])
    if (!unit) return null
    units[id] = unit
  }
  return units
}

function readShares(value: unknown): Record<UnitId, number> | null {
  if (!value || typeof value !== 'object') return null
  const capexShare = {} as Record<UnitId, number>
  for (const id of UNIT_IDS) {
    const share = Number((value as Record<string, unknown>)[id])
    if (!isNumber(share)) return null
    capexShare[id] = share
  }
  return capexShare
}

function readSettings(value: unknown): Settings | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const settings: Settings = {
    annualHoursPerFte: Number(row.annualHoursPerFte),
    laborReductionPercent: Number(row.laborReductionPercent),
    horizonYears: Number(row.horizonYears),
    depreciationPercent: Number(row.depreciationPercent),
  }
  return Object.values(settings).every(isNumber) ? settings : null
}

function readStage(value: unknown): StageInput | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const units = readUnits(row.units)
  const capexShare = readShares(row.capexShare)
  const totalCapex = Number(row.totalCapex)
  if (!units || !capexShare || !isNumber(totalCapex)) return null
  return { implemented: row.implemented !== false, totalCapex, capexShare, units }
}

export function parseStoredState(raw: string): AppState | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const settings = readSettings(parsed.settings)
    if (!settings) return null

    if (parsed.stages && typeof parsed.stages === 'object') {
      const stages = {} as Record<StageId, StageInput>
      for (const id of STAGE_IDS) {
        const stage = readStage((parsed.stages as Record<string, unknown>)[id])
        if (!stage) return null
        stages[id] = stage
      }
      return { isExample: parsed.isExample === true, settings, stages }
    }

    const legacyUnits = readUnits(parsed.units)
    const legacySettings = parsed.settings as Record<string, unknown> | undefined
    const legacyShares = legacySettings ? readShares(legacySettings.capexShare) : null
    const legacyCapex = Number(legacySettings?.totalCapex)
    if (!legacyUnits || !legacyShares || !isNumber(legacyCapex)) return null
    return {
      isExample: parsed.isExample === true,
      settings,
      stages: {
        assistants: { implemented: true, totalCapex: legacyCapex, capexShare: legacyShares, units: legacyUnits },
        anomalies: emptyStageInput(),
        reporting: emptyStageInput(),
      },
    }
  } catch {
    return null
  }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('finblok-ai-effect-v1')
    if (!raw) return createDemoState()
    return parseStoredState(raw) ?? createDemoState()
  } catch {
    return createDemoState()
  }
}

function hasLocalSave(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null || localStorage.getItem('finblok-ai-effect-v1') !== null
}

export async function loadSharedState(): Promise<AppState> {
  try {
    const response = await fetch('/api/state', { cache: 'no-store' })
    if (response.ok && response.status !== 204) {
      const shared = parseStoredState(await response.text())
      if (shared) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(shared))
        return shared
      }
    }
  } catch {
    return loadState()
  }
  const local = loadState()
  if (hasLocalSave()) {
    try {
      await saveSharedState(local)
    } catch {
      /* общее хранилище недоступно: показываем сохранение этого браузера */
    }
  }
  return local
}

export function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export async function saveSharedState(state: AppState): Promise<void> {
  const response = await fetch('/api/state', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  })
  if (!response.ok) throw new Error('Не удалось записать общее сохранение')
}
