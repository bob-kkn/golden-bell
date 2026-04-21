import { useEffect, useState } from "react";
import {
  getLatestStorageNotice,
  subscribeToStorageNotice,
  type StorageNotice,
} from "./storageNotice";

export function StorageNoticeBanner() {
  const [notice, setNotice] = useState<StorageNotice | null>(() => getLatestStorageNotice());

  useEffect(() => subscribeToStorageNotice(setNotice), []);

  if (!notice) {
    return null;
  }

  return (
    <div className="warning-banner" role="status">
      {notice.message}
    </div>
  );
}
