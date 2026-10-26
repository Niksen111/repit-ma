import { CourseApi, type Attachment, type OwnerType } from './courses-api.ts'

// Use a fixed MIME type: the download API deliberately returns octet-stream.
// Never render uploaded HTML or SVG as a document on the application's origin.
export function previewContentType(file: Attachment): string | null {
  switch (/\.(jpe?g|png|pdf)$/i.exec(file.originalName)?.[1].toLowerCase()) {
    case 'jpg': case 'jpeg': return 'image/jpeg'
    case 'png': return 'image/png'
    case 'pdf': return 'application/pdf'
    default: return null
  }
}

export async function previewFile(api: CourseApi, type: OwnerType, ownerId: number, file: Attachment): Promise<void> {
  const contentType = previewContentType(file)
  if (!contentType) return
  const trigger = document.activeElement
  const dialog = document.createElement('dialog')
  dialog.className = 'file-preview-dialog'
  dialog.setAttribute('aria-label', `Предпросмотр: ${file.originalName}`)
  dialog.innerHTML = '<header class="file-preview-header"><h2></h2><button type="button" class="secondary-button" autofocus>Закрыть</button></header><p class="status" role="status">Загрузка файла…</p><div class="file-preview-content"></div><footer class="file-preview-footer" hidden><a class="secondary-button" data-preview-download>Скачать</a><a class="secondary-button" data-preview-open target="_blank" rel="noopener noreferrer">Открыть в новой вкладке</a><p class="muted">Если PDF не отображается в браузере, откройте его в новой вкладке или скачайте.</p></footer>'
  dialog.querySelector('h2')!.textContent = file.originalName
  const status = dialog.querySelector<HTMLElement>('[role="status"]')!
  const content = dialog.querySelector<HTMLElement>('.file-preview-content')!
  const controller = new AbortController()
  let url: string | undefined
  dialog.querySelector('button')!.addEventListener('click', () => dialog.close())
  dialog.addEventListener('close', () => {
    controller.abort()
    content.replaceChildren()
    if (url) URL.revokeObjectURL(url)
    dialog.remove()
    if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
  }, { once: true })
  document.body.append(dialog)
  dialog.showModal()
  try {
    const blob = await api.fileBlob(type, ownerId, file, controller.signal)
    if (!dialog.open) return
    url = URL.createObjectURL(new Blob([blob], { type: contentType }))
    if (contentType === 'application/pdf') {
      const frame = document.createElement('iframe')
      frame.title = file.originalName
      frame.src = url
      content.append(frame)
    } else {
      const image = document.createElement('img')
      image.alt = file.originalName
      image.addEventListener('error', () => { status.textContent = 'Не удалось показать изображение. Попробуйте скачать файл.' })
      image.src = url
      content.append(image)
    }
    const download = dialog.querySelector<HTMLAnchorElement>('[data-preview-download]')!
    download.href = url
    download.download = file.originalName
    dialog.querySelector<HTMLAnchorElement>('[data-preview-open]')!.href = url
    dialog.querySelector<HTMLElement>('footer')!.hidden = false
    dialog.querySelector<HTMLElement>('footer p')!.hidden = contentType !== 'application/pdf'
    status.textContent = ''
  } catch (error) {
    if (!dialog.open) return
    status.className = 'status error'
    status.textContent = error instanceof Error ? error.message : 'Не удалось загрузить файл. Попробуйте ещё раз.'
  }
}
