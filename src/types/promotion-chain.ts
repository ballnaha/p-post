// Promotion Chain - Type Definitions
// ไฟล์นี้รวม Types ทั้งหมดที่ใช้ใน Promotion Chain System

export interface RankHierarchy {
  rankName: string;
  rankLevel: number;
  abbreviation?: string;
}

export interface ChainNode {
  id: string;
  nodeOrder: number;
  
  // Personnel Info
  personnelId?: string;
  nationalId: string;
  fullName: string;
  rank: string;
  seniority?: string;
  
  // From Position (จะกลายเป็นตำแหน่งว่าง)
  fromPosCodeId: number;
  fromPosition: string;
  fromPositionNumber?: string;
  fromUnit: string;
  
  // To Position (ตำแหน่งใหม่ที่ได้รับ)
  toPosCodeId: number;
  toPosition: string;
  toPositionNumber?: string;
  toUnit: string;
  
  // Rank Levels
  fromRankLevel: number;
  toRankLevel: number;
  isPromotionValid: boolean;
  
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PromotionChain {
  id: string;
  year: number;
  chainNumber: string;
  status: 'draft' | 'approved' | 'completed' | 'cancelled';
  
  // Origin Position
  originVacantPositionId: string;
  originPosCodeId: number;
  originPosition: string;
  originUnit: string;
  
  totalNodes: number;
  nodes: ChainNode[];
  
  notes?: string;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface VacantPosition {
  id: string;
  year: number;
  posCodeId: number;
  position: string;
  unit: string;
  positionNumber?: string;
  requestedPositionId?: number;
  requestedPosition?: string;
  nominator?: string;
  notes?: string;
}

export interface SwapListPerson {
  id: string;
  year: number;
  
  // Position Info
  posCodeId: number;
  position: string;
  positionNumber?: string;
  unit: string;
  actingAs?: string;
  
  // Person Info
  seniority?: string;
  rank: string;
  fullName: string;
  nationalId: string;
  birthDate?: string;
  age?: string;
  education?: string;
  
  // For Promotion Chain
  rankLevel: number;
  
  // Appointment Info
  lastAppointment?: string;
  currentRankSince?: string;
  enrollmentDate?: string;
  retirementDate?: string;
  yearsOfService?: string;
  
  // Training Info
  trainingLocation?: string;
  trainingCourse?: string;
  
  // Nomination Info
  supporterName?: string; // ผู้สนับสนุน/ผู้เสนอชื่อ
  supportReason?: string; // เหตุผลในการสนับสนุน
}

export interface PromotionChainSummary {
  totalChains: number;
  byStatus: {
    draft: number;
    approved: number;
    completed: number;
    cancelled: number;
  };
  averageNodesPerChain: number;
  totalPersonnelAffected: number;
}

// Validation Types
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  nodeId?: string;
  type: 'rank_mismatch' | 'invalid_promotion' | 'duplicate_personnel' | 'missing_data';
  message: string;
}

export interface ValidationWarning {
  nodeId?: string;
  type: 'age_concern' | 'experience_concern' | 'unit_change';
  message: string;
}

// API Response Types
export interface CreateChainRequest {
  year: number;
  originVacantPositionId: string;
  nodes: Omit<ChainNode, 'id' | 'createdAt' | 'updatedAt'>[];
  notes?: string;
}

export interface CreateChainResponse {
  success: boolean;
  data?: PromotionChain;
  error?: string;
}

export interface GetChainsResponse {
  success: boolean;
  data?: PromotionChain[];
  total?: number;
  error?: string;
}

export interface ApproveChainRequest {
  chainId: string;
  approvedBy: string;
  notes?: string;
}

export interface ApproveChainResponse {
  success: boolean;
  data?: PromotionChain;
  error?: string;
}
