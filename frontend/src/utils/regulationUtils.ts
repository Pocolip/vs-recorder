/**
 * Regulations where Mega Evolution is the active mid-battle mechanic instead of
 * Terastallization. Matches strings like "VGC 2026 Regulation M-A",
 * "VGC 2026 Regulation M-B", or any future Reg M variant.
 *
 * When the team has no regulation set we default to Mega — most teams created
 * after Mega regs launch will be Mega-era; old data has a regulation set.
 */
export function isMegaRegulation(regulation: string | null | undefined): boolean {
  if (!regulation) return true;
  return /Regulation\s+M(-[A-Z])?$/i.test(regulation);
}
