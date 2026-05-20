import { prisma } from '@/lib/prisma'

export interface HideRule {
  id: string
  categoryId: string | null
  pattern: string
  target: string // 'file' | 'folder' | 'both'
}

// Convert a glob-ish pattern (* and ?) into a case-insensitive anchored regex.
export function wildcardToRegex(pattern: string): RegExp {
  const escaped = pattern
    .trim()
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape regex specials
    .replace(/\*/g, '.*')                  // * -> any
    .replace(/\?/g, '.')                    // ? -> single char
  return new RegExp(`^${escaped}$`, 'i')
}

// Does a given entry match any of the supplied rules?
export function isHidden(name: string, isDirectory: boolean, rules: HideRule[]): boolean {
  return rules.some((r) => {
    if (r.target === 'file' && isDirectory) return false
    if (r.target === 'folder' && !isDirectory) return false
    try {
      return wildcardToRegex(r.pattern).test(name)
    } catch {
      return false
    }
  })
}

// Fetch global rules + rules for a specific category in one query.
export async function getHideRules(categoryId: string): Promise<HideRule[]> {
  return prisma.hideRule.findMany({
    where: { OR: [{ categoryId: null }, { categoryId }] },
    select: { id: true, categoryId: true, pattern: true, target: true },
  })
}
