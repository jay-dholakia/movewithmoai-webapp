import Image from 'next/image'
import { cn } from '@/lib/utils'

export function FeaturePhoto({
  src,
  alt,
  aspect = 'aspect-[4/3]',
  priority,
}: {
  src: string
  alt: string
  aspect?: string
  priority?: boolean
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-slate-200/90 shadow-md',
        aspect
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes="(min-width: 768px) 50vw, 100vw"
        className="object-cover"
      />
    </div>
  )
}
