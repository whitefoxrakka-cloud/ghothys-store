/* LocalStorage helpers (cache layer, source of truth is backend DB) */
(function(){
  window.getAllUsers = function(){return JSON.parse(localStorage.getItem(window.STORAGE_KEYS.USERS)||'[]');};
  window.saveAllUsers = function(u){localStorage.setItem(window.STORAGE_KEYS.USERS,JSON.stringify(u));};
  window.getTransactions = function(){if(!window.currentUser)return[];const a=JSON.parse(localStorage.getItem(window.STORAGE_KEYS.TRANSACTIONS)||'{}');return a[window.currentUser.email]||[];};
  window.saveTransactions = function(t){if(!window.currentUser)return;const a=JSON.parse(localStorage.getItem(window.STORAGE_KEYS.TRANSACTIONS)||'{}');a[window.currentUser.email]=t;localStorage.setItem(window.STORAGE_KEYS.TRANSACTIONS,JSON.stringify(a));};

  window.saveCurrentUser = function(){
    if(!window.currentUser)return;
    localStorage.setItem(window.STORAGE_KEYS.CURRENT_USER,JSON.stringify(window.currentUser));
    const users=getAllUsers();const i=users.findIndex(u=>u.email===window.currentUser.email);
    if(i!==-1){users[i]=window.currentUser;saveAllUsers(users);}
  };
})();