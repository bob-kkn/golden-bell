export interface StorageNotice {
  id: number;
  message: string;
}

const STORAGE_NOTICE_EVENT = "golden-bell:storage-notice";

let latestStorageNotice: StorageNotice | null = null;
let latestStorageNoticeKey: string | null = null;
let noticeSequence = 0;

function buildNotice(message: string): StorageNotice {
  noticeSequence += 1;

  return {
    id: noticeSequence,
    message,
  };
}

export function rememberStorageNotice(message: string, dedupeKey: string = message): void {
  if (latestStorageNoticeKey === dedupeKey) {
    return;
  }

  latestStorageNoticeKey = dedupeKey;
  latestStorageNotice = buildNotice(message);
}

export function emitStorageNotice(message: string, dedupeKey: string = message): void {
  rememberStorageNotice(message, dedupeKey);

  if (typeof window === "undefined" || !latestStorageNotice) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<StorageNotice>(STORAGE_NOTICE_EVENT, {
      detail: latestStorageNotice,
    }),
  );
}

export function getLatestStorageNotice(): StorageNotice | null {
  return latestStorageNotice;
}

export function subscribeToStorageNotice(listener: (notice: StorageNotice) => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleNotice = (event: Event) => {
    const customEvent = event as CustomEvent<StorageNotice>;
    listener(customEvent.detail);
  };

  window.addEventListener(STORAGE_NOTICE_EVENT, handleNotice as EventListener);

  return () => {
    window.removeEventListener(STORAGE_NOTICE_EVENT, handleNotice as EventListener);
  };
}
