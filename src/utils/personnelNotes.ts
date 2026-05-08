const PERSON_NOTE_LABEL = 'หมายเหตุตัวคน';
const POSITION_NOTE_LABEL = 'หมายเหตุตำแหน่ง';

function extractTaggedNote(notes: string | null | undefined, label: string): string | null {
  if (!notes) return null;

  const prefix = `${label}:`;
  const value = notes
    .split('\n')
    .find((line) => line.startsWith(prefix))
    ?.replace(prefix, '')
    .trim();

  return value || null;
}

export function getLegacyPersonNote(notes: string | null | undefined): string | null {
  if (!notes) return null;

  const taggedPersonNote = extractTaggedNote(notes, PERSON_NOTE_LABEL);
  if (taggedPersonNote) return taggedPersonNote;

  const value = notes
    .split('\n')
    .filter((line) => !line.startsWith(`${POSITION_NOTE_LABEL}:`))
    .join('\n')
    .trim();

  return value || null;
}

export function getLegacyPositionNote(notes: string | null | undefined): string | null {
  return extractTaggedNote(notes, POSITION_NOTE_LABEL);
}

export function getResolvedPersonNote(notes: string | null | undefined): string | null {
  return getLegacyPersonNote(notes);
}

export function getResolvedPositionNote(
  notes: string | null | undefined,
  positionNotes: string | null | undefined
): string | null {
  return positionNotes || getLegacyPositionNote(notes);
}
