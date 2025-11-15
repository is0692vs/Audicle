// Manual test runner for playlists route
const { GET, POST } = require("./route.ts");

async function runTests() {
  console.log("Running manual tests for playlists route...");

  try {
    // Test GET
    console.log("Testing GET...");
    const getRes = await GET();
    console.log("GET status:", getRes.status);
    const getData = await getRes.json();
    console.log("GET data:", getData);

    // Test POST without name
    console.log("Testing POST without name...");
    const mockRequest = new Request("http://localhost:3000/api/playlists", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const postRes = await POST(mockRequest);
    console.log("POST status:", postRes.status);
  } catch (error) {
    console.error("Test error:", error);
  }
}

runTests();
