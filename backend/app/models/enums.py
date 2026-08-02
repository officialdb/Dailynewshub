"""Shared enumerations for the NMS."""

from enum import Enum


class ArticleStatus(str, Enum):
    """Article lifecycle states."""

    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    FACT_CHECKING = "fact_checking"
    VALIDATION = "validation"
    EDITORIAL_REVIEW = "editorial_review"
    APPROVED = "approved"
    SCHEDULED = "scheduled"
    PUBLISHED = "published"
    ARCHIVED = "archived"
    REJECTED = "rejected"
    REVISION_REQUESTED = "revision_requested"


class FactCheckStatus(str, Enum):
    """Fact check states."""

    PENDING = "pending"
    VERIFIED = "verified"
    NEEDS_EVIDENCE = "needs_evidence"
    FAILED = "failed"


# --- API PLATFORM ---
class DeveloperTier(str, Enum):
    """Developer platform subscription tiers."""

    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    ENTERPRISE = "enterprise"


# --- API PLATFORM ---
class DeveloperKeyEnvironment(str, Enum):
    """Environment scope for developer API keys."""

    LIVE = "live"
    TEST = "test"
