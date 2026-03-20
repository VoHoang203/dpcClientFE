/**
 * ATTENDANCE WIDGET - CONTENT SCRIPT
 */

// 1. Map tên Role tiếng Việt
const ROLE_MAP = {
  "SECRETARY": "Bí thư",
  "DEPUTY_SECRETARY": "Phó Bí thư",
  "COMMITTEE_MEMBER": "Chi ủy viên",
  "PARTY_MEMBER": "Đảng viên",
  "MEMBER": "Đảng viên" 
};

let widgetElements = null;
let currentUserRole = null; 

// 2. Khởi tạo giao diện (Shadow DOM) 
function initAttendanceUI() {
  const container = document.createElement("div");
  container.id = "attendance-extension-root";
  container.style.all = "initial";
  document.body.appendChild(container);

  const shadow = container.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = `
    .widget-wrapper {
      position: fixed; top: 60px; right: 20px; z-index: 2147483647;
      font-family: sans-serif; display: flex; align-items: center; gap: 15px;
      padding: 10px 20px; 
      background: rgba(255, 255, 255, 0.9); 
      backdrop-filter: blur(5px); 
      border-radius: 50px; 
      box-shadow: 0 4px 15px rgba(0,0,0,0.15);
      border: 1px solid #ddd;
    }
    .status-dot { width: 12px; height: 12px; border-radius: 50%; background: #ff4d4d; }
    .status-dot.active { background: #00ca4e; box-shadow: 0 0 10px #00ca4e; }
    .status-dot.in-meeting { background: #00ca4e; box-shadow: 0 0 10px #00ca4e; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(0, 202, 78, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(0, 202, 78, 0); } 100% { box-shadow: 0 0 0 0 rgba(0, 202, 78, 0); } }
    .user-info { display: flex; flex-direction: column; }
    .username-text { font-size: 14px; font-weight: bold; color: #333; }
    .role-label { font-size: 11px; color: #666; text-transform: uppercase; font-weight: 600;}
    .meeting-status { font-size: 11px; color: #00ca4e; font-weight: bold; display: none; margin-top: 2px;}
    
    .end-btn {
      background: #ff4d4d; color: white; border: none; padding: 6px 12px;
      border-radius: 20px; font-size: 12px; font-weight: bold; cursor: pointer;
      display: none; transition: 0.2s;
    }
    .end-btn:hover { background: #e60000; box-shadow: 0 2px 8px rgba(255,77,77,0.4); }
  `;

  const wrapper = document.createElement("div");
  wrapper.className = "widget-wrapper";
  wrapper.innerHTML = `
    <div id="dot" class="status-dot"></div>
    <div class="user-info">
      <span id="roleLabel" class="role-label">Chưa rõ</span>
      <span id="name" class="username-text">Chưa đăng nhập</span>
      <span id="meetingStatus" class="meeting-status">● Đang họp</span>
    </div>
    <button id="endBtn" class="end-btn">Kết thúc họp</button>
  `;

  shadow.appendChild(style);
  shadow.appendChild(wrapper);

  widgetElements = {
    dot: shadow.getElementById("dot"),
    roleLabel: shadow.getElementById("roleLabel"),
    name: shadow.getElementById("name"),
    meetingStatus: shadow.getElementById("meetingStatus"),
    endBtn: shadow.getElementById("endBtn"),
  };

  // SỰ KIỆN: Ấn nút Kết thúc trên Extension
  widgetElements.endBtn.addEventListener("click", () => {
    if (confirm("Bạn có chắc chắn muốn CHỐT SỔ ĐIỂM DANH & KẾT THÚC cuộc họp này cho tất cả mọi người?")) {
      chrome.runtime.sendMessage({ type: "END_MEETING" });
      
      const leaveButton = document.querySelector('button[aria-label*="Rời khỏi cuộc gọi"], button[aria-label*="Leave call"]');
      if (leaveButton) leaveButton.click();
    }
  });
}

function updateUI(username, isLoggedIn, role) {
  if (!widgetElements) return;
  currentUserRole = role;

  if (isLoggedIn && username) {
    widgetElements.dot.classList.add("active");
    widgetElements.name.innerText = username;
    widgetElements.roleLabel.innerText = ROLE_MAP[role] || "Đảng viên";
  } else {
    widgetElements.dot.classList.remove("active");
    widgetElements.dot.classList.remove("in-meeting");
    widgetElements.name.innerText = "Chưa đăng nhập";
    widgetElements.roleLabel.innerText = "Chưa rõ";
    widgetElements.meetingStatus.style.display = "none";
    widgetElements.endBtn.style.display = "none";
  }
}

initAttendanceUI();

chrome.storage.local.get(["username", "isLoggedIn", "role"], (data) => {
  updateUI(data.username, data.isLoggedIn, data.role);
});

// ==========================================
// 3. LOGIC ĐIỂM DANH MEET CHUẨN XÁC
// ==========================================
let currentMeetId = null;
let meetingState = "OUTSIDE"; 
let checkInterval = null;

// Kiểm tra quyền Chi uỷ (Đã có cả Bí thư, Phó Bí thư, Chi ủy viên)
function isCommittee() {
  return ["SECRETARY", "DEPUTY_SECRETARY", "COMMITTEE_MEMBER"].includes(currentUserRole);
}

function updateMeetingStateUI(state) {
  meetingState = state;
  if (!widgetElements || !currentUserRole) return;

  if (state === "IN_MEETING") {
    widgetElements.dot.classList.add("in-meeting");
    widgetElements.meetingStatus.style.display = "block"; 
    // Bật nút Kết thúc nếu là Chi uỷ
    if (isCommittee()) widgetElements.endBtn.style.display = "block";
  } else {
    widgetElements.dot.classList.remove("in-meeting");
    widgetElements.meetingStatus.style.display = "none";
    widgetElements.endBtn.style.display = "none";
  }
}

function startMeetingCheckLoop(meetId) {
  currentMeetId = meetId;
  updateMeetingStateUI("WAITING_ROOM");
  console.log(`[Content] Đang ở phòng chờ Meet: ${meetId}...`);

  if (checkInterval) clearInterval(checkInterval);

  checkInterval = setInterval(() => {
    const leaveButton = document.querySelector('button[aria-label*="Rời khỏi cuộc gọi"], button[aria-label*="Leave call"]');

    if (leaveButton && meetingState === "WAITING_ROOM") {
      console.log("[Content] 🟢 ĐÃ VÀO PHÒNG HỌP THỰC SỰ!");
      updateMeetingStateUI("IN_MEETING");
      chrome.runtime.sendMessage({ type: "JOIN_MEET", currentUrl: location.href });
    } else if (!leaveButton && meetingState === "IN_MEETING") {
      console.log("[Content] 🔴 ĐÃ THOÁT KHỎI PHÒNG HỌP (Mất kết nối/Bị kick)!");
      chrome.runtime.sendMessage({ type: "LEAVE_MEET" });
      updateMeetingStateUI("OUTSIDE");
      clearInterval(checkInterval);
      currentMeetId = null;
    }
  }, 1000);
}

let lastUrl = "";
function checkUrlChange() {
  const currentUrl = location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    const match = currentUrl.match(/meet\.google\.com\/([a-z0-9-]+)/);

    if (match && match[1] !== "lookup") {
      if (currentMeetId !== match[1]) startMeetingCheckLoop(match[1]);
    } else {
      if (meetingState === "IN_MEETING") chrome.runtime.sendMessage({ type: "LEAVE_MEET" });
      updateMeetingStateUI("OUTSIDE");
      currentMeetId = null;
      if (checkInterval) clearInterval(checkInterval);
    }
  }
}

checkUrlChange(); 
const observer = new MutationObserver(() => checkUrlChange());
observer.observe(document, { subtree: true, childList: true });

// SỰ KIỆN: Chi uỷ bấm nút đỏ của Google Meet -> Auto chốt sổ End Meeting
document.addEventListener('click', (e) => {
  const leaveBtn = e.target.closest('button[aria-label*="Rời khỏi cuộc gọi"], button[aria-label*="Leave call"]');
  
  if (leaveBtn && meetingState === "IN_MEETING") {
    if (isCommittee()) {
      console.log("[Content] Chi uỷ rời nhóm, tự động chốt sổ cuộc họp!");
      chrome.runtime.sendMessage({ type: "END_MEETING" });
    } else {
      chrome.runtime.sendMessage({ type: "LEAVE_MEET" });
    }
    updateMeetingStateUI("OUTSIDE");
  }
}, true); 

// ==========================================
// 4. LẮNG NGHE MESSAGE TỪ FE & BACKGROUND
// ==========================================
window.addEventListener("message", (event) => {
  if (event.data.type === "FROM_FE_LOGIN") {
    console.log("[Content] Nhận lệnh Đăng nhập:", event.data);
    updateUI(event.data.username, true, event.data.role);

    chrome.runtime.sendMessage({
      type: "SET_USER",
      username: event.data.username,
      role: event.data.role, 
      committeeAccessToken: event.data.committeeAccessToken,
    });
  }

  if (event.data.type === "SET_ACTIVE_MEETING") {
    chrome.storage.local.set({ activeMeetingId: event.data.meetingId });
  }

  if (event.data.type === "FROM_FE_LOGOUT") {
    updateUI(null, false, null);
    chrome.runtime.sendMessage({ type: "LOGOUT" });
  }
});

window.addEventListener("beforeunload", () => {
  if (meetingState === "IN_MEETING") chrome.runtime.sendMessage({ type: "LEAVE_MEET" });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SHOW_ERROR") {
    alert("⚠️ THÔNG BÁO TỪ HỆ THỐNG:\n" + message.message);

    if (widgetElements) {
      widgetElements.dot.style.background = "#ff4d4d"; 
      widgetElements.dot.style.boxShadow = "0 0 10px #ff4d4d";
      widgetElements.name.innerText = "Lỗi hệ thống!";
      widgetElements.name.style.color = "#ff4d4d";
    }
    chrome.runtime.sendMessage({ type: "LEAVE_MEET" });
  }
});