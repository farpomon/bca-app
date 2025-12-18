import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Bot, User, Sparkles, Trash2, Lightbulb } from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

interface AIInsightsChatProps {
  sessionType: 'project' | 'asset' | 'company';
  contextId?: number; // projectId or assetId (not needed for company)
  title?: string;
  className?: string;
}

interface Message {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export function AIInsightsChat({ sessionType, contextId, title, className }: AIInsightsChatProps) {
  const [message, setMessage] = useState("");
  const [sessionId, setSessionId] = useState<number | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [clickedQuestionIndex, setClickedQuestionIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch suggested questions
  const { data: suggestedQuestionsData } = trpc.aiChat.getSuggestedQuestions.useQuery(
    {
      sessionType,
      contextId,
    },
    {
      enabled: messages.length === 0, // Only show when chat is empty
    }
  );

  const suggestedQuestions = suggestedQuestionsData?.questions || [];

  const sendMessageMutation = trpc.aiChat.sendMessage.useMutation({
    onSuccess: (data) => {
      // Add assistant response to messages
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: 'assistant',
          content: data.message,
          createdAt: new Date().toISOString(),
        },
      ]);
      setSessionId(data.sessionId);
      setMessage("");
    },
    onError: (error) => {
      toast.error("Failed to send message", {
        description: error.message,
      });
    },
  });

  const deleteSessionMutation = trpc.aiChat.deleteSession.useMutation({
    onSuccess: () => {
      setMessages([]);
      setSessionId(undefined);
      toast.success("Chat cleared");
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;
    if (sendMessageMutation.isPending) return;

    // Add user message to UI immediately
    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: message.trim(),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Send to backend
    sendMessageMutation.mutate({
      sessionType,
      contextId,
      message: message.trim(),
      sessionId,
    });
  };

  const handleClearChat = () => {
    if (sessionId) {
      deleteSessionMutation.mutate({ sessionId });
    } else {
      setMessages([]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestedQuestionClick = (question: string, index: number) => {
    setClickedQuestionIndex(index);
    setMessage(question);
    // Optionally auto-send the question
    setTimeout(() => {
      sendMessageMutation.mutate({
        sessionType,
        contextId,
        message: question,
        sessionId,
      });
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: 'user',
          content: question,
          createdAt: new Date().toISOString(),
        },
      ]);
      setMessage("");
      setClickedQuestionIndex(null);
    }, 0);
  };

  return (
    <Card className={`flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">
            {title || `AI Insights - ${sessionType.charAt(0).toUpperCase() + sessionType.slice(1)}`}
          </h3>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearChat}
            disabled={deleteSessionMutation.isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="h-12 w-12 mb-4 opacity-50 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Ask me anything about this {sessionType}.
            </p>
            <p className="text-xs mt-2 text-muted-foreground">
              I can analyze conditions, costs, deficiencies, and trends.
            </p>

            {/* Suggested Questions */}
            {suggestedQuestions.length > 0 && (
              <div className="mt-6 w-full max-w-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium text-foreground">Suggested Questions</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {suggestedQuestions.map((question, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 hover:border-primary transition-colors p-3 h-auto justify-start text-left text-xs font-normal flex items-center gap-2"
                      onClick={() => handleSuggestedQuestionClick(question, index)}
                    >
                      {clickedQuestionIndex === index && (
                        <Loader2 className="h-3 w-3 animate-spin flex-shrink-0" />
                      )}
                      <span className="flex-1">{question}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <Streamdown className="text-sm">{msg.content}</Streamdown>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
            {sendMessageMutation.isPending && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            placeholder="Ask about conditions, costs, deficiencies..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sendMessageMutation.isPending}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sendMessageMutation.isPending}
            size="icon"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
