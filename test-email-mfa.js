// Test script to trigger email MFA setup and see SendGrid logs
import { sendVerificationEmail } from './server/emailMfa.js';

const testEmail = 'luisrubiofaria@gmail.com';
const testCode = '123456';

console.log('Testing email MFA setup...');
console.log('Sending verification code to:', testEmail);

sendVerificationEmail(testEmail, testCode)
  .then((result) => {
    console.log('Email send result:', result);
    if (result) {
      console.log('✅ Email sent successfully!');
    } else {
      console.log('❌ Email failed to send');
    }
    process.exit(result ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
