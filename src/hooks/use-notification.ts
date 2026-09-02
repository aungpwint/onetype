import { useState, useEffect, useCallback } from "react";
import { notificationService } from "../services/notification/service";
import type { NotificationState } from "../services/notification/types";

export function useNotification() {
  const [state, setState] = useState<NotificationState>(() =>
    notificationService.getState()
  );

  useEffect(() => {
    return notificationService.subscribe(setState);
  }, []);

  const init = useCallback(() => notificationService.init(), []);

  return { state, init };
}
