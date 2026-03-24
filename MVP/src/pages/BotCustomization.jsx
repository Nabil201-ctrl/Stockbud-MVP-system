
import React, { useState, useEffect } from 'react';
import { Bot, MessageSquare, Settings, Palette, Zap, Shield, Globe, Brain } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { TrendingUp } from 'lucide-react';

const BotCustomization = () => {
  const { isDarkMode } = useTheme();
  const { user, updateProfile } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const [botSettings, setBotSettings] = useState({
    responseSpeed: 'Medium',
    theme: 'Blue',
    language: 'English',
    notifications: true,
    voiceEnabled: false,
    dataAccess: 'Limited',
    autoRespond: true
  });

  useEffect(() => {
    if (user?.shopifyStores && user.activeShopId) {
      const activeShop = user.shopifyStores.find(s => s.id === user.activeShopId);
      if (activeShop?.botSettings) {
        setBotSettings(prev => ({
          ...prev,
          ...activeShop.botSettings
        }));
      } else if (user.botSettings) {
        
        setBotSettings(prev => ({
          ...prev,
          ...user.botSettings
        }));
      }
    } else if (user?.botSettings) {
      setBotSettings(prev => ({
        ...prev,
        ...user.botSettings
      }));
    }
  }, [user]);

  const handleSettingChange = (setting, value) => {
    setBotSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setSaveStatus('');
    try {
      // Use new endpoint for shop-specific settings
      if (user?.activeShopId) {
        const response = await fetch(`http://localhost:3000/users/shopify-stores/${user.activeShopId}/settings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(botSettings)
        });

        if (response.ok) {
          setSaveStatus(t('bot.success'));
          setTimeout(() => setSaveStatus(''), 3000);
        } else {
          setSaveStatus(t('bot.error'));
        }
      } else {
        
        const result = await updateProfile({ botSettings });
        if (result.success) {
          setSaveStatus(t('bot.success'));
          setTimeout(() => setSaveStatus(''), 3000);
        } else {
          setSaveStatus(t('bot.error'));
        }
      }

    } catch (error) {
      console.error(error);
      setSaveStatus(t('bot.error'));
    } finally {
      setLoading(false);
    }
  };

  const personalityOptions = [
    { id: 'professional', label: 'Professional', icon: '', description: 'Formal and business-like responses' },
    { id: 'friendly', label: 'Friendly', icon: '', description: 'Warm and approachable tone' },
    { id: 'technical', label: 'Technical', icon: '', description: 'Detailed and data-focused' },
    { id: 'concise', label: 'Concise', icon: '', description: 'Short and to-the-point responses' }
  ];

  const themeOptions = [
    { id: 'blue', label: 'Blue', color: 'bg-blue-500' },
    { id: 'purple', label: 'Purple', color: 'bg-purple-500' },
    { id: 'green', label: 'Green', color: 'bg-green-500' },
    { id: 'orange', label: 'Orange', color: 'bg-orange-500' }
  ];

  return (
    <div className={`p-6 min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-7xl mx-auto">
        {}
        <div className="mb-8" id="bot-header">
          <h1 className="text-3xl font-bold mb-2">{t('bot.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {t('bot.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {}
          <div className={`lg:col-span-2 rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`} id="bot-preview-card">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className={`w-16 h-16 rounded-full flex-shrink-0 ${themeOptions.find(t => t.id === botSettings.theme.toLowerCase())?.color || 'bg-blue-500'} flex items-center justify-center`}>
                  <Bot size={32} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{botSettings.name}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className={`px-2 py-1 rounded-full text-xs ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      {botSettings.personality} Personality
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      {botSettings.responseSpeed} Speed
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between w-full sm:w-auto sm:block text-right">
                <div className="text-sm text-gray-500 dark:text-gray-400">{t('bot.status')}</div>
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium">{t('bot.active')}</span>
                </div>
              </div>
            </div>

            {}
            <div className={`rounded-lg p-4 mb-6 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <div className="text-sm font-medium mb-2">{t('bot.previewChat')}</div>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-white text-xs">{t('bot.you')}</span>
                  </div>
                  <div className={`rounded-lg p-3 max-w-[70%] ${isDarkMode ? 'bg-gray-600' : 'bg-white'}`}>
                    <p className="text-sm">{t('bot.sampleQuestion')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className={`w-8 h-8 rounded-full ${themeOptions.find(t => t.id === botSettings.theme.toLowerCase())?.color || 'bg-blue-500'} flex items-center justify-center`}>
                    <Bot size={16} className="text-white" />
                  </div>
                  <div className={`rounded-lg p-3 max-w-[70%] ${isDarkMode ? 'bg-gray-600' : 'bg-white'}`}>
                    <p className="text-sm">
                      {botSettings.personality === 'Friendly'
                        ? "Hey there!  Your revenue today is $40,256.92 with a 2.94% increase from yesterday. Great job!"
                        : botSettings.personality === 'Technical'
                          ? "Revenue analysis: $40,256.92 as of current time. This represents a 2.94% increase from previous period. Data sourced from multiple revenue streams."
                          : botSettings.personality === 'Concise'
                            ? "Revenue: $40,256.92 (+2.94%)"
                            : "Your current revenue stands at $40,256.92, reflecting a 2.94% growth from the previous period."
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {}
            <div>
              <h3 className="text-lg font-semibold mb-4">{t('bot.capabilities')}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { icon: <Brain size={20} />, label: t('bot.dataAnalysis'), enabled: true },
                  { icon: <TrendingUp size={20} />, label: t('bot.trendPrediction'), enabled: true },
                  { icon: <Globe size={20} />, label: t('bot.multiLanguage'), enabled: botSettings.language !== 'English' },
                  { icon: <Shield size={20} />, label: t('bot.security'), enabled: true },
                  { icon: <MessageSquare size={20} />, label: t('bot.contextMemory'), enabled: true },
                  { icon: <Zap size={20} />, label: t('bot.quickResponses'), enabled: botSettings.responseSpeed === 'Fast' }
                ].map((cap, idx) => (
                  <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <div className={`p-2 rounded-lg ${cap.enabled ? (isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100') : (isDarkMode ? 'bg-gray-600' : 'bg-gray-200')}`}>
                      <div className={cap.enabled ? (isDarkMode ? 'text-blue-400' : 'text-blue-600') : 'text-gray-400'}>
                        {cap.icon}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-sm">{cap.label}</div>
                      <div className={`text-xs ${cap.enabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                        {cap.enabled ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {}
          <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`} id="bot-settings-card">
            <h2 className="text-xl font-bold mb-6">{t('bot.configSettings')}</h2>

            <div className="space-y-6">
              {}
              <div>
                <label className="block text-sm font-medium mb-2">{t('bot.botName')}</label>
                <input
                  type="text"
                  value={botSettings.name}
                  onChange={(e) => handleSettingChange('name', e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                />
              </div>

              {}
              <div>
                <label className="block text-sm font-medium mb-2">{t('bot.personalityType')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {personalityOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleSettingChange('personality', option.label)}
                      className={`p-3 rounded-lg text-left transition-colors ${botSettings.personality === option.label
                        ? isDarkMode ? 'bg-blue-900/30 border-blue-500' : 'bg-blue-50 border-blue-500'
                        : isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                        } border`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{option.icon}</span>
                        <span className="font-medium">{option.label}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{option.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {}
              <div>
                <label className="block text-sm font-medium mb-2">{t('bot.responseSpeed')}</label>
                <div className="flex gap-2">
                  {['Slow', 'Medium', 'Fast'].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => handleSettingChange('responseSpeed', speed)}
                      className={`flex-1 py-2 rounded-lg font-medium ${botSettings.responseSpeed === speed
                        ? isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'
                        : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                        }`}
                    >
                      {speed}
                    </button>
                  ))}
                </div>
              </div>

              {}
              <div>
                <label className="block text-sm font-medium mb-2">{t('bot.themeColor')}</label>
                <div className="flex gap-3">
                  {themeOptions.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => handleSettingChange('theme', theme.label)}
                      className={`w-10 h-10 rounded-full ${theme.color} flex items-center justify-center ${botSettings.theme === theme.label ? 'ring-4 ring-offset-2 ring-blue-300 dark:ring-blue-700' : ''}`}
                      title={theme.label}
                    >
                      {botSettings.theme === theme.label && (
                        <span className="text-white">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {}
              <div>
                <label className="block text-sm font-medium mb-2">{t('bot.language')}</label>
                <select
                  value={botSettings.language}
                  onChange={(e) => handleSettingChange('language', e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  <option>English</option>
                  <option>Spanish</option>
                  <option>French</option>
                  <option>German</option>
                  <option>Chinese</option>
                </select>
              </div>

              {}
              <div className="space-y-4">
                {[
                  { label: 'bot.enableNotifications', setting: 'notifications', icon: <MessageSquare size={16} /> },
                  { label: 'bot.voiceResponses', setting: 'voiceEnabled', icon: <Settings size={16} /> },
                  { label: 'bot.autoRespond', setting: 'autoRespond', icon: <Zap size={16} /> }
                ].map((toggle) => (
                  <div key={toggle.setting} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        {toggle.icon}
                      </div>
                      <div>
                        <div className="font-medium">{t(toggle.label)}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {toggle.setting === 'notifications' ? 'Receive alerts from bot' :
                            toggle.setting === 'voiceEnabled' ? 'Enable voice output' :
                              'Automatically respond to common queries'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSettingChange(toggle.setting, !botSettings[toggle.setting])}
                      className={`w-12 h-6 rounded-full transition-colors ${botSettings[toggle.setting]
                        ? 'bg-blue-600'
                        : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
                        }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${botSettings[toggle.setting] ? 'translate-x-7' : 'translate-x-1'}`}></div>
                    </button>
                  </div>
                ))}
              </div>

              {}
              <div>
                <label className="block text-sm font-medium mb-2">{t('bot.dataAccess')}</label>
                <select
                  value={botSettings.dataAccess}
                  onChange={(e) => handleSettingChange('dataAccess', e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  <option>Limited</option>
                  <option>Standard</option>
                  <option>Full Access</option>
                  <option>Custom</option>
                </select>
              </div>

              {}
              {saveStatus && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${saveStatus.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {saveStatus}
                </div>
              )}
              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {loading ? t('bot.saving') : t('bot.saveChanges')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BotCustomization;