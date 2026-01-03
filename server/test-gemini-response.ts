import { invokeLLM } from "./_core/llm";

async function testGeminiResponse() {
  console.log("Testing Gemini response structure with json_schema...\n");

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "Extract information and return as JSON.",
        },
        {
          role: "user",
          content: "Extract: Building Name: Test Building, Year Built: 2020",
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "test_extraction",
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
              yearBuilt: { type: "number" },
            },
          },
        },
      },
    });

    console.log("Full response structure:");
    console.log(JSON.stringify(response, null, 2));

    console.log("\n\nResponse type:", typeof response);
    console.log("Has choices?", "choices" in response);
    console.log("Choices is array?", Array.isArray(response.choices));
    console.log("Choices length:", response.choices?.length);

    if (response.choices && response.choices.length > 0) {
      console.log("\nFirst choice:");
      console.log(JSON.stringify(response.choices[0], null, 2));

      const content = response.choices[0]?.message?.content;
      console.log("\nContent type:", typeof content);
      console.log("Content value:", content);

      if (typeof content === "string") {
        const parsed = JSON.parse(content);
        console.log("\nParsed content:", parsed);
      }
    }
  } catch (error: any) {
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
  }
}

testGeminiResponse();
