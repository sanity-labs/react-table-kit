import type {
  BuildCommentDocumentArgs,
  BuildCommentNotificationContextArgs,
  BuildCommentTargetArgs,
  BuildStudioCommentUrlArgs,
  BuildTaskStudioUrlArgs,
  CommentDocument,
  CommentMessage,
  CommentNotificationContext,
  CommentTarget,
  TaskCommentComposerArgs,
} from './types'

export function buildStudioCommentUrl({
  commentId,
  documentId,
  documentType,
  studioBaseUrl,
  workspaceName = 'news_and_media',
}: BuildStudioCommentUrlArgs): string {
  const cleanId = documentId.replace('drafts.', '')
  const normalizedBase = studioBaseUrl.replace(/\/$/, '')

  return `${normalizedBase}/${workspaceName}/intent/edit/id=${cleanId};type=${documentType};inspect=sanity%2Fcomments;comment=${commentId}/`
}

export function buildTaskStudioUrl({
  commentId,
  taskId,
  workspaceName = 'admin',
}: BuildTaskStudioUrlArgs): string {
  const params = new URLSearchParams({
    selectedTask: taskId,
    sidebar: 'tasks',
    viewMode: 'edit',
  })

  if (commentId) {
    params.set('commentId', commentId)
  }

  const workspacePath = workspaceName ? `/${workspaceName}` : ''

  return `${workspacePath}/?${params.toString()}`
}

export function buildCommentTarget({
  contentDataset,
  documentId,
  documentType,
  fieldPath,
  projectId,
}: BuildCommentTargetArgs): CommentTarget {
  return {
    document: {
      _dataset: contentDataset,
      _projectId: projectId,
      _ref: documentId.replace('drafts.', ''),
      _type: 'crossDatasetReference',
      _weak: true,
    },
    documentType,
    path: {field: fieldPath ?? 'title'},
  }
}

export function buildCommentNotificationContext({
  currentThreadLength,
  documentTitle,
  payload,
  subscribers,
  tool = '',
  url,
  workspaceName,
  workspaceTitle,
}: BuildCommentNotificationContextArgs): CommentNotificationContext {
  return {
    notification: {
      currentThreadLength,
      documentTitle,
      subscribers,
      url,
      workspaceName,
      workspaceTitle,
    },
    payload,
    tool,
  }
}

export function buildCommentDocument({
  authorId,
  commentId,
  context,
  createdAt,
  message,
  parentCommentId,
  status,
  subscribers,
  target,
  threadId,
}: BuildCommentDocumentArgs): CommentDocument {
  const id = commentId ?? crypto.randomUUID()
  const now = createdAt ?? new Date().toISOString()

  return {
    _createdAt: now,
    _id: id,
    _type: 'comment',
    _updatedAt: now,
    authorId,
    ...(context ? {context} : {}),
    message,
    reactions: [],
    status: status ?? 'open',
    subscribers: subscribers ?? [authorId],
    target,
    threadId: threadId ?? id,
    ...(parentCommentId ? {parentCommentId} : {}),
  }
}

export function buildTaskCommentDocument({
  authorId,
  commentId,
  message,
  parentCommentId,
  status,
  subscribers,
  taskId,
  taskStudioUrl,
  taskTitle,
  threadId,
  workspaceId,
  workspaceTitle,
}: TaskCommentComposerArgs & {
  authorId: string
  status?: 'open' | 'resolved'
}): CommentDocument {
  const id = commentId ?? crypto.randomUUID()
  const commentSubscribers = subscribers?.length ? subscribers : [authorId]

  return buildCommentDocument({
    authorId,
    commentId: id,
    context: buildCommentNotificationContext({
      currentThreadLength: parentCommentId ? 2 : 1,
      documentTitle: taskTitle ?? '',
      payload: {workspace: workspaceId ?? ''},
      subscribers: commentSubscribers,
      tool: 'structure',
      url:
        taskStudioUrl ??
        buildTaskStudioUrl({
          commentId: id,
          taskId,
          workspaceName: workspaceId,
        }),
      workspaceName: workspaceId ?? '',
      workspaceTitle: workspaceTitle ?? '',
    }),
    message,
    parentCommentId,
    status,
    subscribers: commentSubscribers,
    target: {
      document: {
        _ref: taskId,
        _type: 'reference',
        _weak: true,
      },
      documentType: 'tasks.task',
    },
    threadId,
  })
}

export function buildMessageFromPlainText(text: string): CommentMessage {
  return [
    {
      _key: crypto.randomUUID().slice(0, 8),
      _type: 'block',
      children: [
        {
          _key: crypto.randomUUID().slice(0, 8),
          _type: 'span',
          text,
        },
      ],
      style: 'normal',
    },
  ]
}
