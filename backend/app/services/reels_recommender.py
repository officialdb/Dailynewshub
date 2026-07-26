"""Lightweight reel recommendation engine.

Two-step mechanism:
  1. Candidate retrieval  – collaborative (60) + content-based (40)
  2. Ranking              – weighted scoring formula

Exploration factor: 15 % of slots reserved for unseen-category reels.

The recommendation list is pre-computed by a Celery task every 6 h
and stored in Redis.  The API endpoint reads from cache only.
"""

from __future__ import annotations

import json
import logging
import math
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.category import Category
from app.models.reel import Reel
from app.models.reel_watch_event import ReelWatchEvent
from app.models.followed_channel import FollowedChannel

logger = logging.getLogger(__name__)

# ── Tuning knobs ────────────────────────────────────────────────────────
COLLAB_CANDIDATES = 60
CONTENT_CANDIDATES = 40
TOTAL_CANDIDATES = COLLAB_CANDIDATES + CONTENT_CANDIDATES
SIMILAR_USERS_K = 20
COLD_START_THRESHOLD = 10          # min watch events before profile is used
EXPLORE_SLOTS = 15                 # out of 100
EXPLORE_MIN_POPULARITY = 0.4
EXPLORE_INJECT_EVERY = 4           # inject at positions 4, 8, 12 …
RECENT_WINDOW_DAYS = 30
RECENT_WEIGHT = 2.0                # 2× for last 30 days
DEDUP_WINDOW_DAYS = 7
NEW_VIDEO_DEFAULT_POPULARITY = 0.1
NEW_VIDEO_WINDOW_HOURS = 72
CACHE_TTL_SECONDS = 6 * 3600      # 6 hours
EARLY_RECOMPUTE_THRESHOLD = 5     # watch events since last refresh

# Scoring weights
W_COMPLETION = 0.40
W_WATCH_TIME = 0.25
W_CATEGORY = 0.20
W_POPULARITY = 0.10
W_SKIP = 0.05


# ── 1. User profile vector ─────────────────────────────────────────────

async def build_user_profile(
    user_id: UUID,
    db: AsyncSession,
) -> dict:
    """Build a user profile vector from watch history.

    Returns
    -------
    dict with keys:
        category_affinity   – {category_id_str: float 0-1}
        completion_by_cat   – {category_id_str: float 0-1}
        skip_tags           – set of tag strings the user skipped
        avg_watch_duration  – average preferred watch duration (seconds)
        watch_count         – total watch events
        watched_reel_ids    – set of reel IDs watched in last 7 days
    """
    now = datetime.now(timezone.utc)
    cutoff_recent = now - timedelta(days=RECENT_WINDOW_DAYS)
    cutoff_dedup = now - timedelta(days=DEDUP_WINDOW_DAYS)

    # Fetch all watch events with reel + category info
    result = await db.execute(
        select(ReelWatchEvent, Reel)
        .join(Reel, ReelWatchEvent.reel_id == Reel.id)
        .options(selectinload(Reel.category))
        .where(ReelWatchEvent.user_id == user_id)
        .order_by(ReelWatchEvent.created_at.desc())
    )
    rows = result.all()

    cat_watch_time: dict[str, float] = defaultdict(float)
    cat_completion: dict[str, list[float]] = defaultdict(list)
    skip_tags: set[str] = set()
    total_weighted_time = 0.0
    durations: list[int] = []
    watched_reel_ids: set[str] = set()

    for event, reel in rows:
        cat_key = str(reel.category_id) if reel.category_id else "__none__"
        weight = RECENT_WEIGHT if event.created_at >= cutoff_recent else 1.0

        watch_secs = event.watch_duration_seconds
        weighted_time = watch_secs * weight
        cat_watch_time[cat_key] += weighted_time
        total_weighted_time += weighted_time

        cat_completion[cat_key].append(event.completion_ratio)

        # Skip detection: < 20 % completion
        if event.completion_ratio < 0.2:
            # Use category name and channel as "tags"
            if reel.category and reel.category.name:
                skip_tags.add(reel.category.name.lower())
            skip_tags.add(reel.channel_name.lower())

        if event.completion_ratio >= 0.5:
            durations.append(reel.duration_seconds)

        # Track recently watched for dedup
        if event.created_at >= cutoff_dedup:
            watched_reel_ids.add(str(reel.id))

    # Normalise affinity scores
    category_affinity: dict[str, float] = {}
    if total_weighted_time > 0:
        for cat, wt in cat_watch_time.items():
            category_affinity[cat] = wt / total_weighted_time

    # Average completion per category
    completion_by_cat: dict[str, float] = {}
    for cat, ratios in cat_completion.items():
        completion_by_cat[cat] = sum(ratios) / len(ratios) if ratios else 0.0

    avg_watch_duration = sum(durations) / len(durations) if durations else 60

    return {
        "category_affinity": category_affinity,
        "completion_by_cat": completion_by_cat,
        "skip_tags": skip_tags,
        "avg_watch_duration": avg_watch_duration,
        "watch_count": len(rows),
        "watched_reel_ids": watched_reel_ids,
    }


# ── 2. Candidate retrieval ─────────────────────────────────────────────

async def _collaborative_candidates(
    user_id: UUID,
    profile: dict,
    db: AsyncSession,
    limit: int = COLLAB_CANDIDATES,
) -> list[UUID]:
    """Find reels watched by similar users (cosine similarity on affinity)."""
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=RECENT_WINDOW_DAYS)
    watched = profile["watched_reel_ids"]

    # Build affinity vectors for all active users
    all_users_result = await db.execute(
        select(ReelWatchEvent.user_id)
        .where(ReelWatchEvent.created_at >= cutoff)
        .distinct()
    )
    peer_ids = [row[0] for row in all_users_result.all() if row[0] != user_id]

    if not peer_ids:
        return []

    # Build per-peer affinity vectors
    peer_vectors: dict[UUID, dict[str, float]] = {}
    for pid in peer_ids:
        pp = await build_user_profile(pid, db)
        peer_vectors[pid] = pp["category_affinity"]

    # Cosine similarity
    user_vec = profile["category_affinity"]
    user_norm = math.sqrt(sum(v * v for v in user_vec.values())) or 1.0

    scored_peers: list[tuple[UUID, float]] = []
    for pid, pvec in peer_vectors.items():
        pnorm = math.sqrt(sum(v * v for v in pvec.values())) or 1.0
        dot = sum(user_vec.get(k, 0.0) * v for k, v in pvec.items())
        sim = dot / (user_norm * pnorm)
        scored_peers.append((pid, sim))

    scored_peers.sort(key=lambda x: x[1], reverse=True)
    top_peers = [pid for pid, _ in scored_peers[:SIMILAR_USERS_K]]

    if not top_peers:
        return []

    # Collect reels watched by top peers that the target hasn't seen
    peer_events = await db.execute(
        select(ReelWatchEvent.reel_id, func.count().label("freq"))
        .where(
            ReelWatchEvent.user_id.in_(top_peers),
            ReelWatchEvent.created_at >= cutoff,
        )
        .group_by(ReelWatchEvent.reel_id)
        .order_by(func.count().desc())
    )

    candidates: list[UUID] = []
    for reel_id, _ in peer_events.all():
        rid_str = str(reel_id)
        if rid_str not in watched:
            candidates.append(reel_id)
        if len(candidates) >= limit:
            break

    return candidates


async def _content_based_candidates(
    profile: dict,
    db: AsyncSession,
    limit: int = CONTENT_CANDIDATES,
) -> list[UUID]:
    """Retrieve reels matching user's top category affinities."""
    watched = profile["watched_reel_ids"]
    affinity = profile["category_affinity"]

    # Top 3 categories
    top_cats = sorted(affinity.items(), key=lambda x: x[1], reverse=True)[:3]
    top_cat_ids = [UUID(c) for c, _ in top_cats if c != "__none__"]

    if not top_cat_ids:
        # Fallback: most popular reels
        result = await db.execute(
            select(Reel.id)
            .order_by(Reel.view_count.desc(), Reel.like_count.desc())
            .limit(limit * 2)
        )
        ids = [r[0] for r in result.all() if str(r[0]) not in watched]
        return ids[:limit]

    result = await db.execute(
        select(Reel.id)
        .where(Reel.category_id.in_(top_cat_ids))
        .order_by(Reel.view_count.desc(), Reel.like_count.desc())
        .limit(limit * 2)
    )

    candidates: list[UUID] = []
    for (rid,) in result.all():
        if str(rid) not in watched:
            candidates.append(rid)
        if len(candidates) >= limit:
            break

    return candidates


# ── 3. Scoring ──────────────────────────────────────────────────────────

def _popularity_score(reel: Reel, max_views: int) -> float:
    """Normalised popularity: log(1+views) / log(1+max_views)."""
    if max_views <= 0:
        return NEW_VIDEO_DEFAULT_POPULARITY
    return math.log(1 + (reel.view_count or 0)) / math.log(1 + max_views)


def _time_decay(reel: Reel) -> float:
    """Time decay penalty: 0.1 × (1 - e^(-age/30)).  Max penalty 0.1."""
    if not reel.published_at:
        return 0.0
    now = datetime.now(timezone.utc)
    pub = reel.published_at
    if pub.tzinfo is None:
        pub = pub.replace(tzinfo=timezone.utc)
    age_days = max((now - pub).total_seconds() / 86400, 0)
    return 0.1 * (1 - math.exp(-age_days / 30))


def _score_reel(
    reel: Reel,
    profile: dict,
    max_views: int,
) -> float:
    """Score a single candidate reel."""
    cat_key = str(reel.category_id) if reel.category_id else "__none__"

    # Completion rate for this category
    completion = profile["completion_by_cat"].get(cat_key, 0.5)

    # Watch time ratio
    avg_dur = profile["avg_watch_duration"] or 60
    reel_dur = reel.duration_seconds or 60
    watch_ratio = min(reel_dur / avg_dur, 1.0) if avg_dur > 0 else 0.5

    # Category affinity
    cat_aff = profile["category_affinity"].get(cat_key, 0.0)

    # Popularity
    pop = _popularity_score(reel, max_views)

    # Skip penalty
    skip = 0.0
    cat_name = ""
    if reel.category and reel.category.name:
        cat_name = reel.category.name.lower()
    if cat_name in profile["skip_tags"] or reel.channel_name.lower() in profile["skip_tags"]:
        skip = 1.0

    # Time decay
    decay = _time_decay(reel)

    score = (
        completion * W_COMPLETION
        + watch_ratio * W_WATCH_TIME
        + cat_aff * W_CATEGORY
        + pop * W_POPULARITY
        - skip * W_SKIP
        - decay
    )
    return round(score, 4)


# ── 4. Exploration factor ──────────────────────────────────────────────

async def _exploration_pool(
    profile: dict,
    db: AsyncSession,
    max_views: int,
    count: int = EXPLORE_SLOTS,
) -> list[UUID]:
    """Find popular reels in categories the user hasn't explored."""
    affinity = profile["category_affinity"]

    # Unseen categories: affinity < threshold or missing
    seen_cats = {
        k for k, v in affinity.items() if v > 0.05 and k != "__none__"
    }
    all_cats = await db.execute(select(Category.id))
    unseen_cat_ids = [c for (c,) in all_cats.all() if str(c) not in seen_cats]

    if not unseen_cat_ids:
        return []

    # Popular reels from unseen categories
    result = await db.execute(
        select(Reel.id)
        .where(Reel.category_id.in_(unseen_cat_ids))
        .order_by(Reel.view_count.desc(), Reel.like_count.desc())
        .limit(count * 3)
    )

    pool: list[UUID] = []
    for (rid,) in result.all():
        if str(rid) not in profile["watched_reel_ids"]:
            pool.append(rid)
        if len(pool) >= count:
            break

    return pool


def _inject_exploration(
    ranked_ids: list[UUID],
    explore_ids: list[UUID],
) -> list[UUID]:
    """Inject exploration reels at every 4th position."""
    result: list[UUID] = []
    explore_idx = 0

    for i, rid in enumerate(ranked_ids):
        # Every 4th slot gets an exploration reel if available
        if (i + 1) % EXPLORE_INJECT_EVERY == 0 and explore_idx < len(explore_ids):
            result.append(explore_ids[explore_idx])
            explore_idx += 1
        result.append(rid)

    return result


# ── 5. Cold start ──────────────────────────────────────────────────────

async def _cold_start_recommendations(
    user_id: UUID,
    db: AsyncSession,
    count: int = 100,
) -> list[str]:
    """For new users: return trending reels, optionally filtered by onboarding prefs."""
    from app.models.user import User

    user = await db.get(User, user_id)
    preferred_cats: list[str] = []
    if user and user.preferences:
        # Match preference names to category IDs
        cat_result = await db.execute(
            select(Category.id).where(
                func.lower(Category.name).in_([p.lower() for p in user.preferences])
            )
        )
        preferred_cats = [str(c) for (c,) in cat_result.all()]

    query = select(Reel.id).order_by(
        Reel.view_count.desc(),
        Reel.like_count.desc(),
        Reel.published_at.desc().nullslast(),
    )

    if preferred_cats:
        cat_uuids = [UUID(c) for c in preferred_cats]
        query = query.where(Reel.category_id.in_(cat_uuids))

    query = query.limit(count)
    result = await db.execute(query)
    return [str(r[0]) for r in result.all()]


# ── 6. Main entry point ────────────────────────────────────────────────

async def compute_recommendations(
    user_id: UUID,
    db: AsyncSession,
) -> list[str]:
    """Compute a full recommendation list for a user.

    Returns a list of reel ID strings, ranked by score with
    exploration reels injected at every 4th position.
    """
    # Build user profile from watch history
    profile = await build_user_profile(user_id, db)

    # Cold start: fewer than COLD_START_THRESHOLD watch events
    if profile["watch_count"] < COLD_START_THRESHOLD:
        return await _cold_start_recommendations(user_id, db)

    # Get max view count for popularity normalisation
    max_views = await db.scalar(select(func.max(Reel.view_count))) or 1

    # Step 1: Candidate retrieval
    collab = await _collaborative_candidates(user_id, profile, db)
    content = await _content_based_candidates(profile, db)

    # Merge & deduplicate
    seen: set[UUID] = set()
    candidates: list[UUID] = []
    for rid in collab + content:
        if rid not in seen:
            seen.add(rid)
            candidates.append(rid)

    # Fetch full reel objects for scoring
    if not candidates:
        return await _cold_start_recommendations(user_id, db)

    reel_result = await db.execute(
        select(Reel)
        .options(selectinload(Reel.category))
        .where(Reel.id.in_(candidates))
    )
    reels = {r.id: r for r in reel_result.scalars().all()}

    # Step 2: Score and rank
    scored = [
        (rid, _score_reel(reels[rid], profile, max_views))
        for rid in candidates
        if rid in reels
    ]
    scored.sort(key=lambda x: x[1], reverse=True)

    # Split: top 85 % exploitation, remaining filled by exploration
    exploit_count = TOTAL_CANDIDATES - EXPLORE_SLOTS
    ranked_ids = [rid for rid, _ in scored[:exploit_count]]

    # Step 3: Exploration injection
    explore = await _exploration_pool(profile, db, max_views)
    final_ids = _inject_exploration(ranked_ids, explore)

    # Pad with remaining scored candidates if exploration pool is small
    used = set(final_ids)
    for rid, _ in scored:
        if len(final_ids) >= TOTAL_CANDIDATES:
            break
        if rid not in used:
            final_ids.append(rid)
            used.add(rid)

    return [str(rid) for rid in final_ids]


# ── 7. Cache helpers ───────────────────────────────────────────────────

def cache_key(user_id: UUID | str) -> str:
    return f"reel_recs:{user_id}"


async def get_cached_recommendations(
    user_id: UUID,
    redis_client,
) -> list[str] | None:
    """Read pre-computed recommendations from Redis cache."""
    raw = await redis_client.get(cache_key(user_id))
    if raw is None:
        return None
    return json.loads(raw)


async def set_cached_recommendations(
    user_id: UUID,
    recs: list[str],
    redis_client,
) -> None:
    """Store recommendations in Redis with 6 h TTL."""
    await redis_client.setex(
        cache_key(user_id),
        CACHE_TTL_SECONDS,
        json.dumps(recs),
    )


async def should_recompute(
    user_id: UUID,
    redis_client,
    db: AsyncSession,
) -> bool:
    """Check if user watched ≥ 5 new reels since last cache refresh."""
    last_cached = await redis_client.get(f"reel_recs_ts:{user_id}")
    if last_cached is None:
        return True

    last_ts = datetime.fromisoformat(last_cached)
    if last_ts.tzinfo is None:
        last_ts = last_ts.replace(tzinfo=timezone.utc)

    count = await db.scalar(
        select(func.count(ReelWatchEvent.id)).where(
            ReelWatchEvent.user_id == user_id,
            ReelWatchEvent.created_at >= last_ts,
        )
    )
    return (count or 0) >= EARLY_RECOMPUTE_THRESHOLD


async def mark_recomputed(
    user_id: UUID,
    redis_client,
) -> None:
    """Record the timestamp of the last recomputation."""
    await redis_client.set(
        f"reel_recs_ts:{user_id}",
        datetime.now(timezone.utc).isoformat(),
    )
