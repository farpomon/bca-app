import { appRouter } from "./server/routers";
import type { TrpcContext } from "./server/_core/context";

// Create a test context
const ctx: TrpcContext = {
  user: {
    id: 1,
    openId: "test-user",
    email: "luisrubiofaria@gmail.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  req: {
    protocol: "https",
    headers: {},
    ip: "127.0.0.1",
  } as any,
  res: {} as any,
};

async function testEmailMFA() {
  console.log("Testing Email MFA setup...");
  const caller = appRouter.createCaller(ctx);
  
  try {
    const result = await caller.emailMfa.setupEmail();
    console.log("SUCCESS:", JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error("ERROR:", error.message);
    console.error("Full error:", error);
  }
}

testEmailMFA();
