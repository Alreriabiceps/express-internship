// Test script to check createConversation endpoint
import fetch from "node-fetch";

const testCreateConversation = async () => {
  try {
    console.log("Testing createConversation endpoint...");

    // You'll need to replace these with actual values
    const token = "YOUR_JWT_TOKEN_HERE";
    const otherUserId = "COMPANY_USER_ID_HERE";

    const response = await fetch(
      "http://localhost:5000/api/chat/conversations",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          otherUserId: otherUserId,
        }),
      }
    );

    const data = await response.json();
    console.log("Response status:", response.status);
    console.log("Response data:", data);
  } catch (error) {
    console.error("Error testing endpoint:", error);
  }
};

testCreateConversation();
