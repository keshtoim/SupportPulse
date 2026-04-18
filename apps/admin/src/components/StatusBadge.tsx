import type { TicketStatus } from '@supportpulse/shared'
import { TicketStatusLabel } from '@supportpulse/shared'

const COLOR: Record<TicketStatus, string> = {
  new:            'bg-blue-100 text-blue-700',
  in_queue:       'bg-yellow-100 text-yellow-700',
  in_progress:    'bg-indigo-100 text-indigo-700',
  waiting_client: 'bg-orange-100 text-orange-700',
  closed:         'bg-gray-100 text-gray-500',
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${COLOR[status]}`}>
      {TicketStatusLabel[status]}
    </span>
  )
}
