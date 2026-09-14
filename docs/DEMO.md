# Guided demonstration

All seeded names, agreements, addresses, and submissions are fictional. `example.com` links are placeholders, not verified asset folders.

1. Sign in and choose **Load guided demo** in an empty workspace.
2. Open **Orbit Analytics**. Inspect its scope and each playbook citation. Approve the plan, then **Run agent**. Inspect the three created workspace folder records and welcome draft.
3. Open **Northstar Studio → Client inputs**. Request a correction on the pending brand folder with an explanatory note. The input becomes rejected and kickoff remains blocked.
4. Open its **Client portal**. Submit a replacement HTTPS link and a page inventory containing owners, pages, and missing copy. Submissions survive reload. No password or secret is needed.
5. Return to the operator workspace and refresh it. Accept the submitted inputs with notes. For fictional links, explicitly state that this is a workflow demonstration, not an external access verification.
6. **Run agent** again. Inspect and download `Kickoff handoff.md` and `Onboarding tasks.json` under Workspace.
7. Confirm a future, agreed kickoff time. Download the ICS file. The application records confirmation but does not send invitations.
8. Run the agent again and inspect the artifact count: stable artifact IDs prevent duplicate provisioning.
9. Ask the evidence search about sandbox access, kickoff prerequisites, or an exclusion in the scope. Inspect the original passages.

## Materialize the exported workspace

Export the workspace package from the application, then run:

```sh
node scripts/materialize.mjs /path/to/client-workspace.json /path/to/new-client-folder
```

The destination must not already exist. The tool creates input and deliverable folders, the package, and generated documents. It never deletes or overwrites existing files. A filesystem failure can leave a partial new directory; inspect it and use a different fresh destination when retrying.

## Local integration verification

With the local development server running:

```sh
npm run test:integration
```

The suite uses local simulated sign-in and creates one retained verification project. It refuses non-loopback URLs. It exercises the HTTP API, D1 persistence, concurrent writes, client/operator boundaries, and the complete kickoff flow. It intentionally does not delete the test project.
