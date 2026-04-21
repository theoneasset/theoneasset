import Airtable from 'airtable'
import type { Listing, CostRecord } from '@/types'

function requireEnv(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`[Airtable] 필수 환경변수 누락: ${key}`)
  return val
}

function getBase() {
  const token = requireEnv('AIRTABLE_TOKEN')
  const baseId = requireEnv('AIRTABLE_BASE_ID')
  Airtable.configure({ apiKey: token })
  return Airtable.base(baseId)
}

export const TABLES = {
  BUILDINGS:  () => requireEnv('AIRTABLE_TABLE_BUILDINGS'),
  LISTINGS:   () => requireEnv('AIRTABLE_TABLE_LISTINGS'),
  CLIENTS:    () => requireEnv('AIRTABLE_TABLE_CLIENTS'),
  PROPOSALS:  () => requireEnv('AIRTABLE_TABLE_PROPOSALS'),
  CONTENT:    () => requireEnv('AIRTABLE_TABLE_CONTENT'),
  COSTS:      () => requireEnv('AIRTABLE_TABLE_COSTS'),
  LOCK:       () => requireEnv('AIRTABLE_TABLE_LOCK'),
}

export async function getRecords(
  tableName: string,
  options: {
    view?: string
    filterFormula?: string
    maxRecords?: number
    fields?: string[]
    sort?: { field: string; direction?: 'asc' | 'desc' }[]
  } = {}
): Promise<Airtable.Record<Airtable.FieldSet>[]> {
  const base = getBase()
  const records: Airtable.Record<Airtable.FieldSet>[] = []

  const queryOptions: Airtable.SelectOptions<Airtable.FieldSet> = {}
  if (options.view) queryOptions.view = options.view
  if (options.filterFormula) queryOptions.filterByFormula = options.filterFormula
  if (options.maxRecords) queryOptions.maxRecords = options.maxRecords
  if (options.fields) queryOptions.fields = options.fields
  if (options.sort) queryOptions.sort = options.sort

  await base(tableName).select(queryOptions).eachPage((pageRecords, fetchNextPage) => {
    records.push(...pageRecords)
    fetchNextPage()
  })

  return records
}

export async function createRecord(
  tableName: string,
  fields: Airtable.FieldSet
): Promise<Airtable.Record<Airtable.FieldSet>> {
  const base = getBase()
  return base(tableName).create(fields)
}

export async function updateRecord(
  tableName: string,
  recordId: string,
  fields: Partial<Airtable.FieldSet>
): Promise<Airtable.Record<Airtable.FieldSet>> {
  const base = getBase()
  return base(tableName).update(recordId, fields as Airtable.FieldSet)
}

export async function deleteRecord(
  tableName: string,
  recordId: string
): Promise<Airtable.Record<Airtable.FieldSet>> {
  const base = getBase()
  return base(tableName).destroy(recordId)
}

export async function findListingByUrl(sourceUrl: string): Promise<boolean> {
  const records = await getRecords(TABLES.LISTINGS(), {
    filterFormula: `{원문링크} = "${sourceUrl}"`,
    maxRecords: 1,
    fields: ['원문링크'],
  })
  return records.length > 0
}

export async function upsertListing(
  listing: Partial<Listing>
): Promise<{ created: boolean; recordId: string }> {
  if (listing.sourceUrl) {
    const exists = await findListingByUrl(listing.sourceUrl)
    if (exists) {
      return { created: false, recordId: '' }
    }
  }

  const record = await createRecord(TABLES.LISTINGS(), {
    '주소':           listing.address ?? '',
    '건물명':         listing.buildingName ?? '',
    '해당층':         listing.floor ?? '',
    '전용평수(평)':   listing.area,
    '매물유형':       listing.propertyType ?? '기타',
    '임대보증금':     listing.deposit,
    '월세':           listing.monthlyRent,
    '매매가':         listing.salePrice,
    '출처':           listing.source ?? '직접입력',
    '원문링크':       listing.sourceUrl ?? '',
    '상태':           listing.status ?? '신규',
    '위도':           listing.latitude,
    '경도':           listing.longitude,
    '지역':           listing.district ?? '',
    '매물처등록일':   listing.crawledAt ?? new Date().toISOString(),
    '더원에셋접수일': new Date().toISOString(),
    '수정일':         new Date().toISOString(),
  })

  return { created: true, recordId: record.id }
}

export async function saveCostRecord(cost: Omit<CostRecord, 'id' | 'airtableId'>): Promise<string> {
  const record = await createRecord(TABLES.COSTS(), {
    '사용일시':    cost.timestamp,
    '모델':        cost.model,
    '입력토큰':    cost.inputTokens,
    '출력토큰':    cost.outputTokens,
    '입력비용USD': cost.inputCostUsd,
    '출력비용USD': cost.outputCostUsd,
    '총비용USD':   cost.totalCostUsd,
    '용도':        cost.purpose,
    '매물ID':      cost.listingId ?? '',
  })
  return record.id
}

export async function getTotalCost(): Promise<number> {
  try {
    const records = await getRecords(TABLES.COSTS(), {
      fields: ['총비용USD'],
    })
    return records.reduce((sum, r) => sum + ((r.fields['총비용USD'] as number) ?? 0), 0)
  } catch {
    return 0
  }
}