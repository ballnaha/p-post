export interface Personnel {
    id: string;
    noId?: number | string | null;
    fullName: string | null;
    rank: string | null;
    position: string | null;
    unit: string | null;
    positionNumber: string | null;
    avatarUrl: string | null;
    age?: string;
    seniority?: string;
    actingAs?: string | null;
    supporterName?: string | null;
    supportReason?: string | null;
    requestedPosition?: string | null;
    notes?: string | null;
    posCodeId?: number;
    posCodeMaster?: { id: number; name: string } | null;
    originalId?: string;
    // Swap transaction metadata
    swapDetailId?: string; // ID of SwapTransactionDetail record for syncing
    transactionId?: string; // ID of parent SwapTransaction
    transactionType?: string; // Type: two-way, three-way, promotion, etc.
    [key: string]: any;
}

export interface Column {
    id: string;
    title: string;
    groupNumber?: string;
    itemIds: string[];
    vacantPosition?: any;
    level?: number;
    chainId?: string;
    chainType?: 'swap' | 'three-way' | 'promotion' | 'custom';
    // Link to original SwapTransaction (for two-way, three-way swaps)
    linkedTransactionId?: string;
    linkedTransactionType?: string; // 'two-way', 'three-way', etc.
    isCompleted?: boolean; // Lane marked as complete and can be hidden
}
