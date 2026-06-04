'use client'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch — render only after mount
  useEffect(() => setMounted(true), [])
  if (!mounted) {
    return (
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center ${className}`}
        aria-hidden="true"
      />
    )
  }

  const handleToggle = () => {
    if (theme === 'system') {
      setTheme('light')
    } else if (theme === 'light') {
      setTheme('dark')
    } else {
      setTheme('system')
    }
  }

  let icon = <Monitor className="w-4 h-4" />
  let title = '기기 설정 (시스템)'
  let label = '시스템 설정에 맞춤'

  if (theme === 'light') {
    icon = <Sun className="w-4 h-4" />
    title = '라이트 모드'
    label = '라이트 모드'
  } else if (theme === 'dark') {
    icon = <Moon className="w-4 h-4" />
    title = '다크 모드'
    label = '다크 모드'
  }

  return (
    <button
      id="theme-toggle-btn"
      onClick={handleToggle}
      className={`w-9 h-9 rounded-xl flex items-center justify-center
        bg-surface-raised border border-base text-base-secondary
        hover:text-base-primary hover:bg-surface-overlay
        transition-all duration-200 shrink-0 ${className}`}
      aria-label={label}
      title={title}
    >
      {icon}
    </button>
  )
}
