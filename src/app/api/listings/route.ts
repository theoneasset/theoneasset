import { NextRequest, NextResponse } from 'next/server'
import { getRecords, updateRecord, TABLES } from '@/lib/airtable/client'
import { getLockStatus, acquireLock } from '@/lib/airtable/lock'
import type { ApiResponse, Listing } from '@/types'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url)
  const status   = searchParams.get('status')
  const district = searchParams.get('district')
  const source   = searchParams.get('source')
  const limit    = parseInt(searchParams.get('limit') ?? '100')

  try {
    const filters: string[] = []
    if (status)   filters.push(`{상태} = "${status}"`)
    if (district) filters.push(`FIND("${district}", {지역}) > 0`)
    if (source)   filters.push(`{출처} = "${source}"`)

    const filterFormula = filters.length > 0
      ? `AND(${filters.join(',')})`
      : undefined

    const records = await getRecords(TABLES.LISTINGS(), {
      filterFormula,
      maxRecords: limit,
      sort: [{ field: '더원에셋접수일', direction: 'desc' }],
    })

    const listings: Partial<Listing>[] = records.map(r => ({
      id:             r.id,
      airtableId:     r.id,
      address:        r.fields['주소'] as string,
      buildingName:   r.fields['건물명'] as string,
      floor:          r.fields['해당층'] as string,
      area:           r.fields['전용평수(평)'] as number,
      propertyType:   r.fields['매물유형'] as Listing['propertyType'],
      deposit:        r.fields['임대보증금'] as number,
      monthlyRent:    r.fields['월세'] as number,
      salePrice:      r.fields['매매가'] as number,
      maintenanceFee: r.fields['관리비'] as number,
      source:         r.fields['출처'] as Listing['source'],
      sourceUrl:      r.fields['원문링크'] as string,
      status:         r.fields['상태'] as Listing['status'],
      latitude:       r.fields['위도'] as number,
      longitude:      r.fields['경도'] as number,
      district:       r.fields['지역'] as string,
      aiAnalysis:     r.fields['AI분석'] as string,
      aiScore:        r.fields['AI점수'] as number,
      assignedTo:     r.fields['담당자'] as string,
      crawledAt:      r.fields['매물처등록일'] as string,
      createdAt:      r.fields['더원에셋접수일'] as string,
      updatedAt:      r.fields['수정일'] as string,
    }))

    return NextResponse.json({
      success:   true,
      data:      listings,
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse<typeof listings>)

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { success: false, error: message, timestamp: new Date().toISOString() },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json()
    const { airtableId, updatedBy, fields } = body

    if (!airtableId || !updatedBy) {
      return NextResponse.json(
        { success: false, error: 'airtableId, updatedBy 필수', timestamp: new Date().toISOString() },
        { status: 400 }
      )
    }

    const lockStatus = await getLockStatus('listing', airtableId)

    if (lockStatus.locked && lockStatus.lockedBy !== updatedBy) {
      return NextResponse.json(
        {
          success: false,
          error: `"${lockStatus.lockedBy}" 님이 편집 중입니다 (${lockStatus.remainingMin}분 후 자동 해제)`,
          data: { lockedBy: lockStatus.lockedBy, remainingMin: lockStatus.remainingMin },
          timestamp: new Date().toISOString(),
        },
        { status: 409 }
      )
    }

    const lockResult = await acquireLock('listing', airtableId, updatedBy)
    if (!lockResult.acquired) {
      return NextResponse.json(
        {
          success: false,
          error: `잠금 획득 실패: ${lockResult.lockedBy} 님이 사용 중`,
          timestamp: new Date().toISOString(),
        },
        { status: 409 }
      )
    }

    await updateRecord(TABLES.LISTINGS(), airtableId, {
      ...fields,
      '수정일': new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      data:    { airtableId, lockId: lockResult.lockId },
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse<unknown>)

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { success: false, error: message, timestamp: new Date().toISOString() },
      { status: 500 }
    )
  }
}