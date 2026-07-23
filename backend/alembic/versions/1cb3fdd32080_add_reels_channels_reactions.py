"""add_reels_channels_reactions

Revision ID: 1cb3fdd32080
Revises: 0002_comments_table
Create Date: 2026-07-14 17:52:04.172395

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1cb3fdd32080'
down_revision: Union[str, None] = '0002_comments_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(conn, table_name: str) -> bool:
    return sa.inspect(conn).has_table(table_name)


def _column_exists(conn, table_name: str, column_name: str) -> bool:
    cols = [c["name"] for c in sa.inspect(conn).get_columns(table_name)]
    return column_name in cols


def _index_exists(conn, table_name: str, index_name: str) -> bool:
    indexes = [i["name"] for i in sa.inspect(conn).get_indexes(table_name)]
    return index_name in indexes


def upgrade() -> None:
    conn = op.get_bind()

    # ── New tables (only create if absent) ──────────────────────────────────
    if not _table_exists(conn, 'followed_channels'):
        op.create_table('followed_channels',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('channel_id', sa.String(length=255), nullable=False),
        sa.Column('channel_name', sa.String(length=255), nullable=False),
        sa.Column('channel_logo_url', sa.String(length=1000), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_followed_channels_user_id_users'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_followed_channels')),
        sa.UniqueConstraint('user_id', 'channel_id', name='uq_followed_channels_user_channel')
        )

    if not _table_exists(conn, 'reels'):
        op.create_table('reels',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('youtube_video_id', sa.String(length=100), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('thumbnail_url', sa.String(length=1000), nullable=True),
        sa.Column('channel_id', sa.String(length=255), nullable=False),
        sa.Column('channel_name', sa.String(length=255), nullable=False),
        sa.Column('channel_logo_url', sa.String(length=1000), nullable=True),
        sa.Column('category_id', sa.UUID(), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), nullable=False),
        sa.Column('view_count', sa.Integer(), nullable=False),
        sa.Column('like_count', sa.Integer(), nullable=False),
        sa.Column('comment_count', sa.Integer(), nullable=False),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], name=op.f('fk_reels_category_id_categories'), ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_reels'))
        )

    if not _index_exists(conn, 'reels', 'ix_reels_youtube_video_id'):
        op.create_index(op.f('ix_reels_youtube_video_id'), 'reels', ['youtube_video_id'], unique=True)

    if not _table_exists(conn, 'article_comments'):
        op.create_table('article_comments',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('article_id', sa.UUID(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['article_id'], ['articles.id'], name=op.f('fk_article_comments_article_id_articles'), ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_article_comments_user_id_users'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_article_comments'))
        )

    if not _table_exists(conn, 'article_reactions'):
        op.create_table('article_reactions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('article_id', sa.UUID(), nullable=False),
        sa.Column('reaction_type', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['article_id'], ['articles.id'], name=op.f('fk_article_reactions_article_id_articles'), ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_article_reactions_user_id_users'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_article_reactions')),
        sa.UniqueConstraint('user_id', 'article_id', name='uq_article_reactions_user_article')
        )

    if not _table_exists(conn, 'reel_comments'):
        op.create_table('reel_comments',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('reel_id', sa.UUID(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['reel_id'], ['reels.id'], name=op.f('fk_reel_comments_reel_id_reels'), ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_reel_comments_user_id_users'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_reel_comments'))
        )

    if not _table_exists(conn, 'reel_likes'):
        op.create_table('reel_likes',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('reel_id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['reel_id'], ['reels.id'], name=op.f('fk_reel_likes_reel_id_reels'), ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_reel_likes_user_id_users'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_reel_likes')),
        sa.UniqueConstraint('user_id', 'reel_id', name='uq_reel_likes_user_reel')
        )

    # ── New columns on existing tables (only add if absent) ─────────────────
    if not _column_exists(conn, 'articles', 'is_pinned'):
        op.add_column('articles', sa.Column('is_pinned', sa.Boolean(), server_default=sa.text('false'), nullable=False))
    if not _column_exists(conn, 'articles', 'ai_summary'):
        op.add_column('articles', sa.Column('ai_summary', sa.Text(), nullable=True))
    if not _column_exists(conn, 'articles', 'audio_url'):
        op.add_column('articles', sa.Column('audio_url', sa.String(length=1000), nullable=True))

    if not _column_exists(conn, 'bookmarks', 'reel_id'):
        op.add_column('bookmarks', sa.Column('reel_id', sa.UUID(), nullable=True))
        op.create_foreign_key(op.f('fk_bookmarks_reel_id_reels'), 'bookmarks', 'reels', ['reel_id'], ['id'], ondelete='CASCADE')

    if not _column_exists(conn, 'notifications', 'scheduled_at'):
        op.add_column('notifications', sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True))
    if not _column_exists(conn, 'notifications', 'is_sent'):
        op.add_column('notifications', sa.Column('is_sent', sa.Boolean(), server_default=sa.text('false'), nullable=False))

    if not _column_exists(conn, 'users', 'preferences'):
        op.add_column('users', sa.Column('preferences', sa.JSON(), nullable=True))
    if not _column_exists(conn, 'users', 'reading_history'):
        op.add_column('users', sa.Column('reading_history', sa.JSON(), nullable=True))
    if not _column_exists(conn, 'users', 'onboarding_completed'):
        op.add_column('users', sa.Column('onboarding_completed', sa.Boolean(), server_default=sa.text('false'), nullable=False))

    # ── Index/constraint recreation (safe even if already applied) ───────────
    op.execute("DROP INDEX IF EXISTS uq_articles_source_url")
    op.execute("ALTER TABLE articles DROP CONSTRAINT IF EXISTS uq_articles_source_url")
    if not _index_exists(conn, 'articles', 'ix_articles_source_url'):
        op.create_index(op.f('ix_articles_source_url'), 'articles', ['source_url'], unique=True)

    op.execute("DROP INDEX IF EXISTS uq_categories_slug")
    op.execute("ALTER TABLE categories DROP CONSTRAINT IF EXISTS uq_categories_slug")
    if not _index_exists(conn, 'categories', 'ix_categories_slug'):
        op.create_index(op.f('ix_categories_slug'), 'categories', ['slug'], unique=True)

    op.execute("DROP INDEX IF EXISTS uq_device_tokens_fcm_token")
    op.execute("ALTER TABLE device_tokens DROP CONSTRAINT IF EXISTS uq_device_tokens_fcm_token")
    if not _index_exists(conn, 'device_tokens', 'ix_device_tokens_fcm_token'):
        op.create_index(op.f('ix_device_tokens_fcm_token'), 'device_tokens', ['fcm_token'], unique=True)

    op.execute("DROP INDEX IF EXISTS uq_users_email")
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS uq_users_email")
    if not _index_exists(conn, 'users', 'ix_users_email'):
        op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.create_index('ix_users_email', 'users', ['email'], unique=False)
    op.create_unique_constraint('uq_users_email', 'users', ['email'])
    op.drop_column('users', 'onboarding_completed')
    op.drop_column('users', 'reading_history')
    op.drop_column('users', 'preferences')
    op.drop_column('notifications', 'is_sent')
    op.drop_column('notifications', 'scheduled_at')
    op.drop_index(op.f('ix_device_tokens_fcm_token'), table_name='device_tokens')
    op.create_index('ix_device_tokens_fcm_token', 'device_tokens', ['fcm_token'], unique=False)
    op.create_unique_constraint('uq_device_tokens_fcm_token', 'device_tokens', ['fcm_token'])
    op.drop_index(op.f('ix_categories_slug'), table_name='categories')
    op.create_index('ix_categories_slug', 'categories', ['slug'], unique=False)
    op.create_unique_constraint('uq_categories_slug', 'categories', ['slug'])
    op.drop_constraint(op.f('fk_bookmarks_reel_id_reels'), 'bookmarks', type_='foreignkey')
    op.drop_column('bookmarks', 'reel_id')
    op.drop_index(op.f('ix_articles_source_url'), table_name='articles')
    op.create_index('ix_articles_source_url', 'articles', ['source_url'], unique=False)
    op.create_unique_constraint('uq_articles_source_url', 'articles', ['source_url'])
    op.drop_column('articles', 'audio_url')
    op.drop_column('articles', 'ai_summary')
    op.drop_column('articles', 'is_pinned')
    op.drop_table('reel_likes')
    op.drop_table('reel_comments')
    op.drop_table('article_reactions')
    op.drop_table('article_comments')
    op.drop_index(op.f('ix_reels_youtube_video_id'), table_name='reels')
    op.drop_table('reels')
    op.drop_table('followed_channels')
    # ### end Alembic commands ###
