import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Sparkles,
  User,
  Trash2,
  Minimize2,
  HelpCircle,
} from "lucide-react";
import { Streamdown } from "streamdown";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const SUGGESTED_PROMPTS = [
  "How do I create a new project?",
  "How do I add photos to an assessment?",
  "What is UNIFORMAT II?",
  "How do I generate a report?",
  "How does offline mode work?",
];

export function FloatingChatbot() {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const chatMutation = trpc.chatbot.chat.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
    },
    onError: (error) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        },
      ]);
    },
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      ) as HTMLDivElement;
      if (viewport) {
        requestAnimationFrame(() => {
          viewport.scrollTo({
            top: viewport.scrollHeight,
            behavior: "smooth",
          });
        });
      }
    }
  }, [messages, chatMutation.isPending]);

  const handleSend = (content: string) => {
    const trimmedContent = content.trim();
    if (!trimmedContent || chatMutation.isPending) return;

    // Add user message
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: trimmedContent },
    ];
    setMessages(newMessages);
    setInput("");

    // Send to API
    chatMutation.mutate({
      message: trimmedContent,
      history: messages.slice(-10), // Keep last 10 messages for context
    });

    // Focus textarea
    textareaRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const handleClearConversation = () => {
    setMessages([]);
  };

  // Don't render for unauthenticated users
  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            "fixed bottom-6 right-6 z-50",
            "flex items-center justify-center",
            "w-14 h-14 rounded-full",
            "bg-primary text-primary-foreground",
            "shadow-lg hover:shadow-xl",
            "transition-all duration-200",
            "hover:scale-105 active:scale-95",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          )}
          aria-label="Open help chat"
        >
          <HelpCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-50 bg-card border border-border rounded-lg shadow-2xl",
            "flex flex-col",
            "transition-all duration-200",
            isMinimized
              ? "bottom-6 right-6 w-72 h-14"
              : "bottom-6 right-6 w-96 h-[32rem] max-h-[calc(100vh-3rem)]",
            "sm:w-96",
            "max-w-[calc(100vw-2rem)]"
          )}
        >
          {/* Header */}
          <div
            className={cn(
              "flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground rounded-t-lg",
              isMinimized && "rounded-b-lg cursor-pointer"
            )}
            onClick={() => isMinimized && setIsMinimized(false)}
          >
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <span className="font-medium">Help Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              {!isMinimized && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                  onClick={() => setIsMinimized(true)}
                >
                  <Minimize2 className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Content (hidden when minimized) */}
          {!isMinimized && (
            <>
              {/* Clear button */}
              {messages.length > 0 && (
                <div className="flex items-center justify-between px-4 py-2 border-b bg-background/50">
                  <span className="text-xs text-muted-foreground">
                    {messages.length} message{messages.length !== 1 ? "s" : ""}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearConversation}
                    className="h-7 text-xs"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Clear
                  </Button>
                </div>
              )}

              {/* Messages Area */}
              <div ref={scrollAreaRef} className="flex-1 overflow-hidden">
                {messages.length === 0 ? (
                  <div className="flex h-full flex-col p-4">
                    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Sparkles className="w-10 h-10 opacity-20" />
                        <p className="text-sm text-center">
                          Hi! I can help you learn how to use the BCA app.
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 w-full max-w-xs">
                        {SUGGESTED_PROMPTS.map((prompt, index) => (
                          <button
                            key={index}
                            onClick={() => handleSend(prompt)}
                            disabled={chatMutation.isPending}
                            className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <ScrollArea className="h-full">
                    <div className="flex flex-col gap-3 p-4">
                      {messages.map((message, index) => (
                        <div
                          key={index}
                          className={cn(
                            "flex gap-2",
                            message.role === "user"
                              ? "justify-end items-start"
                              : "justify-start items-start"
                          )}
                        >
                          {message.role === "assistant" && (
                            <div className="w-7 h-7 shrink-0 mt-0.5 rounded-full bg-primary/10 flex items-center justify-center">
                              <Sparkles className="w-3.5 h-3.5 text-primary" />
                            </div>
                          )}

                          <div
                            className={cn(
                              "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                              message.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground"
                            )}
                          >
                            {message.role === "assistant" ? (
                              <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:m-0 [&_ul]:m-0 [&_ol]:m-0 [&_li]:m-0">
                                <Streamdown>{message.content}</Streamdown>
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap">
                                {message.content}
                              </p>
                            )}
                          </div>

                          {message.role === "user" && (
                            <div className="w-7 h-7 shrink-0 mt-0.5 rounded-full bg-secondary flex items-center justify-center">
                              <User className="w-3.5 h-3.5 text-secondary-foreground" />
                            </div>
                          )}
                        </div>
                      ))}

                      {chatMutation.isPending && (
                        <div className="flex items-start gap-2">
                          <div className="w-7 h-7 shrink-0 mt-0.5 rounded-full bg-primary/10 flex items-center justify-center">
                            <Sparkles className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div className="rounded-lg bg-muted px-3 py-2">
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </div>

              {/* Input Area */}
              <form
                onSubmit={handleSubmit}
                className="flex gap-2 p-3 border-t bg-background/50 items-end"
              >
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question..."
                  className="flex-1 max-h-24 resize-none min-h-9 text-sm"
                  rows={1}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || chatMutation.isPending}
                  className="shrink-0 h-9 w-9"
                >
                  {chatMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
