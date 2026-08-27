<template>
  <section class="Profile">
    <!-- 加载中 -->
    <div v-if="loading" class="state-tip">加载中...</div>

    <!-- 未登录门禁 -->
    <div v-else-if="!user" class="auth-gate">
      <div class="gate-card">
        <div class="gate-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h2>登录后查看您的相册</h2>
        <p>我的相册展示您的上传图片与视频，仅自己可见</p>
        <button class="gate-btn" @click="authOpen = true">去登录</button>
      </div>
    </div>

    <template v-else>
      <!-- 个人信息卡 -->
      <div class="profile-card">
        <div class="profile-banner"></div>
        <div class="profile-body">
          <div class="profile-avatar-wrap">
            <img v-if="user.avatar_url" :src="avatarUrl" :alt="user.username" class="profile-avatar" />
            <div v-else class="profile-avatar profile-avatar-default">{{ avatarLetter }}</div>
          </div>
          <div class="profile-meta">
            <div class="profile-name-row">
              <h1 class="profile-name">{{ user.username }}</h1>
            </div>
            <div class="profile-email-row">
              <p class="profile-email">{{ user.email || '未绑定邮箱' }}</p>
              <span v-if="hasEmailBound" class="verified-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                已验证
              </span>
            </div>
            <div v-if="user.auth_methods?.length" class="auth-methods">
              <span v-for="m in user.auth_methods" :key="m.provider" class="auth-method-tag">{{ { email: '邮箱', github: 'GitHub', google: 'Google', gitee: 'Gitee' }[m.provider] || m.provider }}</span>
            </div>
          </div>
          <div class="profile-stats">
            <div class="stat">
              <span class="stat-num">{{ stats.total }}</span>
              <span class="stat-label">图片</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat">
              <span class="stat-num">{{ realAlbums.length }}</span>
              <span class="stat-label">相册</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat">
              <span class="stat-num">{{ formatSize(stats.totalSize) }}</span>
              <span class="stat-label">占用空间</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 实体相册详情视图（真实相册 / 未分组） -->
      <div v-if="activeAlbumId !== null" class="album-detail">
        <div class="detail-head">
          <button class="back-btn" @click="closeRealAlbum">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            返回相册
          </button>
          <div class="detail-title">
            <h2>{{ currentAlbum ? currentAlbum.name : '未分组' }}</h2>
            <span>
              {{ albumImages.length }} 个文件
              <template v-if="currentAlbum && childAlbums.length"> · {{ childAlbums.length }} 个子相册</template>
              <template v-if="currentAlbum && currentAlbum.id === defaultAlbumId"> · 默认上传相册</template>
            </span>
          </div>
          <div class="detail-actions">
            <template v-if="batchMode">
              <button class="btn ghost" @click="toggleSelectAll">{{ isAllSelected ? '取消全选' : '全选' }}</button>
              <button class="btn primary" :disabled="!selectedIds.size || moving" @click="openBatchMoveDialog">
                {{ moving ? '移动中...' : `批量移动 (${selectedIds.size})` }}
              </button>
              <button class="btn danger" :disabled="!selectedIds.size || batchDeleting" @click="openBatchDeleteDialog">
                {{ batchDeleting ? '删除中...' : '批量删除' }}
              </button>
              <button class="btn ghost" @click="exitBatchMode">退出</button>
            </template>
            <template v-else>
              <button v-if="currentAlbum" class="btn ghost" :disabled="settingDefault || currentAlbum.id === defaultAlbumId" @click="setDefaultFromDetail">
                {{ currentAlbum.id === defaultAlbumId ? '已是默认' : '设为默认' }}
              </button>
              <button v-if="currentAlbum" class="btn ghost" @click="openAlbumDialog('rename')">重命名</button>
              <button v-if="currentAlbum" class="btn ghost" @click="openDeleteAlbumDialog">删除相册</button>
              <button v-if="currentAlbum" class="btn primary" @click="openAlbumDialog('create-child')">＋ 新建子相册</button>
              <button class="btn ghost" :disabled="!albumImages.length" @click="enterBatchMode">批量管理</button>
            </template>
          </div>
        </div>

        <!-- 面包屑 -->
        <div v-if="currentAlbum" class="album-breadcrumb">
          <button class="crumb" @click="closeRealAlbum">我的相册</button>
          <template v-if="parentAlbum">
            <span class="crumb-sep">/</span>
            <button class="crumb" @click="openRealAlbum(parentAlbum.id)">{{ parentAlbum.name }}</button>
          </template>
          <span class="crumb-sep">/</span>
          <span class="crumb current">{{ currentAlbum.name }}</span>
        </div>

        <!-- 子相册 -->
        <div v-if="childAlbums.length" class="child-albums">
          <button v-for="ca in childAlbums" :key="ca.id" class="child-album-card" @click="openRealAlbum(ca.id)">
            <div class="child-album-cover">
              <img v-if="ca.cover_url" :src="coverUrl(ca.cover_url)" loading="lazy" :alt="ca.name" />
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            </div>
            <div class="child-album-meta">
              <span class="child-album-name">{{ ca.name }}</span>
              <span class="child-album-count">{{ ca.image_count }} 个文件</span>
            </div>
          </button>
        </div>

        <!-- 图片网格 -->
        <div v-if="albumLoading" class="state-tip">加载中...</div>
        <div v-else-if="albumImages.length" class="image-grid" :class="{ 'batch-mode': batchMode }">
          <div class="image-card" :class="{ selected: selectedIds.has(img.id) }" v-for="img in albumImages" :key="img.id">
            <div class="thumb-wrap" @click="batchMode ? toggleSelect(img) : openPreview(img, albumImages)">
              <video v-if="isVideo(img)" class="thumb" :src="fileUrl(img)" muted preload="metadata" playsinline @loadeddata="onThumbLoad"></video>
              <img v-else class="thumb" :src="fileUrl(img)" loading="lazy" :alt="img.filename || ''" @load="onThumbLoad" />
              <span v-if="isVideo(img)" class="video-badge">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                视频
              </span>
              <div v-if="batchMode" class="select-checkbox" :class="{ checked: selectedIds.has(img.id) }" @click.stop>
                <svg v-if="selectedIds.has(img.id)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div v-else class="thumb-actions" @click.stop>
                <button class="action-btn" title="复制链接" @click="copyLink(img)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </button>
                <button class="action-btn" title="移动到相册" @click="openMoveDialog(img)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 4h16v16H4z" />
                    <path d="M4 4v7h16" />
                    <path d="M12 12v6" />
                    <path d="m9 15 3-3 3 3" />
                  </svg>
                </button>
                <button class="action-btn" title="编辑标签" @click="openTagDialog(img)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
                    <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
                  </svg>
                </button>
                <button v-if="currentAlbum" class="action-btn star-btn" :class="{ active: currentAlbum.cover_image_id === img.id }" :title="currentAlbum.cover_image_id === img.id ? '取消相册封面' : '设为相册封面'" @click="setCoverImage(img)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </button>
                <button class="action-btn danger" title="删除" @click="openDeleteDialog(img)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
            <div class="image-caption">
              <p class="caption-name" :title="img.filename || ''">{{ img.filename || '未命名' }}</p>
              <p class="caption-meta">
                <span v-if="tagList(img).length" class="caption-tags">
                  <span class="tag" v-for="t in tagList(img)" :key="t">{{ t }}</span>
                </span>
                <span>{{ formatDate(img) }} · {{ formatSize(img.size) }}</span>
              </p>
            </div>
          </div>
        </div>
        <div v-else class="state-tip">{{ currentAlbum ? '该相册暂无图片，' : '暂无未分组图片，' }}<router-link to="/" class="link">去上传</router-link></div>
      </div>

      <!-- 相册详情视图 -->
      <div v-else-if="activeAlbum" class="album-detail">
        <div class="detail-head">
          <button
            class="back-btn"
            @click="
              exitBatchMode();
              activeKey = '';
            "
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            返回相册
          </button>
          <div class="detail-title">
            <h2>{{ activeAlbum.name }}</h2>
            <span>{{ activeAlbum.images.length }} 个文件 · {{ formatSize(albumSize(activeAlbum)) }}</span>
          </div>
          <div class="detail-actions">
            <template v-if="batchMode">
              <button class="btn ghost" @click="toggleSelectAll">
                {{ isAllSelected ? '取消全选' : '全选' }}
              </button>
              <button class="btn primary" :disabled="!selectedIds.size || moving" @click="openBatchMoveDialog">
                {{ moving ? '移动中...' : `批量移动 (${selectedIds.size})` }}
              </button>
              <button class="btn ghost" :disabled="!selectedIds.size || batchSaving" @click="openBatchDialog">
                {{ batchSaving ? '保存中...' : `批量编辑标签 (${selectedIds.size})` }}
              </button>
              <button class="btn danger" :disabled="!selectedIds.size || batchDeleting" @click="openBatchDeleteDialog">
                {{ batchDeleting ? '删除中...' : '批量删除' }}
              </button>
              <button class="btn ghost" @click="exitBatchMode">退出</button>
            </template>
            <template v-else>
              <button class="btn ghost" :disabled="!activeAlbum.images.length" @click="enterBatchMode">批量管理</button>
            </template>
          </div>
        </div>

        <div v-if="activeAlbum.images.length" class="image-grid" :class="{ 'batch-mode': batchMode }">
          <div class="image-card" :class="{ selected: selectedIds.has(img.id) }" v-for="img in activeAlbum.images" :key="img.id">
            <div class="thumb-wrap" @click="batchMode ? toggleSelect(img) : openPreview(img)">
              <video v-if="isVideo(img)" class="thumb" :src="fileUrl(img)" muted preload="metadata" playsinline @loadeddata="onThumbLoad"></video>
              <img v-else class="thumb" :src="fileUrl(img)" loading="lazy" :alt="img.filename || ''" @load="onThumbLoad" />
              <span v-if="isVideo(img)" class="video-badge">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                视频
              </span>
              <div v-if="batchMode" class="select-checkbox" :class="{ checked: selectedIds.has(img.id) }" @click.stop>
                <svg v-if="selectedIds.has(img.id)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div v-else class="thumb-actions" @click.stop>
                <button class="action-btn" title="复制链接" @click="copyLink(img)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </button>
                <button class="action-btn" title="移动到相册" @click="openMoveDialog(img)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 4h16v16H4z" />
                    <path d="M4 4v7h16" />
                    <path d="M12 12v6" />
                    <path d="m9 15 3-3 3 3" />
                  </svg>
                </button>
                <button class="action-btn" title="编辑标签" @click="openTagDialog(img)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
                    <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
                  </svg>
                </button>
                <button class="action-btn danger" title="删除" @click="openDeleteDialog(img)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
            <div class="image-caption">
              <p class="caption-name" :title="img.filename || ''">{{ img.filename || '未命名' }}</p>
              <p class="caption-meta">
                <span v-if="tagList(img).length" class="caption-tags">
                  <span class="tag" v-for="t in tagList(img)" :key="t">{{ t }}</span>
                </span>
                <span>{{ formatDate(img) }} · {{ formatSize(img.size) }}</span>
              </p>
            </div>
          </div>
        </div>
        <div v-else class="state-tip">该相册已无内容</div>
      </div>

      <!-- 相册列表视图 -->
      <template v-else>
        <div class="albums-head">
          <h2 class="albums-title">我的相册</h2>
        </div>
        <div class="tabs">
          <button class="tab" :class="{ active: groupMode === 'album' }" @click="groupMode = 'album'">我的相册</button>
          <button class="tab" :class="{ active: groupMode === 'time' }" @click="groupMode = 'time'">按时间</button>
          <button class="tab" :class="{ active: groupMode === 'tag' }" @click="groupMode = 'tag'">按标签</button>
        </div>

        <!-- 实体相册网格 -->
        <template v-if="groupMode === 'album'">
          <div class="real-album-grid">
            <button class="real-album-card is-new" @click="openAlbumDialog('create')">
              <div class="real-album-cover is-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  <path d="M18 3v6" />
                  <path d="M15 6h6" />
                </svg>
              </div>
              <div class="real-album-info">
                <p class="real-album-name">新建相册</p>
                <p class="real-album-meta">创建相册整理图片</p>
              </div>
            </button>
            <button v-for="a in topLevelAlbums" :key="a.id" class="real-album-card" @click="openRealAlbum(a.id)">
              <div class="real-album-cover">
                <img v-if="a.cover_url" class="cover-img" :src="coverUrl(a.cover_url)" loading="lazy" :alt="a.name" @load="onThumbLoad" />
                <div v-else class="is-empty">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                </div>
                <span v-if="a.id === defaultAlbumId" class="default-album-badge">默认</span>
              </div>
              <div class="real-album-info">
                <p class="real-album-name" :title="a.name">{{ a.name }}</p>
                <p class="real-album-meta">
                  {{ a.image_count }} 个文件<template v-if="childCount(a.id)"> · {{ childCount(a.id) }} 个子相册</template>
                </p>
              </div>
            </button>
            <button class="real-album-card" @click="openRealAlbum(0)">
              <div class="real-album-cover is-empty is-ungrouped">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 7h.01" />
                  <path d="M7 13v.01" />
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M21 8v8a2 2 0 0 1-2 2h-6.83" />
                  <path d="m9 11 1.5 1.5" />
                  <path d="m13 9 2.5 2.5" />
                </svg>
              </div>
              <div class="real-album-info">
                <p class="real-album-name">未分组</p>
                <p class="real-album-meta">{{ ungroupedCount }} 个文件</p>
              </div>
            </button>
          </div>
        </template>

        <!-- 按时间 / 按标签分组网格 -->
        <template v-else>
          <div v-if="albums.length" class="album-grid">
            <div class="album-card" v-for="album in albums" :key="album.key" @click="activeKey = album.key">
              <div class="cover-stack" :class="`cover-count-${Math.min(album.images.length, 3)}`">
                <div class="cover-item" v-for="img in album.images.slice(0, 3)" :key="img.id">
                  <video v-if="isVideo(img)" class="cover-media" :src="fileUrl(img)" muted preload="metadata" playsinline></video>
                  <img v-else class="cover-media" :src="fileUrl(img)" loading="lazy" :alt="album.name" />
                </div>
                <span class="cover-badge">{{ album.images.length }}</span>
              </div>
              <div class="album-info">
                <p class="album-name" :title="album.name">{{ album.name }}</p>
                <p class="album-meta">{{ album.images.length }} 个文件 · {{ formatSize(albumSize(album)) }}</p>
              </div>
            </div>
          </div>
          <div v-else class="state-tip">暂无上传记录，<router-link to="/" class="link">去上传</router-link> 第一张图片吧</div>

          <div v-if="hasMore" class="load-more">
            <button class="load-more-btn" :disabled="loadingMore" @click="loadMore">
              {{ loadingMore ? '加载中...' : '加载更多' }}
            </button>
          </div>
        </template>
      </template>
    </template>

    <!-- 登录弹窗 -->
    <AuthDialog v-model:open="authOpen" @success="onLoginSuccess" />

    <!-- 编辑标签弹窗 -->
    <Dialog :open="tagOpen" @update:open="(v: boolean) => (tagOpen = v)">
      <DialogContent class="max-w-md">
        <div class="flex flex-col gap-1.5 text-center">
          <DialogTitle>编辑标签</DialogTitle>
          <DialogDescription> 为「{{ tagTarget?.filename || '未命名' }}」设置标签，多个标签用英文逗号分隔；标签模式下将按标签自动归入相册。 </DialogDescription>
        </div>
        <input v-model="tagInput" class="dialog-input" type="text" placeholder="例如：风景, 旅行" @keyup.enter="saveTags" />
        <div class="dialog-footer">
          <button class="btn ghost" @click="tagOpen = false">取消</button>
          <button class="btn primary" :disabled="savingTag" @click="saveTags">{{ savingTag ? '保存中...' : '保存' }}</button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- 批量编辑标签弹窗 -->
    <Dialog :open="batchDialogOpen" @update:open="(v: boolean) => (batchDialogOpen = v)">
      <DialogContent class="max-w-md">
        <div class="flex flex-col gap-1.5 text-center">
          <DialogTitle>批量编辑标签</DialogTitle>
          <DialogDescription> 将替换 {{ selectedIds.size }} 张图片的标签，多个标签用英文逗号分隔；留空表示清空所有标签。 </DialogDescription>
        </div>
        <input v-model="batchTagInput" class="dialog-input" type="text" placeholder="例如：风景, 旅行" @keyup.enter="saveBatchTags" />
        <div class="dialog-footer">
          <button class="btn ghost" @click="batchDialogOpen = false">取消</button>
          <button class="btn primary" :disabled="batchSaving" @click="saveBatchTags">{{ batchSaving ? '保存中...' : '保存' }}</button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- 删除确认弹窗 -->
    <Dialog :open="deleteOpen" @update:open="(v: boolean) => (deleteOpen = v)">
      <DialogContent class="max-w-md">
        <div class="flex flex-col gap-1.5 text-center">
          <DialogTitle>删除图片</DialogTitle>
          <DialogDescription> 确定删除「{{ deleteTarget?.filename || '未命名' }}」吗？删除后将同时移除云端源文件与上传记录，不可恢复。 </DialogDescription>
        </div>
        <div class="dialog-footer">
          <button class="btn ghost" @click="deleteOpen = false">取消</button>
          <button class="btn danger" :disabled="deleting" @click="confirmDelete">{{ deleting ? '删除中...' : '确认删除' }}</button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- 新建/重命名相册弹窗 -->
    <Dialog :open="albumDialogOpen" @update:open="(v: boolean) => (albumDialogOpen = v)">
      <DialogContent class="max-w-md">
        <div class="flex flex-col gap-1.5 text-center">
          <DialogTitle>{{ albumDialogTitle }}</DialogTitle>
          <DialogDescription>{{ albumDialogDesc }}</DialogDescription>
        </div>
        <input v-model="albumNameInput" class="dialog-input" type="text" placeholder="请输入相册名称（最多 50 字）" maxlength="50" @keyup.enter="submitAlbumDialog" />
        <div class="dialog-footer">
          <button class="btn ghost" @click="albumDialogOpen = false">取消</button>
          <button class="btn primary" :disabled="albumSubmitting" @click="submitAlbumDialog">
            {{ albumSubmitting ? '保存中...' : albumDialogMode === 'rename' ? '保存' : '创建' }}
          </button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- 删除相册确认弹窗 -->
    <Dialog :open="deleteAlbumOpen" @update:open="(v: boolean) => (deleteAlbumOpen = v)">
      <DialogContent class="max-w-md">
        <div class="flex flex-col gap-1.5 text-center">
          <DialogTitle>删除相册</DialogTitle>
          <DialogDescription> 确定删除「{{ currentAlbum?.name }}」吗？相册内的图片将移入未分组，子相册将提升为顶级相册，此操作不可恢复。 </DialogDescription>
        </div>
        <div class="dialog-footer">
          <button class="btn ghost" @click="deleteAlbumOpen = false">取消</button>
          <button class="btn danger" :disabled="deletingAlbum" @click="confirmDeleteAlbum">{{ deletingAlbum ? '删除中...' : '确认删除' }}</button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- 移动到相册弹窗 -->
    <Dialog :open="moveOpen" @update:open="(v: boolean) => (moveOpen = v)">
      <DialogContent class="max-w-md">
        <div class="flex flex-col gap-1.5 text-center">
          <DialogTitle>移动到相册</DialogTitle>
          <DialogDescription>
            <template v-if="moveTargetIds.length > 1">将选中的 {{ moveTargetIds.length }} 张图片移动到指定相册</template>
            <template v-else>将「{{ moveTargetName }}」移动到指定相册</template>
          </DialogDescription>
        </div>
        <select v-model="moveAlbumValue" class="dialog-input">
          <option value="none">未分组</option>
          <option v-for="opt in albumTreeOptions" :key="opt.id" :value="String(opt.id)">{{ opt.label }}</option>
        </select>
        <div class="dialog-footer">
          <button class="btn ghost" @click="moveOpen = false">取消</button>
          <button class="btn primary" :disabled="moving" @click="confirmMove">{{ moving ? '移动中...' : '移动' }}</button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- 批量删除确认弹窗 -->
    <Dialog :open="batchDeleteOpen" @update:open="(v: boolean) => (batchDeleteOpen = v)">
      <DialogContent class="max-w-md">
        <div class="flex flex-col gap-1.5 text-center">
          <DialogTitle>批量删除</DialogTitle>
          <DialogDescription> 确定删除选中的 {{ selectedIds.size }} 张图片吗？删除后将同时移除云端源文件与上传记录，不可恢复。 </DialogDescription>
        </div>
        <div class="dialog-footer">
          <button class="btn ghost" @click="batchDeleteOpen = false">取消</button>
          <button class="btn danger" :disabled="batchDeleting" @click="confirmBatchDelete">{{ batchDeleting ? '删除中...' : '确认删除' }}</button>
        </div>
      </DialogContent>
    </Dialog>
  </section>
</template>
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import AuthDialog from '@/components/AuthDialog/AuthDialog.vue';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast/use-toast';

const { toast } = useToast();

/** 登录成功后刷新本页并通知 Header 同步 */
async function onLoginSuccess() {
  await init();
  window.dispatchEvent(new Event('auth:changed'));
}

// 图片记录（与 /api/images 返回字段一致）
interface ImageRecord {
  id: number;
  imgur_id: string | null;
  imgur_url: string;
  filename: string | null;
  size: number | null;
  tags: string | null;
  album_id?: number | null;
  created_at: string;
}

// 相册（时间模式按月份，标签模式按标签）
interface Album {
  key: string;
  name: string;
  images: ImageRecord[];
}

// 实体相册（数据库 albums 表记录）
interface RealAlbum {
  id: number;
  name: string;
  parent_id: number | null;
  cover_image_id: number | null;
  image_count: number;
  cover_url: string | null;
  created_at: string;
}

const PAGE_SIZE = 100;
const UNTAGGED_KEY = '__untagged__';
// IPFS节点（与 Home 保持一致）
const nodeHost = import.meta.env.VITE_IMG_API_URL || location.origin;
// 视频扩展名判定（与 functions/v2/[vkey].js 一致）
const VIDEO_RE = /\.(mp4|webm|avi|mov|mkv|flv|wmv|mpeg|mpg)$/i;

// 页面状态
const loading = ref(true);
const user = ref<{ username: string; avatar_url: string | null; email: string | null; auth_methods?: { provider: string; email: string | null }[] } | null>(null);
const authOpen = ref(false);
const images = ref<ImageRecord[]>([]);
const stats = ref<{ total: number; totalSize: number }>({ total: 0, totalSize: 0 });
const groupMode = ref<'album' | 'time' | 'tag'>('album');
const activeKey = ref('');
const loadingMore = ref(false);

// ===== 实体相册 =====
const realAlbums = ref<RealAlbum[]>([]);
const ungroupedCount = ref(0);
const defaultAlbumId = ref<number | null>(null);
// null=列表视图；数字=相册详情；0=未分组详情
const activeAlbumId = ref<number | null>(null);
const albumImages = ref<ImageRecord[]>([]);
const albumLoading = ref(false);
// 相册图片请求序号：丢弃切换相册后晚到的过期响应
let albumFetchSeq = 0;
// 主列表请求序号：自动刷新(offset=0)与 loadMore 并发时只保留最新响应
let imagesFetchSeq = 0;

const avatarLetter = computed(() => (user.value?.username || '?')[0].toUpperCase());
// 头像 URL：统一走 /v2/ 代理，避免 i.imgur.com 国内直连失败
const avatarUrl = computed(() => {
  const url = user.value?.avatar_url || '';
  if (!url) return '';
  if (url.startsWith(`${nodeHost}/v2/`) || url.startsWith('data:')) return url;
  const fileId = url.split('/').pop();
  return fileId ? `${nodeHost}/v2/${fileId}` : url;
});
const hasEmailBound = computed(() => user.value?.auth_methods?.some((m) => m.provider === 'email') ?? false);

// ===== 工具函数 =====
const fileKey = (img: ImageRecord) => img.imgur_url.split('/').pop() || '';
const fileUrl = (img: ImageRecord) => `${nodeHost}/v2/${fileKey(img)}`;
// 相册封面 URL（cover_url 是 imgur 链接，同样走 /v2 代理）
const coverUrl = (url: string) => `${nodeHost}/v2/${url.split('/').pop() || ''}`;
const isVideo = (img: ImageRecord) => VIDEO_RE.test(fileKey(img));
const formatDate = (img: ImageRecord) => (img.created_at || '').slice(0, 10);
const tagList = (img: ImageRecord) =>
  (img.tags || '')
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean);
const albumSize = (album: Album) => album.images.reduce((sum, i) => sum + (i.size || 0), 0);

const formatSize = (bytes?: number | null) => {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${i === 0 || v >= 100 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
};

// ===== 分组 =====
// 时间模式：按 created_at 月份（YYYY-MM）分组；标签模式：按标签多对多分组，无标签归「未标记」
const albums = computed<Album[]>(() => {
  const map = new Map<string, Album>();
  if (groupMode.value === 'time') {
    for (const img of images.value) {
      const key = (img.created_at || '').slice(0, 7) || '未知时间';
      if (!map.has(key)) map.set(key, { key, name: key, images: [] });
      map.get(key)!.images.push(img);
    }
    // 列表本身按时间倒序，key 倒序即相册倒序
    return [...map.values()].sort((a, b) => b.key.localeCompare(a.key));
  }
  for (const img of images.value) {
    const tags = tagList(img);
    if (!tags.length) {
      if (!map.has(UNTAGGED_KEY)) map.set(UNTAGGED_KEY, { key: UNTAGGED_KEY, name: '未标记', images: [] });
      map.get(UNTAGGED_KEY)!.images.push(img);
      continue;
    }
    for (const t of tags) {
      if (!map.has(t)) map.set(t, { key: t, name: t, images: [] });
      map.get(t)!.images.push(img);
    }
  }
  // 按各相册最新上传时间倒序
  return [...map.values()].sort((a, b) => (b.images[0]?.created_at || '').localeCompare(a.images[0]?.created_at || ''));
});

const activeAlbum = computed(() => (activeKey.value ? albums.value.find((a) => a.key === activeKey.value) || null : null));
const hasMore = computed(() => images.value.length < stats.value.total);

// ===== 实体相册派生状态 =====
const topLevelAlbums = computed(() => realAlbums.value.filter((a) => !a.parent_id));
const childCount = (albumId: number) => realAlbums.value.filter((a) => a.parent_id === albumId).length;
const currentAlbum = computed(() => (activeAlbumId.value && activeAlbumId.value > 0 ? realAlbums.value.find((a) => a.id === activeAlbumId.value) || null : null));
const parentAlbum = computed(() => (currentAlbum.value?.parent_id ? realAlbums.value.find((a) => a.id === currentAlbum.value!.parent_id) || null : null));
const childAlbums = computed(() => realAlbums.value.filter((a) => a.parent_id === activeAlbumId.value));

// ===== 数据加载 =====
const fetchUser = async () => {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    user.value = data.user || null;
  } catch {
    user.value = null;
  }
};

const fetchImages = async (offset = 0) => {
  const seq = ++imagesFetchSeq;
  const res = await fetch(`/api/images?limit=${PAGE_SIZE}&offset=${offset}`);
  if (res.status === 401) {
    user.value = null;
    return;
  }
  const data = await res.json();
  if (!data.success) return;
  // 只应用最新一次请求的结果，避免 loadMore 与自动刷新并发时交错写入
  if (seq !== imagesFetchSeq) return;
  stats.value = data.stats || { total: 0, totalSize: 0 };
  if (offset === 0) {
    images.value = data.images;
  } else {
    // 追加时按 id 去重，避免两次请求间新上传导致重复
    const existed = new Set(images.value.map((i) => i.id));
    images.value = [...images.value, ...data.images.filter((i: ImageRecord) => !existed.has(i.id))];
  }
};

// ===== 实体相册 =====
const fetchAlbums = async () => {
  try {
    const res = await fetch('/api/albums');
    if (res.status === 401) return;
    const data = await res.json();
    if (data.success) {
      realAlbums.value = data.albums || [];
      ungroupedCount.value = data.ungrouped_count || 0;
      defaultAlbumId.value = data.default_album_id ?? null;
    } else {
      console.warn('fetchAlbums failed:', data.error || res.status);
    }
  } catch (e) {
    console.warn('fetchAlbums network error:', e);
  }
};

const fetchAlbumImages = async (albumId: number) => {
  const seq = ++albumFetchSeq;
  albumLoading.value = true;
  try {
    const res = await fetch(`/api/images?limit=500&album_id=${albumId}`);
    if (res.status === 401) {
      user.value = null;
      return;
    }
    const data = await res.json();
    // 快速切换相册时丢弃过期响应，避免慢请求覆盖当前相册
    if (seq !== albumFetchSeq || activeAlbumId.value !== albumId) return;
    if (data.success) albumImages.value = data.images || [];
  } catch {
    if (seq === albumFetchSeq && activeAlbumId.value === albumId) {
      albumImages.value = [];
      toast({ title: '加载失败', description: '网络错误，请稍后重试', variant: 'destructive' });
    }
  } finally {
    if (seq === albumFetchSeq) albumLoading.value = false;
  }
};

const openRealAlbum = async (albumId: number) => {
  activeKey.value = '';
  activeAlbumId.value = albumId;
  albumImages.value = [];
  // 换相册时退出批量模式并清空选中集，避免误操作上一相册中不可见的图片
  if (batchMode.value) exitBatchMode();
  await fetchAlbumImages(albumId);
};

const closeRealAlbum = () => {
  activeAlbumId.value = null;
  albumImages.value = [];
  if (batchMode.value) exitBatchMode();
};

// ===== 新建 / 重命名相册 =====
type AlbumDialogMode = 'create' | 'create-child' | 'rename';
const albumDialogOpen = ref(false);
const albumDialogMode = ref<AlbumDialogMode>('create');
const albumNameInput = ref('');
const albumSubmitting = ref(false);

const albumDialogTitle = computed(() => (albumDialogMode.value === 'rename' ? '重命名相册' : albumDialogMode.value === 'create-child' ? '新建子相册' : '新建相册'));

const albumDialogDesc = computed(() => {
  if (albumDialogMode.value === 'rename') return `修改「${currentAlbum.value?.name || ''}」的名称。`;
  if (albumDialogMode.value === 'create-child') return `在「${currentAlbum.value?.name || ''}」下创建子相册。`;
  return '创建顶级相册，上传时可选择将图片归入该相册。';
});

const openAlbumDialog = (mode: AlbumDialogMode) => {
  albumDialogMode.value = mode;
  albumNameInput.value = mode === 'rename' ? currentAlbum.value?.name || '' : '';
  albumDialogOpen.value = true;
};

const submitAlbumDialog = async () => {
  const name = albumNameInput.value.trim();
  if (!name || albumSubmitting.value) return;
  albumSubmitting.value = true;
  try {
    const isRename = albumDialogMode.value === 'rename';
    const res = await fetch(isRename ? `/api/albums/${activeAlbumId.value}` : '/api/albums', {
      method: isRename ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isRename ? { name } : { name, parent_id: albumDialogMode.value === 'create-child' ? activeAlbumId.value : null }),
    });
    const data = await res.json();
    if (!data.success) {
      toast({ title: isRename ? '保存失败' : '创建失败', description: data.error, variant: 'destructive' });
      return;
    }
    albumDialogOpen.value = false;
    await fetchAlbums();
    toast({ title: 'Tips', description: isRename ? '相册已重命名' : `已创建「${name}」` });
  } catch {
    toast({ title: '操作失败', description: '网络错误，请稍后重试', variant: 'destructive' });
  } finally {
    albumSubmitting.value = false;
  }
};

// ===== 删除相册 =====
const deleteAlbumOpen = ref(false);
const deletingAlbum = ref(false);

const openDeleteAlbumDialog = () => {
  deleteAlbumOpen.value = true;
};

const confirmDeleteAlbum = async () => {
  if (!currentAlbum.value || deletingAlbum.value) return;
  deletingAlbum.value = true;
  try {
    const res = await fetch(`/api/albums/${currentAlbum.value.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!data.success) {
      toast({ title: '删除失败', description: data.error, variant: 'destructive' });
      return;
    }
    deleteAlbumOpen.value = false;
    closeRealAlbum();
    await fetchAlbums();
    toast({ title: 'Tips', description: '相册已删除，图片已移入未分组' });
  } catch {
    toast({ title: '删除失败', description: '网络错误，请稍后重试', variant: 'destructive' });
  } finally {
    deletingAlbum.value = false;
  }
};

// ===== 移动图片到相册（单个 / 批量，含移入未分组） =====
// 相册树平铺为下拉选项（子相册缩进显示）
const albumTreeOptions = computed(() => {
  const byParent = new Map<number | null, RealAlbum[]>();
  for (const a of realAlbums.value) {
    const p = a.parent_id ?? null;
    if (!byParent.has(p)) byParent.set(p, []);
    byParent.get(p)!.push(a);
  }
  const out: { id: number; label: string }[] = [];
  const walk = (parent: number | null, depth: number) => {
    for (const a of byParent.get(parent) || []) {
      out.push({ id: a.id, label: `${'　'.repeat(depth)}${depth ? '└ ' : ''}${a.name}` });
      walk(a.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
});

const moveOpen = ref(false);
// 支持单张与批量：moveTargetIds 为待移动图片 id 列表
const moveTargetIds = ref<number[]>([]);
const moveTargetName = ref('');
const moveAlbumValue = ref<string>('none');
const moving = ref(false);

const openMoveDialog = (img: ImageRecord) => {
  moveTargetIds.value = [img.id];
  moveTargetName.value = img.filename || '未命名';
  // 默认选当前所在相册；未分组时停留在 none
  moveAlbumValue.value = img.album_id ? String(img.album_id) : 'none';
  moveOpen.value = true;
};

const openBatchMoveDialog = () => {
  if (!selectedIds.value.size) return;
  moveTargetIds.value = [...selectedIds.value];
  moveTargetName.value = '';
  moveAlbumValue.value = 'none';
  moveOpen.value = true;
};

const confirmMove = async () => {
  if (moving.value || !moveTargetIds.value.length) return;
  const target = moveAlbumValue.value === 'none' ? null : Number(moveAlbumValue.value);
  if (target !== null && (!Number.isInteger(target) || target <= 0)) return;
  moving.value = true;
  try {
    const results = await Promise.all(
      moveTargetIds.value.map((id) =>
        fetch(`/api/images/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ album_id: target }),
        })
          .then((r) => r.json())
          .catch(() => ({ success: false })),
      ),
    );
    const failed = results.filter((r: any) => !r.success).length;
    const okCount = moveTargetIds.value.length - failed;
    const idSet = new Set(moveTargetIds.value);
    // 实体相册详情视图：归属变化才从列表移除（未分组视图 activeAlbumId=0 对应 null）
    const currentViewAlbumId = activeAlbumId.value === 0 ? null : activeAlbumId.value;
    if (activeAlbumId.value !== null && target !== currentViewAlbumId) {
      albumImages.value = albumImages.value.filter((i) => !idSet.has(i.id));
    }
    // 同步全局列表的 album_id
    for (const img of images.value) {
      if (idSet.has(img.id)) img.album_id = target;
    }
    selectedIds.value = new Set();
    moveOpen.value = false;
    await fetchAlbums();
    if (failed) {
      toast({ title: '部分移动失败', description: `${failed} 张移动失败`, variant: 'destructive' });
    } else {
      toast({ title: 'Tips', description: `已移动 ${okCount} 张图片` });
    }
  } catch {
    toast({ title: '移动失败', description: '网络错误，请稍后重试', variant: 'destructive' });
  } finally {
    moving.value = false;
  }
};

// ===== 批量删除（实体相册详情 / 按时间 / 按标签通用） =====
const batchDeleteOpen = ref(false);
const batchDeleting = ref(false);

const openBatchDeleteDialog = () => {
  if (!selectedIds.value.size) return;
  batchDeleteOpen.value = true;
};

const confirmBatchDelete = async () => {
  if (batchDeleting.value || !selectedIds.value.size) return;
  batchDeleting.value = true;
  try {
    const ids = [...selectedIds.value];
    const results = await Promise.all(
      ids.map((id) =>
        fetch(`/api/images/${id}`, { method: 'DELETE' })
          .then((r) => r.json())
          .catch(() => ({ success: false })),
      ),
    );
    const failed = results.filter((r: any) => !r.success).length;
    const okIds = new Set(ids.filter((_, idx) => results[idx]?.success));
    let removedSize = 0;
    // 实体相册详情视图
    if (activeAlbumId.value !== null) {
      albumImages.value = albumImages.value.filter((i) => !okIds.has(i.id));
    }
    images.value = images.value.filter((i) => {
      if (okIds.has(i.id)) {
        removedSize += i.size || 0;
        return false;
      }
      return true;
    });
    stats.value = {
      total: Math.max(0, stats.value.total - okIds.size),
      totalSize: Math.max(0, stats.value.totalSize - removedSize),
    };
    selectedIds.value = new Set();
    batchDeleteOpen.value = false;
    exitBatchMode();
    // 按时间/按标签分组删空后自动回到相册列表（与单张删除一致）
    if (activeAlbum.value && !activeAlbum.value.images.length) activeKey.value = '';
    await fetchAlbums();
    if (failed) {
      toast({ title: '部分删除失败', description: `${failed} 张删除失败`, variant: 'destructive' });
    } else {
      toast({ title: 'Tips', description: `已删除 ${okIds.size} 张图片` });
    }
  } catch {
    toast({ title: '删除失败', description: '网络错误，请稍后重试', variant: 'destructive' });
    batchDeleteOpen.value = false;
  } finally {
    batchDeleting.value = false;
  }
};

// ===== 相册详情内设为默认上传相册 =====
const settingDefault = ref(false);
const setDefaultFromDetail = async () => {
  if (!currentAlbum.value || settingDefault.value) return;
  settingDefault.value = true;
  try {
    const res = await fetch('/api/albums/default', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ album_id: currentAlbum.value.id }),
    });
    const data = await res.json();
    if (!data.success) {
      toast({ title: '设置失败', description: data.error, variant: 'destructive' });
      return;
    }
    defaultAlbumId.value = data.default_album_id;
    toast({ title: 'Tips', description: '已设为默认上传相册' });
  } catch {
    toast({ title: '设置失败', description: '网络错误，请稍后重试', variant: 'destructive' });
  } finally {
    settingDefault.value = false;
  }
};

// ===== 设为相册封面（再次点击同一张则取消封面） =====
const settingCover = ref(false);
const setCoverImage = async (img: ImageRecord) => {
  if (!currentAlbum.value || settingCover.value) return;
  const isCurrentCover = currentAlbum.value.cover_image_id === img.id;
  settingCover.value = true;
  try {
    const res = await fetch(`/api/albums/${currentAlbum.value.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cover_image_id: isCurrentCover ? null : img.id }),
    });
    const data = await res.json();
    if (!data.success) {
      toast({ title: '设置失败', description: data.error, variant: 'destructive' });
      return;
    }
    await fetchAlbums();
    toast({ title: 'Tips', description: isCurrentCover ? '已取消相册封面' : '已设为相册封面' });
  } catch {
    toast({ title: '设置失败', description: '网络错误，请稍后重试', variant: 'destructive' });
  } finally {
    settingCover.value = false;
  }
};

const init = async () => {
  loading.value = true;
  images.value = [];
  stats.value = { total: 0, totalSize: 0 };
  activeKey.value = '';
  closeRealAlbum();
  realAlbums.value = [];
  ungroupedCount.value = 0;
  await fetchUser();
  if (user.value) {
    await Promise.all([fetchImages(0), fetchAlbums()]);
  }
  loading.value = false;
};

const loadMore = async () => {
  if (loadingMore.value) return;
  loadingMore.value = true;
  try {
    await fetchImages(images.value.length);
  } finally {
    loadingMore.value = false;
  }
};

onMounted(init);

// ===== 上传完成自动刷新 =====
// 监听全局 upload:saved 事件（useUploadManager.saveImage 成功后触发），
// 在 Profile 页面时自动刷新图片列表和相册统计，无需手动刷新。
let uploadSavedTimer: ReturnType<typeof setTimeout> | null = null;
const onUploadSaved = () => {
  // 防抖：短时间内多次上传只刷新一次
  if (uploadSavedTimer) clearTimeout(uploadSavedTimer);
  uploadSavedTimer = setTimeout(async () => {
    if (!user.value) return;
    await Promise.all([fetchImages(0), fetchAlbums()]);
    // 当前在相册详情视图中，也刷新相册内图片
    if (activeAlbumId.value !== null) await fetchAlbumImages(activeAlbumId.value);
  }, 800);
};
window.addEventListener('upload:saved', onUploadSaved);

// 监听全局 auth:changed 事件（头像/用户名更新后触发），刷新用户信息以同步头像
const onAuthChanged = () => { fetchUser(); };
window.addEventListener('auth:changed', onAuthChanged);

onUnmounted(() => {
  window.removeEventListener('upload:saved', onUploadSaved);
  window.removeEventListener('auth:changed', onAuthChanged);
  if (uploadSavedTimer) clearTimeout(uploadSavedTimer);
});

// ===== 预览（复用 ViewImage 灯箱） =====
declare const ViewImage: any;
const loadViewImage = () => {
  return new Promise<void>((resolve) => {
    if ((window as any).ViewImage) return resolve();
    const s = document.createElement('script');
    s.src = '/view-image.min.js';
    s.onload = () => resolve();
    document.head.appendChild(s);
  });
};

const openPreview = async (clicked: ImageRecord, source?: ImageRecord[]) => {
  const list = source || activeAlbum.value?.images || images.value;
  if (!list.length) return;
  await loadViewImage();
  // 构造 mock items，让 ViewImage 能通过 tagName 判断视频
  const mockItems = list.map((i) => ({
    tagName: isVideo(i) ? 'VIDEO' : 'IMG',
    src: fileUrl(i),
    href: fileUrl(i),
  }));
  ViewImage.displayWithVideo(
    list.map((i) => fileUrl(i)),
    fileUrl(clicked),
    mockItems,
    isVideo(clicked),
  );
};

// ===== 复制链接 =====
// 图片/视频加载完成后标记 loaded，触发淡入并停止骨架动画
const onThumbLoad = (e: Event) => {
  (e.target as HTMLElement)?.classList.add('loaded');
};

const copyLink = async (img: ImageRecord) => {
  const url = fileUrl(img);
  let ok = false;
  try {
    await navigator.clipboard.writeText(url);
    ok = true;
  } catch {
    const t = document.createElement('textarea');
    t.value = url;
    document.body.appendChild(t);
    t.select();
    ok = document.execCommand('copy');
    document.body.removeChild(t);
  }
  if (ok) toast({ title: 'Tips', description: '链接已复制' });
};

// ===== 编辑标签 =====
const tagOpen = ref(false);
const tagTarget = ref<ImageRecord | null>(null);
const tagInput = ref('');
const savingTag = ref(false);

const openTagDialog = (img: ImageRecord) => {
  tagTarget.value = img;
  tagInput.value = tagList(img).join(', ');
  tagOpen.value = true;
};

const saveTags = async () => {
  if (!tagTarget.value || savingTag.value) return;
  savingTag.value = true;
  try {
    const res = await fetch(`/api/images/${tagTarget.value.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: tagInput.value }),
    });
    const data = await res.json();
    if (!data.success) {
      toast({ title: '保存失败', description: data.error, variant: 'destructive' });
      return;
    }
    const idx = images.value.findIndex((i) => i.id === tagTarget.value!.id);
    if (idx > -1) images.value[idx] = data.image;
    // 标签模式下，当前相册可能已不包含该图片，回退到相册列表
    if (groupMode.value === 'tag' && activeAlbum.value && !activeAlbum.value.images.some((i) => i.id === data.image.id)) {
      activeKey.value = '';
    }
    tagOpen.value = false;
    toast({ title: 'Tips', description: '标签已更新' });
  } catch {
    toast({ title: '保存失败', description: '网络错误，请稍后重试', variant: 'destructive' });
  } finally {
    savingTag.value = false;
  }
};

// ===== 批量编辑标签 =====
const batchMode = ref(false);
const selectedIds = ref<Set<number>>(new Set());
const batchDialogOpen = ref(false);
const batchTagInput = ref('');
const batchSaving = ref(false);

// 当前批量操作可视图片集合：实体相册详情用 albumImages，按时间/按标签用 activeAlbum.images
const currentBatchImageIds = computed(() => {
  if (activeAlbumId.value !== null) return new Set(albumImages.value.map((i) => i.id));
  return new Set(activeAlbum.value?.images.map((i) => i.id) || []);
});
const isAllSelected = computed(() => currentBatchImageIds.value.size > 0 && selectedIds.value.size === currentBatchImageIds.value.size);

const enterBatchMode = () => {
  batchMode.value = true;
  selectedIds.value = new Set();
};

const exitBatchMode = () => {
  batchMode.value = false;
  selectedIds.value = new Set();
};

const toggleSelect = (img: ImageRecord) => {
  const next = new Set(selectedIds.value);
  if (next.has(img.id)) next.delete(img.id);
  else next.add(img.id);
  selectedIds.value = next;
};

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedIds.value = new Set();
  } else {
    selectedIds.value = new Set(currentBatchImageIds.value);
  }
};

const openBatchDialog = () => {
  if (!selectedIds.value.size) return;
  batchTagInput.value = '';
  batchDialogOpen.value = true;
};

const saveBatchTags = async () => {
  if (!selectedIds.value.size || batchSaving.value) return;
  batchSaving.value = true;
  try {
    const res = await fetch('/api/images/batch-tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...selectedIds.value], tags: batchTagInput.value }),
    });
    const data = await res.json();
    if (!data.success) {
      toast({ title: '保存失败', description: data.error, variant: 'destructive' });
      return;
    }
    // 本地更新已修改图片的 tags
    const tagStr = batchTagInput.value.trim();
    for (const id of selectedIds.value) {
      const idx = images.value.findIndex((i) => i.id === id);
      if (idx > -1) {
        images.value[idx] = { ...images.value[idx], tags: tagStr || null };
      }
    }
    // 标签模式下，如果当前相册的图片被清空了标签或标签变了，回退到相册列表
    if (groupMode.value === 'tag' && activeAlbum.value) {
      const albumKey = activeAlbum.value.key;
      const remaining = activeAlbum.value.images.filter((img) => {
        if (!selectedIds.value.has(img.id)) return true;
        const newTags = tagStr
          .split(/[,，]/)
          .map((t) => t.trim())
          .filter(Boolean);
        if (albumKey === UNTAGGED_KEY) return newTags.length === 0;
        return newTags.includes(albumKey);
      });
      const removedCount = activeAlbum.value.images.length - remaining.length;
      if (!remaining.length) {
        activeKey.value = '';
      } else if (removedCount > 0) {
        toast({
          title: 'Tips',
          description: `已更新 ${data.updated} 张图片的标签，${removedCount} 张已移至其他相册`,
        });
        batchDialogOpen.value = false;
        exitBatchMode();
        return;
      }
    }
    batchDialogOpen.value = false;
    toast({ title: 'Tips', description: `已更新 ${data.updated} 张图片的标签` });
    exitBatchMode();
  } catch {
    toast({ title: '保存失败', description: '网络错误，请稍后重试', variant: 'destructive' });
  } finally {
    batchSaving.value = false;
  }
};

// ===== 删除 =====
const deleteOpen = ref(false);
const deleteTarget = ref<ImageRecord | null>(null);
const deleting = ref(false);

const openDeleteDialog = (img: ImageRecord) => {
  deleteTarget.value = img;
  deleteOpen.value = true;
};

const confirmDelete = async () => {
  if (!deleteTarget.value || deleting.value) return;
  deleting.value = true;
  try {
    const res = await fetch(`/api/images/${deleteTarget.value.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!data.success) {
      toast({ title: '删除失败', description: data.error, variant: 'destructive' });
      deleteOpen.value = false;
      return;
    }
    const { id, size } = deleteTarget.value;
    images.value = images.value.filter((i) => i.id !== id);
    // 实体相册详情视图中同步移除并刷新相册统计
    if (activeAlbumId.value !== null) {
      albumImages.value = albumImages.value.filter((i) => i.id !== id);
      fetchAlbums();
    }
    stats.value = {
      total: Math.max(0, stats.value.total - 1),
      totalSize: Math.max(0, stats.value.totalSize - (size || 0)),
    };
    // 相册删空后自动回到相册列表
    if (activeAlbum.value && !activeAlbum.value.images.length) activeKey.value = '';
    deleteOpen.value = false;
    toast({ title: 'Tips', description: '已删除' });
  } catch {
    toast({ title: '删除失败', description: '网络错误，请稍后重试', variant: 'destructive' });
    deleteOpen.value = false;
  } finally {
    deleting.value = false;
  }
};
</script>

<style scoped lang="less">
@import 'Profile.less';
</style>
