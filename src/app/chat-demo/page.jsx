'use client';

import React, { useState } from 'react';
import { Chatroom } from '@/components/chat/Chatroom';

// Use a fixed base timestamp to prevent hydration mismatches
const BASE_TIMESTAMP = new Date('2026-04-23T15:30:00Z');

// Mock data for demo
const mockChannels = [
  {
    id: '1',
    name: 'general',
    description: 'General discussion for all students',
    type: 'PUBLIC',
  },
  {
    id: '2',
    name: 'campus-news',
    description: 'Latest updates and announcements',
    type: 'PUBLIC',
  },
  {
    id: '3',
    name: 'assignments-help',
    description: 'Help with coursework and assignments',
    type: 'PUBLIC',
  },
  {
    id: '4',
    name: 'social',
    description: 'Off-topic and fun discussions',
    type: 'PUBLIC',
  },
];

const mockMessages = [
  {
    id: '1',
    content: "Hey everyone! Just wanted to share that the library is having extended hours this week for finals prep.",
    user: {
      id: 'user-2',
      displayName: 'Sarah Chen',
      avatar: null,
    },
    userId: 'user-2',
    channelId: '2',
    createdAt: new Date(BASE_TIMESTAMP.getTime() - 1000 * 60 * 5),
    isEdited: false,
    isDeleted: false,
    replyTo: null,
  },
  {
    id: '2',
    content: 'Thanks for the update! I definitely need to use that extra time.',
    user: {
      id: 'user-1',
      displayName: 'Alex Rodriguez',
      avatar: null,
    },
    userId: 'user-1',
    channelId: '2',
    createdAt: new Date(BASE_TIMESTAMP.getTime() - 1000 * 60 * 3),
    isEdited: false,
    isDeleted: false,
    replyTo: null,
  },
  {
    id: '3',
    content: 'Did anyone else find the organic chemistry exam really tough? I need study tips.',
    user: {
      id: 'user-3',
      displayName: 'Jamie Taylor',
      avatar: null,
    },
    userId: 'user-3',
    channelId: '3',
    createdAt: new Date(BASE_TIMESTAMP.getTime() - 1000 * 60 * 2),
    isEdited: false,
    isDeleted: false,
    replyTo: null,
  },
  {
    id: '4',
    content: 'I found Khan Academy videos really helpful for understanding mechanisms. Check out their organic chemistry playlist!',
    user: {
      id: 'user-4',
      displayName: 'Morgan Lee',
      avatar: null,
    },
    userId: 'user-4',
    channelId: '3',
    createdAt: new Date(BASE_TIMESTAMP.getTime() - 1000 * 60 * 1),
    isEdited: false,
    isDeleted: false,
    replyTo: null,
  },
];

export default function ChatroomDemo() {
  const [selectedChannel, setSelectedChannel] = useState(mockChannels[1]);
  const [messages, setMessages] = useState(mockMessages.filter(m => m.channelId === mockChannels[1].id));
  const [isSending, setIsSending] = useState(false);

  const handleSelectChannel = (channelId) => {
    const channel = mockChannels.find(c => c.id === channelId);
    setSelectedChannel(channel);
    setMessages(mockMessages.filter(m => m.channelId === channelId || m.channelId === channel.id));
  };

  const handleSendMessage = ({ content }) => {
    setIsSending(true);
    setTimeout(() => {
      const newMessage = {
        id: Date.now().toString(),
        content,
        user: {
          id: 'current-user',
          displayName: 'You',
          avatar: null,
        },
        userId: 'current-user',
        channelId: selectedChannel.id,
        createdAt: new Date(),
        isEdited: false,
        isDeleted: false,
        replyTo: null,
      };
      setMessages([...messages, newMessage]);
      setIsSending(false);
    }, 500);
  };

  const handleDeleteMessage = (messageId) => {
    setMessages(messages.map(m => 
      m.id === messageId 
        ? { ...m, isDeleted: true, content: '[Deleted]' }
        : m
    ));
  };

  return (
    <div className="w-full h-screen">
      <Chatroom
        channels={mockChannels}
        messages={messages}
        currentUserId="current-user"
        isLoading={false}
        isSending={isSending}
        selectedChannel={selectedChannel}
        onSelectChannel={handleSelectChannel}
        onSendMessage={handleSendMessage}
        onCreateChannel={() => alert('Create channel clicked')}
        onAttachFile={() => alert('Attach file clicked')}
        onDeleteMessage={handleDeleteMessage}
        onEditMessage={(msg) => console.log('Edit:', msg)}
        onReportMessage={(msg) => alert(`Reported message from ${msg.user.displayName}`)}
      />
    </div>
  );
}
