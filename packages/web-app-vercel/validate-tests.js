// Simple validation script for playlists route
// Mock the dependencies manually

// Mock requireAuth
global.requireAuth = () =>
  Promise.resolve({ userEmail: "test@example.com", response: null });

// Mock supabase
global.supabase = {
  from: () => ({
    select: () => ({
      eq: () => ({
        order: () => ({
          order: () =>
            Promise.resolve({
              data: [
                {
                  id: "1",
                  name: "Test Playlist",
                  owner_email: "test@example.com",
                  playlist_items: [{ count: 2 }],
                },
              ],
              error: null,
            }),
        }),
      }),
    }),
    insert: () => ({
      select: () => ({
        single: () =>
          Promise.resolve({
            data: {
              id: "1",
              name: "New Playlist",
              owner_email: "test@example.com",
            },
            error: null,
          }),
      }),
    }),
  }),
};

// Mock NextResponse
global.NextResponse = {
  json: (data, options) => ({
    status: options?.status || 200,
    json: () => Promise.resolve(data),
  }),
};

// Now test the functions
async function testGET() {
  console.log("Testing GET function...");
  try {
    const { GET } = require("./app/api/playlists/route.ts");
    const res = await GET();
    console.log("GET result status:", res.status);
    const data = await res.json();
    console.log("GET result data:", data);
    return res.status === 200 && Array.isArray(data);
  } catch (error) {
    console.error("GET test failed:", error);
    return false;
  }
}

async function testPOST() {
  console.log("Testing POST function...");
  try {
    const { POST } = require("./app/api/playlists/route.ts");
    const mockRequest = {
      json: () => Promise.resolve({}),
    };
    const res = await POST(mockRequest);
    console.log("POST result status:", res.status);
    return res.status === 400;
  } catch (error) {
    console.error("POST test failed:", error);
    return false;
  }
}

async function runValidation() {
  const getResult = await testGET();
  const postResult = await testPOST();

  console.log("GET test passed:", getResult);
  console.log("POST test passed:", postResult);

  if (getResult && postResult) {
    console.log("All tests passed!");
  } else {
    console.log("Some tests failed.");
  }
}

runValidation();
