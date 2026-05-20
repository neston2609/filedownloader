interface Banner {
  id: string
  imageUrl: string
  linkUrl: string
}

// Server component: renders active ad banners at the bottom of the page.
// Clicking a banner with a link opens it in a new tab.
export function BannerStrip({ banners }: { banners: Banner[] }) {
  if (banners.length === 0) return null

  return (
    <div className="mt-12 border-t-[1.5px] border-line bg-bg2/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <p className="text-[10px] font-mono uppercase tracking-widest text-mute mb-3 text-center">Sponsored</p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          {banners.map((b) => {
            const img = (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={b.imageUrl}
                alt="Advertisement"
                className="max-h-32 w-auto rounded-lg border-[1.5px] border-ink object-contain"
              />
            )
            return b.linkUrl ? (
              <a key={b.id} href={b.linkUrl} target="_blank" rel="noopener noreferrer sponsored"
                 className="block transition-transform hover:-translate-y-0.5">
                {img}
              </a>
            ) : (
              <span key={b.id} className="block">{img}</span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
