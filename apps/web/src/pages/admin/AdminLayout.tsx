// Removed: admin tab layout helper (reverted admin pages to use shared Layout).
// This file was created during an earlier refactor and is left intentionally empty
// to avoid accidental usage. Admin pages now use `Layout` from shared/ui.
export const AdminLayout = (props: { children?: React.ReactNode }) => {
  return <>{props.children}</>;
};
