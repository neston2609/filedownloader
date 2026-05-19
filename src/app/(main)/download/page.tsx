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
                className={`rounded-xl border-2 transition-all overflow-hidden flex flex-col ${
                  hasAccess
                    ? 'border-blue-500/30 bg-slate-800 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/10'
                    : 'border-slate-700 bg-slate-800/50 opacity-75'
                }`}
              >
                {/* Image header */}
                <div className="relative aspect-video bg-slate-900 overflow-hidden">
                  {cat.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cat.imageUrl}
                      alt={cat.name}
                      className={`w-full h-full object-cover transition-transform ${hasAccess ? 'group-hover:scale-105' : 'grayscale'}`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FolderOpen className="w-14 h-14 text-slate-700" />
                    </div>
                  )}
                  {!hasAccess && (
                    <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center">
                      <Lock className="w-8 h-8 text-slate-300" />
                    </div>
                  )}
                  {hasAccess && (
                    <span className="absolute top-2 right-2 text-[10px] bg-green-500/90 text-white px-2 py-0.5 rounded-full font-medium backdrop-blur-sm">
                      Access granted
                    </span>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start gap-2 mb-2">
                    <div className={`p-1.5 rounded ${hasAccess ? 'bg-blue-500/20' : 'bg-slate-700/50'} flex-shrink-0`}>
                      {hasAccess
                        ? <Unlock className="w-4 h-4 text-blue-400" />
                        : <Lock className="w-4 h-4 text-slate-500" />}
                    </div>
                    <h3 className="font-semibold text-slate-100 flex-1 min-w-0">{cat.name}</h3>
                  </div>

                  {cat.description && (
                    <p className="text-sm text-slate-400 mb-4 line-clamp-2 flex-1">{cat.description}</p>
                  )}

                  {hasAccess ? (
                    <Link
                      href={`/download/${cat.id}`}
                      className="mt-auto flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                    >
                      Browse Files
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <div className="mt-auto flex items-center justify-center gap-2 w-full bg-slate-700/50 text-slate-500 text-sm font-medium py-2 rounded-lg cursor-not-allowed border border-slate-700">
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
