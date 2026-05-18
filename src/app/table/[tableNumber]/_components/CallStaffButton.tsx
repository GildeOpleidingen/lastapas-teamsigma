"use client";

import { useState, useEffect } from "react";
import { Bell, Check } from "lucide-react";

export function CallStaffButton({ tableId }: { tableId: number }) {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  function handleCall() {
    setConfirmed(true);
  }

  function handleClose() {
    setOpen(false);
    setConfirmed(false);
  }

  useEffect(() => {
    if (!confirmed) return;
    const timer = setTimeout(handleClose, 1500);
    return () => clearTimeout(timer);
  }, [confirmed]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-20 rounded-full bg-primary p-4 text-primary-foreground shadow-lg transition-transform active:scale-95"
        aria-label="Call staff"
      >
        <Bell size={22} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-6"
          onClick={handleClose}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-background p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {confirmed ? (
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="rounded-full bg-primary/10 p-4">
                  <Check size={28} className="text-primary" />
                </div>
                <p className="text-lg font-semibold">On their way!</p>
              </div>
            ) : (
              <>
                <div className="mb-4 flex flex-col items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-4">
                    <Bell size={28} className="text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold">Call a staff member?</h2>
                  <p className="text-center text-sm text-muted-foreground">
                    Someone will come to Table {tableId} shortly.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    className="flex-1 rounded-full border border-border py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCall}
                    className="flex-1 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity active:opacity-70"
                  >
                    Call staff
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
