'use client'

import { useState, useEffect } from 'react'
import { FileText, Download, ExternalLink, AlertCircle } from 'lucide-react'

interface RegulationFile {
  title: string
  description?: string
  path: string  // public 경로 (예: /regulations/rental-rules.pdf)
}

interface Props {
  files: RegulationFile[]
}

function PdfPanel({ file }: { file: RegulationFile }) {
  const [status, setStatus] = useState<'checking' | 'found' | 'missing'>('checking')

  useEffect(() => {
    fetch(file.path, { method: 'HEAD' })
      .then((res) => setStatus(res.ok ? 'found' : 'missing'))
      .catch(() => setStatus('missing'))
  }, [file.path])

  return (
    <div className="flex flex-col gap-3">
      {/* 파일 헤더 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-surface-raised rounded-2xl border border-base">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-brand-rose-muted border border-brand-rose flex items-center justify-center text-brand-rose shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-base-primary truncate">{file.title}</p>
            {file.description && (
              <p className="text-xs text-base-muted mt-0.5">{file.description}</p>
            )}
          </div>
        </div>
        {status === 'found' && (
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={file.path}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-base text-xs font-medium text-base-secondary hover:bg-surface-overlay hover:text-base-primary transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              새 탭
            </a>
            <a
              href={file.path}
              download
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-rose text-white text-xs font-medium hover:opacity-90 transition-opacity"
            >
              <Download className="w-3.5 h-3.5" />
              다운로드
            </a>
          </div>
        )}
      </div>

      {/* PDF 뷰어 */}
      {status === 'checking' && (
        <div className="flex items-center justify-center rounded-2xl border border-base bg-surface-raised py-20">
          <div className="w-6 h-6 border-2 border-brand-rose border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {status === 'missing' && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-base bg-surface-raised py-20 text-center px-6">
          <AlertCircle className="w-10 h-10 text-base-faint" />
          <div>
            <p className="text-sm font-medium text-base-muted">규정 파일이 아직 등록되지 않았습니다.</p>
            <p className="text-xs text-base-faint mt-1">관리자에게 문의하거나 학과 사무실을 방문해 주세요.</p>
          </div>
        </div>
      )}

      {status === 'found' && (
        <div className="rounded-2xl border border-base overflow-hidden bg-surface-raised">
          <iframe
            src={`${file.path}#toolbar=1&navpanes=0`}
            className="w-full"
            style={{ height: '80vh', minHeight: 480 }}
            title={file.title}
          />
        </div>
      )}
    </div>
  )
}

export function RegulationViewer({ files }: Props) {
  const [activeIdx, setActiveIdx] = useState(0)

  return (
    <div className="space-y-6">
      {/* 탭 (파일이 여러 개일 때) */}
      {files.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          {files.map((f, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                activeIdx === i
                  ? 'bg-brand-rose-muted text-brand-rose border-brand-rose'
                  : 'bg-surface-raised text-base-muted border-base hover:bg-surface-overlay hover:text-base-primary'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              {f.title}
            </button>
          ))}
        </div>
      )}

      {files[activeIdx] && <PdfPanel key={activeIdx} file={files[activeIdx]} />}

      {files.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-base bg-surface-raised py-20 text-center px-6">
          <FileText className="w-10 h-10 text-base-faint" />
          <p className="text-sm font-medium text-base-muted">등록된 규정 파일이 없습니다.</p>
        </div>
      )}
    </div>
  )
}
