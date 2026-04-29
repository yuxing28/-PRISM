"use client";

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { ChatArea } from "@/components/chat/chat-area";
import { SettingsModal } from "@/components/settings/settings-modal";
import { LandingPage } from "@/components/landing/landing-page";
import { motion, AnimatePresence } from "framer-motion";

const LANDING_STATE_KEY = 'decision-ai-show-landing';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  // 水合完成后才读取 localStorage，避免 SSR/CSR 不匹配
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(LANDING_STATE_KEY);
    if (saved === 'false') {
      setShowLanding(false);
    }
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 保存用户状态到 localStorage
  const handleEnterApp = () => {
    localStorage.setItem(LANDING_STATE_KEY, 'false');
    setShouldAnimate(true);
    setShowLanding(false);
  };

  const handleBackToLanding = () => {
    localStorage.setItem(LANDING_STATE_KEY, 'true');
    setShouldAnimate(false);
    setShowLanding(true);
  };

  // 移动端：简单淡入，桌面端：缩放效果
  const mainVariants = shouldAnimate
    ? (isMobile
        ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
        : { initial: { opacity: 0, scale: 1.05 }, animate: { opacity: 1, scale: 1 } })
    : { initial: { opacity: 1, scale: 1 }, animate: { opacity: 1, scale: 1 } };

  // 水合完成前显示加载态，避免 SSR/CSR 闪屏
  if (!mounted) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
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
