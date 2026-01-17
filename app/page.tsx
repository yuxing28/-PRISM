"use client";

import { useState, useEffect, useRef } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { ChatArea } from "@/components/chat/chat-area";
import { SettingsModal } from "@/components/settings/settings-modal";
import { LandingPage } from "@/components/landing/landing-page";
import { motion, AnimatePresence } from "framer-motion";

const LANDING_STATE_KEY = 'decision-ai-show-landing';

export default function Home() {
  const [showLanding, setShowLanding] = useState<boolean | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  // 用 useRef 追踪是否是用户主动点击进入，刷新后自动重置为 false
  const isUserTriggeredTransition = useRef(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 从 localStorage 恢复用户状态
  useEffect(() => {
    const saved = localStorage.getItem(LANDING_STATE_KEY);
    // 默认显示首页，除非用户之前已进入功能页
    setShowLanding(saved !== 'false');
  }, []);

  // 保存用户状态到 localStorage
  const handleEnterApp = () => {
    localStorage.setItem(LANDING_STATE_KEY, 'false');
    isUserTriggeredTransition.current = true; // 标记为用户主动点击
    setShowLanding(false);
  };

  const handleBackToLanding = () => {
    localStorage.setItem(LANDING_STATE_KEY, 'true');
    setShowLanding(true);
  };

  // 只有用户主动点击进入时才播放动效
  const shouldAnimate = isUserTriggeredTransition.current;
  
  // 移动端：简单淡入，桌面端：缩放效果
  const mainVariants = shouldAnimate
    ? (isMobile
        ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
        : { initial: { opacity: 0, scale: 1.05 }, animate: { opacity: 1, scale: 1 } })
    : { initial: { opacity: 1, scale: 1 }, animate: { opacity: 1, scale: 1 } };

  // 等待初始化完成
  if (showLanding === null) {
    return (
      <div className="h-screen w-full bg-gradient-to-br from-slate-50 via-sky-50/30 to-cyan-50/20" />
    );
  }

  return (
    <AnimatePresence mode="wait">
      {showLanding ? (
        <motion.div
          key="landing"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <LandingPage onEnter={handleEnterApp} />
        </motion.div>
      ) : (
        <motion.div
          key="main"
          initial={mainVariants.initial}
          animate={mainVariants.animate}
          transition={{ duration: shouldAnimate ? (isMobile ? 0.5 : 0.8) : 0, ease: "easeOut" }}
          className="h-screen w-full"
        >
          <MainLayout onLogoClick={handleBackToLanding}>
            <ChatArea />
            <SettingsModal />
          </MainLayout>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
