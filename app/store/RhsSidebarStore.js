import { create } from "zustand";

export const useRhsSidebarStore = create((set) => ({
    isOpen: false,
    open: (component, props = {}) => set({ isOpen: true, component, props }),
    props: {},
    setProps: (props) => set(state => ({
        props: {
            ...state.props,
            ...props
        }
    })),
    close: () => set({ isOpen: false }),
    toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));