// Tạo UI
const widget = document.createElement("div");
widget.id = "attendance-widget";

widget.style.position = "fixed";
widget.style.top = "20px";
widget.style.right = "20px";
widget.style.zIndex = "9999";
widget.style.padding = "10px 14px";
widget.style.background = "white";
widget.style.borderRadius = "12px";
widget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
widget.style.display = "flex";
widget.style.alignItems = "center";
widget.style.gap = "8px";
widget.style.fontFamily = "Arial";

// chấm trạng thái
const dot = document.createElement("div");
dot.style.width = "10px";
dot.style.height = "10px";
dot.style.borderRadius = "50%";
dot.style.background = "red";

// username
const name = document.createElement("span");
name.innerText = "";

widget.appendChild(dot);
widget.appendChild(name);
document.body.appendChild(widget);

// load trạng thái từ storage
chrome.storage.local.get(["username", "isLoggedIn"], (data) => {
  if (data.isLoggedIn) {
    dot.style.background = "green";
    name.innerText = data.username;
  }
});

// lắng nghe FE gửi username
window.addEventListener("message", (event) => {
  if (event.data.type === "FROM_FE_LOGIN") {
    dot.style.background = "green";
    name.innerText = event.data.username;

    chrome.runtime.sendMessage({
      type: "SET_USER",
      username: event.data.username
    });
  }

  if (event.data.type === "FROM_FE_LOGOUT") {
    dot.style.background = "red";
    name.innerText = "";

    chrome.runtime.sendMessage({
      type: "LOGOUT"
    });
  }
});

// --- [Phần UI cũ của bạn giữ nguyên ở đây] ---

let lastUrl = location.href;
let isInMeet = false;

function checkUrlChange() {
  const currentUrl = location.href;
  
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    
    // Kiểm tra nếu là Google Meet (VD: meet.google.com/abc-xyz)
    const meetRegex = /meet\.google\.com\/([a-z0-9-]+)/;
    const match = currentUrl.match(meetRegex);

    if (match) {
      const meetId = match[1];
      if (meetId !== "lookup" && !isInMeet) {
        isInMeet = true;
        chrome.runtime.sendMessage({ type: "JOIN_MEET", meetId });
      }
    } else {
      if (isInMeet) {
        isInMeet = false;
        chrome.runtime.sendMessage({ type: "LEAVE_MEET" });
      }
    }
  }
}

// Theo dõi sự thay đổi URL (vì Meet là SPA)
const observer = new MutationObserver(() => checkUrlChange());
observer.observe(document, { subtree: true, childList: true });

// Xử lý khi đóng tab/trình duyệt
window.addEventListener("beforeunload", () => {
  if (isInMeet) {
    chrome.runtime.sendMessage({ type: "LEAVE_MEET" });
  }
});

// Lắng nghe FE gửi Login/Logout (giữ nguyên logic cũ của bạn)
window.addEventListener("message", (event) => {
  if (event.data.type === "FROM_FE_LOGIN") {
    // ... logic cũ ...
    chrome.runtime.sendMessage({ type: "SET_USER", username: event.data.username });
  }
  // ... tương tự cho LOGOUT ...
});
