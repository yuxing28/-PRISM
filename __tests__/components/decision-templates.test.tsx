/**
 * 组件测试 - DecisionTemplates
 * 测试决策模板选择组件
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DecisionTemplates } from '@/components/chat/decision-templates';

describe('DecisionTemplates 组件测试', () => {
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    mockOnSelect.mockClear();
  });

  it('应该渲染所有模板按钮', () => {
    render(<DecisionTemplates onSelect={mockOnSelect} />);
    
    // 验证6个模板都显示
    expect(screen.getByText('职业选择')).toBeInTheDocument();
    expect(screen.getByText('投资决策')).toBeInTheDocument();
    expect(screen.getByText('学习规划')).toBeInTheDocument();
    expect(screen.getByText('购房决策')).toBeInTheDocument();
    expect(screen.getByText('创业决策')).toBeInTheDocument();
    expect(screen.getByText('人生抉择')).toBeInTheDocument();
  });

  it('应该显示标题文本', () => {
    render(<DecisionTemplates onSelect={mockOnSelect} />);
    
    expect(screen.getByText(/快速开始/i)).toBeInTheDocument();
    expect(screen.getByText(/选择决策模板/i)).toBeInTheDocument();
  });

  it('点击模板应该调用 onSelect 回调', () => {
    render(<DecisionTemplates onSelect={mockOnSelect} />);
    
    const careerButton = screen.getByText('职业选择');
    fireEvent.click(careerButton);
    
    expect(mockOnSelect).toHaveBeenCalledTimes(1);
    expect(mockOnSelect).toHaveBeenCalledWith(
      expect.stringContaining('跳槽')
    );
  });

  it('点击投资决策模板应该传递正确的 prompt', () => {
    render(<DecisionTemplates onSelect={mockOnSelect} />);
    
    const investButton = screen.getByText('投资决策');
    fireEvent.click(investButton);
    
    expect(mockOnSelect).toHaveBeenCalledWith(
      expect.stringContaining('投资股票')
    );
  });

  it('点击创业决策模板应该传递正确的 prompt', () => {
    render(<DecisionTemplates onSelect={mockOnSelect} />);
    
    const startupButton = screen.getByText('创业决策');
    fireEvent.click(startupButton);
    
    expect(mockOnSelect).toHaveBeenCalledWith(
      expect.stringContaining('创业想法')
    );
  });

  it('应该支持自定义 className', () => {
    const { container } = render(
      <DecisionTemplates onSelect={mockOnSelect} className="custom-class" />
    );
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('custom-class');
  });

  it('所有模板按钮应该有正确的样式类', () => {
    render(<DecisionTemplates onSelect={mockOnSelect} />);
    
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(6);
    
    buttons.forEach(button => {
      expect(button).toHaveClass('rounded-2xl');
    });
  });
});
