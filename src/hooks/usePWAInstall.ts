import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export type PWAInstallPlatform = 'auto' | 'android' | 'ios';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalPlatform, setModalPlatform] = useState<PWAInstallPlatform>('auto');

  useEffect(() => {
    // 1. Detect standalone mode
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
      if (isStandaloneMode) {
        setIsInstalled(true);
      }
    };
    checkStandalone();

    // 2. Detect platform (including iPadOS 13+ reporting Macintosh with touch points)
    const ua = window.navigator.userAgent.toLowerCase();
    const isIPadOS =
      window.navigator.platform === 'MacIntel' &&
      typeof window.navigator.maxTouchPoints === 'number' &&
      window.navigator.maxTouchPoints > 1;
    const isIOSDevice =
      (/iphone|ipad|ipod/.test(ua) || isIPadOS) &&
      !(window as unknown as { MSStream?: boolean }).MSStream;
    const isAndroidDevice = /android/.test(ua);
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    // 3. Listen for native beforeinstallprompt (Chrome, Android, Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // 4. Listen for appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsModalOpen(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          setIsModalOpen(false);
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    } else {
      // If native prompt is not available, open instructions modal for Android/browser install
      setModalPlatform('android');
      setIsModalOpen(true);
    }
  }, [deferredPrompt]);

  const openModal = useCallback((platform: PWAInstallPlatform = 'auto') => {
    setModalPlatform(platform);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setModalPlatform('auto');
  }, []);

  return {
    canInstall: !isInstalled,
    isInstalled,
    isStandalone,
    isIOS,
    isAndroid,
    hasNativePrompt: !!deferredPrompt,
    isModalOpen,
    modalPlatform,
    openModal,
    closeModal,
    promptInstall
  };
}
