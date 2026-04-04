const API_BASE_URL = "http://160.25.81.143:3000";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[Background] Nhận message từ Content:", message.type);

  if (message.type === "SET_USER") {
    chrome.storage.local.set(
      {
        username: message.username,
        role: message.role,
        committeeAccessToken: message.committeeAccessToken,
        accessToken: message.accessToken,
        isLoggedIn: true,
      },
      () => {
        console.log(
          `[Background] Đã lưu thông tin: ${message.username} - Role: ${message.role}`,
        );
      },
    );
  }

  if (message.type === "LOGOUT") {
    chrome.alarms.clear("attendance_heartbeat");
    chrome.storage.local.clear();
    console.log("[Background] Đã xóa dữ liệu Đảng viên");
  }

  if (message.type === "JOIN_MEET") handleJoinMeet(message.currentUrl);
  if (message.type === "LEAVE_MEET") handleLeaveMeet();
  if (message.type === "END_MEETING") handleEndMeeting(); // Đã thêm sự kiện End Meeting
});

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
    "committeeAccessToken",
    "activeMeetingId",
    "role",
    "accessToken",
  ]);

  if (!data.role || !data.activeMeetingId) {
    console.error("[Background] ❌ Thiếu Token hoặc MeetingId");
    return;
  }

  const meetingId = data.activeMeetingId;

  console.log(`[Background] Đang Check-in Online cho Meet: ${meetingId}...`);
  console.log(data.role);
  console.log(data.accessToken);

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
    try {
      resData = await res.json();
    } catch (e) {
      resData = {};
    }

    if (res.ok && resData.success !== false) {
      console.log("[Background] ✅ Check-in THÀNH CÔNG, bắt đầu tính giờ");
      await chrome.storage.local.set({ currentUrl: currentUrl });
      await sendHeartbeatOnce(meetingId, data.committeeAccessToken, currentUrl);
      chrome.alarms.create("attendance_heartbeat", { periodInMinutes: 1.0 });
    } else {
      console.error("[Background] ❌ Check-in BE THẤT BẠI:", resData);
      sendGenericError();
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "SHOW_ERROR",
          message: resData.message || "Cuộc họp đã kết thúc, không thể check-in!"
        });
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

// HÀM XỬ LÝ CHỐT SỔ CUỘC HỌP (Gọi API PATCH)
async function handleEndMeeting() {
  const data = await chrome.storage.local.get([
    "committeeAccessToken",
    "activeMeetingId",
  ]);
  if (!data.accessToken || !data.activeMeetingId) return;

  console.log(
    `[Background] 🛑 Đang gọi API KẾT THÚC cuộc họp ${data.activeMeetingId}...`,
  );
  try {
    const res = await fetch(
      `${API_BASE_URL}/meetings/${data.activeMeetingId}/end`,
      {
        method: "PATCH", // Đã chuyển thành PATCH khớp với BE
        headers: {
          Authorization: `Bearer ${data.accessToken}`,
        },
      },
    );

    let resData;
    try {
      resData = await res.json();
    } catch (e) {
      resData = {};
    }

    if (res.ok) {
      console.log(
        "[Background] ✅ Đã kết thúc cuộc họp trên server thành công!",
      );
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
    const data = await chrome.storage.local.get([
      "accessToken",
      "activeMeetingId",
      "currentUrl",
    ]);

    if (data.accessToken && data.activeMeetingId && data.currentUrl) {
      console.log(`[Background] 💓 Đang gửi Heartbeat...`);
      try {
        const res = await fetch(
          `${API_BASE_URL}/meetings/${data.activeMeetingId}/heartbeat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",

              Authorization: `Bearer ${data.accessToken}`,
            },
            body: JSON.stringify({ currentUrl: data.currentUrl }),
          },
        );

        let resData;
        try {
          resData = await res.json();
        } catch (e) {
          resData = {};
        }

        if (res.ok && resData.success !== false) {
          console.log("[Background] 💓 Nhịp tim gửi THÀNH CÔNG");
        } else {
          console.error("[Background] ❌ Lỗi Heartbeat - Status:", res.status);
          console.error("[Background] Response body:", resData);

          // ❗ CHỈ báo lỗi nhưng KHÔNG stop heartbeat
          if (res.status === 401 || res.status === 403) {
            // Token chết thì mới dừng
            console.error("[Background] 🔐 Token hết hạn, dừng heartbeat");
            chrome.alarms.clear("attendance_heartbeat");
            sendGenericError();
          } else {
            // 500 thì bỏ qua, retry lần sau
            console.warn(
              "[Background] ⚠️ Server lỗi tạm thời, sẽ retry sau 1 phút",
            );
          }
        }
      } catch (err) {
        console.error("[Background] Lỗi mạng khi Heartbeat:", err);
      }
    }
  }
});

function sendGenericError() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: "SHOW_ERROR",
        message:
          "Vui lòng quay lại trang lịch để vào họp lại hoặc báo cho chi uỷ",
      });
    }
  });
}
