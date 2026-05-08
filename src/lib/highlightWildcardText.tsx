import React from 'react';
import { getWildcardSearchParts } from './wildcardSearch';

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface HighlightOptions {
  highlightStyle?: React.CSSProperties;
}

export function highlightWildcardText(
  text: unknown,
  rawSearch: string,
  options?: HighlightOptions
): React.ReactNode {
  const value = String(text ?? '');
  const { search, hasWildcard, parts } = getWildcardSearchParts(rawSearch);

  if (!search) return value;

  const tokens = (hasWildcard ? parts : [search])
    .map(part => part.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  if (tokens.length === 0) return value;

  const pattern = tokens.map(escapeRegExp).join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');
  const segments = value.split(regex);

  if (segments.length === 1) return value;

  const highlightStyle: React.CSSProperties = {
    backgroundColor: 'rgba(245, 158, 11, 0.22)',
    color: '#b45309',
    fontWeight: 800,
    borderRadius: 4,
    padding: '0 2px',
    ...options?.highlightStyle,
  };

  return (
    <>
      {segments.map((segment, index) => {
        if (!segment) return null;

        const isMatch = tokens.some(token => token.toLowerCase() === segment.toLowerCase());
        if (!isMatch) {
          return <React.Fragment key={index}>{segment}</React.Fragment>;
        }

        return (
          <mark key={index} style={highlightStyle}>
            {segment}
          </mark>
        );
      })}
    </>
  );
}
