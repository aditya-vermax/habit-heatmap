"use client";

import { useState } from "react";
import { useSettings } from "@/hooks/use-data";
import { downloadBackup } from "@/lib/backup";

export function BackupBanner() {
  const { update } = useSettings();
  const [busy, setBusy] = useState(false);
  return (
    <div className="banner" role="region" aria-label="Backup reminder">
      <p>
        <strong>Time for a backup.</strong> Your habits live only in this browser. Export a copy so
        a cleared cache can&apos;t take your history with it.
      </p>
      <div className="row-tools">
        <button
          type="button"
          className="btn btn-sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await downloadBackup();
            } finally {
              setBusy(false);
            }
          }}
        >
          Export backup
        </button>
        <button
          type="button"
          className="btn btn-sm btn-quiet"
          onClick={() => update({ reminderDismissedAt: new Date().toISOString() })}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
