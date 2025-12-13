import { NextRequest, NextResponse } from 'next/server';
import {
    ColumnFilterDetail,
    getIncomingLabel,
    getCurrentHolderLabel,
    getCurrentPositionLabel,
    getNewPositionLabel,
    getSupporterLabel,
    getReasonLabel,
} from '@/utils/columnFilterLabels';
import { GET as getNewInOutData } from '../route';

interface FilterOption {
    value: string;
    label: string;
    count: number;
}

interface ColumnFiltersResponse {
    incomingPerson: FilterOption[];
    currentHolder: FilterOption[];
    currentPosition: FilterOption[];
    newPosition: FilterOption[];
    supporter: FilterOption[];
    reason: FilterOption[];
}

const cache = new Map<string, { data: ColumnFiltersResponse; timestamp: number }>();
const CACHE_TTL = 60000; // 60 seconds
const PAGE_SIZE = 1000;

const mapToOptions = (map: Map<string, number>): FilterOption[] => {
    return Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 200)
        .map(([value, count]) => ({ value, label: value, count }));
};

const addValue = (map: Map<string, number>, value?: string | null) => {
    const trimmed = value?.trim();
    if (!trimmed) return;
    map.set(trimmed, (map.get(trimmed) || 0) + 1);
};

async function fetchAllSwapDetails(params: URLSearchParams): Promise<ColumnFilterDetail[]> {
    const dataUrl = new URL('https://internal.local/api/new-in-out');
    const allDetails: ColumnFilterDetail[] = [];
    let totalCount = Infinity;
    let page = 0;

    while (allDetails.length < totalCount) {
        params.set('page', page.toString());
        params.set('pageSize', PAGE_SIZE.toString());
        dataUrl.search = params.toString();

        const req = new NextRequest(dataUrl.toString());
        const response = await getNewInOutData(req);

        if (!response.ok) {
            throw new Error('Failed to fetch swap details');
        }

        const payload = await response.json();
        if (!payload?.success || !payload?.data) {
            throw new Error('Invalid response from main API');
        }

        const details: ColumnFilterDetail[] = payload.data.swapDetails || [];
        allDetails.push(...details);
        totalCount = payload.data.totalCount ?? allDetails.length;

        if (details.length === 0) break;
        page += 1;
    }

    return allDetails;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const unit = searchParams.get('unit') || 'all';
        const posCodeId = searchParams.get('posCodeId') || 'all';
        const status = searchParams.get('status') || 'all';
        const swapType = searchParams.get('swapType') || 'all';
        const year = searchParams.get('year') || String(new Date().getFullYear() + 543);

        const cacheKey = `${unit}-${posCodeId}-${status}-${swapType}-${year}`;
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return NextResponse.json({ success: true, data: cached.data, cached: true });
        }

        const params = new URLSearchParams({
            unit,
            posCodeId,
            status,
            swapType,
            year,
            filtersOnly: 'false',
        });

        const allDetails = await fetchAllSwapDetails(params);

        const incomingMap = new Map<string, number>();
        const holderMap = new Map<string, number>();
        const currentPositionMap = new Map<string, number>();
        const newPositionMap = new Map<string, number>();
        const supporterMap = new Map<string, number>();
        const reasonMap = new Map<string, number>();

        for (const detail of allDetails) {
            addValue(incomingMap, getIncomingLabel(detail));
            addValue(holderMap, getCurrentHolderLabel(detail));
            addValue(currentPositionMap, getCurrentPositionLabel(detail));
            addValue(newPositionMap, getNewPositionLabel(detail));
            addValue(supporterMap, getSupporterLabel(detail));
            addValue(reasonMap, getReasonLabel(detail));
        }

        const response: ColumnFiltersResponse = {
            incomingPerson: mapToOptions(incomingMap),
            currentHolder: mapToOptions(holderMap),
            currentPosition: mapToOptions(currentPositionMap),
            newPosition: mapToOptions(newPositionMap),
            supporter: mapToOptions(supporterMap),
            reason: mapToOptions(reasonMap),
        };

        cache.set(cacheKey, { data: response, timestamp: Date.now() });

        if (cache.size > 100) {
            const now = Date.now();
            for (const [key, value] of cache.entries()) {
                if (now - value.timestamp > CACHE_TTL) cache.delete(key);
            }
        }

        return NextResponse.json({ success: true, data: response });

    } catch (error) {
        console.error('Error fetching column filters:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch column filters', details: String(error) },
            { status: 500 }
        );
    }
}
