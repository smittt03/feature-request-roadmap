
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  Clock3,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  ThumbsUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const API_URL = "http://localhost:5000/api";

const columns = [
  {
    key: "planned",
    title: "Planned",
    status: "Planned",
    description: "Ideas we intend to build",
    icon: Clock3,
    color: "blue",
  },
  {
    key: "inProgress",
    title: "In progress",
    status: "In Progress",
    description: "Work currently underway",
    icon: CircleDashed,
    color: "amber",
  },
  {
    key: "completed",
    title: "Completed",
    status: "Completed",
    description: "Shipped to the community",
    icon: CheckCircle2,
    color: "green",
  },
];

function Roadmap({ user, onBack }) {
  const [roadmap, setRoadmap] = useState({
    planned: [],
    inProgress: [],
    completed: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  const isAdmin = user?.role === "admin";

  const loadRoadmap = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.get(`${API_URL}/posts/roadmap`);
      const data = response.data.roadmap || response.data;

      setRoadmap({
        planned: data.planned || [],
        inProgress: data.inProgress || [],
        completed: data.completed || [],
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Couldn't load the roadmap. Check that the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoadmap();
  }, [loadRoadmap]);

  const updateStatus = async (postId, status) => {
    if (!isAdmin) return;

    const previousRoadmap = roadmap;
    setUpdatingId(postId);
    setError("");

    const nextRoadmap = {
      planned: [],
      inProgress: [],
      completed: [],
    };

    for (const column of columns) {
      for (const post of roadmap[column.key]) {
        if (post._id === postId) {
          const destination = columns.find((item) => item.status === status);
          if (destination) {
            nextRoadmap[destination.key].push({ ...post, status });
          }
        } else {
          nextRoadmap[column.key].push(post);
        }
      }
    }

    setRoadmap(nextRoadmap);

    try {
      await axios.patch(
        `${API_URL}/posts/${postId}/status`,
        { status },
        { withCredentials: true }
      );

      await loadRoadmap();
    } catch (err) {
      setRoadmap(previousRoadmap);
      setError(
        err.response?.data?.message ||
          "Couldn't update the status. Your change has been reverted."
      );
    } finally {
      setUpdatingId("");
    }
  };

  const totalCount =
    roadmap.planned.length +
    roadmap.inProgress.length +
    roadmap.completed.length;

  return (
    <main className="roadmap-page">
      <div className="roadmap-container">
        <div className="roadmap-back-row">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft size={16} />
            Back to feedback
          </Button>

          <Button
            variant="outline"
            onClick={loadRoadmap}
            disabled={loading}
          >
            <RefreshCw
              size={15}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </Button>
        </div>

        <section className="roadmap-heading">
          <div className="roadmap-kicker">
            <span className="roadmap-kicker-dot" />
            PRODUCT DIRECTION
          </div>

          <h1>Our public roadmap</h1>

          <p>
            See what we're planning, what we're building, and what we've
            shipped. Your feedback helps shape every step.
          </p>

          <div className="roadmap-summary">
            <div>
              <span className="roadmap-summary-number">{totalCount}</span>
              <span className="roadmap-summary-label">tracked ideas</span>
            </div>
            <div>
              <span className="roadmap-summary-number">
                {roadmap.completed.length}
              </span>
              <span className="roadmap-summary-label">completed</span>
            </div>
            <div>
              <span className="roadmap-summary-number">
                {roadmap.inProgress.length}
              </span>
              <span className="roadmap-summary-label">in progress</span>
            </div>
          </div>
        </section>

        {error && (
          <div className="roadmap-error" role="alert">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={loadRoadmap}>
              Try again
            </Button>
          </div>
        )}

        <section className="roadmap-board" aria-label="Product roadmap">
          {columns.map((column) => {
            const Icon = column.icon;
            const items = roadmap[column.key];

            return (
              <section
                className={`roadmap-column roadmap-${column.color}`}
                key={column.key}
              >
                <header className="roadmap-column-header">
                  <div className="roadmap-column-title">
                    <span className="roadmap-column-icon">
                      <Icon size={17} />
                    </span>
                    <h2>{column.title}</h2>
                    <span className="roadmap-count">
                      {loading ? "…" : items.length}
                    </span>
                  </div>
                  <p>{column.description}</p>
                </header>

                <div className="roadmap-column-body">
                  {loading ? (
                    Array.from({ length: 2 }).map((_, index) => (
                      <div className="roadmap-skeleton" key={index}>
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="mt-4 h-5 w-full" />
                        <Skeleton className="mt-2 h-4 w-4/5" />
                        <Skeleton className="mt-5 h-4 w-24" />
                      </div>
                    ))
                  ) : items.length === 0 ? (
                    <div className="roadmap-empty">
                      <Icon size={22} />
                      <p>Nothing here just yet.</p>
                      <span>New updates will appear here.</span>
                    </div>
                  ) : (
                    items.map((post) => (
                      <article className="roadmap-card" key={post._id}>
                        <div className="roadmap-card-top">
                          <Badge variant="outline">{post.category}</Badge>
                          <span className="roadmap-card-status">
                            {column.title}
                          </span>
                        </div>

                        <h3>{post.title}</h3>

                        <p className="roadmap-card-description">
                          {post.description || "No description provided."}
                        </p>

                        <div className="roadmap-card-footer">
                          <span className="roadmap-votes">
                            <ThumbsUp size={15} />
                            {post.voteCount ?? 0}
                            <span>votes</span>
                          </span>

                          {post.commentCount != null && (
                            <span className="roadmap-comments">
                              {post.commentCount} comments
                            </span>
                          )}
                        </div>

                        {isAdmin && (
                          <div className="roadmap-admin">
                            <label htmlFor={`status-${post._id}`}>
                              <ShieldCheck size={14} />
                              Admin status
                            </label>

                            <select
                              id={`status-${post._id}`}
                              value={post.status || column.status}
                              disabled={updatingId === post._id}
                              onChange={(event) =>
                                updateStatus(post._id, event.target.value)
                              }
                            >
                              {columns.map((item) => (
                                <option
                                  key={item.status}
                                  value={item.status}
                                >
                                  {item.status}
                                </option>
                              ))}
                            </select>

                            {updatingId === post._id && (
                              <LoaderCircle
                                size={15}
                                className="animate-spin"
                              />
                            )}
                          </div>
                        )}
                      </article>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </section>

        <div className="roadmap-bottom">
          <div>
            <h3>Have an idea for what's next?</h3>
            <p>Head back to the feedback board and share it with us.</p>
          </div>

          <Button onClick={onBack}>
            Share feedback
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </main>
  );
}

export default Roadmap;
