// Mock API for Promotion Chain
// ใช้สำหรับทดสอบ UI ก่อนที่จะมี Backend API จริง

import { PromotionChain, ChainNode, VacantPosition, SwapListPerson } from '@/types/promotion-chain';

const RANK_HIERARCHY = [
  { rankName: 'รอง ผบ.ตร.', rankLevel: 1 },
  { rankName: 'ผู้ช่วย', rankLevel: 2 },
  { rankName: 'ผบช.', rankLevel: 3 },
  { rankName: 'รอง ผบช.', rankLevel: 4 },
  { rankName: 'ผบก.', rankLevel: 6 },
  { rankName: 'รอง ผบก.', rankLevel: 7 },
  { rankName: 'ผกก.', rankLevel: 8 },
  { rankName: 'รอง ผกก.', rankLevel: 9 },
  { rankName: 'สว.', rankLevel: 11 },
  { rankName: 'รอง สว.', rankLevel: 12 },
];

// Mock Vacant Positions
export const mockVacantPositions: VacantPosition[] = [
  {
    id: 'vp-1',
    year: 2568,
    posCodeId: 8,
    position: 'ผกก-นครปฐม',
    unit: 'สถ.นครปฐม',
    positionNumber: 'VP-001',
    notes: 'ตำแหน่งว่างเนื่องจากเกษียณอายุ',
  },
  {
    id: 'vp-2',
    year: 2568,
    posCodeId: 6,
    position: 'ผบก.-สมุทรสาคร',
    unit: 'สถ.สมุทรสาคร',
    positionNumber: 'VP-002',
  },
  {
    id: 'vp-3',
    year: 2568,
    posCodeId: 11,
    position: 'สว.-กาญจนบุรี',
    unit: 'สถ.กาญจนบุรี',
    positionNumber: 'VP-003',
  },
];

// Mock Swap List (ผู้สมัคร)
export const mockSwapList: SwapListPerson[] = [
  // รอง ผบก. (Level 7)
  {
    id: 'sl-1',
    year: 2568,
    posCodeId: 7,
    position: 'รอง ผบก.-ราชบุรี',
    unit: 'สถ.ราชบุรี',
    fullName: 'พ.ต.ท. สมชาย ใจดี',
    rank: 'พ.ต.ท.',
    nationalId: '1234567890123',
    seniority: 'อ.50',
    rankLevel: 7,
    age: '52',
    education: 'ป.ตรี',
    yearsOfService: '30',
  },
  {
    id: 'sl-2',
    year: 2568,
    posCodeId: 7,
    position: 'รอง ผบก.-กาญจนบุรี',
    unit: 'สถ.กาญจนบุรี',
    fullName: 'พ.ต.ท. สมศรี รักษ์ดี',
    rank: 'พ.ต.ท.',
    nationalId: '1234567890124',
    seniority: 'อ.51',
    rankLevel: 7,
    age: '51',
    education: 'ป.ตรี',
    yearsOfService: '29',
  },
  
  // ผกก. (Level 8)
  {
    id: 'sl-3',
    year: 2568,
    posCodeId: 8,
    position: 'ผกก.-สมุทรสาคร',
    unit: 'สถ.สมุทรสาคร',
    fullName: 'พ.ต.ท. สมหมาย มั่นคง',
    rank: 'พ.ต.ท.',
    nationalId: '1234567890125',
    seniority: 'อ.52',
    rankLevel: 8,
    age: '50',
    education: 'ป.ตรี',
    yearsOfService: '28',
  },
  {
    id: 'sl-4',
    year: 2568,
    posCodeId: 8,
    position: 'ผกก.-สุพรรณบุรี',
    unit: 'สถ.สุพรรณบุรี',
    fullName: 'พ.ต.ต. สมพร เจริญดี',
    rank: 'พ.ต.ต.',
    nationalId: '1234567890126',
    seniority: 'อ.53',
    rankLevel: 8,
    age: '49',
    education: 'ป.ตรี',
    yearsOfService: '27',
  },
  
  // สว. (Level 11)
  {
    id: 'sl-5',
    year: 2568,
    posCodeId: 11,
    position: 'สว.-กาญจนบุรี',
    unit: 'สถ.กาญจนบุรี',
    fullName: 'พ.ต.ต. สมใจ ซื่อสัตย์',
    rank: 'พ.ต.ต.',
    nationalId: '1234567890127',
    seniority: 'อ.54',
    rankLevel: 11,
    age: '48',
    education: 'ป.ตรี',
    yearsOfService: '26',
  },
  {
    id: 'sl-6',
    year: 2568,
    posCodeId: 11,
    position: 'สว.-เพชรบุรี',
    unit: 'สถ.เพชรบุรี',
    fullName: 'พ.ต.ต. สมบูรณ์ ยุติธรรม',
    rank: 'พ.ต.ต.',
    nationalId: '1234567890128',
    seniority: 'อ.55',
    rankLevel: 11,
    age: '47',
    education: 'ป.ตรี',
    yearsOfService: '25',
  },
  
  // รอง สว. (Level 12)
  {
    id: 'sl-7',
    year: 2568,
    posCodeId: 12,
    position: 'รอง สว.-สุพรรณบุรี',
    unit: 'สถ.สุพรรณบุรี',
    fullName: 'ร.ต.อ. สมศักดิ์ กล้าหาญ',
    rank: 'ร.ต.อ.',
    nationalId: '1234567890129',
    seniority: 'อ.56',
    rankLevel: 12,
    age: '45',
    education: 'ป.ตรี',
    yearsOfService: '23',
  },
  {
    id: 'sl-8',
    year: 2568,
    posCodeId: 12,
    position: 'รอง สว.-ราชบุรี',
    unit: 'สถ.ราชบุรี',
    fullName: 'ร.ต.อ. สมนึก อุทิศ',
    rank: 'ร.ต.อ.',
    nationalId: '1234567890130',
    seniority: 'อ.57',
    rankLevel: 12,
    age: '44',
    education: 'ป.ตรี',
    yearsOfService: '22',
  },
];

// Mock Promotion Chains
export const mockPromotionChains: PromotionChain[] = [
  {
    id: 'pc-1',
    year: 2568,
    chainNumber: '2568/PC-001',
    status: 'draft',
    originVacantPositionId: 'vp-1',
    originPosCodeId: 8,
    originPosition: 'ผกก-นครปฐม',
    originUnit: 'สถ.นครปฐม',
    totalNodes: 3,
    nodes: [
      {
        id: 'node-1',
        nodeOrder: 1,
        personnelId: 'sl-1',
        nationalId: '1234567890123',
        fullName: 'พ.ต.ท. สมชาย ใจดี',
        rank: 'พ.ต.ท.',
        seniority: 'อ.50',
        fromPosCodeId: 7,
        fromPosition: 'รอง ผบก.-ราชบุรี',
        fromUnit: 'สถ.ราชบุรี',
        toPosCodeId: 8,
        toPosition: 'ผกก-นครปฐม',
        toUnit: 'สถ.นครปฐม',
        fromRankLevel: 7,
        toRankLevel: 8,
        isPromotionValid: true,
      },
      {
        id: 'node-2',
        nodeOrder: 2,
        personnelId: 'sl-3',
        nationalId: '1234567890125',
        fullName: 'พ.ต.ท. สมหมาย มั่นคง',
        rank: 'พ.ต.ท.',
        seniority: 'อ.52',
        fromPosCodeId: 8,
        fromPosition: 'ผกก.-สมุทรสาคร',
        fromUnit: 'สถ.สมุทรสาคร',
        toPosCodeId: 7,
        toPosition: 'รอง ผบก.-ราชบุรี',
        toUnit: 'สถ.ราชบุรี',
        fromRankLevel: 8,
        toRankLevel: 7,
        isPromotionValid: true,
      },
      {
        id: 'node-3',
        nodeOrder: 3,
        personnelId: 'sl-5',
        nationalId: '1234567890127',
        fullName: 'พ.ต.ต. สมใจ ซื่อสัตย์',
        rank: 'พ.ต.ต.',
        seniority: 'อ.54',
        fromPosCodeId: 11,
        fromPosition: 'สว.-กาญจนบุรี',
        fromUnit: 'สถ.กาญจนบุรี',
        toPosCodeId: 8,
        toPosition: 'ผกก.-สมุทรสาคร',
        toUnit: 'สถ.สมุทรสาคร',
        fromRankLevel: 11,
        toRankLevel: 8,
        isPromotionValid: true,
      },
    ],
    createdAt: '2024-11-01T10:00:00Z',
    createdBy: 'admin',
  },
];

// Mock API Functions
export const mockApi = {
  // Get all chains
  getChains: async (year?: number): Promise<PromotionChain[]> => {
    await delay(500);
    if (year) {
      return mockPromotionChains.filter((c) => c.year === year);
    }
    return mockPromotionChains;
  },

  // Get chain by ID
  getChain: async (id: string): Promise<PromotionChain | null> => {
    await delay(300);
    return mockPromotionChains.find((c) => c.id === id) || null;
  },

  // Get vacant positions
  getVacantPositions: async (year?: number): Promise<VacantPosition[]> => {
    await delay(400);
    if (year) {
      return mockVacantPositions.filter((vp) => vp.year === year);
    }
    return mockVacantPositions;
  },

  // Get candidates by rank level
  getCandidatesByRank: async (rankLevel: number, year: number = 2568): Promise<SwapListPerson[]> => {
    await delay(500);
    return mockSwapList.filter((p) => p.rankLevel === rankLevel && p.year === year);
  },

  // Create chain
  createChain: async (chain: Partial<PromotionChain>): Promise<PromotionChain> => {
    await delay(800);
    const newChain: PromotionChain = {
      id: `pc-${Date.now()}`,
      year: chain.year || 2568,
      chainNumber: `${chain.year}/PC-${String(mockPromotionChains.length + 1).padStart(3, '0')}`,
      status: 'draft',
      originVacantPositionId: chain.originVacantPositionId || '',
      originPosCodeId: chain.originPosCodeId || 0,
      originPosition: chain.originPosition || '',
      originUnit: chain.originUnit || '',
      totalNodes: chain.nodes?.length || 0,
      nodes: chain.nodes || [],
      createdAt: new Date().toISOString(),
      createdBy: 'admin',
    };
    mockPromotionChains.push(newChain);
    return newChain;
  },

  // Delete chain
  deleteChain: async (id: string): Promise<boolean> => {
    await delay(300);
    const index = mockPromotionChains.findIndex((c) => c.id === id);
    if (index > -1) {
      mockPromotionChains.splice(index, 1);
      return true;
    }
    return false;
  },

  // Approve chain
  approveChain: async (id: string): Promise<PromotionChain | null> => {
    await delay(500);
    const chain = mockPromotionChains.find((c) => c.id === id);
    if (chain) {
      chain.status = 'approved';
      chain.updatedAt = new Date().toISOString();
      return chain;
    }
    return null;
  },
};

// Utility: Simulate delay
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Utility: Get rank name by level
export function getRankNameByLevel(level: number): string {
  const rank = RANK_HIERARCHY.find((r) => r.rankLevel === level);
  return rank?.rankName || `ระดับ ${level}`;
}

// Utility: Validate promotion
export function validatePromotion(fromRankLevel: number, toRankLevel: number): boolean {
  // ตรวจสอบว่าเลื่อนขึ้นไปอย่างน้อย 1 ระดับ (ระดับน้อย = ยศสูงกว่า)
  return toRankLevel < fromRankLevel;
}

// Utility: Calculate next required rank
export function getNextRequiredRankLevel(
  vacantRankLevel: number,
  nodes: ChainNode[]
): number | null {
  if (nodes.length === 0) {
    return vacantRankLevel + 1;
  }
  const lastNode = nodes[nodes.length - 1];
  const nextLevel = lastNode.fromRankLevel + 1;
  return nextLevel <= 12 ? nextLevel : null;
}
