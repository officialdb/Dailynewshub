"""Article workflow state machine — defines valid transitions and guards."""

from __future__ import annotations

from app.models.enums import ArticleStatus

TRANSITIONS: dict[ArticleStatus, set[ArticleStatus]] = {
    ArticleStatus.DRAFT: {
        ArticleStatus.SUBMITTED,
        ArticleStatus.REJECTED,
    },
    ArticleStatus.SUBMITTED: {
        ArticleStatus.UNDER_REVIEW,
        ArticleStatus.FACT_CHECKING,
        ArticleStatus.REJECTED,
        ArticleStatus.REVISION_REQUESTED,
    },
    ArticleStatus.UNDER_REVIEW: {
        ArticleStatus.FACT_CHECKING,
        ArticleStatus.VALIDATION,
        ArticleStatus.REJECTED,
        ArticleStatus.REVISION_REQUESTED,
    },
    ArticleStatus.FACT_CHECKING: {
        ArticleStatus.VALIDATION,
        ArticleStatus.REJECTED,
        ArticleStatus.REVISION_REQUESTED,
    },
    ArticleStatus.VALIDATION: {
        ArticleStatus.EDITORIAL_REVIEW,
        ArticleStatus.REJECTED,
        ArticleStatus.REVISION_REQUESTED,
    },
    ArticleStatus.EDITORIAL_REVIEW: {
        ArticleStatus.APPROVED,
        ArticleStatus.REJECTED,
        ArticleStatus.REVISION_REQUESTED,
    },
    ArticleStatus.APPROVED: {
        ArticleStatus.SCHEDULED,
        ArticleStatus.PUBLISHED,
        ArticleStatus.REJECTED,
    },
    ArticleStatus.SCHEDULED: {
        ArticleStatus.PUBLISHED,
        ArticleStatus.APPROVED,
    },
    ArticleStatus.PUBLISHED: {
        ArticleStatus.ARCHIVED,
    },
    ArticleStatus.ARCHIVED: {
        ArticleStatus.PUBLISHED,
    },
    ArticleStatus.REJECTED: {
        ArticleStatus.DRAFT,
    },
    ArticleStatus.REVISION_REQUESTED: {
        ArticleStatus.DRAFT,
        ArticleStatus.SUBMITTED,
    },
}

ROLE_TRANSITIONS: dict[ArticleStatus, dict[str, set[ArticleStatus]]] = {
    ArticleStatus.DRAFT: {
        "reporter": {ArticleStatus.SUBMITTED},
    },
    ArticleStatus.SUBMITTED: {
        "chief_editor": {
            ArticleStatus.UNDER_REVIEW,
            ArticleStatus.FACT_CHECKING,
            ArticleStatus.REJECTED,
            ArticleStatus.REVISION_REQUESTED,
        },
    },
    ArticleStatus.UNDER_REVIEW: {
        "chief_editor": {
            ArticleStatus.FACT_CHECKING,
            ArticleStatus.VALIDATION,
            ArticleStatus.REJECTED,
            ArticleStatus.REVISION_REQUESTED,
        },
    },
    ArticleStatus.FACT_CHECKING: {
        "fact_checker": {
            ArticleStatus.VALIDATION,
            ArticleStatus.REJECTED,
            ArticleStatus.REVISION_REQUESTED,
        },
    },
    ArticleStatus.VALIDATION: {
        "validator": {
            ArticleStatus.EDITORIAL_REVIEW,
            ArticleStatus.REJECTED,
            ArticleStatus.REVISION_REQUESTED,
        },
    },
    ArticleStatus.EDITORIAL_REVIEW: {
        "chief_editor": {
            ArticleStatus.APPROVED,
            ArticleStatus.REJECTED,
            ArticleStatus.REVISION_REQUESTED,
        },
    },
    ArticleStatus.APPROVED: {
        "publisher": {
            ArticleStatus.SCHEDULED,
            ArticleStatus.PUBLISHED,
        },
        "chief_editor": {
            ArticleStatus.SCHEDULED,
            ArticleStatus.PUBLISHED,
            ArticleStatus.REJECTED,
        },
    },
    ArticleStatus.SCHEDULED: {
        "publisher": {ArticleStatus.PUBLISHED},
        "chief_editor": {ArticleStatus.PUBLISHED, ArticleStatus.APPROVED},
    },
    ArticleStatus.PUBLISHED: {
        "publisher": {ArticleStatus.ARCHIVED},
        "chief_editor": {ArticleStatus.ARCHIVED},
        "admin": {ArticleStatus.ARCHIVED},
    },
    ArticleStatus.ARCHIVED: {
        "publisher": {ArticleStatus.PUBLISHED},
        "chief_editor": {ArticleStatus.PUBLISHED},
        "admin": {ArticleStatus.PUBLISHED},
    },
    ArticleStatus.REJECTED: {
        "reporter": {ArticleStatus.DRAFT},
        "chief_editor": {ArticleStatus.DRAFT},
    },
    ArticleStatus.REVISION_REQUESTED: {
        "reporter": {ArticleStatus.DRAFT, ArticleStatus.SUBMITTED},
    },
}


def can_transition(from_status: ArticleStatus, to_status: ArticleStatus) -> bool:
    """Check if a transition is valid (ignoring role)."""
    allowed = TRANSITIONS.get(from_status, set())
    return to_status in allowed


def can_role_transition(
    from_status: ArticleStatus,
    to_status: ArticleStatus,
    role_name: str,
) -> bool:
    """Check if a specific role can perform this transition."""
    role_map = ROLE_TRANSITIONS.get(from_status, {})
    allowed = role_map.get(role_name, set())
    return to_status in allowed


def get_available_transitions(current_status: ArticleStatus) -> set[ArticleStatus]:
    """Get all valid next states from the current status."""
    return TRANSITIONS.get(current_status, set())


def get_role_transitions(
    current_status: ArticleStatus,
    role_name: str,
) -> set[ArticleStatus]:
    """Get valid next states for a specific role from the current status."""
    role_map = ROLE_TRANSITIONS.get(current_status, {})
    return role_map.get(role_name, set())
