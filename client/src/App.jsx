
import { useEffect, useState } from "react";
import axios from "axios";
import Roadmap from "./Roadmap";
import CommentsDialog from "./CommentsDialog";
import {
  ArrowDownUp,
  Check,
  ChevronDown,
  CircleHelp,
  Command,
  Filter,
  Lightbulb,
  LoaderCircle,
  LogOut,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  UserRound,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";


import "./App.css";

const API_URL = "http://localhost:5000/api";

const categories = ["All", "UI/UX", "Integrations", "Performance", "General"];
const requestCategories = categories.filter((item) => item !== "All");

const statusColors = {
  "Under Review": "review",
  Planned: "planned",
  "In Progress": "progress",
  Completed: "completed",
};

const initialAuthForm = {
  name: "",
  email: "",
  password: "",
  token: "",
  newPassword: "",
};

function App() {
  const [currentPage, setCurrentPage] = useState("feedback");
  const [posts, setPosts] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("mostUpvoted");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [votingId, setVotingId] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [requestOpen, setRequestOpen] = useState(false);
  const [requestTitle, setRequestTitle] = useState("");
  const [requestDescription, setRequestDescription] = useState("");
  const [requestCategory, setRequestCategory] = useState("UI/UX");
  const [requestError, setRequestError] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState("");

  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState(initialAuthForm);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [verificationToken, setVerificationToken] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [user, setUser] = useState(null);

  const [pendingAction, setPendingAction] = useState("");
  const [discussionPost, setDiscussionPost] = useState(null);

  const updateAuthField = (field, value) => {
    setAuthForm((current) => ({ ...current, [field]: value }));
  };

  const openAuth = (mode = "login", action = "") => {
    setAuthMode(mode);
    setAuthError("");
    setAuthMessage("");
    setPendingAction(action);
    setAuthOpen(true);
  };

  const closeAuth = () => {
    setAuthOpen(false);
    setAuthError("");
    setAuthBusy(false);
  };

  useEffect(() => {
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const params = {
          search: search.trim(),
          sort,
          page: 1,
          limit: 20,
        };

        if (category !== "All") params.category = category;
        if (statusFilter !== "All") params.status = statusFilter;

        const response = await axios.get(`${API_URL}/posts`, {
          params,
          signal: controller.signal,
        });

        setPosts(response.data.posts || []);
      } catch (err) {
        if (err.code !== "ERR_CANCELED") {
          setError(
            "Couldn't load feature requests. Check that your backend is running."
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, category, sort, statusFilter]);

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      try {
        const response = await axios.get(`${API_URL}/auth/me`, {
          withCredentials: true,
        });

        if (!cancelled) {
          setUser(response.data.user || response.data);
        }
      } catch {
        if (!cancelled) setUser(null);
      }
    };

    loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const openRequestDialog = () => {
    setRequestError("");
    setRequestSuccess("");
    setRequestOpen(true);
  };

  const resetRequestForm = () => {
    setRequestTitle("");
    setRequestDescription("");
    setRequestCategory("UI/UX");
    setRequestError("");
  };

  const handleCreateRequest = async (event) => {
    event.preventDefault();

    const title = requestTitle.trim();
    const description = requestDescription.trim();

    if (title.length < 5 || title.length > 120) {
      setRequestError("Title must be between 5 and 120 characters.");
      return;
    }

    if (description.length < 20 || description.length > 5000) {
      setRequestError("Description must be between 20 and 5000 characters.");
      return;
    }

    setSubmittingRequest(true);
    setRequestError("");

    try {
      await axios.post(
        `${API_URL}/posts`,
        { title, description, category: requestCategory },
        { withCredentials: true }
      );

      setRequestOpen(false);
      resetRequestForm();
      setRequestSuccess("Your feature request was submitted successfully.");
      setSearch("");
      setCategory("All");
      setStatusFilter("All");
      setSort("newest");
    } catch (err) {
      if (err.response?.status === 401) {
        setRequestError("Please log in to submit a feature request.");
        setRequestOpen(false);
        openAuth("login", "request");
      } else {
        setRequestError(
          err.response?.data?.message || "Couldn't submit your request."
        );
      }
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthError("");
    setAuthMessage("");
    setAuthBusy(true);

    try {
      if (authMode === "signup") {
        const name = authForm.name.trim();
        const email = authForm.email.trim().toLowerCase();

        if (name.length < 2) {
          setAuthError("Please enter your name.");
          return;
        }

        if (authForm.password.length < 8) {
          setAuthError("Password must be at least 8 characters long.");
          return;
        }

        const response = await axios.post(`${API_URL}/auth/signup`, {
          name,
          email,
          password: authForm.password,
        });

        setVerificationToken(response.data.verificationToken || "");
        setAuthForm((current) => ({ ...current, email, password: "" }));
        setAuthMode("verify");
        setAuthMessage(
          "Account created. Verify your email to enable login. This project uses a development verification token instead of sending email."
        );
      } else if (authMode === "login") {
        const response = await axios.post(
          `${API_URL}/auth/login`,
          {
            email: authForm.email.trim().toLowerCase(),
            password: authForm.password,
          },
          { withCredentials: true }
        );

        setUser(response.data.user);
        setAuthMessage("You're signed in.");
        setAuthOpen(false);
        setAuthForm(initialAuthForm);

        if (pendingAction === "request") {
          setRequestOpen(true);
          setRequestError("");
        } else if (pendingAction === "vote") {
          setError("You're signed in. You can now vote.");
        }

        setPendingAction("");
      } else if (authMode === "verify") {
        const token = authForm.token.trim() || verificationToken;

        if (!token) {
          setAuthError(
            "Enter the verification token returned during signup."
          );
          return;
        }

        await axios.get(`${API_URL}/auth/verify-email`, {
          params: { token },
        });

        setVerificationToken("");
        setAuthForm((current) => ({ ...current, token: "" }));
        setAuthMode("login");
        setAuthMessage("Email verified successfully. You can now log in.");
      } else if (authMode === "forgot") {
        const response = await axios.post(`${API_URL}/auth/forgot-password`, {
          email: authForm.email.trim().toLowerCase(),
        });

        setResetToken(response.data.resetToken || "");
        setAuthForm((current) => ({
          ...current,
          token: response.data.resetToken || "",
        }));
        setAuthMode("reset");
        setAuthMessage(
          response.data.resetToken
            ? "Development reset token generated. It has been filled into the token field below."
            : "If an account exists with this email, a reset link has been generated. If no token appears, use a valid account in your local development database."
        );
      } else if (authMode === "reset") {
        const token = authForm.token.trim() || resetToken;

        if (!token) {
          setAuthError("Enter a valid password reset token.");
          return;
        }

        if (authForm.newPassword.length < 8) {
          setAuthError("New password must be at least 8 characters long.");
          return;
        }

        const response = await axios.post(`${API_URL}/auth/reset-password`, {
          token,
          password: authForm.newPassword,
        });

        setResetToken("");
        setAuthForm(initialAuthForm);
        setAuthMode("login");
        setAuthMessage(
          response.data.message || "Password reset. Please log in."
        );
      }
    } catch (err) {
      setAuthError(
        err.response?.data?.message ||
          "The request failed. Check the backend and try again."
      );
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(
        `${API_URL}/auth/logout`,
        {},
        { withCredentials: true }
      );
    } catch {
      // Clear the local UI even if the server session has expired.
    }

    setUser(null);
    setError("You've been logged out.");
  };

  const handleVote = async (postId) => {
    if (!user) {
      openAuth("login", "vote");
      return;
    }

    const previousPosts = posts;

    setPosts((currentPosts) =>
      currentPosts.map((post) =>
        post._id === postId
          ? {
              ...post,
              voteCount: Math.max(
                0,
                (post.voteCount || 0) + (post.hasVoted ? -1 : 1)
              ),
              hasVoted: !post.hasVoted,
            }
          : post
      )
    );

    setVotingId(postId);
    setError("");

    try {
      const response = await axios.post(
        `${API_URL}/posts/${postId}/vote`,
        {},
        { withCredentials: true }
      );

      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post._id === postId
            ? {
                ...post,
                voteCount: response.data.voteCount,
                hasVoted: response.data.hasVoted,
              }
            : post
        )
      );
    } catch (err) {
      setPosts(previousPosts);

      if (err.response?.status === 401) {
        openAuth("login", "vote");
      } else {
        setError(
          err.response?.data?.message || "Couldn't update your vote."
        );
      }
    } finally {
      setVotingId("");
    }
  };

  const formatDate = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleDateString("en", {
      month: "short",
      day: "numeric",
    });
  };

  const authTitles = {
    login: "Welcome back",
    signup: "Create your account",
    verify: "Verify your email",
    forgot: "Forgot your password?",
    reset: "Reset your password",
  };

  const authDescriptions = {
    login: "Sign in to share ideas and vote on features.",
    signup: "Join the community and help shape what we build.",
    verify: "Use the verification token from your signup response.",
    forgot: "Enter the email address associated with your account.",
    reset: "Choose a new password to secure your account.",
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Feedback home">
          <span className="brand-mark">
            <Command size={19} strokeWidth={2.5} />
          </span>
          <span>OpenBoard</span>
          <span className="brand-tag">FEEDBACK</span>
        </a>

        <nav className="top-nav">
          <button
            className={`nav-link ${
              currentPage === "feedback" ? "active" : ""
            }`}
            onClick={() => setCurrentPage("feedback")}
          >
            Feedback
          </button>

          <button
            className={`nav-link ${
              currentPage === "roadmap" ? "active" : ""
            }`}
            onClick={() => setCurrentPage("roadmap")}
          >
            Roadmap
          </button>
        </nav>

        <div className="top-actions">
          {user ? (
            <>
              <span className="login-link">
                <UserRound size={15} />
                {user.name || user.email}
              </span>
              <button className="login-link" onClick={handleLogout}>
                <LogOut size={15} />
                Log out
              </button>
            </>
          ) : (
            <button
              className="login-link"
              onClick={() => openAuth("login")}
            >
              Log in
            </button>
          )}

          <button
            className="button button-primary header-button"
            onClick={openRequestDialog}
          >
            <Plus size={17} />
            New request
          </button>
        </div>
      </header>

      <main>
  {currentPage === "roadmap" ? (
    <Roadmap
      user={user}
      onBack={() => setCurrentPage("feedback")}
    />
  ) : (
    <>
        <section className="hero-section">
          <div className="hero-glow" />
          <div className="hero-content">
            <div className="eyebrow">
              <Sparkles size={14} />
              YOUR VOICE SHAPES WHAT'S NEXT
            </div>

            <h1>
              Good ideas get
              <br />
              <span>better together.</span>
            </h1>

            <p>
              Share your ideas, vote for what matters, and help us build
              something great together.
            </p>

            <div className="hero-search">
              <Search size={19} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search ideas, features, and feedback..."
                aria-label="Search feature requests"
              />

              {search && (
                <button
                  className="clear-search"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <X size={17} />
                </button>
              )}

              <kbd>⌘ K</kbd>
            </div>

            <div className="hero-note">
              <span className="avatar-stack" aria-hidden="true">
                <span>S</span>
                <span>J</span>
                <span>A</span>
              </span>
              <span>Every vote counts. Every idea matters.</span>
            </div>
          </div>

          <div className="hero-decoration decoration-one" />
          <div className="hero-decoration decoration-two" />
          <div className="hero-decoration decoration-three" />
        </section>

        <section className="content-section" id="feedback">
          <div className="section-heading">
            <div>
              <div className="section-kicker">THE COMMUNITY BOARD</div>
              <h2>Feature requests</h2>
              <p>Explore ideas and help decide what we build next.</p>
            </div>

            <button
              className="button button-primary"
              onClick={openRequestDialog}
            >
              <Plus size={17} />
              Suggest a feature
            </button>
          </div>

          <div className="toolbar">
            <div className="category-tabs" aria-label="Filter by category">
              {categories.map((item) => (
                <button
                  key={item}
                  className={`category-tab ${
                    category === item ? "selected" : ""
                  }`}
                  onClick={() => setCategory(item)}
                >
                  {item === "All" && <Lightbulb size={15} />}
                  {item}
                </button>
              ))}
            </div>

            <div className="toolbar-actions">
              <button
                className={`button button-outline filter-button ${
                  showFilters ? "is-active" : ""
                }`}
                onClick={() => setShowFilters((value) => !value)}
              >
                <Filter size={15} />
                Filters
              </button>

              <label className="sort-select">
                <ArrowDownUp size={15} />
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  aria-label="Sort feature requests"
                >
                  <option value="mostUpvoted">Most upvoted</option>
                  <option value="trending">Trending</option>
                  <option value="newest">Newest</option>
                  <option value="mostDiscussed">Most discussed</option>
                </select>
                <ChevronDown size={14} />
              </label>
            </div>
          </div>

          {showFilters && (
            <div className="filter-panel">
              <label className="filter-label" htmlFor="status-filter">
                Status
              </label>

              <select
                id="status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="All">All statuses</option>
                <option value="Under Review">Under Review</option>
                <option value="Planned">Planned</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>

              <button
                className="filter-chip"
                onClick={() => {
                  setSearch("");
                  setCategory("All");
                  setStatusFilter("All");
                }}
              >
                Reset filters
              </button>
            </div>
          )}

          {requestSuccess && (
            <div className="success-banner" role="status">
              <Check size={18} />
              <span>{requestSuccess}</span>
              <button
                onClick={() => setRequestSuccess("")}
                aria-label="Dismiss success"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {error && (
            <div className="error-banner" role="alert">
              <CircleHelp size={18} />
              <span>{error}</span>
              <button
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div className="feed-meta">
            <span>
              {loading
                ? "Finding ideas..."
                : `${posts.length} ${
                    posts.length === 1 ? "idea" : "ideas"
                  } to explore`}
            </span>
            <span className="live-indicator">
              <span />
              Community feedback
            </span>
          </div>

          {loading ? (
            <div className="loading-state">
              <LoaderCircle className="spinner" size={28} />
              <p>Loading ideas...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Lightbulb size={25} />
              </div>
              <h3>No ideas found just yet</h3>
              <p>
                {search
                  ? "Try another search term or clear your filters."
                  : "Be the first to share an idea with the community."}
              </p>
              <button
                className="button button-primary"
                onClick={openRequestDialog}
              >
                <Plus size={17} />
                Suggest a feature
              </button>
            </div>
          ) : (
            <div className="post-list">
              {posts.map((post) => {
                const statusClass = statusColors[post.status] || "review";

                return (
                  <article className="post-card" key={post._id}>
                    <button
                      className={`vote-button ${
                        post.hasVoted ? "voted" : ""
                      }`}
                      onClick={() => handleVote(post._id)}
                      disabled={votingId === post._id}
                      aria-label={`Upvote ${post.title}`}
                    >
                      {votingId === post._id ? (
                        <LoaderCircle className="spinner" size={17} />
                      ) : post.hasVoted ? (
                        <Check size={18} />
                      ) : (
                        <ThumbsUp size={17} />
                      )}
                      <span>{post.voteCount ?? 0}</span>
                    </button>

                    <div className="post-main">
                      <div className="post-tags">
                        <span className="category-label">{post.category}</span>
                        <span className={`status-label ${statusClass}`}>
                          <span className="status-dot" />
                          {post.status}
                        </span>
                      </div>

                      <h3>{post.title}</h3>
                      <p className="post-description">{post.description}</p>

                      <div className="post-footer">
                        <div className="author-info">
                          <span className="author-avatar">
                            {(post.author?.name || "U")
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                          <span>
                            {post.author?.name || "Community member"}
                          </span>
                          <span className="footer-separator">·</span>
                          <span>{formatDate(post.createdAt)}</span>
                        </div>

                        <button
                          className="comment-link"
                          onClick={() => setDiscussionPost(post)}
                        >
                          <MessageCircle size={16} />
                          {post.commentCount ?? 0}
                          <span>Comments</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="bottom-note">
            <Sparkles size={15} />
            Have an idea? The best improvements start with a conversation.
          </div>
        </section>

        <section className="roadmap-teaser" id="roadmap">
          <div>
            <div className="section-kicker">TRANSPARENT BY DESIGN</div>
            <h2>See what's coming next.</h2>
            <p>
              Follow ideas from the first spark to the finished feature.
            </p>
          </div>
          <a className="button button-outline" href="#roadmap">
            Explore roadmap
            <ArrowDownUp size={16} />
          </a>
        
        </section>
      </>
    )}
  </main>


      <footer className="footer">
        <a className="brand footer-brand" href="/">
          <span className="brand-mark">
            <Command size={17} strokeWidth={2.5} />
          </span>
          <span>OpenBoard</span>
        </a>
        <span>Built better, together.</span>
        <span className="footer-right">
          Feedback that moves us forward ✳
        </span>
      </footer>

      <Dialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
      >
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>Suggest a feature</DialogTitle>
            <DialogDescription>
              Tell us what would make your experience better.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRequest} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="request-title">Feature title</Label>
              <Input
                id="request-title"
                value={requestTitle}
                onChange={(event) => setRequestTitle(event.target.value)}
                placeholder="What would you like us to build?"
                minLength={5}
                maxLength={120}
                required
              />
              <p className="text-xs text-muted-foreground">
                {requestTitle.length}/120 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-description">Description</Label>
              <Textarea
                id="request-description"
                value={requestDescription}
                onChange={(event) =>
                  setRequestDescription(event.target.value)
                }
                placeholder="Describe the problem and how this feature would help..."
                rows={5}
                minLength={20}
                maxLength={5000}
                required
              />
              <p className="text-xs text-muted-foreground">
                Markdown syntax is supported in the description text.
              </p>
              <p className="text-xs text-muted-foreground">
                {requestDescription.length}/5000 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-category">Category</Label>
              <select
                id="request-category"
                value={requestCategory}
                onChange={(event) =>
                  setRequestCategory(event.target.value)
                }
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                required
              >
                {requestCategories.map((item) => (
                  <option value={item} key={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            {requestError && (
              <p role="alert" className="text-sm text-destructive">
                {requestError}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={submittingRequest}
                onClick={() => setRequestOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submittingRequest}>
                {submittingRequest ? (
                  <>
                    <LoaderCircle size={16} className="mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit request"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <ShieldCheck size={21} />
            </div>
            <DialogTitle>{authTitles[authMode]}</DialogTitle>
            <DialogDescription>
              {authDescriptions[authMode]}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="auth-name">Full name</Label>
                <Input
                  id="auth-name"
                  autoComplete="name"
                  value={authForm.name}
                  onChange={(event) =>
                    updateAuthField("name", event.target.value)
                  }
                  placeholder="Your name"
                  minLength={2}
                  required
                />
              </div>
            )}

            {["login", "signup", "forgot"].includes(authMode) && (
              <div className="space-y-2">
                <Label htmlFor="auth-email">Email address</Label>
                <Input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  value={authForm.email}
                  onChange={(event) =>
                    updateAuthField("email", event.target.value)
                  }
                  placeholder="you@example.com"
                  required
                />
              </div>
            )}

            {["login", "signup"].includes(authMode) && (
              <div className="space-y-2">
                <Label htmlFor="auth-password">Password</Label>
                <Input
                  id="auth-password"
                  type="password"
                  autoComplete={
                    authMode === "login" ? "current-password" : "new-password"
                  }
                  value={authForm.password}
                  onChange={(event) =>
                    updateAuthField("password", event.target.value)
                  }
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                />
              </div>
            )}

            {authMode === "verify" && (
              <div className="space-y-2">
                <Label htmlFor="verify-token">Verification token</Label>
                <Input
                  id="verify-token"
                  value={authForm.token || verificationToken}
                  onChange={(event) =>
                    updateAuthField("token", event.target.value)
                  }
                  placeholder="Paste verification token"
                  required
                />
                {verificationToken && (
                  <p className="break-all text-xs text-muted-foreground">
                    Development token: {verificationToken}
                  </p>
                )}
              </div>
            )}

            {authMode === "reset" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="reset-token">Reset token</Label>
                  <Input
                    id="reset-token"
                    value={authForm.token || resetToken}
                    onChange={(event) =>
                      updateAuthField("token", event.target.value)
                    }
                    placeholder="Paste password reset token"
                    required
                  />
                  {resetToken && (
                    <p className="break-all text-xs text-muted-foreground">
                      Development token: {resetToken}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={authForm.newPassword}
                    onChange={(event) =>
                      updateAuthField("newPassword", event.target.value)
                    }
                    placeholder="At least 8 characters"
                    minLength={8}
                    required
                  />
                </div>
              </>
            )}

            {authMessage && (
              <p role="status" className="break-words text-sm text-muted-foreground">
                {authMessage}
              </p>
            )}

            {authError && (
              <p role="alert" className="break-words text-sm text-destructive">
                {authError}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={authBusy}>
              {authBusy ? (
                <>
                  <LoaderCircle size={16} className="mr-2 animate-spin" />
                  Please wait...
                </>
              ) : authMode === "login" ? (
                "Log in"
              ) : authMode === "signup" ? (
                "Create account"
              ) : authMode === "verify" ? (
                "Verify email"
              ) : authMode === "forgot" ? (
                "Generate reset token"
              ) : (
                "Reset password"
              )}
            </Button>
          </form>

          <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 text-sm">
            {authMode === "login" && (
              <>
                <button
                  className="text-muted-foreground underline underline-offset-4"
                  onClick={() => {
                    setAuthMode("forgot");
                    setAuthError("");
                    setAuthMessage("");
                  }}
                >
                  Forgot password?
                </button>
                <button
                  className="underline underline-offset-4"
                  onClick={() => {
                    setAuthMode("signup");
                    setAuthError("");
                    setAuthMessage("");
                  }}
                >
                  Create account
                </button>
              </>
            )}

            {authMode === "signup" && (
              <button
                className="underline underline-offset-4"
                onClick={() => {
                  setAuthMode("login");
                  setAuthError("");
                  setAuthMessage("");
                }}
              >
                Already have an account? Log in
              </button>
            )}

            {["forgot", "reset", "verify"].includes(authMode) && (
              <button
                className="underline underline-offset-4"
                onClick={() => {
                  setAuthMode("login");
                  setAuthError("");
                  setAuthMessage("");
                }}
              >
                Back to login
              </button>
            )}
            
          </div>
        </DialogContent>
      </Dialog>
        {discussionPost && (
          <CommentsDialog
            post={discussionPost}
            user={user}
            onClose={() => setDiscussionPost(null)}
            onLogin={() => {
              setDiscussionPost(null);
              openAuth("login");
            }}
          />
        )}
    </div>
  );
}

export default App;
