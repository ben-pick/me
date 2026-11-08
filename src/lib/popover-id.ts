export type PopoverKind = "company" | "project" | "interest";

export interface PopoverId {
  readonly kind: PopoverKind;
  readonly slug: string;
}

const PATTERN = /^#?(company|project|interest)\/([a-z0-9-]+)$/;

export const parsePopoverHash = (hash: string): PopoverId | null => {
  const m = PATTERN.exec(hash);
  if (!m?.[1] || !m[2]) return null;
  return { kind: m[1] as PopoverKind, slug: m[2] };
};

export const popoverHash = (id: PopoverId) => `#${id.kind}/${id.slug}`;
