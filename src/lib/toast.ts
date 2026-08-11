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
  dismiss(id: string | number) {
    toast.dismiss(id);
  },
};

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
