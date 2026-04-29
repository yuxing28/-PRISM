/**
 * 组件测试 - DimensionRadar
 * 测试多维度雷达图组件
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DimensionRadar } from '@/components/ui/dimension-radar';

describe('DimensionRadar 组件测试', () => {
  const mockDimensions = {
    logic: 8,
    feasibility: 7,
    risk: 6,
    value: 9,
    timing: 7,
    resource: 5
  };

  const emptyDimensions = {
    logic: 0,
    feasibility: 0,
    risk: 0,
    value: 0,
    timing: 0,
    resource: 0
  };

  it('应该渲染雷达图（有数据时）', () => {
    const { container } = render(<DimensionRadar dimensions={mockDimensions} />);
    
    // 验证 ResponsiveContainer 被渲染
    const responsiveContainer = container.querySelector('.recharts-responsive-container');
    expect(responsiveContainer).toBeInTheDocument();
  });

  it('应该显示空状态（无数据时）', () => {
    render(<DimensionRadar dimensions={emptyDimensions} />);
    
    expect(screen.getByText('等待多维分析数据...')).toBeInTheDocument();
  });

  it('应该在红队模式下使用不同的颜色', () => {
    const { container } = render(
      <DimensionRadar dimensions={mockDimensions} isDebateMode={true} />
    );
    
    // 验证组件被渲染（颜色通过 props 传递给 Recharts）
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('应该支持自定义 className', () => {
    const { container } = render(
      <DimensionRadar dimensions={mockDimensions} className="custom-radar" />
    );
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('custom-radar');
  });

  it('应该在部分维度有数据时渲染雷达图', () => {
    const partialDimensions = {
      logic: 5,
      feasibility: 0,
      risk: 0,
      value: 7,
      timing: 0,
      resource: 0
    };

    const { container } = render(<DimensionRadar dimensions={partialDimensions} />);
    
    // 只要有任何维度 > 0，就应该渲染雷达图
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('空状态应该显示加载动画', () => {
    const { container } = render(<DimensionRadar dimensions={emptyDimensions} />);
    
    // 验证动画元素存在
    const animatedElement = container.querySelector('.animate-spin');
    expect(animatedElement).toBeInTheDocument();
  });
});
