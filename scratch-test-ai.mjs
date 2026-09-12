import fetch from 'node-fetch';

const HOSIT_AI_PUBLIC_8000 = "http://106.51.21.4:8000/api/chat";

async function test() {
  const payload = {
    message: "Enakku nalla fertilizer suggest pannu",
    user_id: "test",
    context: "Task: Answer agricultural questions in Tanglish."
  };
  try {
    console.log("Trying public API...");
    const res = await fetch(HOSIT_AI_PUBLIC_8000, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log(res.status);
    const data = await res.text();
    console.log(data);
  } catch (e) {
    console.log("Error:", e.message);
  }
}
test();
