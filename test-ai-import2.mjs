import { invokeLLM } from "./server/_core/llm.ts";
import mammoth from "mammoth";
import * as fs from "fs";

async function testAIImport() {
  try {
    // Read the test file
    const fileBuffer = fs.readFileSync("/home/ubuntu/test-bca.docx");
    
    // Extract text from Word document
    console.log("[Test] Extracting text from Word document...");
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    const documentText = result.value;
    console.log("[Test] Extracted text length:", documentText.length);
    console.log("[Test] First 500 chars:", documentText.substring(0, 500));
    
    // Test LLM call with text
    const prompt = `You are an expert in building condition assessment. Extract asset information from this document and return as JSON with this structure:
{
  "asset": {
    "name": "string or null",
    "assetType": "string or null",
    "address": "string or null",
    "yearBuilt": "number or null"
  },
  "assessments": []
}`;
    
    console.log("[Test] Calling LLM with extracted text...");
    const response = await invokeLLM({
      messages: [
        { role: "system", content: prompt },
        {
          role: "user",
          content: `Here is the content of the Building Condition Assessment document:\n\n${documentText.substring(0, 50000)}`,
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
