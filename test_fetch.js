const fetch = require('node-fetch');
async function run() {
  const start = Date.now();
  console.log("Fetching...");
  try {
    const res = await fetch("http://106.51.21.4:8000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "hello", user_id: "F1021", context: "test" })
    });
    const text = await res.text();
    console.log("Success in " + (Date.now() - start) + "ms:", text);
  } catch(e) {
    console.log("Error in " + (Date.now() - start) + "ms:", e.message);
  }
}
run();
