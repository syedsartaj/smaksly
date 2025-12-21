import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartItem {
  websiteId: string;
  websiteName: string;
  domain: string;
  niche: string;
  da: number;
  dr: number;
  price: number; // in cents
  quantity: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;

  // Computed
  totalItems: number;
  totalPrice: number;

  // Actions
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (websiteId: string) => void;
  updateQuantity: (websiteId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      get totalItems() {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      get totalPrice() {
        return get().items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
      },

      addItem: (item) =>
        set((state) => {
          const existingItem = state.items.find(
            (i) => i.websiteId === item.websiteId
          );

          if (existingItem) {
            // Item already in cart - don't add duplicates for guest posts
            return state;
          }

          return {
            items: [...state.items, { ...item, quantity: 1 }],
            isOpen: true, // Open cart when adding item
          };
        }),

      removeItem: (websiteId) =>
        set((state) => ({
          items: state.items.filter((i) => i.websiteId !== websiteId),
        })),

      updateQuantity: (websiteId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.websiteId !== websiteId)
              : state.items.map((i) =>
                  i.websiteId === websiteId ? { ...i, quantity } : i
                ),
        })),

      clearCart: () => set({ items: [] }),

      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      openCart: () => set({ isOpen: true }),

      closeCart: () => set({ isOpen: false }),
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    }
  )
);

// Selectors
export const selectCartItems = (state: CartState) => state.items;
export const selectCartTotal = (state: CartState) =>
  state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
export const selectCartCount = (state: CartState) =>
  state.items.reduce((sum, item) => sum + item.quantity, 0);
export const selectIsInCart = (websiteId: string) => (state: CartState) =>
  state.items.some((i) => i.websiteId === websiteId);
