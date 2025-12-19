// Test script to send email via SendGrid
import { sendVerificationEmail } from "./server/_core/email";

const testEmail = "luisrubiofaria@gmail.com";
const testCode = "123456";

console.log("=".repeat(60));
console.log("Testing Email MFA - Sending Verification Code");
console.log("=".repeat(60));
console.log(`To: ${testEmail}`);
console.log(`Code: ${testCode}`);
console.log("=".repeat(60));

sendVerificationEmail(testEmail, testCode, "mfa_setup")
  .then((result) => {
    console.log("=".repeat(60));
    if (result) {
      console.log("✅ SUCCESS: Email sent successfully!");
    } else {
      console.log("❌ FAILURE: Email failed to send");
      console.log("Check the logs above for SendGrid API error details");
    }
    console.log("=".repeat(60));
    process.exit(result ? 0 : 1);
  })
  .catch((error) => {
    console.log("=".repeat(60));
    console.error("❌ EXCEPTION:", error);
    console.log("=".repeat(60));
    process.exit(1);
  });
