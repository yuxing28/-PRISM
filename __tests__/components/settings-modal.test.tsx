/**
 * 组件测试 - SettingsModal
 * 测试设置模态框组件
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsModal } from '@/components/settings/settings-modal';
import { useDecisionStore } from '@/lib/store';

// Mock Zustand store
jest.mock('@/lib/store', () => ({
  useDecisionStore: jest.fn()
}));

describe('SettingsModal 组件测试', () => {
  const mockSetApiKey = jest.fn();
  const mockToggleSettings = jest.fn();
  const mockClearAllData = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // 默认 mock 实现
    (useDecisionStore as unknown as jest.Mock).mockReturnValue({
      apiKey: '',
      setApiKey: mockSetApiKey,
      showSettings: true,
      toggleSettings: mockToggleSettings,
      clearAllData: mockClearAllData
    });
  });

  it('当 showSettings 为 false 时不应该渲染', () => {
    (useDecisionStore as unknown as jest.Mock).mockReturnValue({
      apiKey: '',
      setApiKey: mockSetApiKey,
      showSettings: false,
      toggleSettings: mockToggleSettings,
      clearAllData: mockClearAllData
    });

    const { container } = render(<SettingsModal />);
    expect(container.firstChild).toBeNull();
  });

  it('当 showSettings 为 true 时应该渲染模态框', () => {
    render(<SettingsModal />);
    
    expect(screen.getByText('用户设置')).toBeInTheDocument();
    expect(screen.getByText(/配置您的推演引擎参数/i)).toBeInTheDocument();
  });

  it('应该显示 API Key 输入框', () => {
    render(<SettingsModal />);
    
    expect(screen.getByText(/DeepSeek 接口密钥/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('sk-...')).toBeInTheDocument();
  });

  it('应该显示现有的 API Key', () => {
    (useDecisionStore as unknown as jest.Mock).mockReturnValue({
      apiKey: 'sk-test-key-123',
      setApiKey: mockSetApiKey,
      showSettings: true,
      toggleSettings: mockToggleSettings,
      clearAllData: mockClearAllData
    });

    render(<SettingsModal />);
    
    const input = screen.getByPlaceholderText('sk-...') as HTMLInputElement;
    expect(input.value).toBe('sk-test-key-123');
  });

  it('应该支持输入新的 API Key', () => {
    render(<SettingsModal />);
    
    const input = screen.getByPlaceholderText('sk-...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'sk-new-key' } });
    
    expect(input.value).toBe('sk-new-key');
  });

  it('点击保存按钮应该调用 setApiKey', () => {
    render(<SettingsModal />);
    
    const input = screen.getByPlaceholderText('sk-...');
    fireEvent.change(input, { target: { value: 'sk-new-key' } });
    
    const saveButton = screen.getByText('保存配置');
    fireEvent.click(saveButton);
    
    expect(mockSetApiKey).toHaveBeenCalledWith('sk-new-key');
    expect(mockToggleSettings).toHaveBeenCalledWith(false);
  });

  it('点击关闭按钮应该关闭模态框', () => {
    render(<SettingsModal />);
    
    // 使用更具体的选择器 - 查找包含 X 图标的按钮
    const buttons = screen.getAllByRole('button');
    const closeButton = buttons.find(btn => 
      btn.querySelector('svg.lucide-x')
    );
    
    expect(closeButton).toBeDefined();
    if (closeButton) {
      fireEvent.click(closeButton);
      expect(mockToggleSettings).toHaveBeenCalledWith(false);
    }
  });

  it('应该显示清除数据按钮', () => {
    render(<SettingsModal />);
    
    expect(screen.getByText(/清除所有本地缓存数据/i)).toBeInTheDocument();
  });

  it('点击清除数据按钮应该显示确认对话框', () => {
    // Mock window.confirm
    const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
    
    render(<SettingsModal />);
    
    const clearButton = screen.getByText(/清除所有本地缓存数据/i);
    fireEvent.click(clearButton);
    
    expect(mockConfirm).toHaveBeenCalledWith(
      expect.stringContaining('确定要清除')
    );
    
    mockConfirm.mockRestore();
  });

  it('确认清除数据应该调用 clearAllData', () => {
    const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
    
    render(<SettingsModal />);
    
    const clearButton = screen.getByText(/清除所有本地缓存数据/i);
    fireEvent.click(clearButton);
    
    expect(mockClearAllData).toHaveBeenCalled();
    
    mockConfirm.mockRestore();
  });

  it('应该支持切换密码显示/隐藏', () => {
    render(<SettingsModal />);
    
    const input = screen.getByPlaceholderText('sk-...') as HTMLInputElement;
    expect(input.type).toBe('password');
    
    // 查找眼睛图标按钮（通过父元素查找）
    const toggleButtons = screen.getAllByRole('button');
    const eyeButton = toggleButtons.find(btn => 
      btn.querySelector('svg') && btn.className.includes('hover:text-slate-500')
    );
    
    if (eyeButton) {
      fireEvent.click(eyeButton);
      expect(input.type).toBe('text');
      
      fireEvent.click(eyeButton);
      expect(input.type).toBe('password');
    }
  });

  it('应该显示版本信息', () => {
    render(<SettingsModal />);
    
    expect(screen.getByText(/Prism AI Terminal/i)).toBeInTheDocument();
  });

  it('应该显示安全提示', () => {
    render(<SettingsModal />);
    
    expect(screen.getByText(/密钥仅加密存储在您的本地浏览器中/i)).toBeInTheDocument();
  });
});
