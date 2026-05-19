import { formatDate } from '../utils/whoop'

interface Props {
  title: string
  date?: string | null
  right?: React.ReactNode
}

export default function PageHeader({ title, date, right }: Props) {
  return (
    <div className="flex items-start justify-between px-5 pt-14 pb-4 safe-top">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {date && (
          <p className="text-gray-400 text-sm mt-0.5 capitalize">{formatDate(date)}</p>
        )}
      </div>
      {right && <div className="flex-shrink-0 ml-4 mt-1">{right}</div>}
    </div>
  )
}
