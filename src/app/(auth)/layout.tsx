export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative offset blocks */}
      <div className="absolute top-20 left-10 w-24 h-24 bg-retro-lime rounded-3xl -rotate-12 hidden md:block" />
      <div className="absolute bottom-32 right-16 w-20 h-20 bg-retro-sky rounded-2xl rotate-12 hidden md:block" />
      <div className="absolute top-1/2 right-32 w-12 h-12 bg-retro-coral rounded-full hidden lg:block" />
      <div className="absolute bottom-20 left-32 w-16 h-16 bg-retro-lemon rounded-2xl rotate-6 hidden lg:block" />
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  )
}
