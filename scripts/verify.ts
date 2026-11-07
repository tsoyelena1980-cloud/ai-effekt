import assert from 'node:assert/strict'
import { buildWorkbook } from '../src/finance/exportExcel'
import { formatTyping } from '../src/finance/format'
import { calculateFinblock, createDemoState, type AppState } from '../src/finance/model'

const demo = createDemoState()
const result = calculateFinblock(demo)

assert.equal(result.units.dbu.hourCost, 12_500_000 / 22 / 8)
assert.equal(result.processCost, 21_818_181_818)
assert.equal(result.costAfterAi, 12_651_654_546)
assert.equal(result.operatingAnnualEffect, 9_166_527_272)
assert.equal(result.annualDepreciation, 2_400_000_000)
assert.equal(result.annualEffect, 6_766_527_272)
assert.equal(result.monthlyEffect, 6_766_527_272 / 12)
assert.equal(result.totalCapex, 12_000_000_000)
const operating = 9_166_527_272
assert.ok(result.reductionPercent !== null && Math.abs(result.reductionPercent - (operating / 21_818_181_818) * 100) < 1e-6)
assert.ok(result.paybackMonths !== null && Math.abs(result.paybackMonths - (12_000_000_000 / operating) * 12) < 1e-6)
assert.ok(
  result.roiPercent !== null &&
    Math.abs(result.roiPercent - ((operating * 5 - 12_000_000_000) / 12_000_000_000) * 100) < 1e-6,
)
assert.equal(result.units.dbu.processCost, 9_090_909_091)
assert.equal(result.units.dbu.aiTotalCost, 860_800_000)
assert.equal(result.units.dbu.remainingStaffCost, 3_636_363_636)
assert.equal(result.units.dbu.operatingAnnualEffect, 4_593_745_455)
assert.equal(result.units.dbu.annualDepreciation, 960_000_000)
assert.equal(result.units.dbu.annualEffect, 3_633_745_455)
assert.equal(result.units.ifrs.processCost, 3_636_363_636)
assert.equal(result.units.fm.processCost, 5_454_545_455)
assert.equal(result.units.alm.processCost, 3_636_363_636)
assert.equal(
  result.units.dbu.operatingAnnualEffect +
    result.units.ifrs.operatingAnnualEffect +
    result.units.fm.operatingAnnualEffect +
    result.units.alm.operatingAnnualEffect,
  result.operatingAnnualEffect,
)
assert.equal(
  result.units.dbu.annualEffect +
    result.units.ifrs.annualEffect +
    result.units.fm.annualEffect +
    result.units.alm.annualEffect,
  result.annualEffect,
)
assert.equal(result.units.dbu.allocatedCapex, 4_800_000_000)
assert.equal(result.units.ifrs.allocatedCapex, 2_400_000_000)
assert.equal(result.units.fm.allocatedCapex, 3_000_000_000)
assert.equal(result.units.alm.allocatedCapex, 1_800_000_000)

const half: AppState = {
  ...demo,
  settings: { ...demo.settings, laborReductionPercent: 50 },
}
const halfResult = calculateFinblock(half)
assert.equal(halfResult.units.dbu.remainingStaffCost, 6_363_636_364)
assert.equal(halfResult.units.dbu.operatingAnnualEffect, 1_866_472_727)

const noCapex = calculateFinblock({
  ...demo,
  stages: {
    ...demo.stages,
    assistants: { ...demo.stages.assistants, totalCapex: 0 },
  },
})
assert.equal(noCapex.roiPercent, null)
assert.equal(noCapex.paybackMonths, 0)
assert.equal(noCapex.annualDepreciation, 0)
assert.equal(noCapex.annualEffect, result.operatingAnnualEffect)

const loss = calculateFinblock({
  ...demo,
  stages: {
    ...demo.stages,
    assistants: {
      ...demo.stages.assistants,
      units: {
        ...demo.stages.assistants.units,
        dbu: { ...demo.stages.assistants.units.dbu, aiOpexAnnual: 20_000_000_000 },
      },
    },
  },
})
assert.ok(loss.annualEffect < 0)
assert.equal(loss.paybackMonths, null)
assert.ok(loss.roiPercent !== null && loss.roiPercent < 0)

const zeroProcess = calculateFinblock({
  ...demo,
  stages: {
    ...demo.stages,
    assistants: {
      ...demo.stages.assistants,
      units: {
        dbu: { ...demo.stages.assistants.units.dbu, operationsPerMonth: 0, aiSharePercent: 0, aiOpexAnnual: 0 },
        ifrs: { ...demo.stages.assistants.units.ifrs, operationsPerMonth: 0, aiSharePercent: 0, aiOpexAnnual: 0 },
        fm: { ...demo.stages.assistants.units.fm, operationsPerMonth: 0, aiSharePercent: 0, aiOpexAnnual: 0 },
        alm: { ...demo.stages.assistants.units.alm, operationsPerMonth: 0, aiSharePercent: 0, aiOpexAnnual: 0 },
      },
    },
  },
})
assert.equal(zeroProcess.processCost, 0)
assert.equal(zeroProcess.reductionPercent, null)

const zeroRate = calculateFinblock({
  ...demo,
  stages: {
    ...demo.stages,
    assistants: {
      ...demo.stages.assistants,
      units: {
        ...demo.stages.assistants.units,
        dbu: { ...demo.stages.assistants.units.dbu, fteMonthlyCost: 0 },
      },
    },
  },
})
assert.equal(zeroRate.units.dbu.hourCost, 0)
assert.equal(zeroRate.units.dbu.processCost, 0)

const badShares = calculateFinblock({
  ...demo,
  stages: {
    ...demo.stages,
    assistants: { ...demo.stages.assistants, capexShare: { dbu: 40, ifrs: 20, fm: 25, alm: 20 } },
  },
})
const excluded = calculateFinblock({
  ...demo,
  stages: {
    ...demo.stages,
    assistants: { ...demo.stages.assistants, implemented: false },
  },
})
assert.equal(excluded.annualEffect, 0)
assert.equal(excluded.totalCapex, 0)

assert.equal(badShares.capexSharesValid, false)
assert.equal(badShares.totalCapex, 12_000_000_000)

const oneYear = calculateFinblock({ ...demo, settings: { ...demo.settings, horizonYears: 1 } })
assert.ok(oneYear.roiPercent !== null && oneYear.roiPercent < (result.roiPercent ?? 0))

const workbook = buildWorkbook(demo, result)
const calculation = workbook.Sheets['Расчет']
const summary = workbook.Sheets['Финблок']
assert.ok(calculation)
assert.ok(summary)
assert.equal(calculation['B3']?.f, "'Исходные данные'!B9/'Исходные данные'!$B$2/8")
assert.equal(calculation['B5']?.f, 'ROUND(B2*B3,0)')
assert.equal(calculation['B5']?.v, 9_090_909_091)
assert.equal(summary['B4']?.v, 9_166_527_272)
assert.equal(summary['B4']?.f, 'B2-B3')
assert.equal(summary['B6']?.f, 'IF(B4<=0,"Не окупается",B5/B4*12)')
assert.match(String(summary['B7']?.f), /Не определяется/)

assert.equal(formatTyping('12000000000', 0).replace(/\D/g, ''), '12000000000')
assert.notEqual(formatTyping('12000000000', 0), '12000000000')
assert.equal(formatTyping('00012000', 0).replace(/\D/g, ''), '12000')
assert.equal(formatTyping('12,50', 1).endsWith(',5'), true)
assert.equal(formatTyping('', 0), '')

console.log('model ok', result.annualEffect, result.paybackMonths, result.roiPercent)
