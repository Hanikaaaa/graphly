export function initAIUI() {
  const fab = document.getElementById("ai-fab");
  const chatbox = document.getElementById("ai-chatbox");
  const closeBtn = document.getElementById("ai-close-btn");
  const input = document.getElementById("ai-input");
  const sendBtn = document.getElementById("ai-send-btn");
  const messages = document.getElementById("ai-messages");

  if (!fab || !chatbox) return;

  fab.addEventListener("click", () => {
    chatbox.classList.toggle("hidden");
    input.focus();
  });

  closeBtn.addEventListener("click", () => {
    chatbox.classList.add("hidden");
  });

  function appendMessage(text, type = "user") {
    const div = document.createElement("div");
    div.className = `ai-message ai-${type}`;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function handleSend() {
    const value = input.value.trim();
    if (!value) return;

    appendMessage(value, "user");
    input.value = "";

    // placeholder response
    setTimeout(() => {
      appendMessage("AI integration coming soon.", "system");
    }, 600);
  }

  sendBtn.addEventListener("click", handleSend);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  });
}