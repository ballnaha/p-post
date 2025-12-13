const VACANT_LABEL = 'ตำแหน่งว่าง';
const RESERVED_LABEL = 'ว่าง (กันตำแหน่ง)';
const PLACEHOLDER_KEYWORDS = new Set([
  'ว่าง',
  'ว่าง (กันตำแหน่ง)',
  'ว่าง(กันตำแหน่ง)',
  'ตำแหน่งว่าง',
  '[รอการเลือกบุคลากร]',
  '[Waiting]',
]);

export interface ColumnFilterDetail {
  rank?: string | null;
  fullName?: string | null;
  supporterName?: string | null;
  supportReason?: string | null;
  fromPosition?: string | null;
  fromUnit?: string | null;
  fromPositionNumber?: string | null;
  toPosition?: string | null;
  toUnit?: string | null;
  toPositionNumber?: string | null;
  transaction?: { swapType?: string | null } | null;
  replacedPerson?: {
    rank?: string | null;
    fullName?: string | null;
    fromPosition?: string | null;
    fromUnit?: string | null;
    fromPositionNumber?: string | null;
  } | null;
}

const formatName = (rank?: string | null, name?: string | null) => {
  const parts = [rank, name].filter(Boolean);
  return parts.length ? parts.join(' ').trim() : '';
};

const formatPosition = (position?: string | null, unit?: string | null) => {
  const parts = [position, unit].filter(Boolean);
  return parts.length ? parts.join(' · ').trim() : '';
};

const formatNewPosition = (
  position?: string | null,
  unit?: string | null,
  positionNumber?: string | null,
) => {
  const rawParts: Array<string | null | undefined> = [
    position,
    unit,
    positionNumber ? `#${positionNumber}` : null,
  ];

  const parts = rawParts
    .map(part => part?.trim() || '')
    .filter(part => part.length > 0);

  return parts.length ? parts.join(' · ') : '';
};

const isPlaceholderName = (name?: string | null): boolean => {
  const trimmed = name?.trim() || '';
  if (!trimmed) return true;
  if (PLACEHOLDER_KEYWORDS.has(trimmed)) return true;
  return false;
};

const getVacantLabel = (name?: string | null): string => {
  if (name && name.includes('กันตำแหน่ง')) {
    return RESERVED_LABEL;
  }
  return VACANT_LABEL;
};

export const getIncomingLabel = (detail: ColumnFilterDetail): string | null => {
  if (!detail) return null;

  // ถ้าเป็น placeholder (ว่าง) UI จะไม่แสดงข้อมูลในคอลัมน์นี้
  if (isPlaceholderName(detail.fullName)) {
    return null;
  }

  const hasTransaction = !!detail.transaction;

  if (hasTransaction && detail.fullName) {
    const label = formatName(detail.rank, detail.fullName);
    return label || null;
  }

  if (detail.replacedPerson && !isPlaceholderName(detail.replacedPerson.fullName)) {
    const label = formatName(detail.replacedPerson.rank, detail.replacedPerson.fullName);
    return label || null;
  }

  return null;
};

export const getCurrentHolderLabel = (detail: ColumnFilterDetail): string => {
  if (detail.replacedPerson) {
    if (!isPlaceholderName(detail.replacedPerson.fullName)) {
      const label = formatName(detail.replacedPerson.rank, detail.replacedPerson.fullName);
      return label || VACANT_LABEL;
    }
    return getVacantLabel(detail.replacedPerson.fullName);
  }

  if (detail.transaction) {
    return getVacantLabel();
  }

  if (!isPlaceholderName(detail.fullName)) {
    const label = formatName(detail.rank, detail.fullName);
    return label || VACANT_LABEL;
  }

  return getVacantLabel(detail.fullName);
};

export const getCurrentPositionLabel = (detail: ColumnFilterDetail): string | null => {
  let position: string | null | undefined = null;

  if (detail.replacedPerson && !isPlaceholderName(detail.replacedPerson.fullName)) {
    position = detail.replacedPerson.fromPosition;
    console.log('[Filter Debug] getCurrentPosition - replaced person:', {
      fullName: detail.fullName,
      replacedFullName: detail.replacedPerson.fullName,
      position: position,
    });
  } else {
    const hasTransaction = !!detail.transaction;
    const isCurrentPerson = !isPlaceholderName(detail.fullName);

    // ถ้าเป็น placeholder (ว่าง) และไม่มี transaction = ตำแหน่งว่างที่ยังไม่มีคนครอง
    // UI จะแสดง chip "ตำแหน่งว่าง" ใน column คนครอง ไม่ใช่ตำแหน่งจริง → ไม่ควรนับใน filter
    if (!isCurrentPerson && !hasTransaction) {
      console.log('[Filter Debug] getCurrentPosition - vacant without transaction (skip):', {
        fullName: detail.fullName,
        fromPosition: detail.fromPosition,
      });
      return null;
    }

    // ถ้ามี transaction หรือเป็น placeholder (ว่าง) ที่มี transaction ให้ใช้ toPosition ก่อน (เหมือน UI)
    // ถ้าเป็นคนปกติที่ไม่มี transaction ให้ใช้ fromPosition
    if ((hasTransaction && isCurrentPerson) || (hasTransaction && !isCurrentPerson)) {
      position = detail.toPosition || detail.fromPosition;
      console.log('[Filter Debug] getCurrentPosition - transaction:', {
        fullName: detail.fullName,
        hasTransaction,
        isCurrentPerson,
        toPosition: detail.toPosition,
        fromPosition: detail.fromPosition,
        position: position,
      });
    } else {
      position = detail.fromPosition || detail.toPosition;
      console.log('[Filter Debug] getCurrentPosition - normal person:', {
        fullName: detail.fullName,
        fromPosition: detail.fromPosition,
        toPosition: detail.toPosition,
        position: position,
      });
    }
  }

  const trimmed = position?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
};

export const getNewPositionLabel = (detail: ColumnFilterDetail): string | null => {
  // กรองเฉพาะ position (ไม่รวม unit และ positionNumber) เพื่อให้ตรงกับที่แสดงในตาราง
  // ใช้ || แทน ?? เพื่อให้ fallback ทำงานกรณีที่เป็น string ว่าง
  const position = detail.toPosition || detail.replacedPerson?.fromPosition || null;
  const trimmed = position?.trim();
  
  console.log('[Filter Debug] getNewPosition:', {
    fullName: detail.fullName,
    toPosition: detail.toPosition,
    replacedFromPosition: detail.replacedPerson?.fromPosition,
    finalPosition: trimmed,
  });
  
  return trimmed && trimmed.length > 0 ? trimmed : null;
};

export const getSupporterLabel = (detail: ColumnFilterDetail): string => {
  const supporter = detail.supporterName?.trim();
  return supporter && supporter.length > 0 ? supporter : '(ไม่ระบุ)';
};

export const getReasonLabel = (detail: ColumnFilterDetail): string => {
  const reason = detail.supportReason?.trim();
  return reason && reason.length > 0 ? reason : '(ไม่ระบุ)';
};
