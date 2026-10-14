'use client';

import React, { useState } from 'react';
import { DEFAULT_MENUS, MenuItem, RiggedConfig } from '@/types/lunch';
import { X, RotateCcw, Save, Plus, Trash2, Eye, ShieldAlert, Sparkles, Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  menus: MenuItem[];
  onSaveMenus: (menus: MenuItem[]) => void;
  riggedConfig: RiggedConfig;
  onSaveRiggedConfig: (config: RiggedConfig) => void;
}

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#10B981', '#06B6D4',
  '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E',
];

export default function SettingsModal({
  isOpen,
  onClose,
  menus,
  onSaveMenus,
  riggedConfig,
  onSaveRiggedConfig,
}: SettingsModalProps) {
  const [localMenus, setLocalMenus] = useState<MenuItem[]>(menus);
  const [localRigged, setLocalRigged] = useState<RiggedConfig>(riggedConfig);
  const [activeTab, setActiveTab] = useState<'menus' | 'secret'>('menus');
  const [savedNotice, setSavedNotice] = useState(false);

  // Sync when opened
  React.useEffect(() => {
    if (isOpen) {
      setLocalMenus(menus);
      setLocalRigged(riggedConfig);
      setSavedNotice(false);
    }
  }, [isOpen, menus, riggedConfig]);

  if (!isOpen) return null;

  const handleMenuChange = (id: string, field: keyof MenuItem, value: string) => {
    setLocalMenus((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleAddMenu = () => {
    if (localMenus.length >= 16) {
      alert('메뉴는 최대 16개까지 추천됩니다.');
      return;
    }
    const newId = `custom-${Date.now()}`;
    const newItem: MenuItem = {
      id: newId,
      name: '새 점심 메뉴',
      emoji: '🍽️',
      color: PRESET_COLORS[localMenus.length % PRESET_COLORS.length],
      description: '맛있고 든든한 점심 식사',
      category: '기타',
    };
    setLocalMenus((prev) => [...prev, newItem]);
  };

  const handleDeleteMenu = (id: string) => {
    if (localMenus.length <= 2) {
      alert('최소 2개 이상의 메뉴가 필요합니다.');
      return;
    }
    setLocalMenus((prev) => prev.filter((item) => item.id !== id));
    if (localRigged.targetMenuId === id) {
      setLocalRigged((prev) => ({ ...prev, targetMenuId: null, enabled: false }));
    }
  };

  const handleResetDefaults = () => {
    if (confirm('기본 추천 메뉴 10개로 초기화하시겠습니까?')) {
      setLocalMenus(DEFAULT_MENUS);
      setLocalRigged({
        enabled: false,
        targetMenuId: null,
        dramaticNearMiss: true,
      });
    }
  };

  const handleSaveAll = () => {
    onSaveMenus(localMenus);
    onSaveRiggedConfig(localRigged);
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-700/80 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/40">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              ⚙️ 메뉴 & 룰렛 설정
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              점심 후보 메뉴를 변경하거나 아슬아슬 당첨을 세팅하세요.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-full bg-neutral-800 hover:bg-neutral-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-neutral-800 bg-neutral-900/90 px-6 pt-3 gap-3">
          <button
            onClick={() => setActiveTab('menus')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'menus'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span>🍱 점심 메뉴 목록 ({localMenus.length}개)</span>
          </button>
          <button
            onClick={() => setActiveTab('secret')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'secret'
                ? 'border-rose-400 text-rose-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>🎯 비밀 강제 당첨 (아슬아슬 주작)</span>
            {localRigged.enabled && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeTab === 'menus' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
                <span>이모지 / 이름 / 설명 / 카테고리를 자유롭게 수정하세요.</span>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="inline-flex items-center gap-1 text-neutral-400 hover:text-amber-400 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>기본 10개 초기화</span>
                </button>
              </div>

              {localMenus.map((item, index) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 p-3 rounded-2xl bg-neutral-800/60 border border-neutral-700/60 hover:border-neutral-600 transition-colors"
                >
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs font-mono text-neutral-500 w-5">
                      #{index + 1}
                    </span>
                    {/* Emoji input */}
                    <input
                      type="text"
                      maxLength={4}
                      value={item.emoji}
                      onChange={(e) => handleMenuChange(item.id, 'emoji', e.target.value)}
                      className="w-12 h-10 text-center text-xl bg-neutral-900 border border-neutral-700 rounded-xl focus:outline-none focus:border-amber-400 text-white"
                      title="이모지"
                    />
                    {/* Name input */}
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleMenuChange(item.id, 'name', e.target.value)}
                      placeholder="메뉴 이름"
                      className="flex-1 sm:w-36 h-10 px-3 text-sm font-semibold bg-neutral-900 border border-neutral-700 rounded-xl focus:outline-none focus:border-amber-400 text-white"
                    />
                  </div>

                  {/* Description input */}
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleMenuChange(item.id, 'description', e.target.value)}
                    placeholder="한 줄 설명"
                    className="w-full sm:flex-1 h-10 px-3 text-xs bg-neutral-900 border border-neutral-700 rounded-xl focus:outline-none focus:border-amber-400 text-neutral-300"
                  />

                  {/* Color & delete */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <input
                      type="color"
                      value={item.color}
                      onChange={(e) => handleMenuChange(item.id, 'color', e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      title="테마 색상"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteMenu(item.id)}
                      disabled={localMenus.length <= 2}
                      className="p-2 text-neutral-400 hover:text-red-400 rounded-lg hover:bg-neutral-800 disabled:opacity-30 disabled:hover:text-neutral-400 transition-colors"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddMenu}
                className="w-full py-3 border border-dashed border-neutral-700 hover:border-amber-400/60 rounded-2xl text-xs font-semibold text-neutral-400 hover:text-amber-400 flex items-center justify-center gap-1.5 transition-all bg-neutral-900/40"
              >
                <Plus className="w-4 h-4" />
                <span>새 메뉴 추가하기</span>
              </button>
            </div>
          )}

          {activeTab === 'secret' && (
            <div className="space-y-5 p-2">
              <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-800/40 text-rose-200">
                <div className="flex items-center gap-2 font-bold text-sm text-rose-400">
                  <Eye className="w-4 h-4" />
                  <span>극적인 아슬아슬 당첨 조작기</span>
                </div>
                <p className="text-xs text-rose-200/80 mt-1.5 leading-relaxed">
                  팀원들과 점심 내기나 룰렛을 돌릴 때, <strong>원하는 메뉴가 다른 후보와 마지막 순간까지 치열하게 경합하다가 0.1초 차이로 역전 당첨</strong>되도록 조작합니다. 아무도 눈치채지 못할 만큼 자연스럽고 손에 땀을 쥐게 합니다.
                </p>
              </div>

              {/* Master toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-800/70 border border-neutral-700">
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>강제 당첨 모드 활성화</span>
                    {localRigged.enabled && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        작동중
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    끄면 100% 완전 공정한 순수 랜덤으로 결정됩니다.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localRigged.enabled}
                    onChange={(e) =>
                      setLocalRigged((prev) => ({
                        ...prev,
                        enabled: e.target.checked,
                        targetMenuId: e.target.checked && !prev.targetMenuId ? localMenus[0]?.id : prev.targetMenuId,
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500" />
                </label>
              </div>

              {/* Target Pick selection */}
              <div className={`space-y-3 transition-opacity ${localRigged.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                <label className="block text-xs font-semibold text-neutral-300">
                  🎯 무조건 당첨시킬 비밀 메뉴 선택:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {localMenus.map((item) => {
                    const isSelected = localRigged.targetMenuId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          setLocalRigged((prev) => ({ ...prev, targetMenuId: item.id }))
                        }
                        className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'bg-rose-500/20 border-rose-500 text-white shadow-lg shadow-rose-500/10'
                            : 'bg-neutral-800/40 border-neutral-700/60 text-neutral-300 hover:bg-neutral-800'
                        }`}
                      >
                        <span className="text-2xl">{item.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold truncate">{item.name}</div>
                          <div className="text-[11px] text-neutral-400 truncate">
                            {item.description}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center text-white text-xs">
                            ✓
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Dramatic near-miss effect checkbox */}
                <div className="pt-2">
                  <label className="flex items-center gap-3 p-3 rounded-2xl bg-neutral-800/50 border border-neutral-700/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localRigged.dramaticNearMiss}
                      onChange={(e) =>
                        setLocalRigged((prev) => ({
                          ...prev,
                          dramaticNearMiss: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 rounded text-rose-500 bg-neutral-900 border-neutral-700 focus:ring-rose-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>아슬아슬 역전 연출 적용 (강력 추천)</span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        룰렛은 옆 칸에 멈추려다 틱 넘어가고, 선풍기는 마지막 1cm 역전, 슬롯은 마지막 릴이 튕기며 맞춰집니다.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-neutral-950/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            취소
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 font-bold text-xs shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
          >
            {savedNotice ? (
              <>
                <Check className="w-4 h-4" />
                <span>저장 완료!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>설정 저장하기</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
