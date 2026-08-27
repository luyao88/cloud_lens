-- ======================
-- 用户表（支持第三方登录 + 后期邮箱密码）
-- ======================
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- 登录方式
  provider TEXT NOT NULL,               -- 'github' | 'google' | 'email'
  provider_id TEXT,                     -- 第三方唯一ID（邮箱登录时为邮箱地址）

  -- 用户信息
  email TEXT,
  username TEXT,
  avatar_url TEXT,

  -- 邮箱密码登录用（OAuth 用户可为空）
  password_hash TEXT,

  -- 上传设置
  default_album_id INTEGER,              -- 默认上传相册（NULL 为未分组）

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(provider, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);


-- ======================
-- 用户登录方式关联表（一个用户可绑定多种登录方式）
-- ======================
CREATE TABLE IF NOT EXISTS user_auth_methods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  provider TEXT NOT NULL,               -- 'email' | 'github' | 'google' | 'gitee'
  provider_id TEXT NOT NULL,            -- 邮箱地址或第三方唯一ID
  email TEXT,                           -- 该登录方式关联的邮箱（可空）
  password_hash TEXT,                   -- 仅 provider='email' 时有值
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, provider_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auth_methods_user ON user_auth_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_methods_email ON user_auth_methods(email);


-- ======================
-- 图片表
-- ======================
CREATE TABLE IF NOT EXISTS images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  imgur_id TEXT,                          -- Imgur 图片ID（如 abc123）
  imgur_url TEXT NOT NULL,
  delete_hash TEXT,                     -- Imgur 删除用
  filename TEXT,
  size INTEGER,
  tags TEXT,                            -- 标签（逗号分隔，可空）
  album_id INTEGER,                     -- 所属相册（NULL 为未分组）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_images_user_id ON images(user_id);
CREATE INDEX IF NOT EXISTS idx_images_imgur_id ON images(imgur_id);
CREATE INDEX IF NOT EXISTS idx_images_album_id ON images(album_id);

-- 已有数据库升级用（新库无需执行，CREATE TABLE IF NOT EXISTS 已包含新列）：
-- ALTER TABLE images ADD COLUMN imgur_id TEXT;
-- ALTER TABLE images ADD COLUMN tags TEXT;
-- ALTER TABLE images ADD COLUMN album_id INTEGER;
-- ALTER TABLE users ADD COLUMN default_album_id INTEGER;


-- ======================
-- 相册表（支持嵌套，parent_id 自引用）
-- ======================
CREATE TABLE IF NOT EXISTS albums (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,                    -- 相册名（同一父级下唯一由应用层保证）
  parent_id INTEGER,                     -- 父相册ID（NULL 为顶级相册）
  cover_image_id INTEGER,                -- 自定义封面图片ID（NULL 时回退为相册内最新一张）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_albums_user_id ON albums(user_id);
CREATE INDEX IF NOT EXISTS idx_albums_parent_id ON albums(parent_id);

-- 已有数据库升级用（新库无需执行，CREATE TABLE IF NOT EXISTS 已包含新列）：
-- ALTER TABLE albums ADD COLUMN cover_image_id INTEGER;


-- ======================
-- 会话表（简单版，用 Cookie + Session）
-- ======================
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,                  -- session token
  user_id INTEGER NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);


-- ======================
-- 邮箱验证码表
-- ======================
CREATE TABLE IF NOT EXISTS verification_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL,             -- 'register' | 'login'
  expires_at DATETIME NOT NULL,
  used INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_verify_email ON verification_codes(email);


-- ======================
-- 接口限流表（固定窗口计数）
-- 用于验证码发送/校验、登录失败等接口的暴力破解与轰炸防护
-- 已部署的线上库需手动执行这一段：
--   wrangler d1 execute cloud_lens_data --remote --file=cloud_lens_data.sql
-- ======================
CREATE TABLE IF NOT EXISTS api_rate_limits (
  key TEXT PRIMARY KEY,                 -- 限流维度，如 `vc:xxx@yy.com`、`login:xxx@yy.com`
  count INTEGER NOT NULL DEFAULT 1,
  expires_at DATETIME NOT NULL          -- 窗口截止时间（ISO 字符串，UTC）
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_expires ON api_rate_limits(expires_at);


-- ======================
-- OAuth state 表（防 CSRF，跨域名部署兜底）
-- 入口把 state 写入此表，回调侧消费（一次性）；TTL 10 分钟由代码清理
-- 与 api_rate_limits 同为线上必跑迁移
-- ======================
CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);