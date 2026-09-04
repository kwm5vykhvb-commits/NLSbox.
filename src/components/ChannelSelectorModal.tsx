import React, { useState } from 'react';
import {
  X,
  Tag,
  Check,
  Layers,
  ShieldCheck,
  Info,
  Film,
  Clapperboard,
  Gamepad2,
  Image as ImageIcon,
  Music,
  FileText,
  ShieldAlert,
} from 'lucide-react';
import { ChannelInfo, HubCategory } from '../types';

interface ChannelSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  channels: ChannelInfo[];
  activeCategory: HubCategory;
  activeChannel: string;
  searchMode: 'single' | 'multi';
  selectedChannels: string[];
  onSelectCategory: (category: HubCategory) => void;
  onSelectSingleChannel: (channelId: string) => void;
  onUpdateMultiChannels: (selectedChannels: string[], mode: 'single' | 'multi') => void;
}

export const ChannelSelectorModal: React.FC<ChannelSelectorModalProps> = ({
  isOpen,
  onClose,
  channels,
  activeCategory,
  activeChannel,
  searchMode,
  selectedChannels,
  onSelectCategory,
  onSelectSingleChannel,
  onUpdateMultiChannels,
}) => {
  const [mode, setMode] = useState<'single' | 'multi'>(searchMode);
  const [localSelected, setLocalSelected] = useState<string[]>(
    selectedChannels.length > 0 ? selectedChannels : [activeChannel]
  );

  React.useEffect(() => {
    setMode(searchMode);
    setLocalSelected(selectedChannels.length > 0 ? selectedChannels : [activeChannel]);
  }, [isOpen, searchMode, selectedChannels, activeChannel]);

  if (!isOpen) return null;

  // Filter channels based on the active category
  const filteredChannels = channels.filter(
    (c) => (c.category || 'anime') === activeCategory
  );

  const toggleChannelSelection = (channelId: string) => {
    if (mode === 'single') {
      onSelectSingleChannel(channelId);
      onClose();
    } else {
      setLocalSelected((prev) => {
        if (prev.includes(channelId)) {
          if (prev.length <= 1) return prev;
          return prev.filter((id) => id !== channelId);
        } else {
          return [...prev, channelId];
        }
      });
    }
  };

  const handleSelectCategoryTab = (cat: HubCategory) => {
    onSelectCategory(cat);
    const catChannels = channels.filter((c) => (c.category || 'anime') === cat);
    if (catChannels.length > 0) {
      setLocalSelected([catChannels[0].id]);
    }
  };

  const handleApply = () => {
    onUpdateMultiChannels(localSelected, mode);
    onClose();
  };

  const isExcessive = localSelected.length > 5;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in select-none">
      <div className="w-full max-w-lg bg-[#16161C] border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl p-5 space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Sources & Catalogues de Flux</h3>
              <p className="text-[11px] text-gray-400">Classés par Espace / Hub Multimédia</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hub Category Selector Tabs inside modal */}
        <div className="flex gap-1 p-1 rounded-2xl bg-[#121216] border border-white/5 overflow-x-auto no-scrollbar">
          {[
            { id: 'anime', label: 'Animés', icon: Film },
            { id: 'movie_series', label: 'Films/Séries', icon: Clapperboard },
            { id: 'games', label: 'Jeux', icon: Gamepad2 },
            { id: 'wallpapers', label: 'Fonds 4K', icon: ImageIcon },
            { id: 'music', label: 'Musique', icon: Music },
            { id: 'document', label: 'Mangas', icon: FileText },
            { id: 'mature', label: '+18 Averti', icon: ShieldAlert },
          ].map((item) => {
            const isCatActive = activeCategory === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectCategoryTab(item.id as HubCategory)}
                className={`py-2 px-2.5 shrink-0 rounded-xl text-[11px] font-bold transition-all text-center flex items-center gap-1.5 cursor-pointer ${
                  isCatActive
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <item.icon className="w-3.5 h-3.5" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Mode Selector Tabs (Single vs Multi) */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-[#1C1C24] border border-white/5">
          <button
            onClick={() => setMode('single')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'single'
                ? 'bg-gradient-to-r from-red-600 to-purple-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Source Unique (Ultra rapide)</span>
          </button>

          <button
            onClick={() => setMode('multi')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'multi'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Multi-Sources ({localSelected.length})</span>
          </button>
        </div>

        {/* Anti-Ban Protection Note */}
        {mode === 'multi' ? (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5 text-xs text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-emerald-200">Recherche Multi-Sources Sécurisée</p>
              <p className="text-[11px] text-emerald-300/80 leading-snug">
                Recherche simultanément dans les flux sélectionnés de cette catégorie avec protection haute disponibilité.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center gap-2 text-[11px] text-gray-400">
            <Info className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>Cliquez sur une source pour basculer instantanément le catalogue dessus.</span>
          </div>
        )}

        {/* Channels List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[35vh] custom-scrollbar">
          <div className="flex items-center justify-between text-[11px] text-gray-400 font-semibold uppercase px-1">
            <span>Sources certifiées pour cet espace ({filteredChannels.length})</span>
            {mode === 'multi' && (
              <span className={isExcessive ? 'text-amber-400' : 'text-purple-400'}>
                {localSelected.length} sélectionnée(s) {isExcessive && '⚠️'}
              </span>
            )}
          </div>

          {filteredChannels.length > 0 ? (
            filteredChannels.map((channel) => {
              const isChecked = mode === 'multi' ? localSelected.includes(channel.id) : activeChannel === channel.id;

              return (
                <div
                  key={channel.id}
                  onClick={() => toggleChannelSelection(channel.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    isChecked
                      ? 'bg-purple-900/30 border-purple-500/50 shadow-md'
                      : 'bg-[#1C1C24] border-white/5 hover:border-purple-500/20 hover:bg-[#22222C]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-4 h-4 rounded-${mode === 'multi' ? 'md' : 'full'} border-2 flex items-center justify-center shrink-0 transition-all ${
                        isChecked ? 'border-purple-400 bg-purple-500' : 'border-gray-500'
                      }`}
                    >
                      {isChecked && (
                        mode === 'multi' ? (
                          <Check className="w-3 h-3 text-white stroke-[3]" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )
                      )}
                    </div>

                    <div className="min-w-0">
                      <span className={`text-xs font-bold block truncate ${isChecked ? 'text-purple-300' : 'text-gray-200'}`}>
                        {channel.name}
                      </span>
                      <span className="text-[11px] text-gray-400 truncate block">
                        #{channel.id} {channel.description ? `• ${channel.description}` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {isChecked && (
                      <span className="text-[10px] font-bold text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded-md">
                        Actif
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-6 text-center text-xs text-gray-400">
              Aucune source configurée pour cette catégorie.
            </div>
          )}
        </div>

        {/* Cloud Verified Notice */}
        <div className="p-2 rounded-xl bg-white/5 border border-white/5 flex items-center gap-2 text-xs text-gray-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-[11px]">Canaux officiels vérifiés et synchronisés en direct via le Cloud NLSbox.</span>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-white/5 flex gap-2">
          {mode === 'multi' ? (
            <button
              onClick={handleApply}
              className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Appliquer la recherche multi-sources ({localSelected.length})</span>
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
