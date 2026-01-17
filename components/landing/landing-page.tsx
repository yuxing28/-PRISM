"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

interface LandingPageProps {
    onEnter: () => void;
}

export function LandingPage({ onEnter }: LandingPageProps) {
    const [isExiting, setIsExiting] = useState(false);

    const handleEnter = () => {
        setIsExiting(true);
        setTimeout(() => {
            onEnter();
        }, 800); // 穿梭动画时长
    };

    const features = [
        {
            title: "防骗雷达",
            line1: "识破「稳赚不赔」话术",
            line2: "守住你的钱包",
            icon: "/images/landing/icon-audit.png",
        },
        {
            title: "沙盘推演",
            line1: "提前看到最坏结局",
            line2: "别等撞南墙才后悔",
            icon: "/images/landing/icon-stress.png",
        },
        {
            title: "家庭和事佬",
            line1: "用客观数据评分",
            line2: "化解夫妻分歧",
            icon: "/images/landing/icon-model.png",
        },
        {
            title: "24小时顾问",
            line1: "像麦肯锡顾问随时在线",
            line2: "只说真话",
            icon: "/images/landing/icon-confidence.png",
        },
    ];

    return (
        <div className="relative w-full min-h-screen overflow-x-hidden bg-white selection:bg-sky-100">
            {/* 背景图层 */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/images/landing/hero-bg.jpg"
                    alt="Background"
                    fill
                    className="object-cover"
                    priority
                />
            </div>

            {/* 3D 主体元素 - 仅桌面端显示 */}
            <AnimatePresence mode="wait">
                {!isExiting && (
                    <motion.div
                        key="hero-object"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            y: [0, -20, 0],
                        }}
                        exit={{
                            scale: 2.5,
                            opacity: 0,
                            filter: "blur(40px)",
                            transition: { duration: 1, ease: [0.4, 0, 0.2, 1] }
                        }}
                        transition={{
                            y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
                            default: { duration: 1.5, ease: "easeOut" }
                        }}
                        className="absolute inset-0 z-10 pointer-events-none hidden lg:block"
                    >
                        <Image
                            src="/images/landing/hero-object.png"
                            alt="Hero Object"
                            fill
                            className="object-cover"
                            priority
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 内容区域 */}
            <div className="relative z-20 min-h-screen flex flex-col justify-center items-center lg:items-start px-6 py-16 lg:px-32 lg:py-0">
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: isExiting ? 0 : 1, x: isExiting ? -50 : 0 }}
                    transition={{ duration: 1 }}
                    className="max-w-xl text-center lg:text-left"
                >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:gap-4 mb-2 lg:mb-3">
                        <h1 className="text-3xl lg:text-5xl font-bold text-slate-900 leading-[1.2]">
                            智镜 PRISM
                        </h1>
                        
                        {/* 社会认同标签 - 与"智镜 PRISM"垂直居中对齐 */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 text-white mt-3 lg:mt-0"
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                            <span className="text-[10px] font-medium whitespace-nowrap">已为 10,000+ 家庭提供参考</span>
                        </motion.div>
                    </div>

                    <h2 className="text-3xl lg:text-5xl font-bold bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent leading-[1.2] mb-3 lg:mb-4">
                        你的 AI 理性决策外脑
                    </h2>

                    <p className="text-sm lg:text-base text-slate-600 mb-8 lg:mb-10 leading-relaxed max-w-md">
                        一次选错，可能就是几年积蓄。
                        <br />
                        防骗避坑、买房置业、化解家庭分歧——
                        <br />
                        别让情绪左右你，让 AI 帮你做一次「决策体检」。
                    </p>

                    <div className="flex flex-col items-center lg:items-start gap-3">
                        <button
                            onClick={handleEnter}
                            className="group relative inline-flex items-center space-x-3 bg-slate-900 text-white px-6 py-3 lg:px-8 lg:py-4 rounded-full lg:rounded-xl font-medium overflow-hidden transition-all hover:shadow-2xl hover:shadow-sky-200 hover:-translate-y-1 active:scale-95"
                        >
                            <span className="relative z-10">立即免费分析</span>
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            <div className="absolute inset-0 bg-gradient-to-r from-sky-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </button>
                        <p className="text-xs text-slate-400 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            无需注册 · 数据本地存储 · 像日记本一样安全
                        </p>
                    </div>
                </motion.div>

                {/* 功能展示区 */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: isExiting ? 0 : 1, y: isExiting ? 20 : 0 }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="mt-8 lg:mt-12 grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-3 max-w-3xl"
                >
                    {features.map((feature, idx) => (
                        <div key={idx} className="group flex flex-col items-center text-center translate-y-0 hover:-translate-y-2 transition-transform duration-500 px-2">
                            <div className="relative w-14 h-14 lg:w-16 lg:h-16 mb-2.5 lg:mb-3 font-bold flex items-center justify-center">
                                {/* 基础背景微光 - 常驻 */}
                                <div className="absolute inset-0 bg-sky-400/10 blur-2xl rounded-full pointer-events-none"></div>
                                {/* 悬停增强光晕 */}
                                <div className="absolute inset-0 bg-sky-400/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                                <Image
                                    src={feature.icon}
                                    alt={feature.title}
                                    width={64}
                                    height={64}
                                    className="relative z-10 object-contain transition-all duration-500 group-hover:brightness-110 drop-shadow-[0_0_12px_rgba(56,189,248,0.3)]"
                                />
                            </div>
                            <h3 className="text-slate-800 font-bold text-sm lg:text-base mb-1.5 lg:mb-2">{feature.title}</h3>
                            <p className="text-[10px] lg:text-xs text-slate-500 leading-relaxed">
                                {feature.line1}
                                <br />
                                {feature.line2}
                            </p>
                        </div>
                    ))}
                </motion.div>
            </div>

        </div>
    );
}
