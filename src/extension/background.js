const API_BASE_URL = "http://your-api-domain.com/api";
let heartbeatInterval = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SET_USER") {
    chrome.storage.local.set({ username: message.username, isLoggedIn: true });
  }

  if (message.type === "LOGOUT") {
    stopHeartbeat();
    chrome.storage.local.clear();
  }

  // Khi User vào Google Meet
  if (message.type === "JOIN_MEET") {
    handleJoinMeet(message.meetId);
  }

  // Khi User thoát Google Meet
  if (message.type === "LEAVE_MEET") {
    handleLeaveMeet(message.meetId);
  }
});

async function handleJoinMeet(meetId) {
  const { username } = await chrome.storage.local.get("username");
  if (!username) return;

  try {
    // 1. Gọi API Join
    await fetch(`${API_BASE_URL}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, meetId, timestamp: Date.now() })
    });

    // 2. Bắt đầu Heartbeat
    startHeartbeat(meetId, username);
    console.log("Joined and Heartbeat started");
  } catch (err) {
    console.error("Join API Error:", err);
  }
}

async function handleLeaveMeet(meetId) {
  const { username } = await chrome.storage.local.get("username");
  stopHeartbeat();

  try {
    await fetch(`${API_BASE_URL}/leave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, meetId, timestamp: Date.now() })
    });
  } catch (err) {
    console.error("Leave API Error:", err);
  }
}

function startHeartbeat(meetId, username) {
  stopHeartbeat(); // Clear cũ nếu có
  // Sử dụng Alarms để ổn định hơn trên Manifest V3
  chrome.alarms.create("heartbeat", { periodInMinutes: 0.5 }); // Mỗi 30 giây
  
  // Lưu context để dùng trong Alarm
  chrome.storage.local.set({ currentMeetId: meetId });
}

function stopHeartbeat() {
  chrome.alarms.clear("heartbeat");
}

// Lắng nghe Alarm cho Heartbeat
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "heartbeat") {
    const data = await chrome.storage.local.get(["username", "currentMeetId"]);
    if (data.username && data.currentMeetId) {
      fetch(`${API_BASE_URL}/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username: data.username, 
          meetId: data.currentMeetId, 
          status: "online" 
        })
      });
    }
  }
});