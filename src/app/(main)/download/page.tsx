import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Lock, Unlock, FolderOpen, ChevronRight } from 'lucide-react'

export default async function DownloadPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id
  const isAdmin = session.user.role === 'ADMIN'

  const [categories, accessRecords] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
    isAdmin
      ? []
      : prisma.userCategoryAccess.findMany({ where: { userId }, select: { categoryId: true } }),
  ])

  const accessSet = new Set(accessRecords.map((r: { categoryId: string }) => r.categoryId))

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100">Download Area</h1>
        <p className="text-slate-400 mt-1">Browse available content categories below.</p>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
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
                    ? 'border-blue-500/30 bg-slate-800 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/10'
                    : 'border-slate-700 bg-slate-800/50 opacity-75'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${hasAccess ? 'bg-blue-500/20' : 'bg-slate-700/50'}`}>
                        {hasAccess ? (
                          <Unlock className="w-5 h-5 text-blue-400" />
                        ) : (
                          <Lock className="w-5 h-5 text-slate-500" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-100">{cat.name}</h3>
                        {hasAccess ? (
                          <span className="text-xs text-green-400 font-medium">Access granted</span>
                        ) : (
                          <span className="text-xs text-slate-500">No access</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {cat.description && (
                    <p className="text-sm text-slate-400 mb-4 line-clamp-2">{cat.description}</p>
                  )}

                  {hasAccess ? (
                    <Link
                      href={`/download/${cat.id}`}
                      className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                    >
                      Browse Files
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <div className="flex items-center justify-center gap-2 w-full bg-slate-700/50 text-slate-500 text-sm font-medium py-2 rounded-lg cursor-not-allowed border border-slate-700">
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
