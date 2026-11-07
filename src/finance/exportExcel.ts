import * as XLSX from 'xlsx'
import { METHODOLOGY } from './narrative'
import { UNIT_IDS, type AppState, type FinblockResult, type UnitId, unitMeta } from './model'

const INPUT_ROW: Record<UnitId, number> = { dbu: 8, ifrs: 9, fm: 10, alm: 11 }
const CALC_COL: Record<UnitId, number> = { dbu: 1, ifrs: 2, fm: 3, alm: 4 }

function columnName(index: number): string {
  return XLSX.utils.encode_col(index)
}

function createSheet() {
  const sheet: XLSX.WorkSheet = {}
  let maxRow = 0
  let maxCol = 0

  function put(row: number, column: number, cell: XLSX.CellObject) {
    maxRow = Math.max(maxRow, row)
    maxCol = Math.max(maxCol, column)
    sheet[XLSX.utils.encode_cell({ r: row, c: column })] = cell
  }

  function text(row: number, column: number, value: string) {
    put(row, column, { t: 's', v: value })
  }

  function number(row: number, column: number, value: number, formula?: string) {
    const cell: XLSX.CellObject = { t: 'n', v: value }
    if (formula) cell.f = formula
    put(row, column, cell)
  }

  function mixed(row: number, column: number, value: number | string, formula: string) {
    if (typeof value === 'string') put(row, column, { t: 's', v: value, f: formula })
    else put(row, column, { t: 'n', v: value, f: formula })
  }

  function finalize(widths: number[]) {
    sheet['!ref'] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: maxRow, c: maxCol },
    })
    sheet['!cols'] = widths.map((wch) => ({ wch }))
    return sheet
  }

  return { text, number, mixed, finalize }
}

function inputRef(column: number, unit: UnitId): string {
  return `'Исходные данные'!${columnName(column)}${INPUT_ROW[unit] + 1}`
}

function buildInputs(state: AppState) {
  const sheet = createSheet()
  const { settings } = state
  sheet.text(0, 0, 'Параметр')
  sheet.text(0, 1, 'Значение')
  sheet.text(1, 0, 'Рабочих дней в месяце для стоимости часа')
  sheet.number(1, 1, 22)
  sheet.text(2, 0, 'Коэффициент фактического сокращения трудозатрат, %')
  sheet.number(2, 1, settings.laborReductionPercent)
  sheet.text(3, 0, 'Горизонт расчета ROI, лет')
  sheet.number(3, 1, settings.horizonYears)
  sheet.text(4, 0, 'Общий CAPEX этапа AI assistants, сум')
  sheet.number(4, 1, state.stages.assistants.totalCapex)
  sheet.text(5, 0, 'Норма годовой амортизации CAPEX, %')
  sheet.number(5, 1, settings.depreciationPercent)
  sheet.text(6, 0, 'Характер данных')
  sheet.text(6, 1, state.isExample ? 'Демонстрационный пример' : 'Значения пользователя')

  const headers = [
    'Направление',
    'Средняя стоимость 1 FTE в месяц, сум',
    'Количество операций в месяц',
    'Среднее время обработки одной операции, минут',
    'Доля операций ИИ, %',
    'Стоимость одной операции ИИ, сум',
    'Годовые расходы на поддержку ИИ (OPEX), сум',
    'Доля CAPEX, %',
  ]
  headers.forEach((header, column) => sheet.text(7, column, header))

  UNIT_IDS.forEach((id) => {
    const row = INPUT_ROW[id]
    const input = state.stages.assistants.units[id]
    sheet.text(row, 0, unitMeta(id).menu)
    sheet.number(row, 1, input.fteMonthlyCost)
    sheet.number(row, 2, input.operationsPerMonth)
    sheet.number(row, 3, input.minutesPerOperation)
    sheet.number(row, 4, input.aiSharePercent)
    sheet.number(row, 5, input.aiCostPerOperation)
    sheet.number(row, 6, input.aiOpexAnnual)
    sheet.number(row, 7, state.stages.assistants.capexShare[id])
  })

  sheet.text(
    13,
    0,
    'Доли CAPEX должны составлять 100%. На сводный CAPEX, окупаемость и ROI они не влияют: общий бюджет учитывается один раз.',
  )
  return sheet.finalize([62, 42, 28, 42, 24, 36, 46, 18])
}

function buildCalculation(result: FinblockResult) {
  const sheet = createSheet()
  sheet.text(0, 0, 'Показатель')
  UNIT_IDS.forEach((id) => sheet.text(0, CALC_COL[id], unitMeta(id).code))
  sheet.text(0, 5, 'Формула')

  const rows: Array<{
    title: string
    formula: string
    value: (id: UnitId) => number | string
    excel: (cell: { id: UnitId; col: string }) => string
  }> = [
    {
      title: 'Трудозатраты, ч',
      formula: 'Операции в месяц × 12 × среднее время / 60',
      value: (id) => result.units[id].laborHours,
      excel: ({ id }) => `${inputRef(2, id)}*12*${inputRef(3, id)}/60`,
    },
    {
      title: 'Стоимость 1 часа, сум',
      formula: 'Средняя стоимость 1 FTE в месяц / 22 / 8',
      value: (id) => result.units[id].hourCost,
      excel: ({ id }) => `${inputRef(1, id)}/'Исходные данные'!$B$2/8`,
    },
    {
      title: 'Потребность в FTE',
      formula: 'Трудозатраты / (22 × 8 × 12)',
      value: (id) => result.units[id].fteNeed,
      excel: ({ col }) => `${col}2/('Исходные данные'!$B$2*8*12)`,
    },
    {
      title: 'Стоимость процесса в год, сум',
      formula: 'Трудозатраты × стоимость 1 часа',
      value: (id) => result.units[id].processCost,
      excel: ({ col }) => `ROUND(${col}2*${col}3,0)`,
    },
    {
      title: 'Количество операций ИИ',
      formula: 'Операции в месяц × 12 × доля автоматизации',
      value: (id) => result.units[id].aiOperations,
      excel: ({ id }) => `${inputRef(2, id)}*12*${inputRef(4, id)}/100`,
    },
    {
      title: 'Стоимость обработки ИИ, сум',
      formula: 'Количество операций ИИ × стоимость одной операции ИИ',
      value: (id) => result.units[id].aiProcessingCost,
      excel: ({ id, col }) => `ROUND(${col}6*${inputRef(5, id)},0)`,
    },
    {
      title: 'Итого стоимость ИИ в год, сум',
      formula: 'Стоимость обработки ИИ + годовой OPEX',
      value: (id) => result.units[id].aiTotalCost,
      excel: ({ id, col }) => `${col}7+ROUND(${inputRef(6, id)},0)`,
    },
    {
      title: 'Оставшиеся расходы на сотрудников, сум',
      formula: 'Стоимость процесса × (1 − доля ИИ × коэффициент сокращения)',
      value: (id) => result.units[id].remainingStaffCost,
      excel: ({ id, col }) =>
        `ROUND(${col}5*(1-${inputRef(4, id)}/100*'Исходные данные'!$B$3/100),0)`,
    },
    {
      title: 'Общие годовые расходы после внедрения ИИ, сум',
      formula: 'Оставшиеся расходы на сотрудников + итого стоимость ИИ',
      value: (id) => result.units[id].costAfterAi,
      excel: ({ col }) => `${col}9+${col}8`,
    },
    {
      title: 'Годовой эффект до амортизации, сум',
      formula: 'Стоимость процесса − расходы после внедрения ИИ',
      value: (id) => result.units[id].operatingAnnualEffect,
      excel: ({ col }) => `${col}5-${col}10`,
    },
    {
      title: 'Снижение расходов, %',
      formula: 'Годовой эффект / стоимость процесса × 100. При нулевой базе не рассчитывается',
      value: (id) => result.units[id].reductionPercent ?? 'Не рассчитывается',
      excel: ({ col }) => `IF(${col}5=0,"Не рассчитывается",${col}11/${col}5*100)`,
    },
    {
      title: 'CAPEX направления (только аналитика), сум',
      formula: 'Общий CAPEX × доля направления. В сводную окупаемость не суммируется',
      value: (id) => result.units[id].allocatedCapex,
      excel: ({ id }) => `ROUND('Исходные данные'!$B$5*${inputRef(7, id)}/100,0)`,
    },
    {
      title: 'Годовая амортизация доли CAPEX, сум',
      formula: 'CAPEX направления × норма годовой амортизации',
      value: (id) => result.units[id].annualDepreciation,
      excel: ({ col }) => `ROUND(${col}13*'Исходные данные'!$B$6/100,0)`,
    },
    {
      title: 'Годовой эффект после амортизации, сум',
      formula: 'Эффект до амортизации − годовая амортизация',
      value: (id) => result.units[id].annualEffect,
      excel: ({ col }) => `${col}11-${col}14`,
    },
    {
      title: 'Месячный эффект после амортизации, сум',
      formula: 'Годовой эффект после амортизации / 12',
      value: (id) => result.units[id].monthlyEffect,
      excel: ({ col }) => `${col}15/12`,
    },
  ]

  rows.forEach((row, index) => {
    const excelRow = index + 1
    sheet.text(excelRow, 0, row.title)
    sheet.text(excelRow, 5, row.formula)
    UNIT_IDS.forEach((id) => {
      const column = CALC_COL[id]
      const col = columnName(column)
      sheet.mixed(excelRow, column, row.value(id), row.excel({ id, col }))
    })
  })

  return sheet.finalize([62, 24, 24, 24, 24, 78])
}

function buildSummary(result: FinblockResult, horizonYears: number) {
  const sheet = createSheet()
  sheet.text(0, 0, 'Показатель')
  sheet.text(0, 1, 'Значение')
  sheet.text(0, 2, 'Формула')

  const paybackFormula = 'IF(B4<=0,"Не окупается",B5/B4*12)'
  const roiFormula = `IF(B5=0,"Не определяется",(B4*'Исходные данные'!B4-B5)/B5*100)`
  const reductionFormula = 'IF(B2=0,"Не рассчитывается",B4/B2*100)'

  sheet.text(1, 0, 'Текущие годовые расходы Финблока, сум')
  sheet.number(1, 1, result.processCost, 'Расчет!B5+Расчет!C5+Расчет!D5+Расчет!E5')
  sheet.text(1, 2, 'Сумма стоимости процессов ДБУ, МСФО, ФМ и ALM')

  sheet.text(2, 0, 'Годовые расходы после внедрения ИИ, сум')
  sheet.number(2, 1, result.costAfterAi, 'Расчет!B10+Расчет!C10+Расчет!D10+Расчет!E10')
  sheet.text(2, 2, 'Сумма оставшихся расходов на сотрудников и ежегодных расходов на ИИ')

  sheet.text(3, 0, 'Годовой эффект до амортизации, сум')
  sheet.number(3, 1, result.operatingAnnualEffect, 'B2-B3')
  sheet.text(3, 2, 'Текущие расходы − расходы после внедрения. По этой сумме считаются окупаемость и ROI')

  sheet.text(4, 0, 'Общий CAPEX, сум')
  sheet.number(4, 1, result.totalCapex, "'Исходные данные'!B5")
  sheet.text(4, 2, 'Единый инвестиционный бюджет. Учитывается один раз')

  sheet.text(5, 0, 'Срок окупаемости, мес.')
  sheet.mixed(5, 1, result.paybackMonths ?? 'Не окупается', paybackFormula)
  sheet.text(5, 2, 'Общий CAPEX / эффект до амортизации × 12. При эффекте ≤ 0 — «Не окупается»')

  sheet.text(6, 0, `ROI за ${horizonYears} лет, %`)
  sheet.mixed(6, 1, result.roiPercent ?? 'Не определяется', roiFormula)
  sheet.text(6, 2, '((Годовой эффект × число лет − общий CAPEX) / общий CAPEX) × 100')

  sheet.text(7, 0, 'Снижение расходов, %')
  sheet.mixed(7, 1, result.reductionPercent ?? 'Не рассчитывается', reductionFormula)
  sheet.text(7, 2, 'Эффект до амортизации / текущие расходы × 100')

  sheet.text(8, 0, 'Годовая амортизация CAPEX, сум')
  sheet.number(8, 1, result.annualDepreciation, "ROUND(B5*'Исходные данные'!B6/100,0)")
  sheet.text(8, 2, 'Общий CAPEX × норма годовой амортизации. Учитывается один раз')

  sheet.text(9, 0, 'Годовой эффект после амортизации, сум')
  sheet.number(9, 1, result.annualEffect, 'B4-B9')
  sheet.text(9, 2, 'Эффект до амортизации − годовая амортизация')

  sheet.text(10, 0, 'Месячный эффект после амортизации, сум')
  sheet.number(10, 1, result.monthlyEffect, 'B10/12')
  sheet.text(10, 2, 'Годовой эффект после амортизации / 12')

  return sheet.finalize([62, 28, 78])
}

function buildMethodology() {
  const sheet = createSheet()
  sheet.text(0, 0, 'Методика расчета')
  METHODOLOGY.forEach((line, index) => sheet.text(index + 1, 0, `${index + 1}. ${line}`))
  sheet.text(
    METHODOLOGY.length + 2,
    0,
    'Листы «Расчет» и «Финблок» содержат рабочие формулы Excel. Показанные значения совпадают с калькулятором и пересчитываются при изменении исходных данных.',
  )
  return sheet.finalize([140])
}

export function buildWorkbook(state: AppState, result: FinblockResult): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, buildInputs(state), 'Исходные данные')
  XLSX.utils.book_append_sheet(workbook, buildCalculation(result), 'Расчет')
  XLSX.utils.book_append_sheet(workbook, buildSummary(result, state.settings.horizonYears), 'Финблок')
  XLSX.utils.book_append_sheet(workbook, buildMethodology(), 'Методика')
  return workbook
}

export function downloadWorkbook(state: AppState, result: FinblockResult) {
  const workbook = buildWorkbook(state, result)
  XLSX.writeFile(workbook, 'Финблок_эффект_ИИ.xlsx')
}
