import type {CommentDocument, CommentMessage, CommentThread, CommentThreadGroup} from './types'

interface GetCommentThreadsForFieldOptions {
  field: string
  includeResolved?: boolean
}

export function buildCommentThreads(comments: CommentDocument[]): CommentThread[] {
  const threadMap = new Map<string, CommentThread>()

  for (const comment of comments) {
    if (!comment.parentCommentId) {
      threadMap.set(comment.threadId || comment._id, {parent: comment, replies: []})
    }
  }

  for (const comment of comments) {
    if (!comment.parentCommentId) continue

    const thread = threadMap.get(comment.threadId)
    if (thread) {
      thread.replies.push(comment)
    }
  }

  return Array.from(threadMap.values())
}

export function getCommentThreadField(thread: CommentThread): string {
  return thread.parent.target.path?.field || 'unknownField'
}

export function getCommentThreadsForField(
  comments: CommentDocument[],
  {field, includeResolved = false}: GetCommentThreadsForFieldOptions,
): CommentThread[] {
  return buildCommentThreads(comments)
    .filter((thread) => {
      if (getCommentThreadField(thread) !== field) return false
      if (!includeResolved && thread.parent.status === 'resolved') return false
      return true
    })
    .sort(
      (a, b) => new Date(b.parent._createdAt).getTime() - new Date(a.parent._createdAt).getTime(),
    )
}

export function groupUnresolvedCommentsByField(comments: CommentDocument[]): CommentThreadGroup[] {
  const grouped = new Map<string, CommentThread[]>()

  for (const thread of buildCommentThreads(comments)) {
    if (thread.parent.status === 'resolved') continue

    const field = getCommentThreadField(thread)
    const existing = grouped.get(field)
    if (existing) {
      existing.push(thread)
    } else {
      grouped.set(field, [thread])
    }
  }

  return [...grouped.entries()]
    .sort(([fieldA], [fieldB]) => fieldA.localeCompare(fieldB))
    .map(([field, threads]) => ({
      field,
      threads: threads.sort(
        (a, b) => new Date(b.parent._createdAt).getTime() - new Date(a.parent._createdAt).getTime(),
      ),
    }))
}

export function toPlainText(message: CommentMessage): string {
  if (!message) return ''

  return message
    .flatMap((block) =>
      block.children.map((child) => {
        if (child._type === 'mention') return `@${child.userId}`
        return child.text ?? ''
      }),
    )
    .join('')
    .trim()
}
