import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { sendEmail } from "../services/emailService";

export const contactRouter = router({
  sendMessage: publicProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Invalid email address"),
        subject: z.string().optional(),
        message: z.string().min(1, "Message is required"),
      })
    )
    .mutation(async ({ input }) => {
      const { name, email, subject, message } = input;

      // Compose email content
      const emailSubject = subject 
        ? `Contact Form: ${subject}` 
        : "New Contact Form Submission";

      const emailBody = `
You have received a new message from the BCA App contact form.

From: ${name}
Email: ${email}
Subject: ${subject || "No subject"}

Message:
${message}

---
This message was sent via the BCA App contact form.
      `.trim();

      try {
        // Send email to the business owner
        await sendEmail({
          to: "lfaria@mabenconsulting.ca",
          subject: emailSubject,
          text: emailBody,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333; border-bottom: 2px solid #0066cc; padding-bottom: 10px;">
                New Contact Form Submission
              </h2>
              
              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>From:</strong> ${name}</p>
                <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                <p style="margin: 5px 0;"><strong>Subject:</strong> ${subject || "No subject"}</p>
              </div>
              
              <div style="margin: 20px 0;">
                <h3 style="color: #333;">Message:</h3>
                <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
              </div>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
              
              <p style="color: #666; font-size: 12px;">
                This message was sent via the BCA App contact form.
              </p>
            </div>
          `,
        });

        return { success: true };
      } catch (error) {
        console.error("Failed to send contact form email:", error);
        throw new Error("Failed to send message. Please try again later.");
      }
    }),
});
