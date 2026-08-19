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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_images_user_id ON images(user_id);
CREATE INDEX IF NOT EXISTS idx_images_imgur_id ON images(imgur_id);

-- 已有数据库升级用（新库无需执行，CREATE TABLE IF NOT EXISTS 已包含新列）：
-- ALTER TABLE images ADD COLUMN imgur_id TEXT;
-- ALTER TABLE images ADD COLUMN tags TEXT;


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