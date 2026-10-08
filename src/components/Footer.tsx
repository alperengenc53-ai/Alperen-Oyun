import React from 'react';
import { Gamepad2, Award, Zap, Terminal } from 'lucide-react';
import { GameId } from '../types/game';

interface FooterProps {
  onSelectGame: (gameId: GameId | null) => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectGame }) => {
  return (
    <footer className="w-full bg-slate-950 text-slate-400 border-t-2 border-slate-800 mt-8">
      {/* Schematic Indicator matching user drawing */}
      <div className="bg-amber-500/20 text-amber-400 text-xs font-mono font-bold tracking-wider uppercase text-center py-1.5 border-b border-amber-500/20 flex items-center justify-center gap-2">
        <span>📐 FOOTER (Alt Bilgi Bölümü)</span>
        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">
          Şemaya Uygun Tamamlandı
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Col 1: Platform Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <span className="text-xl font-black text-white tracking-tight">
                OYUNDİYARI
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Türkiye’nin en eğlenceli çevrimiçi çok oyunculu web oyun platformu. PUBG Rekabetçi Battle Royale, gittikçe hızlanan Turbo Otoban Araba Yarışı ve kafa çarpınca ölen çok oyunculu Snake.io oyunlarını anında ücretsiz oynayın.
            </p>
            <div className="flex items-center gap-3 text-xs text-emerald-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Bütün Sunucular Aktif (19.400+ Çevrimiçi)</span>
            </div>
          </div>

          {/* Col 2: 3 Ana Oyun */}
          <div className="space-y-3">
            <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              Platform Oyunları
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onSelectGame('pubg')}
                  className="hover:text-amber-400 transition flex items-center gap-1.5 text-left cursor-pointer"
                >
                  <span>🎯</span>
                  <span><strong>PUBG: Rekabetçi</strong> - Erangel Lobi & Canlı Skor</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectGame('traffic')}
                  className="hover:text-sky-400 transition flex items-center gap-1.5 text-left cursor-pointer"
                >
                  <span>🏎️</span>
                  <span><strong>Turbo Otoban: Araba</strong> - Hızlanan Trafik Yarışı</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectGame('snake')}
                  className="hover:text-emerald-400 transition flex items-center gap-1.5 text-left cursor-pointer"
                >
                  <span>🐍</span>
                  <span><strong>Snake.io</strong> - Çok Oyunculu Yılan Savaşı</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Rehberler ve Taktikler */}
          <div className="space-y-3">
            <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-sky-400" />
              Taktikler & Puan Kasma
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="hover:text-white transition cursor-pointer">
                • PUBG: Silah seçimi ve kask zırhı ile hayatta kalma
              </li>
              <li className="hover:text-white transition cursor-pointer">
                • Turbo Otoban: Yakın makas atarak +150 kombo puanı
              </li>
              <li className="hover:text-white transition cursor-pointer">
                • Snake.io: Rakibin önünü kesip kafasını gövdene çarptırma
              </li>
              <li className="hover:text-white transition cursor-pointer">
                • Canlı Skorboard: Skorunuz otomatik hesabınıza kaydedilir
              </li>
            </ul>
          </div>

          {/* Col 4: Sistem Mimarisi Şeması */}
          <div className="space-y-3">
            <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-indigo-400" />
              Sayfa Düzeni Şeması
            </h4>
            <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-[11px] font-mono space-y-1 text-slate-300">
              <div className="text-amber-400 font-bold">1. HEADER Alanı (Başlık & Hesap)</div>
              <div className="text-slate-400 pl-2">↳ 2. Menü Alanı (Navigasyon)</div>
              <div className="text-slate-400 pl-2">↳ 3. Sol Sidebar (PUBG, Araba, Snake)</div>
              <div className="text-slate-400 pl-2">↳ 4. CONTENT Alanı (Oyun & Canlı Skor)</div>
              <div className="text-slate-400 pl-2">↳ 5. Sağ Sidebar (Boş Reklam Yeri)</div>
              <div className="text-amber-400 font-bold pl-2">↳ 6. FOOTER (Alt Bilgi Bölümü)</div>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div>
            © 2026 <strong>OyunDiyarı</strong>. Tüm hakları saklıdır.
          </div>
          <div className="flex items-center gap-4 text-slate-500">
            <span className="hover:text-slate-300 transition cursor-pointer">Gizlilik Politikası</span>
            <span>•</span>
            <span className="hover:text-slate-300 transition cursor-pointer">Kullanım Koşulları</span>
            <span>•</span>
            <span className="hover:text-slate-300 transition cursor-pointer">Reklam & İletişim</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
