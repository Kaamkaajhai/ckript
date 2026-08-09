import { useState } from "react";
import ActionSheet from "../../components/overlays/ActionSheet";
import ConfirmDialog from "../../components/overlays/ConfirmDialog";

/*
 * AccountMenu — the avatar menu, and the logout confirmation behind it.
 *
 * 2026-08-07 (plan §11 Phase 2). Two things changed.
 *
 * Every item is now a real destination. They used to call `onSelect(item)` →
 * `desktopOnly(item.label)`, so an avatar menu whose four entries are Profile,
 * Contact, T&C and Privacy — four routes that exist and render fine on a phone
 * — answered all four with "use a computer". `profileHref` is the viewer's own
 * canonical profile path, the same one desktop's "Edit Profile" uses.
 *
 * And the surface is now the shared `ActionSheet` + `ConfirmDialog`, so this
 * file has no CSS of its own left (`ckm-acct` is retired). The bespoke
 * scrim-plus-popover it replaces had no focus trap, no scroll lock and no
 * inert background, and its confirmation was a hand-rolled dialog with neither
 * `role="alertdialog"` nor a Cancel-first focus order. ActionSheet's contract
 * already says a destructive item hands over to a confirmation rather than
 * closing, which is exactly what logging out needs.
 */
export default function AccountMenu({ open, onClose, onLogout, userName, profileHref, returnFocusTo = null }) {
  const [confirming, setConfirming] = useState(false);

  const items = [
    { id: "profile", icon: "person", label: "Profile", to: profileHref },
    { id: "contact", icon: "mail", label: "Contact", to: "/contact" },
    /*
     * CANONICAL paths, not the aliases (2026-08-08, plan §5.2 and §11 Phase 2
     * bullet 6). These read `/terms` and `/privacy` until now, and App.jsx:481
     * and :483 mount both as `<Navigate replace>` to the paths below — so every
     * mobile tap on either item cost a redirect hop that the same item in
     * desktop's UserMenu does not pay. Desktop links straight here; so does
     * mobile now. The aliases stay declared in the route manifest because
     * external links to them exist; they are just not what this app emits.
     */
    { id: "terms", icon: "description", label: "Terms & Conditions", to: "/terms-of-service" },
    { id: "privacy", icon: "shield", label: "Privacy Policy", to: "/privacy-policy" },
    {
      id: "logout",
      icon: "logout",
      label: "Log out",
      destructive: true,
      onSelect: () => setConfirming(true),
    },
  ];

  return (
    <>
      <ActionSheet
        open={open && !confirming}
        onClose={() => { setConfirming(false); onClose?.(); }}
        title="Account"
        description={userName ? `Signed in as ${userName}` : ""}
        items={items}
        returnFocusTo={returnFocusTo}
      />

      <ConfirmDialog
        open={confirming}
        destructive
        title="Log out"
        message={`Are you sure you want to log out${userName ? ` of ${userName}` : ""}?`}
        confirmLabel="Log out"
        cancelLabel="Cancel"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          onClose?.();
          onLogout?.();
        }}
      />
    </>
  );
}
