import { invokeLLM } from "./server/_core/llm.ts";
import { storagePut } from "./server/storage.ts";
import * as fs from "fs";

async function testAIImport() {
  try {
    // Read the test file
    const fileBuffer = fs.readFileSync("/home/ubuntu/test-bca.docx");
    const mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    
    // Upload to S3
    console.log("[Test] Uploading file to S3...");
    const timestamp = Date.now();
    const fileKey = `temp-uploads/test/${timestamp}-test-bca.docx`;
    const { url: fileUrl } = await storagePut(fileKey, fileBuffer, mimeType);
    console.log("[Test] File URL:", fileUrl);
    
    // Test LLM call
    const prompt = `You are an expert in building condition assessment. Extract asset information from this document and return as JSON.`;
    
    console.log("[Test] Calling LLM...");
    const response = await invokeLLM({
      messages: [
        { role: "system", content: prompt },
        {
          role: "user",
          content: [
            {
              type: "file_url",
              file_url: {
                url: fileUrl,
                mime_type: mimeType,
              },
            },
          ],
        },
      ],
      response_format: {
        type: "json_object",
      },
    });
    
    console.log("[Test] Raw response:", JSON.stringify(response, null, 2));
    
    // Check response structure
    if (!response || !response.choices || !Array.isArray(response.choices) || response.choices.length === 0) {
      console.error("[Test] Invalid response structure!");
      console.error("[Test] response:", response);
      console.error("[Test] response.choices:", response?.choices);
    } else {
      console.log("[Test] Response is valid!");
      console.log("[Test] Content:", response.choices[0]?.message?.content);
    }
    
  } catch (error) {
    console.error("[Test] Error:", error.message);
    console.error("[Test] Stack:", error.stack);
  }
}

testAIImport();
