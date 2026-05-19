import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Lock, Unlock, FolderOpen, ChevronRight } from 'lucide-react'

export default async function DownloadPage() {
  const session = await auth()
  const userId = session!.user!.id
  const isAdmin = session!.user!.role === 'ADMIN'

  const [categories, accessRecords] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
    isAdmin
      ? [] // Admin sees all as unlocked
      : prisma.userCategoryAccess.findMany({ where: { userId }, select: { categoryId: true } }),
  ])

  const accessSet = new Set(accessRecords.map((r: { categoryId: string }) => r.categoryId))

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Download Area</h1>
        <p className="text-slate-500 mt-1">Browse available content categories below.</p>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">No categories available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const hasAccess = isAdmin || accessSet.has(cat.id)
            return (
              <div
                key={cat.id}
                className={`rounded-xl border-2 transition-all ${
                  hasAccess
                    ? 'border-blue-200 bg-white shadow-sm hover:shadow-md hover:border-blue-400'
                    : 'border-slate-200 bg-slate-50 opacity-75'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${hasAccess ? 'bg-blue-100' : 'bg-slate-100'}`}>
                        {hasAccess ? (
                          <Unlock className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Lock className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{cat.name}</h3>
                        {hasAccess ? (
                          <span className="text-xs text-green-600 font-medium">Access granted</span>
                        ) : (
                          <span className="text-xs text-slate-400">No access</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {cat.description && (
                    <p className="text-sm text-slate-500 mb-4 line-clamp-2">{cat.description}</p>
                  )}

                  {hasAccess ? (
                    <Link
                      href={`/download/${cat.id}`}
                      className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                    >
                      Browse Files
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <div className="flex items-center justify-center gap-2 w-full bg-slate-200 text-slate-500 text-sm font-medium py-2 rounded-lg cursor-not-allowed">
                      <Lock className="w-4 h-4" />
                      Contact admin for access
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
