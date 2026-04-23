"use client";

import { useEffect, useState } from "react";
import { DefaultChatTransport, ToolUIPart } from "ai";
import { useChat } from "@ai-sdk/react";

import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";

import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";

import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";

type ForgeChatPanelProps = {
  agentId: string;
};

export function ForgeChatPanel({ agentId }: ForgeChatPanelProps) {
  const [input, setInput] = useState<string>("");

  const { messages, setMessages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/agents/${agentId}/chat`,
    }),
  });

  useEffect(() => {
    const fetchMessages = async () => {
      const res = await fetch(`/api/agents/${agentId}/chat`);
      const data = await res.json();
      setMessages([...data]);
    };
    fetchMessages();
  }, [agentId, setMessages]);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      <Conversation className="flex-1 min-h-0">
        <ConversationContent>
          {messages.map((message) => (
            <div key={message.id}>
              {message.parts?.map((part, i) => {
                if (part.type === "text") {
                  return (
                    <Message key={`${message.id}-${i}`} from={message.role}>
                      <MessageContent className="group-[.is-user]:!text-foreground group-[.is-assistant]:!text-background">
                        <MessageResponse>{part.text}</MessageResponse>
                      </MessageContent>
                    </Message>
                  );
                }

                if (part.type?.startsWith("tool-")) {
                  return (
                    <Tool key={`${message.id}-${i}`}>
                      <ToolHeader
                        type={(part as ToolUIPart).type}
                        state={(part as ToolUIPart).state || "output-available"}
                        className="cursor-pointer"
                      />
                      <ToolContent>
                        <ToolInput input={(part as ToolUIPart).input || {}} />
                        <ToolOutput
                          output={(part as ToolUIPart).output}
                          errorText={(part as ToolUIPart).errorText}
                        />
                      </ToolContent>
                    </Tool>
                  );
                }

                return null;
              })}
            </div>
          ))}
          <ConversationScrollButton />
        </ConversationContent>
      </Conversation>

      <PromptInput onSubmit={handleSubmit} className="mt-4 shrink-0">
        <PromptInputBody>
          <PromptInputTextarea
            onChange={(e) => setInput(e.target.value)}
            value={input}
            placeholder="Ask Sensei..."
            disabled={status !== "ready"}
            className="text-background placeholder:text-background/50 bg-transparent"
          />
        </PromptInputBody>
      </PromptInput>
    </div>
  );
}
