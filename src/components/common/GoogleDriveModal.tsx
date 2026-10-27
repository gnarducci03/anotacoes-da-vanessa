'use client';

import React, { useEffect, useState } from 'react';
import {
  disconnectGoogleDrive,
  getConfiguredGoogleClientId,
  getLastSyncedTimestamp,
  getSavedGoogleUser,
  GoogleUserProfile,
  restoreFromGoogleDrive,
  sanitizeGoogleClientId,
  setConfiguredGoogleClientId,
  signInWithGoogleDrive,
  syncLocalToGoogleDrive,
  validateGoogleClientId,
} from '@/lib/google-drive-sync';
import {
  Cloud,
  CheckCircle2,
  RefreshCw,
  DownloadCloud,
  LogOut,
  Settings,
  X,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncCompleted: (message: string) => void;
  autoSyncEnabled: boolean;
  onToggleAutoSync: (enabled: boolean) => void;
}

export function GoogleDriveModal({
  isOpen,
  onClose,
  onSyncCompleted,
  autoSyncEnabled,
  onToggleAutoSync,
}: GoogleDriveModalProps) {
  const [user, setUser] = useState<GoogleUserProfile | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [clientIdInput, setClientIdInput] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedOrigin, setCopiedOrigin] = useState(false);
  const [currentOrigin, setCurrentOrigin] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const savedUser = getSavedGoogleUser();
    setUser(savedUser);
    setLastSyncedAt(getLastSyncedTimestamp());
    const cid = getConfiguredGoogleClientId();
    setClientIdInput(cid);
    const check = validateGoogleClientId(cid);
    setShowConfig(!cid || !check.valid || !savedUser);
    setErrorMsg(null);
    if (typeof window !== 'undefined') {
      setCurrentOrigin(window.location.origin);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const clientValidation = validateGoogleClientId(clientIdInput);

  const handleSaveClientId = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = sanitizeGoogleClientId(clientIdInput);
    setClientIdInput(cleaned);
    setConfiguredGoogleClientId(cleaned);
    const check = validateGoogleClientId(cleaned);
    if (!check.valid) {
      setErrorMsg(check.reason || 'Client ID inválido.');
      return;
    }
    setErrorMsg(null);
  };

  const handleCopyOrigin = () => {
    if (!currentOrigin) return;
    navigator.clipboard.writeText(currentOrigin);
    setCopiedOrigin(true);
    setTimeout(() => setCopiedOrigin(false), 2000);
  };

  const handleConnectGoogle = async () => {
    setBusy(true);
    setErrorMsg(null);
    try {
      const cleaned = sanitizeGoogleClientId(clientIdInput);
      if (cleaned) {
        setClientIdInput(cleaned);
        setConfiguredGoogleClientId(cleaned);
      }
      const profile = await signInWithGoogleDrive('select_account');
      setUser(profile);
      setShowConfig(false);
      // Já realiza o primeiro backup automático na pasta do Drive após conectar
      const ts = await syncLocalToGoogleDrive();
      setLastSyncedAt(ts);
      onSyncCompleted(
        `Conectado como ${profile.name}! Tudo salvo na pasta "anotações estudos" do Google Drive.`
      );
    } catch (err) {
      setShowConfig(true);
      setErrorMsg(
        err instanceof Error ? err.message : 'Erro ao conectar com o Google.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleManualPush = async () => {
    setBusy(true);
    setErrorMsg(null);
    try {
      const cleaned = sanitizeGoogleClientId(clientIdInput);
      if (cleaned) {
        setClientIdInput(cleaned);
        setConfiguredGoogleClientId(cleaned);
      }
      if (!user) {
        const profile = await signInWithGoogleDrive('select_account');
        setUser(profile);
      }
      const ts = await syncLocalToGoogleDrive();
      setLastSyncedAt(ts);
      onSyncCompleted(
        'Todas as notas e PDFs foram salvos na pasta "anotações estudos" do Google Drive!'
      );
    } catch (err) {
      // Se o token de 1h tiver expirado, pede renovação rápida
      try {
        const profile = await signInWithGoogleDrive('');
        setUser(profile);
        const ts = await syncLocalToGoogleDrive();
        setLastSyncedAt(ts);
        onSyncCompleted(
          'Notas e PDFs salvos na pasta "anotações estudos" do Google Drive!'
        );
      } catch {
        setShowConfig(true);
        setErrorMsg(
          err instanceof Error
            ? err.message
            : 'Falha ao sincronizar com o Google Drive.'
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const handleManualPull = async () => {
    setBusy(true);
    setErrorMsg(null);
    try {
      const cleaned = sanitizeGoogleClientId(clientIdInput);
      if (cleaned) {
        setClientIdInput(cleaned);
        setConfiguredGoogleClientId(cleaned);
      }
      if (!user) {
        const profile = await signInWithGoogleDrive('select_account');
        setUser(profile);
      }
      const res = await restoreFromGoogleDrive();
      setLastSyncedAt(Date.now());
      onSyncCompleted(
        `Restaurados ${res.notebooksCount} cadernos (${res.pagesCount} páginas) da pasta "anotações estudos"!`
      );
    } catch (err) {
      setShowConfig(true);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Erro ao restaurar do Google Drive.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = () => {
    disconnectGoogleDrive();
    setUser(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-3xl bg-surface border border-[var(--border-subtle)] shadow-2xl overflow-hidden">
        {/* Cabeçalho */}
        <div className="px-6 py-4 bg-elevated border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent/15 text-accent flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-primary">
                Conta Google & Nuvem da Vanessa
              </h3>
              <p className="text-[11px] text-secondary">
                Salva na pasta &ldquo;anotações estudos&rdquo; no Google Drive
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowConfig((v) => !v)}
              className="p-1.5 rounded-full hover:bg-dock text-secondary"
              title="Configurar Google Client ID"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-dock text-secondary"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5 text-xs max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-[#FF3B30] flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Perfil Conectado */}
          {user ? (
            <div className="p-4 rounded-2xl bg-app border border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {user.picture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-10 h-10 rounded-full border border-accent"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-accent text-white font-bold flex items-center justify-center text-sm">
                    {user.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold text-sm text-primary truncate">
                    {user.name}
                  </p>
                  <p className="text-secondary truncate">{user.email}</p>
                </div>
              </div>

              <button
                onClick={handleDisconnect}
                className="px-3 py-1.5 rounded-xl hover:bg-red-500/10 text-[#FF3B30] font-semibold flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sair
              </button>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-app border border-[var(--border-subtle)] text-center space-y-3">
              <p className="text-sm font-semibold text-primary">
                Conecte a conta Google da Vanessa
              </p>
              <p className="text-secondary leading-relaxed">
                Assim que conectada, todos os cadernos, traços de caneta e PDFs
                ficam salvos tanto no tablet quanto automaticamente no Google
                Drive dela (15 GB gratuitos).
              </p>
              <button
                disabled={busy}
                onClick={handleConnectGoogle}
                className="px-5 py-2.5 rounded-full bg-accent text-white font-semibold shadow-md hover:opacity-95 disabled:opacity-50 inline-flex items-center gap-2"
              >
                <Cloud className="w-4 h-4" />
                {busy ? 'Conectando...' : 'Entrar com Conta Google'}
              </button>
            </div>
          )}

          {/* Status e Controles de Sincronização */}
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-app border border-[var(--border-subtle)] cursor-pointer">
              <div>
                <p className="font-semibold text-primary">
                  Sincronização Automática em Nuvem
                </p>
                <p className="text-[11px] text-secondary">
                  Salva no Google Drive automaticamente após alterações nos cadernos
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoSyncEnabled}
                onChange={(e) => onToggleAutoSync(e.target.checked)}
                className="w-4 h-4 accent-accent"
              />
            </label>

            {lastSyncedAt && (
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium px-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Última sincronização com o Google Drive:{' '}
                  {new Intl.DateTimeFormat('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  }).format(new Date(lastSyncedAt))}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                disabled={busy}
                onClick={handleManualPush}
                className="p-3 rounded-2xl bg-accent text-white font-semibold flex items-center justify-center gap-2 shadow-sm hover:opacity-95 disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`}
                />
                Salvar no Google Drive Agora
              </button>

              <button
                disabled={busy}
                onClick={handleManualPull}
                className="p-3 rounded-2xl bg-app hover:bg-dock border border-[var(--border-subtle)] text-primary font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <DownloadCloud className="w-4 h-4 text-accent" />
                Restaurar do Google Drive
              </button>
            </div>
          </div>

          {/* Configuração rápida do Google OAuth Client ID */}
          {showConfig && (
            <form
              onSubmit={handleSaveClientId}
              className="p-4 rounded-2xl bg-dock/70 border border-[var(--border-subtle)] space-y-3"
            >
              <p className="font-bold text-primary">
                Configuração do Google OAuth Client ID
              </p>
              <p className="text-[11px] text-secondary leading-relaxed">
                Cole abaixo o <strong>ID do cliente</strong> (Tipo:{' '}
                <strong>Aplicativo da Web</strong>) que termina com{' '}
                <code>.apps.googleusercontent.com</code> (não cole a chave{' '}
                <code>GOCSPX-...</code>):
              </p>
              <input
                type="text"
                value={clientIdInput}
                onChange={(e) => setClientIdInput(e.target.value)}
                placeholder="Ex: 1234567890-abcdefg.apps.googleusercontent.com"
                className="w-full px-3 py-2 rounded-xl bg-surface border border-[var(--border-subtle)] text-primary text-xs font-mono focus:outline-none focus:ring-2 focus:ring-accent"
              />
              {clientIdInput.trim() !== '' && (
                <div
                  className={`text-[11px] font-medium flex items-start gap-1.5 ${
                    clientValidation.valid
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-[#FF3B30]'
                  }`}
                >
                  {clientValidation.valid ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span>
                        Formato de ID do cliente válido! Agora clique em &ldquo;Entrar com Conta Google&rdquo;.
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span>{clientValidation.reason}</span>
                    </>
                  )}
                </div>
              )}

              {currentOrigin && (
                <div className="p-2.5 rounded-xl bg-surface/80 border border-[var(--border-subtle)] space-y-1">
                  <p className="text-[10px] font-semibold text-secondary">
                    URL exata para colocar em &ldquo;Origens JavaScript autorizadas&rdquo; no Google Cloud:
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-[11px] text-primary font-mono truncate">
                      {currentOrigin}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyOrigin}
                      className="px-2.5 py-1 rounded-lg bg-dock hover:bg-accent/15 text-primary text-[10px] font-semibold flex items-center gap-1 flex-shrink-0"
                    >
                      {copiedOrigin ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copiar URL
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-full bg-primary text-surface font-semibold text-xs"
                >
                  Salvar Client ID
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
