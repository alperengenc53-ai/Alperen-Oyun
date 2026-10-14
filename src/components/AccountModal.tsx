import React, { useState } from 'react';
import { UserProfile } from '../types/game';
import {
  registerAccountWithPassword,
  loginAccountWithPassword,
  logoutAccount,
  getAllRegisteredPlayers,
  setActiveUser,
} from '../utils/playerRegistry';
import { User, X, Check, Lock, LogIn, UserPlus, ShieldCheck, LogOut, KeyRound, Sparkles, AlertCircle } from 'lucide-react';
import { playSound } from '../utils/audio';

interface AccountModalProps {
  currentUser: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated: (updated: UserProfile) => void;
  isInitial?: boolean;
}

const AVATAR_OPTIONS = ['👑', '⚡', '🎯', '🏎️', '🐍', '🔥', '🦁', '⭐', '🐺', '🦊', '🤖', '💀'];
const TAG_OPTIONS = ['[TR]', '[PRO]', '[VIP]', '[LİDER]', '[GS]', '[FB]', '[BJK]'];

export const AccountModal: React.FC<AccountModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onProfileUpdated,
  isInitial = false,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'profile'>(
    currentUser && currentUser.username !== 'Misafir' ? 'profile' : 'register'
  );

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [tag, setTag] = useState('[TR]');
  const [avatar, setAvatar] = useState('👑');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const registeredPlayers = getAllRegisteredPlayers();

  if (!isOpen) return null;

  // Handle Real Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser) {
      setErrorMessage('Lütfen kullanıcı adınızı girin!');
      return;
    }
    if (cleanUser.length < 2) {
      setErrorMessage('Kullanıcı adı en az 2 karakter olmalıdır!');
      return;
    }
    if (!cleanPass) {
      setErrorMessage('Lütfen bir şifre belirleyin!');
      return;
    }
    if (cleanPass.length < 3) {
      setErrorMessage('Şifre en az 3 karakter olmalıdır!');
      return;
    }
    if (cleanPass !== passwordConfirm.trim()) {
      setErrorMessage('Girdiğiniz şifreler eşleşmiyor!');
      return;
    }

    const alreadyExists = registeredPlayers.some(
      (p) => p.username.trim().toLowerCase() === cleanUser.toLowerCase()
    );
    if (alreadyExists) {
      setErrorMessage('Bu isim kullanımda! Lütfen farklı bir kullanıcı adı seçin.');
      playSound.hit();
      return;
    }

    setLoading(true);
    const res = await registerAccountWithPassword(cleanUser, cleanPass, tag, avatar);
    setLoading(false);

    if (res.success && res.user) {
      onProfileUpdated(res.user);
      playSound.victory();
      setSuccessMessage('🎉 Hesabınız başarıyla oluşturuldu ve kaydedildi!');
      setTimeout(() => {
        onClose();
      }, 700);
    } else {
      setErrorMessage(res.error || 'Kayıt sırasında bir hata oluştu');
      playSound.hit();
    }
  };

  // Handle Real Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser) {
      setErrorMessage('Lütfen kullanıcı adınızı girin!');
      return;
    }
    if (!cleanPass) {
      setErrorMessage('Lütfen şifrenizi girin!');
      return;
    }

    setLoading(true);
    const res = await loginAccountWithPassword(cleanUser, cleanPass);
    setLoading(false);

    if (res.success && res.user) {
      onProfileUpdated(res.user);
      playSound.coin();
      setSuccessMessage(`Hoş geldin, ${res.user.username}! Verileriniz yüklendi.`);
      setTimeout(() => {
        onClose();
      }, 600);
    } else {
      setErrorMessage(res.error || 'Kullanıcı adı veya şifre hatalı!');
      playSound.hit();
    }
  };

  // Handle Switch to Another Saved Account
  const handleSwitchSaved = (player: UserProfile) => {
    setActiveUser(player.id);
    onProfileUpdated(player);
    playSound.click();
    onClose();
  };

  // Handle Logout
  const handleLogout = () => {
    logoutAccount();
    setActiveTab('login');
    setUsername('');
    setPassword('');
    setErrorMessage(null);
    setSuccessMessage('Çıkış yapıldı. Lütfen hesabınıza giriş yapın.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 px-6 py-4 flex items-center justify-between text-slate-950">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 font-black" />
            <div>
              <h3 className="text-base font-black tracking-wide uppercase">
                {isInitial ? 'OYUNDİYARI • HESAP AÇ & GİRİŞ YAP' : 'OYUNCU HESAP MERKEZİ'}
              </h3>
              <p className="text-[11px] text-amber-950 font-bold">
                İsim ve şifrenizle tüm cihazlardan hesabınıza devam edebilirsiniz
              </p>
            </div>
          </div>
          {!isInitial && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-950/20 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950 text-xs font-bold">
          <button
            onClick={() => {
              setActiveTab('login');
              setErrorMessage(null);
            }}
            className={`flex-1 py-3 flex items-center justify-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'login'
                ? 'border-amber-400 text-amber-400 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>GİRİŞ YAP</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('register');
              setErrorMessage(null);
            }}
            className={`flex-1 py-3 flex items-center justify-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'register'
                ? 'border-amber-400 text-amber-400 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>KAYIT OL</span>
          </button>

          {currentUser && currentUser.username !== 'Misafir' && (
            <button
              onClick={() => {
                setActiveTab('profile');
                setErrorMessage(null);
              }}
              className={`flex-1 py-3 flex items-center justify-center gap-2 border-b-2 transition cursor-pointer ${
                activeTab === 'profile'
                  ? 'border-amber-400 text-amber-400 bg-slate-900/60'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              <span>HESABIM</span>
            </button>
          )}
        </div>

        {/* Error / Success Banners */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* TAB 1: GİRİŞ YAP (LOGIN) */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
              🔑 <strong>Hesabına Devam Et:</strong> Kayıt olduğun kullanıcı adını ve şifreni girerek tüm altınlarını, arabalarını, kostümlerini ve skorlarını anında geri yükleyebilirsin.
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Kullanıcı Adı
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Örn: Komutan, Ahmet123"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Şifre
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Şifrenizi girin..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:border-amber-400 focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-sm rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Giriş Yapılıyor...' : 'HESABIMA GİRİŞ YAP'}</span>
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setErrorMessage(null);
                }}
                className="text-xs text-amber-400 hover:underline font-bold"
              >
                Hesabın yok mu? Buradan Yeni Hesap Oluştur →
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: KAYIT OL (REGISTER) */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegister} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <span>
                Yeni hesap açtığında <strong className="text-amber-400">+200 Altın</strong> hoş geldin hediyesi cüzdanına eklenir! Şifreni unutma, başka cihazlardan da bu isim ve şifreyle girebilirsin.
              </span>
            </div>

            {/* Avatar Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Avatar Seç
              </label>
              <div className="grid grid-cols-6 gap-2">
                {AVATAR_OPTIONS.map((av) => (
                  <button
                    type="button"
                    key={av}
                    onClick={() => {
                      setAvatar(av);
                      playSound.click();
                    }}
                    className={`h-10 rounded-xl text-xl flex items-center justify-center transition cursor-pointer border ${
                      avatar === av
                        ? 'border-amber-400 bg-amber-500/20 scale-105 shadow-md shadow-amber-500/20'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-600'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            {/* Tag selector */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Takım Etiketi
              </label>
              <div className="flex flex-wrap gap-1.5">
                {TAG_OPTIONS.map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setTag(t)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition border cursor-pointer ${
                      tag === t
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Kullanıcı Adı (İsim)
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Kullanıcı adınızı yazın..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Şifre Belirle
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Şifre (min 3)"
                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:border-amber-400 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Şifre Tekrar
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="Tekrar yazın"
                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:border-amber-400 focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>{loading ? 'Kayıt Yapılıyor...' : 'HESABIMI OLUŞTUR & BAŞLA (+200 🪙)'}</span>
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setErrorMessage(null);
                }}
                className="text-xs text-amber-400 hover:underline font-bold"
              >
                Zaten hesabın var mı? Buradan Giriş Yap →
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: HESABIM (PROFILE) */}
        {activeTab === 'profile' && currentUser && (
          <div className="p-6 space-y-4">
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 text-2xl font-black flex items-center justify-center shadow-lg">
                  {currentUser.avatar}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-400 font-mono text-sm">{currentUser.tag}</span>
                    <h4 className="text-base font-black text-white">{currentUser.username}</h4>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">
                      Giriş Yapıldı ✓
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-mono mt-1.5">
                    <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-sky-300">
                      🏎️ Otoban: <strong>{currentUser.trafficCoins ?? 0} 🪙</strong>
                    </span>
                    <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-emerald-300">
                      🐍 Snake: <strong>{currentUser.snakeCoins ?? 0} 🪙</strong>
                    </span>
                    <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-amber-300">
                      🎱 Bilardo: <strong>{currentUser.poolCoins ?? 0} 🪙</strong>
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    💡 Her oyunun cüzdanı bağımsızdır: Bir oyunda kastığınız para sadece o oyunda harcanır!
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Hesaptan çıkış yap"
                className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Çıkış Yap</span>
              </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[10px]">8 BALL POOL 1v1</div>
                <div className="text-emerald-400 font-bold">{currentUser.poolWins || 0} Zafer • {currentUser.poolHighscore || 0} Puan</div>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[10px]">TURBO OTOBAN</div>
                <div className="text-sky-400 font-bold">{currentUser.trafficHighscore} P • {(currentUser.trafficDistance / 1000).toFixed(1)} km</div>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[10px]">SNAKE.IO ARENA</div>
                <div className="text-emerald-400 font-bold">{currentUser.snakeHighscore} P • {currentUser.snakeKills} Av</div>
              </div>
            </div>

            {/* Quick Switch to Other Saved Local Accounts */}
            {registeredPlayers.length > 1 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="text-xs font-bold text-slate-400">Bu Cihazdaki Diğer Kayıtlı Hesaplar:</div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {registeredPlayers
                    .filter((p) => p.id !== currentUser.id)
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleSwitchSaved(p)}
                        className="w-full p-2 bg-slate-950 hover:bg-slate-800/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs transition cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span>{p.avatar}</span>
                          <span className="font-bold text-white">{p.username}</span>
                          <span className="text-[10px] text-slate-400 font-mono">🪙 {p.coins}</span>
                        </div>
                        <span className="text-amber-400 font-bold text-[10px]">Geçiş Yap →</span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
