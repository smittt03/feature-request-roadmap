
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  MessageCircle,
  Send,
  Reply,
  Pencil,
  Trash2,
  X,
  LoaderCircle,
  LogIn,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

const API_URL = "http://localhost:5000/api";
const MAX_COMMENT_LENGTH = 5000;

function CommentsDialog({ post, user, onClose, onLogin }) {
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const postId = post?._id;
  const userId = user?.id || user?._id;
  const isAdmin = user?.role === "admin";

  const loadComments = useCallback(async () => {
    if (!postId) return;

    setLoading(true);
    setError("");

    try {
      const response = await axios.get(
        `${API_URL}/posts/${postId}/comments`
      );

      setComments(response.data.comments || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load this discussion."
      );
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const commentTree = useMemo(() => {
    const byId = new Map();
    const roots = [];

    comments.forEach((comment) => {
      byId.set(String(comment._id), { ...comment, replies: [] });
    });

    byId.forEach((comment) => {
      const parentId = comment.parentComment
        ? String(
            typeof comment.parentComment === "object"
              ? comment.parentComment._id
              : comment.parentComment
          )
        : null;

      const parent = parentId ? byId.get(parentId) : null;

      if (parent) {
        parent.replies.push(comment);
      } else {
        roots.push(comment);
      }
    });

    return roots;
  }, [comments]);

  const canManage = (comment) => {
    const authorId =
      comment.author?._id ||
      comment.author?.id ||
      comment.author;

    return Boolean(
      user && (isAdmin || String(authorId) === String(userId))
    );
  };

  const submitComment = async (event) => {
    event.preventDefault();
    const trimmed = content.trim();

    if (!trimmed) {
      setError("Write a comment before submitting.");
      return;
    }

    if (!user) {
      onLogin?.();
      return;
    }

    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      await axios.post(
        `${API_URL}/posts/${postId}/comments`,
        {
          content: trimmed,
          ...(replyTo ? { parentComment: replyTo._id } : {}),
        },
        { withCredentials: true }
      );

      setContent("");
      setReplyTo(null);
      setNotice("Your comment was posted.");
      await loadComments();
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
        onLogin?.();
      } else {
        setError(
          err.response?.data?.message || "Unable to post your comment."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const saveEdit = async (commentId) => {
    const trimmed = editContent.trim();

    if (!trimmed) {
      setError("Comment content cannot be empty.");
      return;
    }

    setActionId(commentId);
    setError("");
    setNotice("");

    try {
      await axios.patch(
        `${API_URL}/comments/${commentId}`,
        { content: trimmed },
        { withCredentials: true }
      );

      setEditingId(null);
      setEditContent("");
      setNotice("Comment updated.");
      await loadComments();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to update this comment."
      );
    } finally {
      setActionId("");
    }
  };

  const deleteComment = async (commentId) => {
    const confirmed = window.confirm(
      "Delete this comment? Replies will remain in the discussion."
    );

    if (!confirmed) return;

    setActionId(commentId);
    setError("");
    setNotice("");

    try {
      await axios.delete(`${API_URL}/comments/${commentId}`, {
        withCredentials: true,
      });

      setNotice("Comment deleted.");
      await loadComments();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to delete this comment."
      );
    } finally {
      setActionId("");
    }
  };

  const renderComment = (comment, depth = 0) => {
    const authorName =
      comment.author?.name || "Community member";
    const isEditing = editingId === comment._id;
    const busy = actionId === comment._id;

    return (
      <article
        className="discussion-comment"
        key={comment._id}
        style={{ "--reply-depth": Math.min(depth, 3) }}
      >
        <div className="discussion-avatar" aria-hidden="true">
          {authorName.charAt(0).toUpperCase()}
        </div>

        <div className="discussion-comment-main">
          <div className="discussion-comment-meta">
            <strong>{authorName}</strong>
            <time>
              {comment.createdAt
                ? new Date(comment.createdAt).toLocaleDateString()
                : ""}
            </time>
            {comment.updatedAt &&
              comment.createdAt !== comment.updatedAt && (
                <span className="discussion-edited">Edited</span>
              )}
          </div>

          {isEditing ? (
            <div className="discussion-edit-form">
              <Textarea
                value={editContent}
                onChange={(event) => setEditContent(event.target.value)}
                maxLength={MAX_COMMENT_LENGTH}
                rows={4}
                aria-label="Edit comment"
              />
              <div className="discussion-inline-actions">
                <Button
                  size="sm"
                  onClick={() => saveEdit(comment._id)}
                  disabled={busy}
                >
                  {busy ? "Saving..." : "Save changes"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setEditContent("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="discussion-markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {comment.content || ""}
              </ReactMarkdown>
            </div>
          )}

          {!isEditing && (
            <div className="discussion-comment-actions">
              {user && (
                <button
                  type="button"
                  onClick={() => {
                    setReplyTo(comment);
                    setContent("");
                    setError("");
                  }}
                >
                  <Reply size={14} />
                  Reply
                </button>
              )}

              {canManage(comment) && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(comment._id);
                      setEditContent(comment.content || "");
                      setError("");
                    }}
                  >
                    <Pencil size={13} />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="discussion-delete"
                    onClick={() => deleteComment(comment._id)}
                    disabled={busy}
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </>
              )}
            </div>
          )}

          {comment.replies?.map((reply) =>
            renderComment(reply, depth + 1)
          )}
        </div>
      </article>
    );
  };

  return (
    <div
      className="discussion-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="discussion-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="discussion-title"
      >
        <header className="discussion-header">
          <div className="discussion-heading-icon">
            <MessageCircle size={19} />
          </div>

          <div className="discussion-heading-copy">
            <span className="discussion-eyebrow">COMMUNITY DISCUSSION</span>
            <h2 id="discussion-title">Feature discussion</h2>
            <p>{post?.title || "Feature request"}</p>
          </div>

          <button
            className="discussion-close"
            type="button"
            onClick={onClose}
            aria-label="Close discussion"
          >
            <X size={20} />
          </button>
        </header>

        <div className="discussion-scroll">
          {error && (
            <div className="discussion-alert" role="alert">
              {error}
            </div>
          )}

          {notice && (
            <div className="discussion-notice" role="status">
              {notice}
            </div>
          )}

          <div className="discussion-section-heading">
            <div>
              <h3>Conversation</h3>
              <p>
                {comments.length}{" "}
                {comments.length === 1 ? "comment" : "comments"}
              </p>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={loadComments}
              disabled={loading}
            >
              <RefreshCw size={14} />
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="discussion-loading">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-5/6" />
            </div>
          ) : comments.length === 0 ? (
            <div className="discussion-empty">
              <MessageCircle size={28} />
              <h3>Start the conversation</h3>
              <p>Share your thoughts or ask a question about this idea.</p>
            </div>
          ) : (
            <div className="discussion-list">
              {commentTree.map((comment) => renderComment(comment))}
            </div>
          )}
        </div>

        <footer className="discussion-compose">
          {replyTo && (
            <div className="discussion-reply-context">
              <span>
                Replying to{" "}
                <strong>{replyTo.author?.name || "Community member"}</strong>
              </span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                aria-label="Cancel reply"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {user ? (
            <form onSubmit={submitComment}>
              <Textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder={
                  replyTo
                    ? "Write your reply... Markdown is supported."
                    : "Share your thoughts... Markdown is supported."
                }
                maxLength={MAX_COMMENT_LENGTH}
                rows={3}
                aria-label="Write a comment"
              />

              <div className="discussion-compose-footer">
                <span>{content.length}/{MAX_COMMENT_LENGTH}</span>
                <Button
                  type="submit"
                  disabled={submitting || !content.trim()}
                >
                  {submitting ? (
                    <LoaderCircle size={15} className="animate-spin" />
                  ) : (
                    <Send size={15} />
                  )}
                  {replyTo ? "Post reply" : "Post comment"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="discussion-login-prompt">
              <div>
                <strong>Join the conversation</strong>
                <p>Log in to comment or reply to this idea.</p>
              </div>
              <Button onClick={onLogin}>
                <LogIn size={15} />
                Log in
              </Button>
            </div>
          )}
        </footer>
      </section>
    </div>
  );
}

export default CommentsDialog;
