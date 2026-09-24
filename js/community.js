(function(){
  window.getRoleBadge = function(role){
    const map={
      owner:'<span class="role-pill role-owner">👑 Owner</span>',
      developer:'<span class="role-pill role-developer">💻 Developer</span>',
      moderator:'<span class="role-pill role-moderator">🛡 Mod</span>',
      admin:'<span class="role-pill role-admin">⚡ Admin</span>',
      diamond:'<span class="role-pill role-diamond">💠 Diamond</span>',
      platinum:'<span class="role-pill role-platinum">⭐ Platinum</span>',
      gold:'<span class="role-pill role-gold">🏅 Gold</span>',
      vip:'<span class="role-pill role-vip">💎 VIP</span>',
      member:'<span class="role-pill role-member">👤 Member</span>',
      newbie:'<span class="role-pill role-newbie">🌱 Newbie</span>'
    };
    return map[role]||map.member;
  };

  window.isOwner = function(){
    return window.currentUser && window.currentUser.role === 'owner';
  };

  /* ── Tab switching for sidebar menu ── */
  window.setupCommunityTabs = function(){
    const items = document.querySelectorAll('.comm-menu-item[data-comm-tab]');
    const chatArea = document.getElementById('community-chat-area');
    const postsFeed = document.getElementById('community-posts-feed');
    const unreadBadge = document.getElementById('chat-unread-badge');

    function switchTab(tab){
      var allSections = {
        chat: document.getElementById('community-chat-area'),
        gallery: document.getElementById('community-posts-feed'),
        giveaway: document.getElementById('giveaway-section'),
        event: document.getElementById('event-section'),
        announcement: document.getElementById('announcement-section'),
        faq: document.getElementById('faq-section'),
        leaderboard: document.getElementById('leaderboard-section'),
        polling: document.getElementById('polling-section'),
        achievement: document.getElementById('achievement-section'),
        media: document.getElementById('md-section')
      };
      var keys = Object.keys(allSections);
      for (var i = 0; i < keys.length; i++) {
        var el = allSections[keys[i]];
        if (el) {
          el.style.display = 'none';
          el.classList.remove('active');
        }
      }
      if (postsFeed) {
        postsFeed.style.display = 'none';
        postsFeed.classList.remove('active');
      }
      if (unreadBadge) unreadBadge.style.display = 'none';

      var target = null;
      if (tab === 'chat') {
        target = allSections.chat;
        if (target) {
          target.style.display = 'flex';
          target.classList.remove('active');
          target.scrollTop = target.scrollHeight;
        }
      } else if (tab === 'gallery' || !allSections[tab]) {
        target = postsFeed;
        if (target) {
          target.style.display = 'flex';
          target.classList.add('active');
        }
      } else {
        target = allSections[tab];
        if (target) {
          target.style.display = 'flex';
          target.classList.add('active');
        }
        var initMap = {
          giveaway: 'initGiveaway',
          event: 'initEvent',
          announcement: 'initAnnouncement',
          faq: 'initFaq',
          leaderboard: 'initLeaderboard',
          polling: 'initPolling',
          achievement: 'initAchievement',
          media: 'initMedia'
        };
        var fnName = initMap[tab];
        if (fnName && typeof window[fnName] === 'function') {
          setTimeout(function(){ window[fnName](); }, 80);
        }
      }

      items.forEach(function(item){
        if (item.dataset.commTab === tab) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });

      document.dispatchEvent(new CustomEvent('commTabChange', { detail: tab }));
    }

    items.forEach(item => {
      item.addEventListener('click', function(){
        switchTab(this.dataset.commTab);
      });
    });

    const activeItem = document.querySelector('.comm-menu-item.active[data-comm-tab]');
    if(activeItem) switchTab(activeItem.dataset.commTab);
  };

  /* ── Render chat messages ── */
  window.renderCommunityChat = function(){
    const area = document.getElementById('community-chat-area');
    if(!area) return;
    area.innerHTML = (window.communityMessages || []).map(m => {
      const reacHtml = (m.reactions || []).map(r =>
        `<span class="reaction-bubble"><span class="reaction-emoji">${r}</span></span>`
      ).join('');
      return `
        <div class="comm-msg" data-msg-id="${m.id}">
          <div class="comm-avatar">${m.avatar}</div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="msg-username">${m.username}</span>
              ${window.getRoleBadge(m.role)}
              <span class="msg-time">${m.time}</span>
              <div class="msg-actions">
                <button class="msg-action-btn" title="Reply" onclick="window.showToast('Reply','Fitur reply coming soon!')"><i data-lucide="reply" style="width:11px;height:11px"></i></button>
                ${window.isOwner()
                  ? `<button class="msg-action-btn" title="Pin" onclick="pinMessage(${m.id})"><i data-lucide="pin" style="width:11px;height:11px"></i></button>
                     <button class="msg-action-btn" title="Delete" onclick="deleteMessage(${m.id})" style="color:#ef4444"><i data-lucide="trash-2" style="width:11px;height:11px"></i></button>`
                  : ''}
              </div>
            </div>
            <p class="msg-text">${m.text}</p>
            <div class="flex items-center gap-1 mt-1.5">
              <div class="msg-reactions">${reacHtml}</div>
              <button class="add-reaction-btn" style="width:18px;height:18px;font-size:0.55rem" onclick="addReaction(${m.id})" title="Add reaction">+</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
    area.scrollTop = area.scrollHeight;
    if(typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons({attrs:{width:11,height:11}});
  };

  window.sendCommunityMessage = function(){
    const input = document.getElementById('comm-message-input');
    const text = input.value.trim();
    if(!text) return;
    if(!window.currentUser){
      window.showErrorToast('Login Diperlukan','Silakan login untuk mengirim pesan');
      window.openLoginModal();
      return;
    }
    const now = new Date();
    const time = now.getHours().toString().padStart(2,'0')+':'+now.getMinutes().toString().padStart(2,'0');
    window.communityMessages.push({
      id: Date.now(),
      username: window.currentUser.nickname || window.currentUser.name,
      role: window.currentUser.role || 'member',
      avatar: window.currentUser.role === 'owner' ? '👑' : '👤',
      time,
      text,
      reactions: []
    });
    input.value = '';
    window.renderCommunityChat();
    const chatArea = document.getElementById('community-chat-area');
    if(chatArea) chatArea.style.display = 'flex';
    const postsFeed = document.getElementById('community-posts-feed');
    if(postsFeed) postsFeed.style.display = 'none';
  };

  window.deleteMessage = function(id){
    window.communityMessages = window.communityMessages.filter(m => m.id !== id);
    window.renderCommunityChat();
    window.showToast('Dihapus','Pesan telah dihapus');
  };

  window.pinMessage = function(id){
    window.showToast('Pinned','Pesan telah di-pin');
  };

  window.addReaction = function(id){
    const emojis = ['👍','🔥','❤️','😂','🎮','🎉','😮'];
    const msg = (window.communityMessages || []).find(m => m.id === id);
    if(msg){
      const r = emojis[Math.floor(Math.random() * emojis.length)];
      if(!msg.reactions.includes(r)) msg.reactions.push(r);
      window.renderCommunityChat();
    }
  };

  window.toggleEmojiPicker = function(){
    window.showToast('Emoji','Fitur emoji picker coming soon!');
  };

  /* ── Auto-init tabs on page load ── */
  document.addEventListener('DOMContentLoaded', function(){
    if(typeof window.setupCommunityTabs === 'function') window.setupCommunityTabs();
  });

  /* ── Re-init tabs when page becomes active (for SPA) ── */
  const origNav = window.navigateTo;
  if(origNav){
    window.navigateTo = function(pageId, event){
      origNav.call(window, pageId, event);
      if(pageId === 'community-page'){
        setTimeout(function(){
          if(typeof window.setupCommunityTabs === 'function') window.setupCommunityTabs();
          if(typeof window.renderCommunityChat === 'function') window.renderCommunityChat();
        }, 50);
      }
    };
  }
})();
