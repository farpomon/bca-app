import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Loader2, Send, User, Sparkles, Trash2, Maximize2, Minimize2, X } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Streamdown } from "streamdown";
import { createPortal } from "react-dom";

/**
 * Message type matching server-side LLM Message interface
 */
export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AIChatBoxProps = {
  /**
   * Messages array to display in the chat.
   * Should match the format used by invokeLLM on the server.
   */
  messages: Message[];

  /**
   * Callback when user sends a message.
   * Typically you'll call a tRPC mutation here to invoke the LLM.
   */
  onSendMessage: (content: string) => void;

  /**
   * Whether the AI is currently generating a response
   */
  isLoading?: boolean;

  /**
   * Placeholder text for the input field
   */
  placeholder?: string;

  /**
   * Custom className for the container
   */
  className?: string;

  /**
   * Height of the chat box (default: 600px)
   */
  height?: string | number;

  /**
   * Empty state message to display when no messages
   */
  emptyStateMessage?: string;

  /**
   * Suggested prompts to display in empty state
   * Click to send directly
   */
  suggestedPrompts?: string[];

  /**
   * Callback when user wants to clear the conversation
   */
  onClearConversation?: () => void;

  /**
   * Whether to show the expand button (default: true)
   */
  showExpandButton?: boolean;
};

/**
 * A ready-to-use AI chat box component that integrates with the LLM system.
 *
 * Features:
 * - Matches server-side Message interface for seamless integration
 * - Markdown rendering with Streamdown
 * - Auto-scrolls to latest message
 * - Loading states
 * - Uses global theme colors from index.css
 * - Expand/fullscreen mode for better conversation visibility
 *
 * @example
 * ```tsx
 * const ChatPage = () => {
 *   const [messages, setMessages] = useState<Message[]>([
 *     { role: "system", content: "You are a helpful assistant." }
 *   ]);
 *
 *   const chatMutation = trpc.ai.chat.useMutation({
 *     onSuccess: (response) => {
 *       // Assuming your tRPC endpoint returns the AI response as a string
 *       setMessages(prev => [...prev, {
 *         role: "assistant",
 *         content: response
 *       }]);
 *     },
 *     onError: (error) => {
 *       console.error("Chat error:", error);
 *       // Optionally show error message to user
 *     }
 *   });
 *
 *   const handleSend = (content: string) => {
 *     const newMessages = [...messages, { role: "user", content }];
 *     setMessages(newMessages);
 *     chatMutation.mutate({ messages: newMessages });
 *   };
 *
 *   return (
 *     <AIChatBox
 *       messages={messages}
 *       onSendMessage={handleSend}
 *       isLoading={chatMutation.isPending}
 *       suggestedPrompts={[
 *         "Explain quantum computing",
 *         "Write a hello world in Python"
 *       ]}
 *     />
 *   );
 * };
 * ```
 */
export function AIChatBox({
  messages,
  onSendMessage,
  isLoading = false,
  placeholder = "Type your message...",
  className,
  height = "600px",
  emptyStateMessage = "Start a conversation with AI",
  suggestedPrompts,
  onClearConversation,
  showExpandButton = true,
}: AIChatBoxProps) {
  const [input, setInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputAreaRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const expandedTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Filter out system messages
  const displayMessages = messages.filter((msg) => msg.role !== "system");

  // Calculate min-height for last assistant message to push user message to top
  const [minHeightForLastMessage, setMinHeightForLastMessage] = useState(0);

  useEffect(() => {
    if (containerRef.current && inputAreaRef.current) {
      const containerHeight = containerRef.current.offsetHeight;
      const inputHeight = inputAreaRef.current.offsetHeight;
      const scrollAreaHeight = containerHeight - inputHeight;

      // Reserve space for:
      // - padding (p-4 = 32px top+bottom)
      // - user message: 40px (item height) + 16px (margin-top from space-y-4) = 56px
      // Note: margin-bottom is not counted because it naturally pushes the assistant message down
      const userMessageReservedHeight = 56;
      const calculatedHeight = scrollAreaHeight - 32 - userMessageReservedHeight;

      setMinHeightForLastMessage(Math.max(0, calculatedHeight));
    }
  }, []);

  // Handle escape key to close expanded view
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isExpanded) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when expanded
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isExpanded]);

  // Focus textarea when expanding
  useEffect(() => {
    if (isExpanded && expandedTextareaRef.current) {
      expandedTextareaRef.current.focus();
    }
  }, [isExpanded]);

  // Scroll to bottom helper function with smooth animation
  const scrollToBottom = useCallback(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLDivElement;

    if (viewport) {
      requestAnimationFrame(() => {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: 'smooth'
        });
      });
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    onSendMessage(trimmedInput);
    setInput("");

    // Scroll immediately after sending
    scrollToBottom();

    // Keep focus on input
    if (isExpanded) {
      expandedTextareaRef.current?.focus();
    } else {
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Render the chat content (shared between normal and expanded views)
  const renderChatContent = (isExpandedView: boolean) => {
    const currentTextareaRef = isExpandedView ? expandedTextareaRef : textareaRef;
    
    return (
      <>
        {/* Header with clear and expand buttons */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-background/50">
          <span className="text-sm text-muted-foreground">
            {displayMessages.length > 0 
              ? `${displayMessages.length} message${displayMessages.length !== 1 ? 's' : ''}`
              : 'AI Assistant'}
          </span>
          <div className="flex items-center gap-2">
            {onClearConversation && displayMessages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearConversation}
                className="h-8 text-xs"
              >
                <Trash2 className="size-3 mr-1" />
                Clear
              </Button>
            )}
            {showExpandButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleExpand}
                className="h-8 text-xs"
                title={isExpandedView ? "Minimize (Esc)" : "Expand to fullscreen"}
              >
                {isExpandedView ? (
                  <>
                    <Minimize2 className="size-3 mr-1" />
                    Minimize
                  </>
                ) : (
                  <>
                    <Maximize2 className="size-3 mr-1" />
                    Expand
                  </>
                )}
              </Button>
            )}
            {isExpandedView && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(false)}
                className="h-8 w-8"
                title="Close (Esc)"
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div ref={scrollAreaRef} className="flex-1 overflow-hidden">
          {displayMessages.length === 0 ? (
            <div className="flex h-full flex-col p-4">
              <div className="flex flex-1 flex-col items-center justify-center gap-6 text-muted-foreground">
                <div className="flex flex-col items-center gap-3">
                  <Sparkles className="size-12 opacity-20" />
                  <p className="text-sm">{emptyStateMessage}</p>
                </div>

                {suggestedPrompts && suggestedPrompts.length > 0 && (
                  <div className={cn(
                    "flex flex-wrap justify-center gap-2",
                    isExpandedView ? "max-w-4xl" : "max-w-2xl"
                  )}>
                    {suggestedPrompts.map((prompt, index) => (
                      <button
                        key={index}
                        onClick={() => onSendMessage(prompt)}
                        disabled={isLoading}
                        className="rounded-lg border border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className={cn(
                "flex flex-col space-y-4 p-4",
                isExpandedView && "max-w-4xl mx-auto"
              )}>
                {displayMessages.map((message, index) => {
                  // Apply min-height to last message only if NOT loading (when loading, the loading indicator gets it)
                  const isLastMessage = index === displayMessages.length - 1;
                  const shouldApplyMinHeight =
                    isLastMessage && !isLoading && minHeightForLastMessage > 0 && !isExpandedView;

                  return (
                    <div
                      key={index}
                      className={cn(
                        "flex gap-3",
                        message.role === "user"
                          ? "justify-end items-start"
                          : "justify-start items-start"
                      )}
                      style={
                        shouldApplyMinHeight
                          ? { minHeight: `${minHeightForLastMessage}px` }
                          : undefined
                      }
                    >
                      {message.role === "assistant" && (
                        <div className="size-8 shrink-0 mt-1 rounded-full bg-primary/10 flex items-center justify-center">
                          <Sparkles className="size-4 text-primary" />
                        </div>
                      )}

                      <div
                        className={cn(
                          "rounded-lg px-4 py-2.5",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground max-w-[80%]"
                            : "bg-muted text-foreground",
                          isExpandedView && message.role === "assistant" && "max-w-none flex-1"
                        )}
                      >
                        {message.role === "assistant" ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <Streamdown>{message.content}</Streamdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap text-sm">
                            {message.content}
                          </p>
                        )}
                      </div>

                      {message.role === "user" && (
                        <div className="size-8 shrink-0 mt-1 rounded-full bg-secondary flex items-center justify-center">
                          <User className="size-4 text-secondary-foreground" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {isLoading && (
                  <div
                    className="flex items-start gap-3"
                    style={
                      minHeightForLastMessage > 0 && !isExpandedView
                        ? { minHeight: `${minHeightForLastMessage}px` }
                        : undefined
                    }
                  >
                    <div className="size-8 shrink-0 mt-1 rounded-full bg-primary/10 flex items-center justify-center">
                      <Sparkles className="size-4 text-primary" />
                    </div>
                    <div className="rounded-lg bg-muted px-4 py-2.5">
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Input Area */}
        <form
          ref={inputAreaRef}
          onSubmit={handleSubmit}
          className={cn(
            "flex gap-2 p-4 border-t bg-background/50 items-end",
            isExpandedView && "max-w-4xl mx-auto w-full"
          )}
        >
          <Textarea
            ref={currentTextareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              "flex-1 resize-none min-h-9",
              isExpandedView ? "max-h-48" : "max-h-32"
            )}
            rows={isExpandedView ? 2 : 1}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="shrink-0 h-[38px] w-[38px]"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </form>
      </>
    );
  };

  // Expanded fullscreen view using portal
  const expandedView = isExpanded && createPortal(
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-in fade-in-0">
      <div className="fixed inset-4 md:inset-8 lg:inset-12 z-50 flex flex-col bg-card text-card-foreground rounded-lg border shadow-lg animate-in zoom-in-95">
        {renderChatContent(true)}
      </div>
    </div>,
    document.body
  );

  return (
    <>
      <div
        ref={containerRef}
        className={cn(
          "flex flex-col bg-card text-card-foreground rounded-lg border shadow-sm",
          className
        )}
        style={{ height }}
      >
        {renderChatContent(false)}
      </div>
      {expandedView}
    </>
  );
}
