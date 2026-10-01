import { ICONS, type IconName } from './registry'

// 1.75px at every size: `nonScalingStroke` keeps the line in screen pixels, so a 14px chip and a
// 24px shop-floor button carry the same weight as IBM Plex's text. A size set in CSS (1em in a
// pill, the sidebar's `.nav-icon`) cannot thin the stroke the way a scaled viewBox would.
const STROKE = 1.75

export type IconSize = 'sm' | 'md' | 'lg' | 'xl'

export interface IconProps {
  name: IconName
  // sm 0.875rem · md 1rem · lg 1.25rem · xl 1.5rem. A class that sets width and height wins over
  // it (the sizes are `:where()` rules), which is how a pill draws its icon at 1em.
  size?: IconSize
  className?: string
  // Names the icon for a screen reader when nothing beside it does. Without it the icon is hidden:
  // nearly every icon sits next to its own word or inside a control that carries an aria-label.
  label?: string
}

// The only way the app draws an icon (ESLint keeps the libraries behind `src/shared/icons/`).
const Icon = ({ name, size = 'md', className, label }: IconProps) => {
  const Glyph = ICONS[name]
  return (
    <Glyph
      className={`mb-icon mb-icon--${size}${className ? ` ${className}` : ''}`}
      strokeWidth={STROKE}
      nonScalingStroke
      focusable="false"
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    />
  )
}

export default Icon
