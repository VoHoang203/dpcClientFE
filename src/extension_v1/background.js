const API_BASE_URL = "http://160.25.81.143:3000";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[Background] Nhận message từ Content:", message.type || message.action);

  if (message.type === "SET_USER") {
    chrome.storage.local.set(
      {
        username: message.username,
        role: message.role,
        accessToken: message.accessToken,
        isLoggedIn: true,
      },
      () => {
        console.log(`[Background] Đã lưu thông tin: ${message.username} - Role: ${message.role}`);
      },
    );
  }

  if (message.action === "SAVE_NEW_TOKENS") {
    chrome.storage.local.set({
      accessToken: message.accessToken,
      refreshToken: message.refreshToken
    }, () => {
      console.log("[Background] Đã cập nhật Token Refresh mới thành công!");
      sendResponse({ status: "success" });
    });
    return true; 
  }

  if (message.type === "LOGOUT") {
    chrome.alarms.clear("attendance_heartbeat");
    chrome.storage.local.clear();
    console.log("[Background] Đã xóa dữ liệu Đảng viên");
  }

  if (message.type === "JOIN_MEET") handleJoinMeet(message.currentUrl);
  if (message.type === "LEAVE_MEET") handleLeaveMeet();
  if (message.type === "END_MEETING") handleEndMeeting(); 
});

// ==========================================
// THÊM MỚI: HÀM TỰ ĐỘNG REFRESH TOKEN CHO BACKGROUND
// ==========================================
async function refreshTokensInBackground() {
  const data = await chrome.storage.local.get(["refreshToken"]);
  
  if (!data.refreshToken) {
    console.error("[Background] Không có refreshToken trong storage để cấp lại.");
    return null;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${data.refreshToken}`
      }
    });

    if (!res.ok) {
      console.error("[Background] Gọi API Refresh thất bại status:", res.status);
      return null;
    }

    const resData = await res.json();
    
    // Bóc tách token giống logic web của bạn
    const nested = resData.data || {};
    const accessToken = nested.accessToken || resData.accessToken || resData.token;
    const newRefreshToken = nested.refreshToken || resData.refreshToken || data.refreshToken;

    if (accessToken) {
      await chrome.storage.local.set({
        accessToken: accessToken,
        refreshToken: newRefreshToken
      });
      console.log("[Background] ✅ Background tự động refresh token THÀNH CÔNG!");
      return accessToken;
    }
    return null;
  } catch (err) {
    console.error("[Background] Lỗi mạng khi tự refresh token:", err);
    return null;
  }
}

async function sendHeartbeatOnce(meetingId, token, currentUrl) {
  try {
    await fetch(`${API_BASE_URL}/meetings/${meetingId}/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentUrl }),
    });
    console.log("💓 Heartbeat ngay sau checkin OK");
  } catch (err) {
    console.error("❌ Heartbeat ngay sau checkin lỗi:", err);
  }
}

async function handleJoinMeet(currentUrl) {
  const data = await chrome.storage.local.get([
    "role",
    "activeMeetingId",
    "accessToken",
  ]);

  if (!data.role || !data.activeMeetingId) {
    console.error("[Background] ❌ Thiếu Token hoặc MeetingId");
    return;
  }

  const meetingId = data.activeMeetingId;
  console.log(`[Background] Đang Check-in Online cho Meet: ${meetingId}...`);
  console.log("Role:", data.role);

  try {
    const res = await fetch(
      `${API_BASE_URL}/meetings/${meetingId}/check-in-online`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.accessToken}`,
        },
        body: JSON.stringify({ currentUrl: currentUrl }),
      },
    );

    let resData;
    try { resData = await res.json(); } catch (e) { resData = {}; }

    if (res.ok && resData.success !== false) {
      console.log("[Background] ✅ Check-in THÀNH CÔNG, bắt đầu tính giờ");
      await chrome.storage.local.set({ currentUrl: currentUrl });
      await sendHeartbeatOnce(meetingId, data.accessToken, currentUrl);

      chrome.alarms.create("attendance_heartbeat", { periodInMinutes: 1.0 });
    } else {
      console.error("[Background] ❌ Check-in BE THẤT BẠI:", resData);
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: "SHOW_ERROR",
            message: resData.message || "Cuộc họp đã kết thúc, không thể check-in!",
          }).catch(() => {}); // Catch lỗi connection
        }
      });
    }
  } catch (err) {
    console.error("[Background] Vào thất bại do lỗi mạng:", err);
    sendGenericError();
  }
}

async function handleLeaveMeet() {
  chrome.alarms.clear("attendance_heartbeat");
  chrome.storage.local.remove(["activeMeetingId", "currentUrl"]);
  console.log("[Background] Đã thoát phòng họp, dừng đập nhịp tim 🛑");
}

async function handleEndMeeting() {
  const data = await chrome.storage.local.get(["accessToken", "activeMeetingId"]);
  if (!data.accessToken || !data.activeMeetingId) return;

  console.log(`[Background] 🛑 Đang gọi API KẾT THÚC cuộc họp ${data.activeMeetingId}...`);
  try {
    const res = await fetch(`${API_BASE_URL}/meetings/${data.activeMeetingId}/end`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });

    let resData;
    try { resData = await res.json(); } catch (e) { resData = {}; }

    if (res.ok) {
      console.log("[Background] ✅ Đã kết thúc cuộc họp trên server thành công!");
    } else {
      console.error("[Background] ❌ Lỗi khi kết thúc cuộc họp:", resData);
      sendGenericError();
    }
  } catch (err) {
    console.error("[Background] Lỗi mạng khi End Meeting:", err);
    sendGenericError();
  }
  handleLeaveMeet();
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "attendance_heartbeat") {
    let data = await chrome.storage.local.get(["accessToken", "activeMeetingId", "currentUrl"]);

    if (data.accessToken && data.activeMeetingId && data.currentUrl) {
      console.log(`[Background] 💓 Đang gửi Heartbeat...`);
      try {
        let res = await fetch(`${API_BASE_URL}/meetings/${data.activeMeetingId}/heartbeat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.accessToken}`,
          },
          body: JSON.stringify({ currentUrl: data.currentUrl }),
        });

        // ==========================================
        // FIX: XỬ LÝ KHI HEARTBEAT BÁO LỖI TOKEN HẾT HẠN (401/403)
        // ==========================================
        if (res.status === 401 || res.status === 403) {
          console.warn("[Background] ⚠️ Token hết hạn, Background đang TỰ ĐỘNG REFRESH...");
          
          const newToken = await refreshTokensInBackground();
          
          if (newToken) {
             console.log("[Background] 🔄 Thử gửi lại Heartbeat với token mới...");
             // Ghi đè lại token cũ và thử gửi lại request
             res = await fetch(`${API_BASE_URL}/meetings/${data.activeMeetingId}/heartbeat`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${newToken}`, // Dùng token mới
                },
                body: JSON.stringify({ currentUrl: data.currentUrl }),
             });
          } else {
             // Chỉ khi refresh token bị thất bại (hoặc hết hạn nốt) mới dừng heartbeat
             console.error("[Background] 🔐 Refresh Token cũng đã lỗi, dừng hẳn heartbeat.");
             chrome.alarms.clear("attendance_heartbeat");
             sendGenericError();
             return;
          }
        }

        let resData;
        try { resData = await res.json(); } catch (e) { resData = {}; }

        if (res.ok && resData.success !== false) {
          console.log("[Background] 💓 Nhịp tim gửi THÀNH CÔNG");
        } else {
          console.error("[Background] ❌ Lỗi Heartbeat - Status:", res.status);
          console.error("[Background] Response body:", resData);
          if (res.status !== 401 && res.status !== 403) {
            console.warn("[Background] ⚠️ Server lỗi tạm thời, sẽ retry sau 1 phút");
          }
        }
      } catch (err) {
        console.error("[Background] Lỗi mạng khi Heartbeat:", err);
      }
    }
  }
});

// ==========================================
// FIX LỖI: Could not establish connection
// Bắt lỗi .catch() khi tab đó không có content script
// ==========================================
function sendGenericError() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].id) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: "SHOW_ERROR",
        message: "Vui lòng quay lại trang lịch để vào họp lại hoặc báo cho chi uỷ",
      }).catch((err) => {
        // Bỏ qua lỗi rác trên console khi nhắn vào tab Google Search / New Tab
        console.log("[Background] Ẩn lỗi gửi message đến tab không hỗ trợ.");
      });
    }
  });
}