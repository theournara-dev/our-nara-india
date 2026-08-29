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
  error(
    id: string | number,
    message: string,
    description?: string,
    /** Optional extra action, e.g. a "Contact us" feedback link. */
    action?: { label: string; onClick: () => void },
  ) {
    toast.error(message, {
      id,
      description,
      action: action
        ? { label: action.label, onClick: action.onClick }
        : undefined,
    });
  },
  dismiss(id: string | number) {
    toast.dismiss(id);
  },
};

/**
 * Standard toast error UI: a readable message plus a "Contact us" action that
 * opens the feedback dialog with the originating error attached for support.
 */
export function notifyErrorWithContact(
  id: string | number,
  message: string,
  description: string,
  error?: { name?: string; message?: string; digest?: string },
) {
  notify.error(
    id,
    message,
    description,
    toastActionContact(error),
  );
}

/** Build the "Contact us" toast action bound to an (optional) error trace. */
export function toastActionContact(error?: {
  name?: string;
  message?: string;
  digest?: string;
}): { label: string; onClick: () => void } {
  return {
    label: "Contact us",
    onClick: () => {
      import("@/components/contact/contact-dialog").then(
        ({ openContactDialog }) => openContactDialog(error ?? null),
      );
    },
  };
}

/**
 * Toast shown whenever an item is added to the cart. Uses a unique id per call
 * so adding several products in a row stacks distinct notifications instead of
 * replacing one another. `qty` is the number of units added and is shown when
 * greater than one.
 */
export function notifyAddedToCart(name: string, qty = 1) {
  const id = `added-to-cart-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  toast.success("Added to cart", {
    id,
    description:
      qty > 1
        ? `${qty} × ${name} added to your cart.`
        : `${name} added to your cart.`,
  });
}
