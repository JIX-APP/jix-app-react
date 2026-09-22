import React, { createContext, useContext } from 'react';

// ============================================================
// مين فاتح بث الحين، ومين عنده ستوري - مشترك بكل التطبيق.
// App.tsx يجيب البيانات مرة وحدة ويحدّثها لحظيًا، وأي صورة مستخدم
// بأي شاشة تسأل هنا بدل ما كل صورة تسوي استعلام لحالها.
// ============================================================

export interface LiveStreamInfo {
  id: string;
  user_id: string;
  username: string;
  channel_name: string;
  started_at: string;
}

interface JixPresenceValue {
  liveByUser: Record<string, LiveStreamInfo>;
  storyUserIds: Set<string>;
  openLive: (userId: string) => void;
  refreshStories: () => void;
}

const JixPresenceContext = createContext<JixPresenceValue>({
  liveByUser: {},
  storyUserIds: new Set(),
  openLive: () => {},
  refreshStories: () => {},
});

export const JixPresenceProvider = JixPresenceContext.Provider;

export const useJixPresence = () => useContext(JixPresenceContext);

// اختصار: حالة مستخدم واحد
export const useUserPresence = (userId: string | null | undefined) => {
  const { liveByUser, storyUserIds } = useJixPresence();
  return {
    isLive: !!userId && !!liveByUser[userId],
    hasStory: !!userId && storyUserIds.has(userId),
  };
};
