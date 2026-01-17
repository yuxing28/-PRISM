"use client";

import { Briefcase, Heart, GraduationCap, TrendingUp, Home, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface DecisionTemplatesProps {
    onSelect: (template: string) => void;
    className?: string;
}

const TEMPLATES = [
    {
        icon: Briefcase,
        title: "职业选择",
        prompt: "我正在考虑是否要跳槽到一家新公司。新公司薪资涨幅30%，但需要转换技术栈，且公司规模较小。请帮我分析这个决策。",
    },
    {
        icon: TrendingUp,
        title: "投资决策",
        prompt: "我有一笔闲置资金，正在考虑是投资股票、基金还是房产。我的风险承受能力中等，投资周期3-5年。请帮我分析各选项的利弊。",
    },
    {
        icon: GraduationCap,
        title: "学习规划",
        prompt: "我想学习一门新技能来提升竞争力，目前在考虑AI/机器学习、产品管理、数据分析三个方向。请帮我分析哪个方向更适合我。",
    },
    {
        icon: Home,
        title: "购房决策",
        prompt: "我正在考虑是否要买房。目前租房每月5000元，看中的房子首付需要100万，月供8000元。请帮我分析买房vs继续租房的利弊。",
    },
    {
        icon: Users,
        title: "创业决策",
        prompt: "我有一个创业想法，想辞职全职创业。目前有一定积蓄，但市场竞争激烈。请帮我评估这个创业决策的风险和可行性。",
    },
    {
        icon: Heart,
        title: "人生抉择",
        prompt: "我面临一个重要的人生选择，需要在稳定的现状和充满不确定性的新机会之间做出决定。请帮我理性分析这个决策。",
    }
];

export function DecisionTemplates({ onSelect, className }: DecisionTemplatesProps) {
    return (
        <div className={cn("w-full max-w-3xl mx-auto", className)}>
            <div className="text-center mb-6">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">快速开始 · 选择决策模板</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {TEMPLATES.map((template, idx) => {
                    const Icon = template.icon;
                    return (
                        <button
                            key={idx}
                            onClick={() => onSelect(template.prompt)}
                            className={cn(
                                "flex flex-col items-center gap-2 p-4 rounded-2xl border backdrop-blur-sm transition-all duration-300",
                                "bg-white/40 hover:bg-white/60 border-white/60 hover:border-slate-200/80",
                                "hover:scale-[1.02] hover:shadow-sm active:scale-[0.98]"
                            )}
                        >
                            <Icon className="w-6 h-6 text-slate-400" />
                            <span className="text-sm font-bold text-slate-700">{template.title}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
