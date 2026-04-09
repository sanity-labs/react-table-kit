/** @vitest-environment node */

import {describe, expect, it} from 'vitest'

import {
  buildCommentDocument,
  buildCommentTarget,
  buildCommentThreads,
  buildMessageFromPlainText,
  buildTaskCommentDocument,
  buildTaskStudioUrl,
} from '../src/comments'

describe('@sanity-labs/react-table-kit comments', () => {
  it('builds comment threads from parent and reply comments', () => {
    const target = buildCommentTarget({
      contentDataset: 'content',
      documentId: 'doc-1',
      documentType: 'article',
      fieldPath: 'title',
      projectId: 'project-1',
    })

    const parent = buildCommentDocument({
      authorId: 'user-1',
      commentId: 'comment-1',
      message: buildMessageFromPlainText('Parent'),
      target,
    })

    const reply = buildCommentDocument({
      authorId: 'user-2',
      commentId: 'comment-2',
      message: buildMessageFromPlainText('Reply'),
      parentCommentId: parent._id,
      target,
      threadId: parent.threadId,
    })

    expect(buildCommentThreads([reply, parent])).toEqual([{parent, replies: [reply]}])
  })

  it('builds task comments with a task target and url context', () => {
    const comment = buildTaskCommentDocument({
      authorId: 'user-1',
      commentId: 'task-comment-1',
      message: buildMessageFromPlainText('Please review this task'),
      taskId: 'task-1',
      workspaceId: 'admin',
      workspaceTitle: 'Admin',
    })

    expect(comment.target.documentType).toBe('tasks.task')
    expect(comment.context?.notification?.url).toBe(
      buildTaskStudioUrl({
        commentId: 'task-comment-1',
        taskId: 'task-1',
        workspaceName: 'admin',
      }),
    )
    expect(comment.subscribers).toEqual(['user-1'])
  })
})
