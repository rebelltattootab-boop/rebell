import Image from 'next/image'

// The studio mark (Rebell Tattoo Studio) rendered in a rounded tile. The app
// itself is "Rebell Tattoo Supply" — same brand, different product surface.
export function BrandLogo({
  size = 36,
  className = '',
}: {
  size?: number
  className?: string
}) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-lg ring-1 ring-border ${className}`}
      style={{ width: size, height: size, backgroundColor: '#09090b' }}
    >
      <Image
        src="/logo-rebell.jpeg"
        alt="Rebell Tattoo Supply"
        fill
        sizes={`${size}px`}
        className="object-cover"
        priority
      />
    </div>
  )
}
