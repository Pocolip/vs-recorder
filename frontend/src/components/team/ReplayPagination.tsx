export default function ReplayPagination({ page, size, total, onPage }: {
  page: number; size: number; total: number; onPage: (page: number) => void;
}) {
  if (total <= size) return null;
  return <nav aria-label="Replay pages" className="my-4 flex items-center justify-between gap-3 text-sm">
    <button className="rounded border px-3 py-2 disabled:opacity-40" disabled={page === 0} onClick={() => onPage(page - 1)}>Previous</button>
    <span>Page {page + 1} of {Math.ceil(total / size)} · {total} replays</span>
    <button className="rounded border px-3 py-2 disabled:opacity-40" disabled={(page + 1) * size >= total} onClick={() => onPage(page + 1)}>Next</button>
  </nav>;
}
