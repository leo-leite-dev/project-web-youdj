import './YouDJWordmark.css'
import badgeLogo from '../assets/Badge neon YouDJ com slogan em português.png'

interface YouDJWordmarkProps {
  className?: string
}

export function YouDJWordmark({ className = '' }: YouDJWordmarkProps) {
  return <img className={`youdj-wordmark ${className}`.trim()} src={badgeLogo} alt="YouDJ — Você escolhe. O YouDJ toca." />
}
