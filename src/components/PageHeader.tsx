import { formatDate } from '../utils/whoop'

interface Props {
  title: string
  date?: string | null
  right?: React.ReactNode
  onPrev?: () => void
  onNext?: () => void
  hasPrev?: boolean
  hasNext?: boolean
}

export default function PageHeader({ title, date, right, onPrev, onNext, hasPrev, hasNext }: Props) {
  return (
    <div className="flex items-start justify-between px-5 pt-14 pb-4 safe-top">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {date && (
          <div className="flex items-center gap-2 mt-0.5">
            {onPrev && (
              <button
                onClick={onPrev}
                disabled={!hasPrev}
                className="text-gray-400 disabled:opacity-20 text-base leading-none px-1 -ml-1"
              >
                ‹
              </button>
            )}
            <p className="text-gray-400 text-sm capitalize">{formatDate(date)}</p>
            {onNext && (
              <button
                onClick={onNext}
                disabled={!hasNext}
                className="text-gray-400 disabled:opacity-20 text-base leading-none px-1"
              >
                ›
              </button>
            )}
          </div>
        )}
      </div>
      {right && <div className="flex-shrink-0 ml-4 mt-1">{right}</div>}
    </div>
  )
}
