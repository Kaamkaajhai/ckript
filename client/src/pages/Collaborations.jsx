import CollabRequestsInbox from "../components/collab/CollabRequestsInbox";

export default function Collaborations() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9f3c2e]">Writing together</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Collaboration</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
          Review requests to join projects you own. Invitations, active collaborators, comments, and live presence remain in each project workspace.
        </p>
      </header>
      <CollabRequestsInbox />
    </main>
  );
}
