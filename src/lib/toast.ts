import { toast } from "sonner";

/**
 * Loading-first toasts that stay on screen until the async action resolves.
 * Call `notify.loading` to start, then update the same toast with the id.
 */
export const notify = {
  loading(message: string): string | number {
    return toast.loading(message);
  },
  success(id: string | number, message: string, description?: string) {
    toast.success(message, { id, description });
  },
  error(id: string | number, message: string, description?: string) {
    toast.error(message, { id, description });
  },
};
