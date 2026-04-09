export interface CrossDatasetReference {
  _dataset: string
  _projectId: string
  _ref: string
  _type: 'crossDatasetReference'
  _weak: boolean
}

export interface Reference {
  _ref: string
  _type: 'reference'
  _weak: boolean
}

export interface CommentTarget {
  document: CrossDatasetReference | Reference
  documentType: string
  path?: {field: string}
}

export type CommentMessage = Array<{
  _key: string
  _type: 'block'
  children: Array<
    | {_key: string; _type: 'mention'; userId: string}
    | {_key?: string; _type: 'span'; marks?: string[]; text: string}
  >
  markDefs?: Array<{_key: string; _type: string; [key: string]: unknown}>
  style?: string
}> | null

export interface CommentReaction {
  _key: string
  addedAt: string
  shortName: string
  userId: string
}

export type CommentStatus = 'open' | 'resolved'

export interface CommentNotificationContext {
  notification?: {
    currentThreadLength?: number
    documentTitle?: string
    subscribers?: string[]
    url?: string
    workspaceName?: string
    workspaceTitle?: string
  }
  payload?: Record<string, unknown>
  tool?: string
}

export interface CommentDocument {
  _createdAt: string
  _id: string
  _rev?: string
  _type: 'comment'
  _updatedAt: string
  authorId: string
  context?: CommentNotificationContext
  contentSnapshot?: unknown
  lastEditedAt?: string
  message: CommentMessage
  parentCommentId?: string
  reactions?: CommentReaction[] | null
  status: CommentStatus
  subscribers?: string[]
  target: CommentTarget
  threadId: string
}

export interface CommentThread {
  parent: CommentDocument
  replies: CommentDocument[]
}

export interface CommentThreadGroup {
  field: string
  threads: CommentThread[]
}

export interface CommentComposerArgs {
  commentId?: string
  documentId: string
  documentTitle: string
  documentType: string
  fieldPath?: string
  message: CommentMessage
  parentCommentId?: string
  threadId?: string
}

export interface TaskCommentComposerArgs {
  commentId?: string
  message: CommentMessage
  parentCommentId?: string
  subscribers?: string[]
  taskId: string
  taskStudioUrl?: string
  taskTitle?: string
  threadId?: string
  workspaceId?: string
  workspaceTitle?: string
}

export interface CommentsAdapter {
  buildOptimisticComment: (
    args: CommentComposerArgs & {
      authorId: string
    },
  ) => CommentDocument
  createComment: (args: CommentComposerArgs) => Promise<unknown>
}

export interface CommentOptimisticEdit {
  lastEditedAt: string
  message: CommentMessage
}

export interface CommentsState {
  addOptimisticComment: (comment: CommentDocument) => () => void
  comments: CommentDocument[]
  deleteOptimisticComment: (commentId: string) => () => void
  editOptimisticComment: (
    commentId: string,
    message: CommentMessage,
    lastEditedAt: string,
  ) => () => void
  isPending: boolean
  updateOptimisticReactions: (commentId: string, reactions: CommentReaction[]) => () => void
  updateOptimisticStatus: (commentId: string, status: CommentStatus) => () => void
}

export interface CommentMutationApi {
  deleteComment: (commentId: string) => Promise<unknown>
  editComment: (commentId: string, message: CommentMessage) => Promise<unknown>
  setCommentStatus: (commentId: string, status: CommentStatus) => Promise<unknown>
  toggleReaction: (
    commentId: string,
    shortName: string,
    currentReactions: CommentReaction[],
  ) => Promise<unknown>
}

export interface BuildCommentTargetArgs {
  contentDataset: string
  documentId: string
  documentType: string
  fieldPath?: string
  projectId: string
}

export interface BuildCommentNotificationContextArgs {
  currentThreadLength?: number
  documentTitle?: string
  payload?: Record<string, unknown>
  subscribers?: string[]
  tool?: string
  url?: string
  workspaceName?: string
  workspaceTitle?: string
}

export interface BuildCommentDocumentArgs {
  authorId: string
  commentId?: string
  context?: CommentNotificationContext
  createdAt?: string
  message: CommentMessage
  parentCommentId?: string
  status?: CommentStatus
  subscribers?: string[]
  target: CommentTarget
  threadId?: string
}

export interface BuildStudioCommentUrlArgs {
  commentId: string
  documentId: string
  documentType: string
  studioBaseUrl: string
  workspaceName?: string
}

export interface BuildTaskStudioUrlArgs {
  commentId?: string
  taskId: string
  workspaceName?: string
}
